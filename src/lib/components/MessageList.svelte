<script lang="ts">
	import { chatStore } from '$lib/stores/chat.store.svelte';
	import { comfyStore } from '$lib/stores/comfy-store.svelte';
	import MessageItem from '$lib/components/MessageItem.svelte';
	import GeneratingMessage from '$lib/components/GeneratingMessage.svelte';
	import LightboxGallery from '$lib/components/LightboxGallery.svelte';
	import type { LightboxItem } from '$lib/components/LightboxGallery.svelte';
	import { tick } from 'svelte';
	import type { Message } from '$lib/services/chat.service';

	const CAPTION_MAX_LENGTH = 120;

	let scrollEl: HTMLDivElement | undefined = $state();
	let lightboxIndex = $state(-1);
	let lightboxImages = $state<LightboxItem[]>([]);
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
			(message.images ?? []).map((src) => ({ src, caption: getImageCaption(message), seed: message.seed, id: message.id }))
		);
	}

	function openLightbox(messageId: string, imageIndex: number) {
		// Resolve positionally: duplicate (src, caption) pairs exist (same image
		// re-sent, identical captions), and findIndex would always land on the first.
		const messages = chatStore.activeConversation?.messages ?? [];
		lightboxImages = getConversationImages();
		let global = 0;
		let found = -1;
		for (const m of messages) {
			const count = m.images?.length ?? 0;
			if (m.id === messageId) {
				if (imageIndex < count) found = global + imageIndex;
				break;
			}
			global += count;
		}
		lightboxIndex = found >= 0 ? found : 0;
	}

	function closeLightbox() {
		lightboxIndex = -1;
		lightboxImages = [];
	}
</script>

<!-- Image Lightbox Gallery -->
{#if lightboxImages.length > 0 && lightboxIndex >= 0}
	<LightboxGallery images={lightboxImages} bind:index={lightboxIndex} onClose={closeLightbox} />
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
