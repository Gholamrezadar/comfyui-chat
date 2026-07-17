# Workflow override hydration report

## Problem

Workflow overrides saved successfully to IndexedDB, but the Settings UI displayed
stale data when switching workflows.

For example:

1. Select workflow A.
2. Switch to workflow B.
3. The override builder shows workflow A's overrides instead of workflow B's.
4. Switch again and the builder then shows workflow B's overrides.

This made the UI appear to be one workflow behind, despite the persisted data
being correct.

## Investigation

The persistence layer was not the source of the issue:

- `workflow.service.ts` saves the complete `Workflow` object, including
  `overrides`, through Dexie's `put` operation.
- `workflow.store.svelte.ts` replaces the corresponding in-memory workflow after
  saving.
- IndexedDB inspection confirmed the correct override data was stored.

The issue was in component state and lifecycle timing.

### Cause 1: `DynamicWorkflowBuilder` captures overrides only at creation

`DynamicWorkflowBuilder.svelte` initializes its local `rows` state from the
`initialOverrides` prop:

```ts
let rows = $state(initialOverrides.map(...));
```

That value is intentionally local editor state, so subsequent prop changes do
not automatically replace `rows`.

### Cause 2: the previous key recreated the builder too early

`Settings.svelte` previously keyed `DynamicWorkflowBuilder` with
`workflowStore.activeId`. When a workflow was selected, changing `activeId`
caused Svelte to recreate the builder immediately.

The form fields (`editName`, `editWorkflowText`, and `editOverrides`) are loaded
by a separate `$effect`. Therefore, the new builder could be created with the
previous workflow's `editOverrides` before that hydration effect assigned the
new workflow's values.

Since the builder only captures `initialOverrides` when it is created, it kept
those previous overrides until the next workflow selection. This produced the
one-step-behind behavior.

## Rejected fix: a manual builder reset key

An initial workaround used a separate `builderKey` value and changed it from the
workflow hydration effect to force a new builder instance.

A counter version used this statement:

```ts
builderKey += 1;
```

That produced this Svelte runtime error:

```text
effect_update_depth_exceeded
Maximum update depth exceeded
```

`+=` reads the current reactive value and writes it back. Doing that inside an
`$effect` makes the effect depend on state that it updates, creating a reactive
update loop. Replacing the counter with a new object avoided the loop, but a
manual reset token did not express the actual lifecycle relationship.

## Final fix: key by workflow identity

The builder lifecycle is tied to the workflow it edits, so its key is now the
workflow's stable domain identity:

```svelte
{#key workflowStore.activeWorkflow.id}
    <DynamicWorkflowBuilder
        workflowText={editWorkflowText}
        initialOverrides={workflowStore.activeWorkflow.overrides ?? []}
        onOverridesChange={(overrides) => (editOverrides = overrides.map((row) => ({ ...row })))}
    />
{/key}
```

Crucially, `initialOverrides` comes directly from the currently active workflow,
rather than from `editOverrides`. `editOverrides` is local draft state that is
hydrated in a parent `$effect` and can briefly contain the previous workflow's
values while a selection change is processed.

When `activeWorkflow.id` changes, Svelte recreates the builder. The new instance
receives the selected workflow's persisted overrides directly, so it initializes
its local rows from the correct workflow without waiting for the form hydration
effect.

## Result

When selecting a workflow, Settings now:

1. Selects the workflow in the store.
2. Recreates the override builder because its workflow identity changed.
3. Initializes the builder directly from that workflow's saved overrides.
4. Hydrates the remaining editable form fields into local draft state.

Each workflow now displays its own saved overrides immediately, without an
extra selection, a reactive update loop, or an artificial reset key.

## Validation

`bun run check` completed with zero errors. The project retains five existing
warnings in `DynamicWorkflowBuilder.svelte` related to accessibility and its
intentional initial-prop state capture.
