<script lang="ts">
	import { chatStore } from '$lib/stores/chat.store.svelte';
	import MessageItem from '$lib/components/MessageItem.svelte';
	import { Bot } from 'lucide-svelte';
	import { tick } from 'svelte';

	let scrollEl: HTMLDivElement | undefined = $state();
	let lightboxImage = $state<string | null>(null);
	let highlightedMessageId = $state<string | null>(null);
	let highlightFadeMessageId = $state<string | null>(null);
	let highlightTimer: ReturnType<typeof setTimeout> | undefined;

	const REPLY_HIGHLIGHT_HOLD_MS = 1000;
	const REPLY_HIGHLIGHT_FADE_MS = 1500;

	$effect(() => {
		const _ = chatStore.activeConversation?.messages.length;
		tick().then(() => {
			if (scrollEl) {
				scrollEl.scrollTop = scrollEl.scrollHeight;
			}
		});
	});

	function scrollToMessage(id: string) {
		const el = scrollEl?.querySelector(`[data-message-id="${id}"]`);
		if (el) {
			const container = scrollEl;
			const containerRect = container.getBoundingClientRect();
			const targetRect = el.getBoundingClientRect();
			const targetTop =
				targetRect.top - containerRect.top + container.scrollTop - container.clientHeight / 2 +
				targetRect.height / 2;
			container.scrollTo({
				top: Math.max(0, targetTop),
				behavior: 'smooth'
			});

			if (highlightTimer) clearTimeout(highlightTimer);
			highlightedMessageId = id;
			highlightFadeMessageId = null;
			highlightTimer = setTimeout(() => {
				highlightFadeMessageId = id;
				setTimeout(() => {
					if (highlightedMessageId === id) highlightedMessageId = null;
					if (highlightFadeMessageId === id) highlightFadeMessageId = null;
				}, REPLY_HIGHLIGHT_FADE_MS);
			}, REPLY_HIGHLIGHT_HOLD_MS);
		}
	}

	function openLightbox(src: string) {
		lightboxImage = src;
	}

	function closeLightbox() {
		lightboxImage = null;
	}
</script>

<!-- Image Lightbox -->
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

<!-- Message Scroll Container -->
<div bind:this={scrollEl} class="flex-1 overflow-y-auto px-4 py-6">
	<!-- Message List Container -->
	<div class="mx-auto flex max-w-2xl flex-col gap-6">
		<!-- Message Items -->
		{#each chatStore.activeConversation?.messages ?? [] as message (message.id)}
			<MessageItem
				{message}
				isHighlighted={highlightedMessageId === message.id}
				isFading={highlightFadeMessageId === message.id}
				{scrollToMessage}
				{openLightbox}
			/>
		{/each}

		<!-- Typing Indicator -->
		{#if chatStore.isResponding}
			<div class="flex items-start gap-3">
				<!-- Assistant Avatar -->
				<div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary">
					<Bot class="h-4 w-4 text-primary-foreground" />
				</div>
				<!-- Typing Dots -->
				<div class="flex items-center gap-1 pt-2">
					<span class="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]"></span>
					<span class="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]"></span>
					<span class="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]"></span>
				</div>
			</div>
		{/if}
	</div>
</div>
