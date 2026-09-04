<script lang="ts">
	import { chatStore } from '$lib/stores/chat.store.svelte';
	import type { Message } from '$lib/services/chat.service';
	import { Reply, Pencil, Trash2, Copy, X, Check, Ban } from 'lucide-svelte';
	import { tick } from 'svelte';
	import { toast } from 'svelte-sonner';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import MessageActionsSheet from '$lib/components/MessageActionsSheet.svelte';
	import { Tooltip, TooltipContent, TooltipTrigger } from '$lib/components/ui/tooltip';

	let {
		message,
		isHighlighted = false,
		isFading = false,
		scrollToMessage,
		openLightbox
	}: {
		message: Message;
		isHighlighted?: boolean;
		isFading?: boolean;
		scrollToMessage: (id: string) => void;
		openLightbox: (messageId: string, imageIndex: number) => void;
	} = $props();

	let editContent = $state('');
	let editTextareaEl: HTMLTextAreaElement | undefined = $state();
	let showDeleteConfirm = $state(false);
	let showActionsSheet = $state(false);
	let messageRowEl: HTMLDivElement | undefined = $state();
	let editWidth = $state('');

	// Swipe-to-reply: drag the bubble left, release past the trigger to reply.
	// Clamped so the message can't be flung across the screen.
	let replyDragX = $state(0);
	let isDraggingReply = $state(false);
	let replyDragPointerId: number | null = null;
	let replyDragStartX = 0;
	let replyDragStartY = 0;
	let replyHorizontal: boolean | null = null;
	let replySwiped = false;

	const REPLY_DRAG_CLAMP_PX = 72;
	const REPLY_DRAG_TRIGGER_PX = 48;

	function handleReplyDragStart(event: PointerEvent) {
		if (!event.isPrimary) return;
		// Desktop users select text with the mouse: only allow touch pointers to start a swipe.
		if (event.pointerType !== 'touch') return;
		if (longPressSuppressReply) {
			longPressSuppressReply = false;
			return;
		}
		replyDragPointerId = event.pointerId;
		replyDragStartX = event.clientX;
		replyDragStartY = event.clientY;
		replyHorizontal = null;
		replySwiped = false;
		isDraggingReply = true;
		window.addEventListener('pointermove', handleReplyDragMove);
		window.addEventListener('pointerup', handleReplyDragEnd);
		window.addEventListener('pointercancel', handleReplyDragEnd);
	}

	function handleReplyDragMove(event: PointerEvent) {
		if (!isDraggingReply || event.pointerId !== replyDragPointerId) return;
		const dx = event.clientX - replyDragStartX;
		const dy = event.clientY - replyDragStartY;
		if (replyHorizontal === null && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
			replyHorizontal = Math.abs(dx) > Math.abs(dy);
		}
		if (replyHorizontal) {
			if (Math.abs(dx) > 12) replySwiped = true;
			replyDragX = Math.max(-REPLY_DRAG_CLAMP_PX, Math.min(0, dx));
		}
	}

	function handleReplyDragEnd(event: PointerEvent) {
		if (!isDraggingReply || event.pointerId !== replyDragPointerId) return;
		isDraggingReply = false;
		window.removeEventListener('pointermove', handleReplyDragMove);
		window.removeEventListener('pointerup', handleReplyDragEnd);
		window.removeEventListener('pointercancel', handleReplyDragEnd);
		replyDragPointerId = null;
		replyHorizontal = null;
		if (replyDragX <= -REPLY_DRAG_TRIGGER_PX) {
			navigator.vibrate?.(30);
			chatStore.setReplyTo(message);
		}
		replyDragX = 0;
	}

	// Long-press on a bubble opens the actions sheet (mobile only). Cancel
	// the swipe gesture if a long-press fires so they never both trigger.
	const LONG_PRESS_MS = 500;
	const LONG_PRESS_MOVE_PX = 12;
	let longPressTimer: ReturnType<typeof setTimeout> | null = null;
	let longPressStart = { x: 0, y: 0 };
	let longPressSuppressReply = false;

	function cancelLongPress() {
		if (longPressTimer) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
	}

	function handleBubblePointerDown(event: PointerEvent) {
		// Desktop uses right-click; mobile only.
		if (!event.isPrimary || event.pointerType !== 'touch') return;
		longPressSuppressReply = false;
		longPressStart = { x: event.clientX, y: event.clientY };
		cancelLongPress();
		longPressTimer = setTimeout(() => {
			longPressTimer = null;
			longPressSuppressReply = true;
			navigator.vibrate?.(30);
			openActionsSheet();
		}, LONG_PRESS_MS);
	}

	function handleBubblePointerMove(event: PointerEvent) {
		if (!longPressTimer) return;
		if (Math.hypot(event.clientX - longPressStart.x, event.clientY - longPressStart.y) > LONG_PRESS_MOVE_PX) {
			cancelLongPress();
		}
	}

	function openActionsSheet() {
		if (isEditing) return;
		showActionsSheet = true;
	}

	async function downloadMessageImage() {
		const image = message.images?.[0];
		if (!image) return;
		const response = await fetch(image);
		const blobUrl = URL.createObjectURL(await response.blob());
		const link = document.createElement('a');
		link.href = blobUrl;
		const safeName = (message.replyToContent || message.content || 'comfyui-image').trim().slice(0, 40).replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'comfyui-image';
		const randomId = Math.random().toString(36).slice(2, 8);
		link.download = `${safeName}-${randomId}.png`;
		document.body.appendChild(link);
		link.click();
		link.remove();
		setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
	}

	const isUser = $derived(message.role === 'user');
	const isEditing = $derived(chatStore.editingMessage?.id === message.id);
	const repliedMessage = $derived(
		message.replyToId
			? chatStore.activeConversation?.messages.find((m) => m.id === message.replyToId)
			: undefined
	);
	const replyContent = $derived(repliedMessage?.content ?? message.replyToContent);
	const replyImages = $derived(repliedMessage?.images?.slice(0, 4) ?? []);
	const visibleImages = $derived(message.images?.slice(0, 4) ?? []);
	const hiddenImageCount = $derived(Math.max((message.images?.length ?? 0) - 4, 0));

	function formatTimestamp(ts: number): string {
		return new Date(ts).toLocaleTimeString(undefined, {
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatGenerationTime(ms: number): string {
		const totalSeconds = Math.floor(ms / 1000);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		if (minutes > 0) {
			return `${minutes}m ${seconds}s`;
		}
		return `${seconds}s`;
	}

	function getImageGridClass(count: number): string {
		return count === 1 ? 'flex justify-end' : 'grid grid-cols-2 gap-1';
	}

	function startEdit() {
		const messageBubble = messageRowEl?.querySelector<HTMLElement>('[data-message-bubble]');
		editWidth = messageBubble ? `${messageBubble.getBoundingClientRect().width}px` : '';
		editContent = message.content;
		chatStore.setEditing(message);
		tick().then(() => {
			if (editTextareaEl) {
				editTextareaEl.focus();
				editTextareaEl.style.height = 'auto';
				editTextareaEl.style.height = editTextareaEl.scrollHeight + 'px';
			}
		});
	}

	function handleEditKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			confirmEdit();
		} else if (e.key === 'Escape') {
			cancelEdit();
		}
	}

	function confirmEdit() {
		const trimmed = editContent.trim();
		if (!trimmed) return;
		chatStore.editMessage(message.id, trimmed);
		editContent = '';
		editWidth = '';
	}

	function cancelEdit() {
		editContent = '';
		editWidth = '';
		chatStore.cancelEdit();
	}

	function handleEditInput() {
		if (!editTextareaEl) return;
		editTextareaEl.style.height = 'auto';
		editTextareaEl.style.height = Math.min(editTextareaEl.scrollHeight, 180) + 'px';
	}

	async function copyMessage() {
		try {
			await navigator.clipboard.writeText(message.content);
			toast.info('Copied!');
		} catch {
			toast.error('Unable to copy the message');
		}
	}
</script>

<!-- Message Row -->
<div
	bind:this={messageRowEl}
	class={isUser ? 'group/msg flex items-end justify-end' : 'group/msg -mt-3 flex items-start gap-3'}
	data-message-id={message.id}
>
	<!-- Message Stack -->
	<div class={isUser ? 'flex flex-col items-end gap-2' : 'flex min-w-0 flex-col gap-1'}>
		<!-- Reply Preview -->
		{#if message.replyToId}
			<button
				onclick={() => scrollToMessage(message.replyToId!)}
				class={`flex w-fit max-w-[280px] cursor-pointer items-center gap-1.5 rounded-none border-0 bg-transparent px-0 py-0 text-[11px] text-muted-foreground transition-colors hover:text-foreground ${
					isUser ? 'self-end text-right' : 'self-start text-left'
				}`}
				tabindex={-1}
			>
				<!-- Reply Icon at the start -->
				{#if !isUser}
					<Reply class="h-3 w-3 shrink-0" />
				{/if}

				<!-- Reply Text at the start -->
				{#if isUser && replyContent}
					<span class="truncate">{replyContent}</span>
				{/if}

				<!-- Reply Images -->
				{#if replyImages.length}
					<div class="flex items-center gap-1.5">
						{#each replyImages as img, i (i)}
							<img src={img} alt="" class="h-10 w-8 shrink-0 rounded-md object-cover" />
						{/each}
					</div>
				{/if}

				<!-- Reply Text at the end -->
				{#if !isUser && replyContent}
					<span class="truncate">{replyContent}</span>
				{/if}

				<!-- Reply Icon at the end -->
				{#if isUser}
					<Reply class="h-3 w-3 shrink-0 scale-x-[-1]" />
				{/if}
			</button>
		{/if}

		<!-- Edit Composer -->
		{#if isEditing}
			<div
				class={`rounded-xl ${
					isUser
						? 'overflow-hidden bg-chat-bubble px-4 py-1.5 text-foreground/85'
						: 'w-fit max-w-full px-2 py-2'
				}`}
				style={editWidth ? `width: ${editWidth}` : undefined}
			>
				<textarea
					bind:this={editTextareaEl}
					bind:value={editContent}
					oninput={handleEditInput}
					onkeydown={handleEditKeydown}
					rows={1}
					class="block w-full resize-none bg-transparent p-0 text-sm leading-relaxed text-foreground/85 focus:outline-none"
					tabindex={0}
				></textarea>
			</div>
			<!-- Edit Controls -->
			<div class="flex items-center gap-1 opacity-100">
				<button
					onclick={cancelEdit}
					class="cursor-pointer rounded p-1 text-muted-foreground hover:text-foreground"
					aria-label="Cancel edit"
					tabindex={0}
				>
					<X class="h-3.5 w-3.5" />
				</button>
				<button
					onclick={confirmEdit}
					class="cursor-pointer rounded p-1 text-muted-foreground hover:text-primary"
					aria-label="Accept edit"
					tabindex={0}
				>
					<Check class="h-3.5 w-3.5" />
				</button>
			</div>
		{:else}
			<!-- Swipe-to-reply wrapper: drag the bubble left to reveal the reply affordance -->
			<div class="relative">
				<div
					class="absolute inset-y-0 right-0 flex items-center"
					style="opacity: {Math.min(1, -replyDragX / REPLY_DRAG_TRIGGER_PX)};"
					aria-hidden="true"
				>
					<span
						class="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground"
					>
						<Reply class="h-3.5 w-3.5" />
					</span>
				</div>
				<!-- Message Bubble (user bubbles open the action sheet on tap) -->
				<div
					data-message-bubble
					role={isUser ? 'button' : undefined}
					{...(isUser ? { tabindex: 0 } : {})}
					aria-label={isUser ? 'Open message actions' : undefined}
					style="transform: translateX({replyDragX}px); transition: {isDraggingReply
						? 'none'
						: 'transform 0.2s ease-out'};"
					onpointerdown={(event) => {
						handleReplyDragStart(event);
						handleBubblePointerDown(event);
					}}
					onpointermove={handleBubblePointerMove}
					onpointerup={cancelLongPress}
					onpointercancel={cancelLongPress}
					onclick={() => {
						// A swipe that just ended may still fire click: swallow it.
						if (replySwiped) {
							replySwiped = false;
							return;
						}
						// Left-click/tap opens the sheet on touch devices only, so
						// desktop users can select bubble text with the mouse.
						if (
							isUser &&
							!isEditing &&
							typeof window !== 'undefined' &&
							window.matchMedia('(hover: none)').matches
						) {
							openActionsSheet();
						}
					}}
					oncontextmenu={(event) => {
						// Desktop: right-click opens the sheet instead.
						if (!isEditing) {
							event.preventDefault();
							openActionsSheet();
						}
					}}
					onkeydown={(event) => {
						if (!isEditing && (event.key === 'Enter' || event.key === ' ')) {
							event.preventDefault();
							openActionsSheet();
						}
					}}
				class={`rounded-xl touch-pan-y transition-all duration-150 ${
					isUser
						? `overflow-hidden text-foreground/85 [@media(hover:none)]:cursor-pointer [@media(hover:none)]:active:scale-[0.99] [@media(hover:none)]:active:brightness-90 dark:[@media(hover:none)]:active:brightness-125 ${
								isHighlighted && !isFading ? 'bg-black/20 dark:bg-white/30' : 'bg-chat-bubble'
							} ${message.images?.length ? 'p-2' : 'px-4 py-1.5'}`
						: `w-fit max-w-full px-2 py-2 transition-colors duration-300 ${
								isHighlighted && !isFading ? 'bg-black/5 dark:bg-white/12' : 'bg-transparent'
							}`
				}`}
			>
				{#if message.cancelled}
					<!-- Cancelled card -->
					<div
						class="flex h-40 w-64 items-center justify-center rounded-xl border border-border bg-muted/30"
					>
						<div class="flex flex-col items-center gap-2">
							<Ban class="h-6 w-6 text-muted-foreground" />
							<span class="text-xs text-muted-foreground">Generation Cancelled!</span>
						</div>
					</div>
				{:else}
					<!-- Message Images -->
					{#if visibleImages.length}
						<div class={`${getImageGridClass(visibleImages.length)} ${isUser ? '' : 'max-w-sm'}`}>
						{#each visibleImages as img, i (i)}
							<button
									onclick={(event) => {
									event.stopPropagation();
									openLightbox(message.id, i);
								}}
									oncontextmenu={(event) => {
										event.preventDefault();
										event.stopPropagation();
										openActionsSheet();
									}}
									class="relative block cursor-pointer overflow-hidden {visibleImages.length === 1
										? 'rounded-lg'
										: 'first:rounded-tl-lg first:rounded-bl-lg last:rounded-tr-lg last:rounded-br-lg'}"
									tabindex={-1}
								>
									<img
										src={img}
										alt={isUser ? `Uploaded image ${i + 1}` : `Image ${i + 1}`}
										class="block w-full object-cover {visibleImages.length === 1
											? 'max-h-64 rounded-lg'
											: 'h-24'}"
									/>
								</button>
							{/each}
						</div>
						{#if hiddenImageCount > 0}
							<p class="{isUser ? 'px-3 pt-1 ' : ''}text-[11px] text-muted-foreground">
								+{hiddenImageCount} more image{hiddenImageCount > 1 ? 's' : ''}
							</p>
						{/if}
					{/if}

					<!-- Message Text -->
					{#if message.content}
						<p
							class={`text-sm leading-relaxed whitespace-pre-wrap ${
								isUser ? (message.images?.length ? 'px-3 py-1.5' : '') : 'text-foreground'
							}`}
						>
							{message.content}
						</p>
					{/if}
				{/if}
				</div>
			</div>
		{/if}

		<!-- Reply/Edit/Delete Container -->
		{#if !isEditing}
			<div class="flex items-center gap-1 transition-opacity md:opacity-0 md:group-hover/msg:opacity-100">
				<!-- Timestamp -->
				<span class="ml-2 text-[10px] text-muted-foreground">
					{formatTimestamp(message.timestamp)}
				</span>

				
				<!-- Generation Time (assistant messages with images only) -->
				{#if !isUser && message.generationTime}
					<span class="text-[10px] text-muted-foreground">
						| Took {formatGenerationTime(message.generationTime)}
					</span>
				{/if}
				<!-- Reply Button (hover-capable devices only; swipe-to-reply covers touch) -->
				<button
					onclick={() => chatStore.setReplyTo(message)}
					class="hidden cursor-pointer rounded p-1 text-muted-foreground hover:text-foreground [@media(hover:hover)]:block"
					aria-label="Reply"
					tabindex="-1"
				>
					<Reply class="h-3.5 w-3.5" />
				</button>

				<!-- Copy Button (text messages only) -->
				{#if message.content}
					<button
						onclick={copyMessage}
						class="cursor-pointer rounded p-1 text-muted-foreground hover:text-foreground"
						aria-label="Copy message"
						tabindex="-1"
					>
						<Copy class="h-3.5 w-3.5" />
					</button>
				{/if}

				<!-- Edit Button (user on hover-capable devices only, sheet otherwise) -->
				{#if isUser}
					<button
						onclick={startEdit}
						class="hidden cursor-pointer rounded p-1 text-muted-foreground hover:text-foreground [@media(hover:hover)]:block"
						aria-label="Edit"
						tabindex="-1"
					>
						<Pencil class="h-3.5 w-3.5" />
					</button>
				{/if}

				<!-- Delete Button (desktop only; mobile uses the action sheet) -->
				<button
					onclick={() => (showDeleteConfirm = true)}
					class="hidden cursor-pointer rounded p-1 text-muted-foreground hover:text-destructive [@media(hover:hover)]:block"
					aria-label="Delete"
					tabindex={-1}
				>
					<Trash2 class="h-3.5 w-3.5" />
				</button>

			</div>
		{/if}
	</div>
</div>

<ConfirmDialog
	bind:open={showDeleteConfirm}
	title="Delete Message"
	message="Are you sure you want to delete this message? This action cannot be undone."
	onconfirm={() => chatStore.deleteMessage(message.id)}
/>

<MessageActionsSheet
	bind:open={showActionsSheet}
	showEdit={isUser}
	showDownload={!!message.images?.length}
	seed={message.role === 'assistant' ? message.seed : undefined}
	onDownload={downloadMessageImage}
	width={message.role === 'assistant' ? message.width : undefined}
	height={message.role === 'assistant' ? message.height : undefined}
	onReply={() => chatStore.setReplyTo(message)}
	onEdit={startEdit}
	onDelete={() => (showDeleteConfirm = true)}
/>
