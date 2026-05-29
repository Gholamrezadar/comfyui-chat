<script lang="ts">
	import { chatStore } from '$lib/stores/chat.store.svelte';
	import MessageList from './MessageList.svelte';
	import ChatInput from './ChatInput.svelte';
	import { Bot } from 'lucide-svelte';

	// Whether we have an active conversation with messages
	const hasMessages = $derived((chatStore.activeConversation?.messages.length ?? 0) > 0);
</script>

<div class="flex h-full flex-col">
	{#if !chatStore.activeConversation || !hasMessages}
		<!-- Welcome / empty state - chatbox centered -->
		<div class="flex flex-1 flex-col items-center justify-center gap-8 px-4">
			<!-- Hero -->
			<div class="flex flex-col items-center gap-3 text-center">
				<div
					class="flex hidden h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg"
				>
					<Bot class="h-8 w-8 text-primary-foreground" />
				</div>
				<div>
					<h1 class="text-2xl font-bold tracking-tight">ComfyUI Chat</h1>
					<p class="mt-1 text-sm text-muted-foreground">
						Enter a prompt or Upload an image to start
					</p>
				</div>
			</div>

			<!-- Input in center -->
			<div class="w-full max-w-xl">
				<ChatInput />
			</div>
		</div>
	{:else}
		<!-- Active conversation -->
		<!-- Header with conversation title -->
		<div class="flex items-center px-6 py-3">
			<h2 class="truncate text-sm font-medium text-foreground">
				{chatStore.activeConversation.title}
			</h2>
		</div>

		<!-- Messages -->
		<MessageList />

		<!-- Input pinned to bottom -->
		<div class="bg-background px-4 py-3">
			<div class="mx-auto max-w-2xl">
				<ChatInput />
			</div>
		</div>
	{/if}
</div>
