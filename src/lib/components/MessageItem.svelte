<script lang="ts">
	import { chatStore } from '$lib/stores/chat.store.svelte';
	import type { Message } from '$lib/services/chat.service';
	import { Reply, Pencil, Trash2, X, Check } from 'lucide-svelte';
	import { tick } from 'svelte';

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
		openLightbox: (src: string) => void;
	} = $props();

	let editContent = $state('');
	let editTextareaEl: HTMLTextAreaElement | undefined = $state();

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

	function getImageGridClass(count: number): string {
		return count === 1 ? 'flex' : 'grid grid-cols-2 gap-1';
	}

	function startEdit() {
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
	}

	function cancelEdit() {
		editContent = '';
		chatStore.cancelEdit();
	}

	function handleEditInput() {
		if (!editTextareaEl) return;
		editTextareaEl.style.height = 'auto';
		editTextareaEl.style.height = Math.min(editTextareaEl.scrollHeight, 180) + 'px';
	}
</script>

<!-- Message Row -->
<div
	class={isUser ? 'group/msg flex items-end justify-end' : 'group/msg flex items-start gap-3'}
	data-message-id={message.id}
>
	<!-- Message Stack -->
	<div
		class={isUser
			? 'flex flex-col items-end gap-2'
			: 'flex flex-col gap-1 min-w-0'}
	>
		<!-- Reply Preview -->
		{#if message.replyToId}
			<button
				onclick={() => scrollToMessage(message.replyToId!)}
				class={`flex w-fit max-w-[280px] items-center gap-1.5 rounded-none border-0 bg-transparent px-0 py-0 text-[11px] text-muted-foreground cursor-pointer transition-colors hover:text-foreground ${
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
						{#each replyImages as img (img)}
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
			<div class="rounded-xl border border-ring bg-chat-bubble px-3 py-2">
				<textarea
					bind:this={editTextareaEl}
					bind:value={editContent}
					oninput={handleEditInput}
					onkeydown={handleEditKeydown}
					rows={1}
					class="w-full resize-none bg-transparent text-sm leading-relaxed text-foreground/85 focus:outline-none"
					tabindex={0}
				></textarea>
				<!-- Edit Controls -->
				<div class="mt-1.5 flex items-center justify-end gap-1">
					<button
						onclick={cancelEdit}
						class="rounded p-1 text-muted-foreground hover:text-foreground cursor-pointer"
						tabindex={0}
					>
						<X class="h-3.5 w-3.5" />
					</button>
					<button
						onclick={confirmEdit}
						class="rounded p-1 text-muted-foreground hover:text-primary cursor-pointer"
						tabindex={0}
					>
						<Check class="h-3.5 w-3.5" />
					</button>
				</div>
			</div>
		{:else}
			<!-- Message Bubble -->
			<div
				class={`rounded-xl transition-colors duration-300 ${
					isUser
						? `overflow-hidden text-foreground/85 ${
								isHighlighted && !isFading ? 'bg-black/20 dark:bg-white/30' : 'bg-chat-bubble'
							} ${message.images?.length ? 'p-2' : 'px-4 py-1.5'}`
						: `w-fit max-w-full px-2 py-2 ${
								isHighlighted && !isFading ? 'bg-black/5 dark:bg-white/12' : 'bg-transparent'
							}`
				}`}
			>
				<!-- Message Images -->
				{#if visibleImages.length}
					<div class={`${getImageGridClass(visibleImages.length)} ${isUser ? '' : 'max-w-sm'}`}>
						{#each visibleImages as img, i}
							<button
								onclick={() => openLightbox(img)}
								class="relative block overflow-hidden cursor-pointer {visibleImages.length === 1 ? 'rounded-lg' : 'first:rounded-tl-lg first:rounded-bl-lg last:rounded-tr-lg last:rounded-br-lg'}"
								tabindex={-1}
							>
								<img
									src={img}
									alt={isUser ? `Uploaded image ${i + 1}` : `Image ${i + 1}`}
									class="block w-full object-cover {visibleImages.length === 1 ? 'max-h-64 rounded-lg' : 'h-24'}"
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
						class={`whitespace-pre-wrap text-sm leading-relaxed ${
							isUser
								? message.images?.length ? 'px-3 py-1.5' : ''
								: 'text-foreground'
						}`}
					>
						{message.content}
					</p>
				{/if}
			</div>
		{/if}

		<!-- Reply/Edit/Delete Container -->
		{#if !isEditing}
			<div class="flex items-center gap-1 opacity-0 transition-opacity group-hover/msg:opacity-100">
				<!-- Timestamp -->
				<span class="text-[10px] ml-2 text-muted-foreground">
					{formatTimestamp(message.timestamp)}
				</span>

				<!-- Reply Button -->
				<button
					onclick={() => chatStore.setReplyTo(message)}
					class="rounded p-1 text-muted-foreground hover:text-foreground cursor-pointer"
					aria-label="Reply"
					tabindex="-1"
				>
					<Reply class="h-3.5 w-3.5" />
				</button>

				<!-- Edit Button -->
				{#if isUser}
					<button
						onclick={startEdit}
						class="rounded p-1 text-muted-foreground hover:text-foreground cursor-pointer"
						aria-label="Edit"
						tabindex="-1"
					>
						<Pencil class="h-3.5 w-3.5" />
					</button>
				{/if}

				<!-- Delete Button -->
				<button
					onclick={() => chatStore.deleteMessage(message.id)}
					class="rounded p-1 text-muted-foreground hover:text-destructive cursor-pointer"
					aria-label="Delete"
					tabindex="-1"
				>
					<Trash2 class="h-3.5 w-3.5" />
				</button>
			</div>
		{/if}
	</div>
</div>
