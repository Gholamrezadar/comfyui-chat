<script lang="ts">
	import { chatStore } from '$lib/stores/chat.store.svelte';
	import { comfyStore } from '$lib/stores/comfy-store.svelte';
	import MessageList from './MessageList.svelte';
	import ChatInput from './ChatInput.svelte';
	import GeneratingMessage from './GeneratingMessage.svelte';
	import { Bot } from 'lucide-svelte';

	// Whether we have an active conversation with messages
	const hasMessages = $derived((chatStore.activeConversation?.messages.length ?? 0) > 0);
</script>

<!-- Chat View Layout -->
<div class="flex h-full flex-col">
	{#if !chatStore.activeConversation || !hasMessages}
		<!-- Welcome Empty State -->
		<div class="flex flex-1 flex-col items-center justify-center gap-8 px-4">
			<!-- Welcome Hero -->
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

			<!-- Centered Chat Input -->
			<div class="w-full max-w-xl">
				<ChatInput />
			</div>
		</div>
	{:else}
		<!-- Active Conversation Header -->
		<div class="flex items-center px-6 py-3 border-b border-border">
			<h2 class="truncate text-sm font-medium text-foreground">
				{chatStore.activeConversation.title}
			</h2>
		</div>

		<!-- Message List -->
		<MessageList />

		<!-- Generating Message (live preview + progress) -->
		{#if comfyStore.isGenerating}
			<div class="px-4 py-2">
				<div class="mx-auto max-w-2xl">
					<GeneratingMessage />
				</div>
			</div>
		{/if}

		<!-- Bottom Chat Input -->
		<div class="bg-background px-4 py-3">
			<div class="mx-auto max-w-2xl">
				<ChatInput />
			</div>
		</div>
	{/if}
</div>
