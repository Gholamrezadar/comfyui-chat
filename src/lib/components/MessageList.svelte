<script lang="ts">
	import { chatStore } from '$lib/stores/chat.store.svelte';
	import type { Message } from '$lib/services/chat.service';
	import { Bot, User } from 'lucide-svelte';
	import { tick } from 'svelte';

	let scrollEl: HTMLDivElement | undefined = $state();

	// Auto-scroll to bottom when messages change
	$effect(() => {
		// Touch the reactive dependency
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
</script>

<div bind:this={scrollEl} class="flex-1 overflow-y-auto px-4 py-6">
	<div class="mx-auto flex max-w-2xl flex-col gap-6">
		{#each chatStore.activeConversation?.messages ?? [] as message (message.id)}
			{#if message.role === 'user'}
				<!-- User message: bubble aligned right -->
				<div class="flex items-end justify-end gap-2">
					<!-- Bubble -->
					<div class="flex flex-col items-end gap-1">
						<!-- Content -->
						<div class="rounded-xl bg-chat-bubble px-4 py-1.5 text-foreground/85">
							<p class="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
						</div>
						<!-- Timestamp -->
						<span class="text-[10px] text-muted-foreground">{formatTimestamp(message.timestamp)}</span>
					</div>
					<!-- User Profile -->
					<div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-zinc-900 to-zinc-950 text-xs font-bold text-white">
						U
					</div>
				</div>
			{:else}
				<!-- Assistant message: no bubble, plain text -->
				<div class="flex items-start gap-3">
					<div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary mt-0.5 hidden">
						<Bot class="h-4 w-4 text-primary-foreground" />
					</div>
					<div class="flex flex-col gap-1 min-w-0">
						<p class="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{message.content}</p>
						<span class="text-[10px] text-muted-foreground">{formatTimestamp(message.timestamp)}</span>
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
