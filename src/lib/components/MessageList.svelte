<script lang="ts">
	import { chatStore } from '$lib/stores/chat.store.svelte';
	import type { Message } from '$lib/services/chat.service';
	import { Bot, Reply, Pencil, Trash2, X, Check } from 'lucide-svelte';
	import { tick } from 'svelte';

	let scrollEl: HTMLDivElement | undefined = $state();
	let editContent = $state('');
	let EditTextareaEl: HTMLTextAreaElement | undefined = $state();
	let lightboxImage = $state<string | null>(null);

	$effect(() => {
		const _ = chatStore.activeConversation?.messages.length;
		tick().then(() => {
			if (scrollEl) {
				scrollEl.scrollTop = scrollEl.scrollHeight;
			}
		});
	});

	function formatTimestamp(ts: number): string {
		return new Date(ts).toLocaleTimeString(undefined, {
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function startEdit(message: Message) {
		editContent = message.content;
		chatStore.setEditing(message);
		tick().then(() => {
			if (EditTextareaEl) {
				EditTextareaEl.focus();
				EditTextareaEl.style.height = 'auto';
				EditTextareaEl.style.height = EditTextareaEl.scrollHeight + 'px';
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
		if (!trimmed || !chatStore.editingMessage) return;
		chatStore.editMessage(chatStore.editingMessage.id, trimmed);
		editContent = '';
	}

	function cancelEdit() {
		editContent = '';
		chatStore.cancelEdit();
	}

	function handleEditInput() {
		if (!EditTextareaEl) return;
		EditTextareaEl.style.height = 'auto';
		EditTextareaEl.style.height = Math.min(EditTextareaEl.scrollHeight, 180) + 'px';
	}

	function findMessageById(id: string): Message | undefined {
		return chatStore.activeConversation?.messages.find((m) => m.id === id);
	}

	function scrollToMessage(id: string) {
		const el = scrollEl?.querySelector(`[data-message-id="${id}"]`);
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'center' });
			el.classList.add('ring-2', 'ring-primary/50', 'rounded-xl');
			setTimeout(() => {
				el.classList.remove('ring-2', 'ring-primary/50', 'rounded-xl');
			}, 1500);
		}
	}

	function getImageGridClass(count: number): string {
		if (count === 1) return '';
		if (count === 2) return 'grid grid-cols-2 gap-1';
		return 'grid grid-cols-2 gap-1';
	}

	function openLightbox(src: string) {
		lightboxImage = src;
	}

	function closeLightbox() {
		lightboxImage = null;
	}
</script>

<!-- Lightbox -->
{#if lightboxImage}
	<button
		class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm cursor-pointer"
		onclick={closeLightbox}
		onkeydown={(e) => e.key === 'Escape' && closeLightbox()}
	>
		<img
			src={lightboxImage}
			alt="Full size"
			class="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
		/>
	</button>
{/if}

<div bind:this={scrollEl} class="flex-1 overflow-y-auto px-4 py-6">
	<div class="mx-auto flex max-w-2xl flex-col gap-6">
		{#each chatStore.activeConversation?.messages ?? [] as message (message.id)}
			{#if message.role === 'user'}
				<!-- User message: bubble aligned right -->
				<div class="group/msg flex items-end justify-end" data-message-id={message.id}>
					<!-- Bubble -->
					<div class="flex flex-col items-end gap-1">
						<!-- Reply indicator -->
						{#if message.replyToId}
							{@const repliedMsg = findMessageById(message.replyToId)}
							<button
								onclick={() => scrollToMessage(message.replyToId!)}
								class="flex items-center gap-1.5 rounded-t-lg border border-b-0 border-border bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground max-w-[280px] cursor-pointer hover:bg-muted transition-colors overflow-hidden"
							>
								<Reply class="h-3 w-3 shrink-0" />
								{#if repliedMsg?.images?.length}
									<img src={repliedMsg.images[0]} alt="" class="h-5 w-5 shrink-0 rounded object-cover" />
								{/if}
								{#if repliedMsg?.content}
									<span class="truncate">{repliedMsg.content}</span>
								{/if}
							</button>
						{/if}

						{#if chatStore.editingMessage?.id === message.id}
							<!-- Inline edit mode -->
							<div class="rounded-xl border border-ring bg-chat-bubble px-3 py-2">
								<textarea
									bind:this={EditTextareaEl}
									bind:value={editContent}
									oninput={handleEditInput}
									onkeydown={handleEditKeydown}
									rows={1}
									class="w-full resize-none bg-transparent text-sm leading-relaxed text-foreground/85 focus:outline-none"
								></textarea>
								<div class="mt-1.5 flex items-center justify-end gap-1">
									<button
										onclick={cancelEdit}
										class="rounded p-1 text-muted-foreground hover:text-foreground cursor-pointer"
									>
										<X class="h-3.5 w-3.5" />
									</button>
									<button
										onclick={confirmEdit}
										class="rounded p-1 text-muted-foreground hover:text-primary cursor-pointer"
									>
										<Check class="h-3.5 w-3.5" />
									</button>
								</div>
							</div>
						{:else}
							<!-- Content bubble -->
							<div class="overflow-hidden rounded-xl bg-chat-bubble text-foreground/85 {message.images?.length ? 'p-1' : 'px-4 py-1.5'}">
								<!-- Images -->
								{#if message.images && message.images.length > 0}
									<div class="{getImageGridClass(message.images.length)}">
										{#each message.images.slice(0, 4) as img, i}
											<button
												onclick={() => openLightbox(img)}
												class="relative overflow-hidden cursor-pointer {message.images.length === 1 ? 'rounded-lg' : 'first:rounded-tl-lg first:rounded-bl-lg last:rounded-tr-lg last:rounded-br-lg'}"
											>
												<img
													src={img}
													alt="Uploaded image {i + 1}"
													class="w-full object-cover {message.images.length === 1 ? 'max-h-64 rounded-lg' : 'h-24'}"
												/>
											</button>
										{/each}
									</div>
									{#if message.images.length > 4}
										<p class="px-3 pt-1 text-[11px] text-muted-foreground">+{message.images.length - 4} more image{message.images.length - 4 > 1 ? 's' : ''}</p>
									{/if}
								{/if}
								<!-- Text caption -->
								{#if message.content}
									<p class="whitespace-pre-wrap text-sm leading-relaxed {message.images?.length ? 'px-3 py-1.5' : ''}">{message.content}</p>
								{/if}
							</div>
						{/if}

						<!-- Hover action buttons -->
						{#if chatStore.editingMessage?.id !== message.id}
							<div class="flex items-center gap-1 opacity-0 transition-opacity group-hover/msg:opacity-100">
								<span class="text-[10px] text-muted-foreground">
									{formatTimestamp(message.timestamp)}
								</span>
								<button
									onclick={() => chatStore.setReplyTo(message)}
									class="rounded p-1 text-muted-foreground hover:text-foreground cursor-pointer"
									aria-label="Reply"
								>
									<Reply class="h-3.5 w-3.5" />
								</button>
								<button
									onclick={() => startEdit(message)}
									class="rounded p-1 text-muted-foreground hover:text-foreground cursor-pointer"
									aria-label="Edit"
								>
									<Pencil class="h-3.5 w-3.5" />
								</button>
								<button
									onclick={() => chatStore.deleteMessage(message.id)}
									class="rounded p-1 text-muted-foreground hover:text-destructive cursor-pointer"
									aria-label="Delete"
								>
									<Trash2 class="h-3.5 w-3.5" />
								</button>
							</div>
						{/if}
					</div>
				</div>
			{:else}
				<!-- Assistant message -->
				<div class="group/msg flex items-start gap-3" data-message-id={message.id}>
					<div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary mt-0.5 hidden">
						<Bot class="h-4 w-4 text-primary-foreground" />
					</div>
					<div class="flex flex-col gap-1 min-w-0">
						<!-- Reply indicator -->
						{#if message.replyToId}
							{@const repliedMsg = findMessageById(message.replyToId)}
							<button
								onclick={() => scrollToMessage(message.replyToId!)}
								class="flex items-center gap-1.5 rounded-t-lg border border-b-0 border-border bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground max-w-[280px] cursor-pointer hover:bg-muted transition-colors overflow-hidden"
							>
								<Reply class="h-3 w-3 shrink-0" />
								{#if repliedMsg?.images?.length}
									<img src={repliedMsg.images[0]} alt="" class="h-5 w-5 shrink-0 rounded object-cover" />
								{/if}
								{#if repliedMsg?.content}
									<span class="truncate">{repliedMsg.content}</span>
								{/if}
							</button>
						{/if}

					<!-- Images -->
					{#if message.images && message.images.length > 0}
						<div class="{getImageGridClass(message.images.length)} max-w-sm">
							{#each message.images.slice(0, 4) as img, i}
								<button
									onclick={() => openLightbox(img)}
									class="relative overflow-hidden cursor-pointer {message.images.length === 1 ? 'rounded-lg' : 'first:rounded-tl-lg first:rounded-bl-lg last:rounded-tr-lg last:rounded-br-lg'}"
								>
									<img
										src={img}
										alt="Image {i + 1}"
										class="w-full object-cover {message.images.length === 1 ? 'max-h-64 rounded-lg' : 'h-24'}"
									/>
								</button>
							{/each}
						</div>
						{#if message.images.length > 4}
							<p class="text-[11px] text-muted-foreground">+{message.images.length - 4} more image{message.images.length - 4 > 1 ? 's' : ''}</p>
						{/if}
					{/if}

						<!-- Text -->
						{#if message.content}
							<p class="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{message.content}</p>
						{/if}
						<!-- Hover action buttons -->
						<div class="flex items-center gap-1 opacity-0 transition-opacity group-hover/msg:opacity-100">
							<span class="text-[10px] text-muted-foreground">
								{formatTimestamp(message.timestamp)}
							</span>
							<button
								onclick={() => chatStore.setReplyTo(message)}
								class="rounded p-1 text-muted-foreground hover:text-foreground cursor-pointer"
								aria-label="Reply"
							>
								<Reply class="h-3.5 w-3.5" />
							</button>
							<button
								onclick={() => chatStore.deleteMessage(message.id)}
								class="rounded p-1 text-muted-foreground hover:text-destructive cursor-pointer"
								aria-label="Delete"
							>
								<Trash2 class="h-3.5 w-3.5" />
							</button>
						</div>
					</div>
				</div>
			{/if}
		{/each}

		<!-- Typing indicator -->
		{#if chatStore.isResponding}
			<div class="flex items-start gap-3">
				<div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary">
					<Bot class="h-4 w-4 text-primary-foreground" />
				</div>
				<div class="flex items-center gap-1 pt-2">
					<span class="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]"></span>
					<span class="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]"></span>
					<span class="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]"></span>
				</div>
			</div>
		{/if}
	</div>
</div>
