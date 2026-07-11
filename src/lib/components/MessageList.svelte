<script lang="ts">
	import { chatStore } from '$lib/stores/chat.store.svelte';
	import type { Message } from '$lib/services/chat.service';
	import { Bot, Reply, Pencil, Trash2, X, Check } from 'lucide-svelte';
	import { tick } from 'svelte';

	let scrollEl: HTMLDivElement | undefined = $state();
	let editContent = $state('');
	let EditTextareaEl: HTMLTextAreaElement | undefined = $state();

	// Auto-scroll to bottom when messages change
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
</script>

<div bind:this={scrollEl} class="flex-1 overflow-y-auto px-4 py-6">
	<div class="mx-auto flex max-w-2xl flex-col gap-6">
		{#each chatStore.activeConversation?.messages ?? [] as message (message.id)}
			{#if message.role === 'user'}
				<!-- User message: bubble aligned right -->
				<div class="group/msg flex items-end justify-end gap-2" data-message-id={message.id}>
					<!-- Bubble -->
					<div class="flex flex-col items-end gap-1">
						<!-- Reply indicator -->
						{#if message.replyToId}
							{@const repliedMsg = findMessageById(message.replyToId)}
							<button
								onclick={() => scrollToMessage(message.replyToId!)}
								class="flex items-center gap-1.5 rounded-t-lg border border-b-0 border-border bg-muted/50 px-2.5 py-1 text-[11px] text-muted-foreground max-w-[280px] cursor-pointer hover:bg-muted transition-colors"
							>
								<Reply class="h-3 w-3 shrink-0" />
								<span class="truncate">{repliedMsg ? repliedMsg.content : 'Original message'}</span>
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
							<!-- Normal content -->
							<div class="rounded-xl bg-chat-bubble px-4 py-1.5 text-foreground/85">
								<p class="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
							</div>
						{/if}

						<!-- Timestamp -->
						<span class="text-[10px] text-muted-foreground">{formatTimestamp(message.timestamp)}</span>

						<!-- Hover action buttons -->
						{#if chatStore.editingMessage?.id !== message.id}
							<div class="flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity">
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
					<!-- User Profile -->
					<div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-zinc-900 to-zinc-950 text-xs font-bold text-white">
						U
					</div>
				</div>
			{:else}
				<!-- Assistant message: no bubble, plain text -->
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
								class="flex items-center gap-1.5 rounded-t-lg border border-b-0 border-border bg-muted/50 px-2.5 py-1 text-[11px] text-muted-foreground max-w-[280px] cursor-pointer hover:bg-muted transition-colors"
							>
								<Reply class="h-3 w-3 shrink-0" />
								<span class="truncate">{repliedMsg ? repliedMsg.content : 'Original message'}</span>
							</button>
						{/if}

						<p class="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{message.content}</p>
						<span class="text-[10px] text-muted-foreground">{formatTimestamp(message.timestamp)}</span>

						<!-- Hover action buttons -->
						<div class="flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity">
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

		<!-- Typing indicator while waiting for response -->
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
