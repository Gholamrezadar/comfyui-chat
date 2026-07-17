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

## First fix attempt and follow-up issue

The first fix introduced a `builderKey` counter and incremented it inside the
workflow hydration effect after assigning the form fields:

```ts
builderKey += 1;
```

This correctly delayed builder recreation until after the new overrides had
been copied into `editOverrides`. However, it introduced this Svelte runtime
error:

```text
effect_update_depth_exceeded
Maximum update depth exceeded
```

The hydration effect read `builderKey` as part of `builderKey += 1` and then
wrote it. In Svelte's reactive runtime, reading and writing the same state from
an effect makes that effect a dependency of its own update, causing an infinite
update loop.

## Final fix

`Settings.svelte` now uses a reactive object identity as the builder key:

```ts
let builderKey = $state({});
```

After the selected workflow's form state has been hydrated, the effect assigns a
new object:

```ts
builderKey = {};
```

The template keys the builder from that value:

```svelte
{#key builderKey}
    <DynamicWorkflowBuilder
        workflowText={editWorkflowText}
        initialOverrides={editOverrides}
        onOverridesChange={(overrides) => (editOverrides = overrides.map((row) => ({ ...row })))}
    />
{/key}
```

Assigning a fresh object changes the key without reading the previous key, so it
cannot make the hydration effect depend on state that it updates.

## Result

When selecting a workflow, Settings now:

1. Reads the selected workflow from the store.
2. Copies its overrides into `editOverrides`.
3. Recreates the dynamic builder with those hydrated overrides.

Each workflow now displays its own saved overrides immediately, without an
extra selection and without a reactive update loop.

## Validation

`bun run check` completed with zero errors. The project retains five existing
warnings in `DynamicWorkflowBuilder.svelte` related to accessibility and its
intentional initial-prop state capture.
