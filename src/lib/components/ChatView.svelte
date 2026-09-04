<script lang="ts">
	import { chatStore } from '$lib/stores/chat.store.svelte';
	import MessageList from './MessageList.svelte';
	import ChatInput from './ChatInput.svelte';
	import RenameDialog from './RenameDialog.svelte';
	import { Bot, Pencil, PanelLeft } from 'lucide-svelte';

	let { sidebarCollapsed = $bindable(false) }: { sidebarCollapsed: boolean } = $props();

	// Whether we have an active conversation with messages
	const hasMessages = $derived((chatStore.activeConversation?.messages.length ?? 0) > 0);

	let showRename = $state(false);
	let swipeStartX = 0;
	let swipeStartY = 0;
	let swiping = false;

	function handleTouchStart(event: TouchEvent) {
		if (window.matchMedia('(min-width: 768px)').matches) return;
		const target = event.target as HTMLElement;
		if (target.closest('[data-message-bubble], img, button, input, textarea, select')) return;
		const touch = event.touches[0];
		swipeStartX = touch.clientX;
		swipeStartY = touch.clientY;
		swiping = true;
	}

	function handleTouchEnd(event: TouchEvent) {
		if (!swiping) return;
		swiping = false;
		const touch = event.changedTouches[0];
		const deltaX = touch.clientX - swipeStartX;
		if (Math.abs(deltaX) > 72 && Math.abs(touch.clientY - swipeStartY) < 60) {
			sidebarCollapsed = deltaX < 0 ? true : false;
			chatStore.saveSidebarState(deltaX < 0);
		}
	}
</script>

<!-- Chat View Layout -->
<div class="relative flex h-full flex-col" ontouchstart={handleTouchStart} ontouchend={handleTouchEnd}>
	{#if !chatStore.activeConversation || !hasMessages}
		{#if sidebarCollapsed}
			<!-- Mobile drawer opener (rail is off-canvas on small screens) -->
			<button
				type="button"
				class="absolute top-3 left-3 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
				onclick={() => {
					sidebarCollapsed = false;
					chatStore.saveSidebarState(true);
				}}
				aria-label="Open sidebar"
			>
				<PanelLeft class="h-4 w-4" />
			</button>
		{/if}
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
		<div class="group flex items-center gap-1 border-b border-border px-4 py-3 md:px-6">
			{#if sidebarCollapsed}
				<!-- Mobile drawer opener (rail is off-canvas on small screens) -->
				<button
					type="button"
					class="mr-0.5 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
					onclick={() => {
						sidebarCollapsed = false;
						chatStore.saveSidebarState(true);
					}}
					aria-label="Open sidebar"
				>
					<PanelLeft class="h-4 w-4" />
				</button>
			{/if}
			<h2 class="truncate text-sm font-medium text-foreground">
				{chatStore.activeConversation.title}
			</h2>
			<button
				type="button"
				class="shrink-0 cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground md:invisible md:group-hover:visible"
				onclick={() => (showRename = true)}
				aria-label="Rename chat"
			>
				<Pencil class="h-3.5 w-3.5" />
			</button>
		</div>

		<!-- Message List -->
		<MessageList />

		<!-- Bottom Chat Input -->
		<div class="bg-background px-4 py-3">
			<div class="mx-auto max-w-2xl">
				<ChatInput />
			</div>
		</div>
	{/if}
</div>

{#if chatStore.activeConversation}
	<RenameDialog
		bind:open={showRename}
		title="Rename chat"
		initialValue={chatStore.activeConversation.title}
		saveLabel="Save"
		onsave={(value) => {
			const id = chatStore.activeConversation?.id;
			if (id) chatStore.renameConversation(id, value);
		}}
	/>
{/if}
