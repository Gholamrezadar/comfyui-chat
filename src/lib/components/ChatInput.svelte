<script lang="ts">
	import { chatStore } from '$lib/stores/chat.store.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { ImagePlus, LoaderCircle, ArrowUp, Box, Reply, X } from 'lucide-svelte';

	let inputValue = $state('');
	let textareaEl: HTMLTextAreaElement | undefined = $state();

	// Auto resize input
	function autoResize() {
		if (!textareaEl) return;

		textareaEl.style.height = 'auto';
		textareaEl.style.height = Math.min(textareaEl.scrollHeight, 180) + 'px';
	}

	// Send handler
	function handleSend() {
		const trimmed = inputValue.trim();
		if (!trimmed || chatStore.isResponding) return;

		chatStore.sendMessage(trimmed);
		inputValue = '';

		if (textareaEl) textareaEl.style.height = 'auto';
	}

	// Key handling
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	}

	function handleImageAttach() {
		console.log('attach');
	}
</script>

<!-- Reply context bar -->
{#if chatStore.replyToMessage}
	<div class="mb-2 flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs">
		<Reply class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
		<div class="flex-1 min-w-0">
			<span class="font-medium text-foreground">Replying to {chatStore.replyToMessage.role === 'user' ? 'yourself' : 'assistant'}</span>
			<p class="truncate text-muted-foreground">{chatStore.replyToMessage.content}</p>
		</div>
		<button
			onclick={() => chatStore.cancelReply()}
			class="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
		>
			<X class="h-3.5 w-3.5" />
		</button>
	</div>
{/if}

<!-- Composer -->
<div
	class="flex w-full items-end gap-2 rounded-2xl border border-border bg-card px-3 py-2 shadow-sm focus-within:ring-1 focus-within:ring-ring"
>
	<!-- Left: attach -->
	<Button
		variant="ghost"
		size="icon"
		onclick={handleImageAttach}
		class="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
	>
		<ImagePlus class="h-4 w-4" />
	</Button>

	<!-- Center: textarea -->
	<div class="flex flex-1 items-center">
		<Textarea
			ref={textareaEl}
			bind:value={inputValue}
			oninput={autoResize}
			onkeydown={handleKeydown}
			placeholder="Type a message..."
			rows={1}
			disabled={chatStore.isResponding}
			class="min-h-8 max-h-44 w-full resize-none border-0 bg-transparent px-2 py-1 text-sm shadow-none focus-visible:ring-0"
		/>
	</div>

	<!-- Right cluster -->
	<div class="flex items-center gap-2">
		<!-- Model selector (static placeholder like image) -->
		<button
			class="flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
		>
			<Box class="h-3.5 w-3.5" />
			Qwen 3.5 9B
		</button>

		<!-- Send -->
		<Button
			size="icon"
			onclick={handleSend}
			disabled={!inputValue.trim() || chatStore.isResponding}
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

<!-- Hint -->
<p class="mt-1.5 text-center text-[10px] text-muted-foreground">
	Enter to send · Shift+Enter for newline
</p>