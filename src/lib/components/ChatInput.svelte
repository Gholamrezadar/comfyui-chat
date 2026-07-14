<script lang="ts">
	import { chatStore } from '$lib/stores/chat.store.svelte';
	import { workflowStore } from '$lib/stores/workflow.store.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Tooltip, TooltipContent, TooltipTrigger } from '$lib/components/ui/tooltip';
	import { ImagePlus, LoaderCircle, ArrowUp, Box, Reply, X, ChevronUp, SlidersHorizontal } from 'lucide-svelte';
	import SettingsModal from '$lib/components/Settings.svelte';
	import * as settingsService from '$lib/services/settings.service';
	import { tick } from 'svelte';
	import type { Workflow } from '$lib/services/workflow.service';

	let inputValue = $state('');
	let textareaEl: HTMLTextAreaElement | null = $state(null);
	let fileInputEl: HTMLInputElement | undefined = $state();
	let pendingImages = $state<string[]>([]);
	let isDragging = $state(false);
	let lastReplyTargetId = $state<string | null>(null);
	let showWorkflowDropdown = $state(false);
	let showSettings = $state(false);

	// TODO: Pass selectedWorkflow to the API when workflow integration is implemented
	let selectedWorkflow = $state<Workflow | null>(null);

	// Restore selected workflow from persistence on mount
	const savedWorkflowId = settingsService.loadSelectedWorkflowId();
	if (savedWorkflowId) {
		const match = workflowStore.workflows.find((w) => w.id === savedWorkflowId);
		if (match) selectedWorkflow = match;
	}

	// Persist selected workflow ID whenever it changes
	$effect(() => {
		settingsService.saveSelectedWorkflowId(selectedWorkflow?.id ?? null);
	});

	// Open settings and pre-select the current workflow for editing
	function openSettingsWithWorkflow() {
		if (selectedWorkflow) {
			workflowStore.selectWorkflow(selectedWorkflow.id);
		}
		showSettings = true;
	}

	const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
	const MAX_IMAGES = 5;

	function autoResize() {
		if (!textareaEl) return;
		textareaEl.style.height = 'auto';
		textareaEl.style.height = Math.min(textareaEl.scrollHeight, 180) + 'px';
	}

	function focusComposer() {
		tick().then(() => {
			requestAnimationFrame(() => {
				textareaEl?.focus({ preventScroll: true });
				autoResize();
			});
		});
	}

	$effect(() => {
		const replyId = chatStore.replyToMessage?.id ?? null;
		if (!replyId || replyId === lastReplyTargetId) return;

		lastReplyTargetId = replyId;
		focusComposer();
	});

	$effect(() => {
		if (!chatStore.replyToMessage) {
			lastReplyTargetId = null;
		}
	});

	function handleSend() {
		const trimmed = inputValue.trim();
		const hasImages = pendingImages.length > 0;
		if ((!trimmed && !hasImages) || chatStore.isResponding) return;

		chatStore.sendMessage(trimmed, hasImages ? [...pendingImages] : undefined);
		inputValue = '';
		pendingImages = [];
		if (textareaEl) textareaEl.style.height = 'auto';
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	}

	function processFiles(files: FileList | File[]) {
		const remaining = MAX_IMAGES - pendingImages.length;
		if (remaining <= 0) return;

		Array.from(files)
			.slice(0, remaining)
			.filter((f) => ACCEPTED_TYPES.includes(f.type))
			.forEach((file) => {
				const reader = new FileReader();
				reader.onload = () => {
					if (typeof reader.result === 'string') {
						pendingImages = [...pendingImages, reader.result];
					}
				};
				reader.readAsDataURL(file);
			});
	}

	function handleImageAttach() {
		fileInputEl?.click();
	}

	function handleFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files) processFiles(input.files);
		input.value = '';
	}

	function removePendingImage(index: number) {
		pendingImages = pendingImages.filter((_, i) => i !== index);
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
		isDragging = true;
	}

	function handleDragLeave() {
		isDragging = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		if (e.dataTransfer?.files) processFiles(e.dataTransfer.files);
	}

	function handlePaste(e: ClipboardEvent) {
		const items = e.clipboardData?.items;
		if (!items) return;
		const imageFiles: File[] = [];
		for (const item of items) {
			if (item.type.startsWith('image/')) {
				const file = item.getAsFile();
				if (file) imageFiles.push(file);
			}
		}
		if (imageFiles.length > 0) {
			e.preventDefault();
			processFiles(imageFiles);
		}
	}

	const canSend = $derived(
		(inputValue.trim() || pendingImages.length > 0) && !chatStore.isResponding
	);
</script>

<!-- Hidden File Input -->
<input
	bind:this={fileInputEl}
	type="file"
	accept={ACCEPTED_TYPES.join(',')}
	multiple
	class="hidden"
	onchange={handleFileChange}
/>

