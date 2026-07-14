<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { workflowStore } from '$lib/stores/workflow.store.svelte';
	import { X, Plus, Trash2 } from 'lucide-svelte';
	import type { Workflow } from '$lib/services/workflow.service';

	let { open = $bindable(false) }: { open: boolean } = $props();

	let editName = $state('');
	let editBaseUrl = $state('');
	let editWorkflowText = $state('');

	// When a workflow is selected, load it into the editor fields
	$effect(() => {
		const wf = workflowStore.activeWorkflow;
		if (wf) {
			editName = wf.name;
			editBaseUrl = wf.base_url;
			editWorkflowText = wf.workflow;
		}
	});

	function handleNew() {
		workflowStore.newWorkflow();
		editName = '';
		editBaseUrl = '';
		editWorkflowText = '';
	}

	async function handleSave() {
		const wf = workflowStore.activeWorkflow;
		if (!wf) return;
		await workflowStore.saveWorkflow({
			...wf,
			name: editName,
			base_url: editBaseUrl,
			workflow: editWorkflowText
		});
	}

	async function handleDelete() {
		const id = workflowStore.activeId;
		if (!id) return;
		await workflowStore.deleteWorkflow(id);
		const next = workflowStore.activeWorkflow;
		if (next) {
			editName = next.name;
			editBaseUrl = next.base_url;
			editWorkflowText = next.workflow;
		}
	}

	function handleSelect(id: string) {
		workflowStore.selectWorkflow(id);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			open = false;
		}
	}

	// A workflow is "new" if it has just been created (empty name)
	// Actually, let's track this by checking if the workflow exists in the persisted list
	const isNewWorkflow = $derived(
		workflowStore.activeId !== null &&
			!workflowStore.workflows.some(
				(w) => w.id === workflowStore.activeId && w.name !== ''
			)
	);
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-0 backdrop-blur-sm md:p-4">
		<div
			class="flex h-full w-full flex-row bg-card md:h-[70vh] md:max-w-3xl md:rounded-2xl md:border md:border-border md:shadow-lg overflow-hidden"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			aria-label="Settings"
			tabindex="0"
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
					>
						<Plus class="h-4 w-4" />
					</Button>
				</div>

				<!-- Workflow List -->
				<ScrollArea class="flex-1">
					{#if workflowStore.workflows.length === 0}
						<p class="px-4 py-4 text-center text-xs text-muted-foreground">
							No workflows yet
						</p>
					{:else}
						<div class="flex flex-col gap-0.5 p-2">
							{#each workflowStore.workflows as wf (wf.id)}
								<button
									onclick={() => handleSelect(wf.id)}
									class="w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
									class:bg-accent={workflowStore.activeId === wf.id}
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

			<!-- Main Panel -->
			<div class="flex flex-1 flex-col overflow-hidden md:rounded-r-2xl">
				{#if workflowStore.activeWorkflow}
					<!-- Action Bar -->
					<div class="flex items-center justify-end gap-2 border-b border-border px-4 py-3">
						{#if !isNewWorkflow}
							<Button
								variant="ghost"
								size="icon"
								class="h-7 w-7 cursor-pointer text-muted-foreground hover:text-destructive"
								onclick={handleDelete}
								aria-label="Delete workflow"
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
						>
							<X class="h-4 w-4" />
						</Button>
					</div>

					<!-- Content -->
					<div class="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
						<div class="flex flex-col gap-1.5">
							<label for="wf-name" class="text-sm font-medium text-foreground">Name</label>
							<Input
								id="wf-name"
								bind:value={editName}
								placeholder="Enter workflow name..."
							/>
						</div>
						<div class="flex flex-col gap-1.5">
							<label for="wf-base-url" class="text-sm font-medium text-foreground">Base URL</label>
							<Input
								id="wf-base-url"
								bind:value={editBaseUrl}
								placeholder="http://127.0.0.1:8188"
							/>
						</div>
						<div class="flex flex-1 flex-col gap-1.5">
							<label for="wf-workflow" class="text-sm font-medium text-foreground">Workflow</label>
							<Textarea
								id="wf-workflow"
								bind:value={editWorkflowText}
								placeholder="Paste your workflow JSON here..."
								class="flex-1 font-mono text-xs"
							/>
						</div>
						<div class="flex justify-end">
							<Button onclick={handleSave} class="cursor-pointer px-6">Save</Button>
						</div>
					</div>
				{:else}
					<!-- Empty State -->
					<div class="flex flex-1 items-center justify-center p-6">
						<p class="text-sm text-muted-foreground">
							Select a workflow or create a new one
						</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
