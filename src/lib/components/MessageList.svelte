<script lang="ts">
	import { chatStore } from '$lib/stores/chat.store.svelte';
	import { comfyStore } from '$lib/stores/comfy-store.svelte';
	import MessageItem from '$lib/components/MessageItem.svelte';
	import GeneratingMessage from '$lib/components/GeneratingMessage.svelte';
	import { tick } from 'svelte';
	import type { Message } from '$lib/services/chat.service';
	import { ChevronLeft, ChevronRight } from 'lucide-svelte';

	type LightboxItem = {
		src: string;
		caption: string;
	};

	const CAPTION_MAX_LENGTH = 120;

	let scrollEl: HTMLDivElement | undefined = $state();
	let lightboxItem = $state<LightboxItem | null>(null);
	let lightboxIndex = $state(-1);
	let highlightedMessageId = $state<string | null>(null);
	let highlightFadeMessageId = $state<string | null>(null);
	let highlightTimer: ReturnType<typeof setTimeout> | undefined;

	const REPLY_HIGHLIGHT_HOLD_MS = 1000;
	const REPLY_HIGHLIGHT_FADE_MS = 1500;

	$effect(() => {
		const _ = chatStore.activeConversation?.messages.length;
		const _gen = comfyStore.isGenerating;
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

	function shortenCaption(text: string): string {
		const trimmed = text.trim();
		return trimmed.length > CAPTION_MAX_LENGTH
			? `${trimmed.slice(0, CAPTION_MAX_LENGTH).trimEnd()}...`
			: trimmed;
	}

	function getImageCaption(message: Message): string {
		const repliedMessage = message.replyToId
			? chatStore.activeConversation?.messages.find((m) => m.id === message.replyToId)
			: undefined;
		const text = message.replyToId
			? (message.replyToContent || repliedMessage?.content)
			: message.content;
		return shortenCaption(text ?? '');
	}

	function getConversationImages(): LightboxItem[] {
		return (chatStore.activeConversation?.messages ?? []).flatMap((message) =>
			(message.images ?? []).map((src) => ({ src, caption: getImageCaption(message) }))
		);
	}

	function openLightbox(src: string, caption: string) {
		const images = getConversationImages();
		const index = images.findIndex((image) => image.src === src && image.caption === caption);
		lightboxIndex = index >= 0 ? index : 0;
		lightboxItem = images[lightboxIndex] ?? { src, caption };
	}

	function closeLightbox() {
		lightboxItem = null;
		lightboxIndex = -1;
	}

	function navigateLightbox(direction: -1 | 1) {
		const images = getConversationImages();
		if (!images.length) return closeLightbox();
		const currentIndex = Math.max(0, lightboxIndex);
		lightboxIndex = (currentIndex + direction + images.length) % images.length;
		lightboxItem = images[lightboxIndex];
	}

	function handleLightboxKeydown(event: KeyboardEvent) {
		if (!lightboxItem) return;
		if (event.key === 'Escape') {
			event.preventDefault();
			closeLightbox();
		} else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
			event.preventDefault();
			navigateLightbox(-1);
		} else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
			event.preventDefault();
			navigateLightbox(1);
		}
	}
</script>

<svelte:window onkeydown={handleLightboxKeydown} />

<!-- Image Lightbox -->
{#if lightboxItem}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm cursor-pointer"
		onclick={(event) => event.target === event.currentTarget && closeLightbox()}
		onkeydown={(event) => event.key === 'Escape' && closeLightbox()}
		role="dialog"
		tabindex="0"
		aria-label="Close image preview"
	>
		<div class="relative max-w-[90vw]">
			<img
				src={lightboxItem.src}
				alt="Full size"
				class="max-h-[82vh] max-w-[90vw] rounded-lg object-contain"
			/>
			{#if lightboxItem.caption}
				<p
					class="pointer-events-none absolute top-full left-1/2 mt-3 w-max max-w-[min(90vw,36rem)] -translate-x-1/2 text-center text-sm text-foreground/85"
				>
					{lightboxItem.caption}
				</p>
			{/if}
		</div>
		<button
			type="button"
			class="absolute left-3 top-1/2 cursor-pointer rounded-full p-1 text-foreground/70 transition-colors hover:bg-foreground/10 hover:text-foreground"
			onclick={(event) => {
				event.stopPropagation();
				navigateLightbox(-1);
			}}
			aria-label="Previous image"
		>
			<ChevronLeft class="h-4 w-4" />
		</button>
		<button
			type="button"
			class="absolute right-3 top-1/2 cursor-pointer rounded-full p-1 text-foreground/70 transition-colors hover:bg-foreground/10 hover:text-foreground"
			onclick={(event) => {
				event.stopPropagation();
				navigateLightbox(1);
			}}
			aria-label="Next image"
		>
			<ChevronRight class="h-4 w-4" />
		</button>
	</div>
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

		<!-- Generating Message (live preview) or Typing Indicator -->
		{#if comfyStore.isGenerating}
			<GeneratingMessage />
		{:else if chatStore.isResponding}
			<div class="flex items-start gap-3">
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
