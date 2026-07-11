<script lang="ts">
	import { onMount } from 'svelte';
	import { chatStore } from '$lib/stores/chat.store.svelte';
	import { themeStore } from '$lib/stores/theme.store.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import ChatView from '$lib/components/ChatView.svelte';

	let sidebarCollapsed = $state(false);
	let loaded = $state(false);

	// Bootstrap stores on mount (client-only, IndexedDB access)
	onMount(async () => {
		themeStore.init();
		await chatStore.init();
		sidebarCollapsed = !chatStore.isSidebarOpen;
		loaded = true;
	});
</script>

{#if loaded}
	<!-- App Shell -->
	<div class="flex h-screen w-screen overflow-hidden bg-background text-foreground antialiased">
		<!-- Sidebar -->
		<Sidebar bind:collapsed={sidebarCollapsed} />

		<!-- Main Chat Area -->
		<main class="flex flex-1 min-w-0 flex-col overflow-hidden">
			<ChatView />
		</main>
	</div>
{/if}