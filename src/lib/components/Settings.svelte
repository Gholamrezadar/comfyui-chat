<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { workflowStore } from '$lib/stores/workflow.store.svelte';
	import { X, Plus, Trash2 } from 'lucide-svelte';
	import type { WorkflowOverride } from '$lib/services/workflow.service';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import DynamicWorkflowBuilder from '$lib/components/DynamicWorkflowBuilder.svelte';
	import { toast } from 'svelte-sonner';

	let { open = $bindable(false) }: { open: boolean } = $props();

	let dynamicBuilder: DynamicWorkflowBuilder | undefined = $state();

	// --- Form state ---
	let editName = $state('');
	let editBaseUrl = $state('');
	let editWorkflowText = $state('');
	let editOverrides = $state<WorkflowOverride[]>([]);
	let builderKey = $state({});
	let errors = $state<{ name?: string; base_url?: string; workflow?: string }>({});
	let showDeleteConfirm = $state(false);

	// When a workflow is selected, load it into the editor fields
	$effect(() => {
		const wf = workflowStore.activeWorkflow;
		if (wf) {
			editName = wf.name;
			editBaseUrl = wf.base_url;
			editWorkflowText = wf.workflow;
			editOverrides = (wf.overrides ?? []).map((o) => ({ path: o.path, value: o.value }));
			builderKey = {};
			errors = {};
		}
	});

	function validate(): boolean {
		const newErrors: typeof errors = {};
		if (!editName.trim()) {
			newErrors.name = 'Name is required';
		} else {
			const duplicate = workflowStore.workflows.some(
				(w) =>
					w.id !== workflowStore.activeId && w.name.toLowerCase() === editName.trim().toLowerCase()
			);
			if (duplicate) newErrors.name = 'Name already exists';
		}
		if (!editBaseUrl.trim()) {
			newErrors.base_url = 'URL is required';
		} else {
			try {
				const url = new URL(editBaseUrl.trim());
				if (url.protocol !== 'http:' && url.protocol !== 'https:') {
					newErrors.base_url = 'Must be a valid HTTP/HTTPS URL';
				}
			} catch {
				newErrors.base_url = 'Must be a valid HTTP/HTTPS URL';
			}
		}
		if (!editWorkflowText.trim()) {
			newErrors.workflow = 'Workflow is required';
		} else {
			try {
				JSON.parse(editWorkflowText);
			} catch {
				newErrors.workflow = 'Must be valid JSON';
			}
		}
		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	}

	// Block creating a new workflow if the current one has unsaved changes
	// or is a new workflow that hasn't been saved yet
	function handleNew() {
		if (hasUnsavedChanges || isNewWorkflow) return;
		workflowStore.newWorkflow();
		editName = '';
		editBaseUrl = '';
		editWorkflowText = '';
		editOverrides = [];
		errors = {};
	}

	async function handleSave() {
		if (!validate()) return;
		const wf = workflowStore.activeWorkflow;
		if (!wf) return;
		const overridesToSave = editOverrides.map((o) => ({ path: o.path, value: o.value }));
		try {
			await workflowStore.saveWorkflow({
				id: wf.id,
				name: editName.trim(),
				base_url: editBaseUrl.trim(),
				workflow: editWorkflowText,
				overrides: overridesToSave,
				createdAt: wf.createdAt,
				updatedAt: wf.updatedAt
			});
			toast.success('Workflow saved');
		} catch {
			toast.error('Failed to save workflow');
		}
	}

	function handleDelete() {
		showDeleteConfirm = true;
	}

	// Block switching to another workflow if the current one has unsaved changes
	// or is a new workflow that hasn't been saved yet
	function handleSelect(id: string) {
		if (hasUnsavedChanges || isNewWorkflow) return;
		workflowStore.selectWorkflow(id);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			open = false;
		}
	}

	// Handle ESC key directly on the dialog (stopPropagation prevents window handler)
	function handleDialogKeydown(e: KeyboardEvent) {
		e.stopPropagation();
		if (e.key === 'Escape' && open) {
			open = false;
		}
		// Enter to save when not focused on textarea (allow newlines in textarea with Enter)
		else if (
			e.key === 'Enter' &&
			!e.shiftKey &&
			workflowStore.activeWorkflow &&
			(e.target as HTMLElement)?.tagName !== 'TEXTAREA'
		) {
			e.preventDefault();
			handleSave();
		}
	}

	// Auto-focus the Name input when the modal opens
	$effect(() => {
		if (open) {
			const nameInput = document.getElementById('wf-name');
			if (nameInput) {
				requestAnimationFrame(() => nameInput.focus());
			}
		}
	});

	// Whether the active workflow is newly created (not yet persisted in IndexedDB)
	const isNewWorkflow = $derived(
		workflowStore.activeId !== null &&
			!workflowStore.workflows.some((w) => w.id === workflowStore.activeId && w.name !== '')
	);

	// Whether the current form fields differ from the saved workflow data
	const hasUnsavedChanges = $derived.by(() => {
		const wf = workflowStore.activeWorkflow;
		if (!wf) return false;
		return (
			editName.trim() !== wf.name ||
			editBaseUrl.trim() !== wf.base_url ||
			editWorkflowText !== wf.workflow ||
			JSON.stringify(editOverrides) !== JSON.stringify(wf.overrides ?? [])
		);
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-0 backdrop-blur-sm md:p-4"
	>
		<div
			class="flex h-full w-full flex-row overflow-hidden bg-card md:h-[70vh] md:max-w-3xl md:rounded-2xl md:border md:border-border md:shadow-lg"
			onclick={(e) => e.stopPropagation()}
			onkeydown={handleDialogKeydown}
			role="dialog"
			aria-modal="true"
			aria-label="Settings"
			tabindex="-1"
			id="settings-dialog"
		>
			<!-- Sidebar: Workflow List -->
			<div class="flex w-48 flex-col border-r border-border md:rounded-l-2xl">
				<!-- Sidebar Header -->
				<div class="flex items-center justify-between border-b border-border px-4 py-3">
					<h3 class="text-sm font-semibold text-foreground">Workflows</h3>
					<Button
						variant="ghost"
						size="icon"
						class="h-7 w-7 cursor-pointer"
						onclick={handleNew}
						aria-label="Add workflow"
						tabindex={-1}
					>
						<Plus class="h-4 w-4" />
					</Button>
				</div>

				<!-- Workflow List: min-h-0 allows flex child to shrink, enabling ScrollArea to scroll -->
				<div class="min-h-0 flex-1">
					<ScrollArea class="h-full">
						{#if workflowStore.workflows.length === 0}
							<p class="px-4 py-4 text-center text-xs text-muted-foreground">No workflows yet</p>
						{:else}
							<div class="flex flex-col gap-0.5 p-2">
								{#each workflowStore.workflows as wf (wf.id)}
									<button
										onclick={() => handleSelect(wf.id)}
										class="w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
										class:bg-accent={workflowStore.activeId === wf.id}
										tabindex={-1}
									>
										<p class="truncate font-medium">
											{wf.name || 'Untitled Workflow'}
										</p>
									</button>
								{/each}
							</div>
						{/if}
					</ScrollArea>
				</div>
			</div>

			<!-- Main Panel -->
			<div class="flex flex-1 flex-col md:rounded-r-2xl">
				<!-- Action Bar: always visible -->
				<div class="flex items-center justify-end gap-2 border-b border-border px-4 py-3">
					{#if workflowStore.activeWorkflow && !isNewWorkflow}
						<Button
							variant="ghost"
							size="icon"
							class="h-7 w-7 cursor-pointer text-muted-foreground hover:text-destructive"
							onclick={handleDelete}
							aria-label="Delete workflow"
							tabindex={-1}
						>
							<Trash2 class="h-4 w-4" />
						</Button>
					{/if}
					<Button
						variant="ghost"
						size="icon"
						class="h-7 w-7 cursor-pointer"
						onclick={() => (open = false)}
						aria-label="Close"
						tabindex={-1}
					>
						<X class="h-4 w-4" />
					</Button>
				</div>

				{#if workflowStore.activeWorkflow}
					<div class="min-h-0 flex-1">
						<ScrollArea class="h-full">
							<div class="flex flex-col gap-4 p-4">
								<div class="flex flex-col gap-1.5">
									<label for="wf-name" class="text-sm font-medium text-foreground">Name</label>
									<Input
										id="wf-name"
										bind:value={editName}
										placeholder="Enter workflow name..."
										class={errors.name ? 'border-destructive' : ''}
										tabindex={1}
									/>
									{#if errors.name}
										<p class="text-xs text-destructive">{errors.name}</p>
									{/if}
								</div>
								<div class="flex flex-col gap-1.5">
									<label for="wf-base-url" class="text-sm font-medium text-foreground"
										>Base URL</label
									>
									<Input
										id="wf-base-url"
										bind:value={editBaseUrl}
										placeholder="http://127.0.0.1:8188"
										class={errors.base_url ? 'border-destructive' : ''}
										tabindex={2}
									/>
									{#if errors.base_url}
										<p class="text-xs text-destructive">{errors.base_url}</p>
									{/if}
								</div>
								<div class="flex flex-col gap-1.5">
									<label for="wf-workflow" class="text-sm font-medium text-foreground"
										>Workflow</label
									>
									<Textarea
										id="wf-workflow"
										bind:value={editWorkflowText}
										placeholder="Paste your workflow JSON here..."
										rows={10}
										class="field-sizing-fixed font-mono text-xs {errors.workflow
											? 'border-destructive'
											: ''}"
										tabindex={3}
										ondblclick={(e) => {
											const textarea = e.target as HTMLTextAreaElement;
											dynamicBuilder?.addRowAtOffset(textarea.selectionStart);
										}}
									/>
									{#if errors.workflow}
										<p class="text-xs text-destructive">{errors.workflow}</p>
									{/if}
								</div>

								<!-- Workflow Overrides -->
								{#key builderKey}
									<DynamicWorkflowBuilder
										bind:this={dynamicBuilder}
										workflowText={editWorkflowText}
										initialOverrides={editOverrides}
										onOverridesChange={(o) => (editOverrides = o.map((r) => ({ ...r })))}
									/>
								{/key}
								<div class="flex justify-end">
									<Button onclick={handleSave} class="cursor-pointer px-6" tabindex={4}>Save</Button
									>
								</div>
							</div>
						</ScrollArea>
					</div>
				{:else}
					<!-- Empty State -->
					<div class="flex flex-1 items-center justify-center p-6">
						<p class="text-sm text-muted-foreground">Select a workflow or create a new one</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<ConfirmDialog
	bind:open={showDeleteConfirm}
	title="Delete Workflow"
	message="Are you sure you want to delete this workflow? This action cannot be undone."
	onconfirm={async () => {
		const id = workflowStore.activeId;
		if (!id) return;
		await workflowStore.deleteWorkflow(id);
		const next = workflowStore.activeWorkflow;
		if (next) {
			editName = next.name;
			editBaseUrl = next.base_url;
			editWorkflowText = next.workflow;
			editOverrides = (next.overrides ?? []).map((o) => ({ path: o.path, value: o.value }));
		}
	}}
/>