<!-- Reply Context Bar -->
{#if chatStore.replyToMessage}
	<div class="mb-2 flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs">
		<Reply class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
		<!-- Reply Thumbnail -->
		{#if chatStore.replyToMessage.images?.length}
			<img src={chatStore.replyToMessage.images[0]} alt="" class="h-6 w-6 shrink-0 rounded object-cover" />
		{/if}
		<!-- Reply Text -->
		<div class="flex-1 min-w-0">
			<span class="font-medium text-foreground">Replying to {chatStore.replyToMessage.role === 'user' ? 'yourself' : 'assistant'}</span>
			<p class="truncate text-muted-foreground">
				{chatStore.replyToMessage.content || 'Image'}
			</p>
		</div>
		<!-- Cancel Reply Button -->
		<button
			onclick={() => chatStore.cancelReply()}
			class="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
		>
			<X class="h-3.5 w-3.5" />
		</button>
	</div>
{/if}

<!-- Drop Zone Overlay -->
{#if isDragging}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
		role="presentation"
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		ondrop={handleDrop}
	>
		<!-- Drop Zone Prompt -->
		<div class="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-primary bg-card p-8">
			<ImagePlus class="h-8 w-8 text-primary" />
			<p class="text-sm font-medium text-foreground">Drop images here</p>
		</div>
	</div>
{/if}

<!-- Composer -->
<div
	class="flex w-full flex-col gap-2 rounded-2xl border border-border bg-card px-3 py-2 shadow-sm focus-within:ring-1 focus-within:ring-ring"
	role="presentation"
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
>
	<!-- Image Previews -->
	{#if pendingImages.length > 0}
		<div class="flex flex-wrap gap-2">
			{#each pendingImages as img, i (i)}
				<!-- Image Preview Item -->
				<div class="group relative h-16 w-16 overflow-hidden rounded-lg border border-border">
					<img src={img} alt="Upload preview" class="h-full w-full object-cover" />
					<button
						onclick={() => removePendingImage(i)}
						class="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-muted text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
					>
						<X class="h-2.5 w-2.5" />
					</button>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Input Row -->
	<div class="flex items-end gap-2">
		<!-- Attach Button -->
		<Button
			variant="ghost"
			size="icon"
			onclick={handleImageAttach}
			class="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
		>
			<ImagePlus class="h-4 w-4" />
		</Button>

		<!-- Textarea Container: min-w-0 prevents flex overflow from long text -->
		<div class="flex min-w-0 flex-1 items-center">
			<Textarea
				bind:ref={textareaEl}
				bind:value={inputValue}
				oninput={autoResize}
				onkeydown={handleKeydown}
				onpaste={handlePaste}
				placeholder={pendingImages.length > 0 ? 'Add a caption...' : 'Type a message...'}
				rows={1}
				disabled={chatStore.isResponding}
				class="min-h-8 max-h-44 w-full resize-none border-0 bg-transparent px-2 py-1 text-sm shadow-none focus-visible:ring-0"
			/>
		</div>

		<!-- Model/Send Controls -->
		<div class="flex items-center gap-2 relative">
			<!-- Settings Button -->
				<Tooltip>
					<TooltipTrigger>
						<Button
							variant="ghost"
							size="icon"
							onclick={openSettingsWithWorkflow}
							class="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
						>
							<SlidersHorizontal class="h-4 w-4" />
						</Button>
					</TooltipTrigger>
					{#if selectedWorkflow}
						<TooltipContent>Edit workflow</TooltipContent>
					{:else}
						<TooltipContent>Workflows</TooltipContent>
					{/if}
				</Tooltip>

			<!-- Workflow Selector Dropup -->
			<div class="relative">
				<button
					onclick={() => (showWorkflowDropdown = !showWorkflowDropdown)}
					onblur={() => setTimeout(() => (showWorkflowDropdown = false), 150)}
					class="flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
				>
					<Box class="h-3.5 w-3.5" />
					{selectedWorkflow?.name || 'No Workflow'}
					<ChevronUp class="h-3 w-3" />
				</button>

				<!-- Dropup Menu -->
				{#if showWorkflowDropdown}
					<div class="absolute bottom-full left-0 z-50 mb-2 w-64 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
						<!-- Workflow List: custom scrollbar that hides when not hovered -->
						<div class="max-h-60 overflow-y-auto">
							{#if workflowStore.workflows.length === 0}
								<p class="px-4 py-3 text-center text-xs text-muted-foreground">
									No workflows yet
								</p>
							{:else}
								{#each workflowStore.workflows as wf (wf.id)}
									<button
										onclick={() => {
											selectedWorkflow = wf;
											showWorkflowDropdown = false;
										}}
										class="flex w-full flex-col gap-0.5 px-4 py-2.5 text-left transition-colors hover:bg-accent cursor-pointer"
										class:bg-accent={selectedWorkflow?.id === wf.id}
									>
										<span class="text-sm font-medium text-foreground">{wf.name || 'Untitled Workflow'}</span>
										<span class="text-xs text-muted-foreground truncate">{wf.base_url || 'No URL'}</span>
									</button>
								{/each}
							{/if}
						</div>
				</div>
			{/if}
			</div>

			<!-- Send Button -->
			<Button
				size="icon"
				onclick={handleSend}
				disabled={!canSend}
				class="h-8 w-8 rounded-full cursor-pointer"
			>
				{#if chatStore.isResponding}
					<LoaderCircle class="h-4 w-4 animate-spin cursor-wait" />
				{:else}
					<ArrowUp class="h-4 w-4" />
				{/if}
			</Button>
		</div>
	</div>
</div>

<!-- Composer Hint -->
<p class="mt-1.5 text-center text-[10px] text-muted-foreground">
	Enter to send · Shift+Enter for newline · Paste or drag images
</p>

<SettingsModal bind:open={showSettings} />
