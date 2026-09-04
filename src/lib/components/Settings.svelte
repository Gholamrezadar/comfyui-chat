<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { workflowStore } from '$lib/stores/workflow.store.svelte';
	import {
		X,
		Plus,
		Trash2,
		Copy,
		Save,
		ChevronDown,
		CircleHelp,
		Maximize2,
		Minimize2
	} from 'lucide-svelte';
	import type { WorkflowOverride } from '$lib/services/workflow.service';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import InfoDialog from '$lib/components/InfoDialog.svelte';
	import DynamicWorkflowBuilder from '$lib/components/DynamicWorkflowBuilder.svelte';
	import { toast } from 'svelte-sonner';
	import { Tooltip, TooltipContent, TooltipTrigger } from '$lib/components/ui/tooltip';

	let { open = $bindable(false) }: { open: boolean } = $props();

	let dynamicBuilder: DynamicWorkflowBuilder | undefined = $state();

	// --- Form state ---
	let editName = $state('');
	let editBaseUrl = $state('');
	let editWorkflowText = $state('');
	let editOverrides = $state<WorkflowOverride[]>([]);
	let errors = $state<{ name?: string; base_url?: string; workflow?: string }>({});
	let showDeleteConfirm = $state(false);
	let showMobileWorkflowMenu = $state(false);
	let mobileMenuEl: HTMLDivElement | undefined = $state();
	let showBaseUrlHelp = $state(false);
	let showWorkflowHelp = $state(false);
	let workflowExpanded = $state(false);

	// When a workflow is selected, load it into the editor fields
	$effect(() => {
		const wf = workflowStore.activeWorkflow;
		if (wf) {
			editName = wf.name;
			editBaseUrl = wf.base_url;
			editWorkflowText = wf.workflow;
			editOverrides = (wf.overrides ?? []).map((o) => ({ path: o.path, value: o.value }));
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
		const hasWidth = editOverrides.some((o) => o.value === 'WIDTH');
		const hasHeight = editOverrides.some((o) => o.value === 'HEIGHT');
		if (hasWidth !== hasHeight) {
			newErrors.workflow = 'WIDTH and HEIGHT overrides must be configured together';
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

	async function handleClone() {
		const wf = workflowStore.activeWorkflow;
		if (!wf) return;

		const baseName = wf.name.replace(/\s+\(Clone \d+\)$/i, '') || 'Workflow';
		const clonePattern = new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\(Clone (\\d+)\\)$`, 'i');
		const nextNumber =
			workflowStore.workflows.reduce((max, workflow) => {
				const match = workflow.name.match(clonePattern);
				return match ? Math.max(max, Number(match[1])) : max;
			}, 0) + 1;

		await workflowStore.cloneWorkflow(wf, `${baseName} (Clone ${nextNumber})`);
		toast.success('Workflow cloned');
	}

	function handleDelete() {
		showDeleteConfirm = true;
	}

	// Block switching to another workflow if the current one has unsaved changes
	// or is a new workflow that hasn't been saved yet
	function handleSelect(id: string) {
		if (hasUnsavedChanges || isNewWorkflow) return;
		workflowStore.selectWorkflow(id);
		showMobileWorkflowMenu = false;
	}

	function handleMobileMenuKeydown(event: KeyboardEvent) {
		event.stopPropagation();
		if (event.key === 'Escape') {
			showMobileWorkflowMenu = false;
		} else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			const list = workflowStore.workflows;
			if (!list.length) return;
			const current = list.findIndex((w) => w.id === workflowStore.activeId);
			const next =
				event.key === 'ArrowDown'
					? (current + 1) % list.length
					: (current - 1 + list.length) % list.length;
			handleSelect(list[next].id);
		}
	}

	// Focus the mobile menu when it opens for keyboard users
	$effect(() => {
		if (showMobileWorkflowMenu) {
			requestAnimationFrame(() => mobileMenuEl?.focus());
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			// Collapse the expanded editor first, close settings second
			if (workflowExpanded) workflowExpanded = false;
			else open = false;
		}
	}

	// Reset the expanded editor whenever settings close
	$effect(() => {
		if (!open) workflowExpanded = false;
	});

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

	// Auto-focus the Name input when the modal opens (desktop only —
	// focusing on touch devices would pop the keyboard uninvited)
	$effect(() => {
		if (open && !window.matchMedia('(hover: none)').matches) {
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

<svelte:window onkeydown={handleKeydown} onclick={() => (showMobileWorkflowMenu = false)} />

<!-- Shared workflow JSON editor: rendered inline and in the expanded overlay so all
     functionality (incl. double-click override) works in both -->
{#snippet workflowEditor(textareaId: string, expanded: boolean)}
	<Textarea
		id={textareaId}
		bind:value={editWorkflowText}
		placeholder="Paste your workflow JSON here..."
		rows={10}
		class="field-sizing-fixed rounded-lg font-mono text-xs {expanded
			? 'min-h-0 flex-1'
			: 'min-h-72 md:min-h-0'} {errors.workflow ? 'border-destructive' : ''}"
		tabindex={3}
		ondblclick={(e) => {
			const textarea = e.target as HTMLTextAreaElement;
			dynamicBuilder?.addRowAtOffset(textarea.selectionStart);
		}}
	/>
	{#if errors.workflow}
		<p class="text-xs text-destructive">{errors.workflow}</p>
	{/if}
{/snippet}

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
			<!-- Sidebar: Workflow List (desktop only; mobile uses the combobox below) -->
			<div class="hidden w-48 flex-col border-r border-border md:flex md:rounded-l-2xl">
				<!-- Sidebar Header -->
				<div class="flex h-12 shrink-0 items-center justify-between border-b border-border px-4 py-0">
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
				<div class="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4 py-0">
					<!-- Mobile workflow selector, flushed left (sidebar is hidden on small screens) -->
					<div class="relative min-w-0 flex-1 md:hidden">
						<button
							type="button"
							class="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-border bg-muted px-3 py-1.5 text-sm text-foreground transition-colors hover:text-foreground"
							onclick={(event) => {
								event.stopPropagation();
								showMobileWorkflowMenu = !showMobileWorkflowMenu;
							}}
							aria-label="Select workflow"
							aria-expanded={showMobileWorkflowMenu}
						>
							<span class="truncate font-medium">
								{workflowStore.activeWorkflow?.name || 'Select workflow'}
							</span>
							<ChevronDown
								class="h-4 w-4 shrink-0 text-muted-foreground transition-transform {showMobileWorkflowMenu
									? 'rotate-180'
									: ''}"
							/>
						</button>
						{#if showMobileWorkflowMenu}
							<div
								bind:this={mobileMenuEl}
								class="absolute top-full right-0 left-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-border bg-card shadow-lg"
								onclick={(event) => event.stopPropagation()}
								onkeydown={handleMobileMenuKeydown}
								role="listbox"
								aria-label="Workflows"
								tabindex={-1}
							>
								{#if workflowStore.workflows.length === 0}
									<p class="px-4 py-3 text-center text-xs text-muted-foreground">
										No workflows yet
									</p>
								{:else}
									{#each workflowStore.workflows as wf (wf.id)}
										<button
											type="button"
											role="option"
											aria-selected={workflowStore.activeId === wf.id}
											onclick={() => handleSelect(wf.id)}
											class="flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-accent"
											class:bg-accent={workflowStore.activeId === wf.id}
										>
											<span class="truncate font-medium text-foreground">
												{wf.name || 'Untitled Workflow'}
											</span>
										</button>
									{/each}
								{/if}
								<button
									type="button"
									onclick={() => {
										handleNew();
										showMobileWorkflowMenu = false;
									}}
									class="flex w-full cursor-pointer items-center gap-2 border-t border-border px-4 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
								>
									<Plus class="h-3.5 w-3.5 shrink-0" />
									New workflow
								</button>
							</div>
						{/if}
					</div>
					<div class="ml-auto flex shrink-0 items-center gap-2">
					{#if workflowStore.activeWorkflow}
						<Button
							variant="default"
							size="sm"
							class="h-8 w-8 cursor-pointer px-0 text-xs sm:w-auto sm:px-4"
							onclick={handleSave}
							tabindex={-1}
							aria-label="Save workflow"
						>
							<Save class="h-3.5 w-3.5 sm:mr-1.5" />
							<span class="hidden sm:inline">Save</span>
						</Button>
					{/if}
					{#if workflowStore.activeWorkflow}
						<Tooltip>
							<TooltipTrigger>
								<Button
									variant="ghost"
									size="icon"
									class="h-7 w-7 cursor-pointer text-muted-foreground"
									onclick={handleClone}
									aria-label="Duplicate workflow"
									tabindex={-1}
								>
									<Copy class="h-4 w-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Duplicate workflow</TooltipContent>
						</Tooltip>
					{/if}
					{#if workflowStore.activeWorkflow && !isNewWorkflow}
						<Tooltip>
							<TooltipTrigger>
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
							</TooltipTrigger>
							<TooltipContent>Delete workflow</TooltipContent>
						</Tooltip>
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
										class="rounded-lg {errors.name ? 'border-destructive' : ''}"
										tabindex={1}
									/>
									{#if errors.name}
										<p class="text-xs text-destructive">{errors.name}</p>
									{/if}
								</div>
								<div class="flex flex-col gap-1.5">
									<label
										for="wf-base-url"
										class="flex items-center gap-1.5 text-sm font-medium text-foreground"
									>
										Base URL
										<button
											type="button"
											class="cursor-pointer rounded-full text-muted-foreground transition-colors hover:text-foreground"
											onclick={() => (showBaseUrlHelp = true)}
											aria-label="About base URL"
										>
											<CircleHelp class="h-4 w-4" />
										</button>
									</label>
									<Input
										id="wf-base-url"
										bind:value={editBaseUrl}
										placeholder="http://127.0.0.1:8188"
										class="rounded-lg {errors.base_url ? 'border-destructive' : ''}"
										tabindex={2}
									/>
									{#if errors.base_url}
										<p class="text-xs text-destructive">{errors.base_url}</p>
									{/if}
								</div>
								<div class="flex flex-col gap-1.5">
									<div class="flex items-center justify-between">
										<label
											for="wf-workflow"
											class="flex items-center gap-1.5 text-sm font-medium text-foreground"
										>
											Workflow
											<button
												type="button"
												class="cursor-pointer rounded-full text-muted-foreground transition-colors hover:text-foreground"
												onclick={() => (showWorkflowHelp = true)}
												aria-label="About workflow JSON"
											>
												<CircleHelp class="h-4 w-4" />
											</button>
										</label>
										<button
											type="button"
											class="cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
											onclick={() => (workflowExpanded = true)}
											aria-label="Expand workflow editor"
										>
											<Maximize2 class="h-4 w-4" />
										</button>
									</div>
									{@render workflowEditor('wf-workflow', false)}
								</div>

								<!-- Workflow Overrides -->
								{#key workflowStore.activeWorkflow.id}
									<DynamicWorkflowBuilder
										bind:this={dynamicBuilder}
										workflowText={editWorkflowText}
										initialOverrides={workflowStore.activeWorkflow.overrides ?? []}
										onOverridesChange={(o) => (editOverrides = o.map((r) => ({ ...r })))}
									/>
								{/key}
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
	{#if workflowExpanded}
		<div class="fixed inset-0 z-[60] flex flex-col gap-2 bg-card p-4">
			<div class="flex shrink-0 items-center justify-between">
				<span class="text-sm font-medium text-foreground">Workflow</span>
				<button
					type="button"
					class="cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
					onclick={() => (workflowExpanded = false)}
					aria-label="Shrink workflow editor"
				>
					<Minimize2 class="h-4 w-4" />
				</button>
			</div>
			{@render workflowEditor('wf-workflow-expanded', true)}
		</div>
	{/if}
{/if}

<InfoDialog
	bind:open={showBaseUrlHelp}
	title="Base URL"
	message='The HTTP address of your ComfyUI server, e.g. http://127.0.0.1:8188.'
/>

<InfoDialog
	bind:open={showWorkflowHelp}
	title="Workflow JSON"
	bullets={[
		'Your ComfyUI workflow in API-format JSON.',
		'Export from ComfyUI using Export API format',
		'Overrides below are applied on top of this workflow on every run.'
	]}
/>

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
