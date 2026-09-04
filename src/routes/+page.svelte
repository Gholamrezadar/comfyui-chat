<script lang="ts">
	import { onMount } from 'svelte';
	import { chatStore } from '$lib/stores/chat.store.svelte';
	import { themeStore } from '$lib/stores/theme.store.svelte';
	import { workflowStore } from '$lib/stores/workflow.store.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Tooltip, TooltipContent, TooltipTrigger } from '$lib/components/ui/tooltip';
	import { shortcuts, formatShortcut } from '$lib/shortcuts';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import ChatView from '$lib/components/ChatView.svelte';
	import { Sun, Moon } from 'lucide-svelte';

	let sidebarCollapsed = $state(false);
	let loaded = $state(false);

	// Bootstrap stores on mount (client-only, IndexedDB access)
	onMount(async () => {
		themeStore.init();
		await chatStore.init();
		await workflowStore.init();
		sidebarCollapsed = !chatStore.isSidebarOpen;
		loaded = true;
	});
</script>

{#if loaded}
	<!-- App Shell -->
	<div class="relative flex h-[100dvh] w-screen overflow-hidden bg-background text-foreground antialiased">
		<!-- Sidebar -->
		<Sidebar bind:collapsed={sidebarCollapsed} />

		<!-- Main Chat Area -->
		<main class="flex flex-1 min-w-0 flex-col overflow-hidden">
			<ChatView bind:sidebarCollapsed />
		</main>

		<!-- Theme Toggle: top right of screen (desktop only) -->
		<div class="absolute top-1 right-3 z-50 hidden md:block">
			<Tooltip>
				<TooltipTrigger>
					<Button
						variant="ghost"
						size="icon"
						onclick={() => themeStore.toggle()}
						class="h-9 w-9 cursor-pointer"
						aria-label="Toggle theme"
						tabindex={12}
					>
						{#if themeStore.isDark}
							<Sun class="h-4 w-4" />
						{:else}
							<Moon class="h-4 w-4" />
						{/if}
					</Button>
				</TooltipTrigger>
			<TooltipContent>
				{themeStore.isDark ? 'Light mode' : 'Dark mode'}
				<span class="text-muted-foreground">{formatShortcut(shortcuts[4])}</span>
			</TooltipContent>
			</Tooltip>
		</div>
	</div>
{/if}
