<script lang="ts">
	import { chatStore } from '$lib/stores/chat.store.svelte';
	import { themeStore } from '$lib/stores/theme.store.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Tooltip, TooltipContent, TooltipTrigger } from '$lib/components/ui/tooltip';
	import SettingsModal from '$lib/components/Settings.svelte';
	import { tick } from 'svelte';
	import {
		Search,
		Settings,
		ChevronLeft,
		Sun,
		Moon,
		Trash2,
		Bot,
		PanelLeft,
		ImageIcon,
		Plus
	} from 'lucide-svelte';

	// Props
	let { collapsed = $bindable(false) }: { collapsed: boolean } = $props();

	let searchInput = $state('');
	let searchInputEl: HTMLInputElement | null = $state(null);
	let showSettings = $state(false);

	// Sync search query with the store
	$effect(() => {
		chatStore.setSearchQuery(searchInput);
	});

	function focusSearchInput() {
		tick().then(() => {
			requestAnimationFrame(() => {
				searchInputEl?.focus();
			});
		});
	}

	function toggleSidebar() {
		collapsed = !collapsed;
		chatStore.saveSidebarState(!collapsed);
	}

	function handleKeydown(e: KeyboardEvent) {
		const ctrl = e.ctrlKey || e.metaKey;
		const shift = e.shiftKey;
		const key = e.key.toLowerCase();

		if (ctrl && shift && key === 'o') {
			e.preventDefault();
			chatStore.newConversation();
		} else if (ctrl && shift && key === 's') {
			e.preventDefault();
			showSettings = true;
		} else if (ctrl && shift && key === 'h') {
			e.preventDefault();
			themeStore.toggle();
		} else if (ctrl && key === 'k') {
			e.preventDefault();
			if (collapsed) collapsed = false;
			focusSearchInput();
		} else if (ctrl && key === '/') {
			e.preventDefault();
			toggleSidebar();
		}
	}

	function handleSelectConvo(id: string) {
		chatStore.selectConversation(id);
	}

	function handleDeleteConvo(e: MouseEvent, id: string) {
		e.stopPropagation();
		chatStore.deleteConversation(id);
	}

	function formatTime(ts: number): string {
		const d = new Date(ts);
		const now = new Date();
		const diffMs = now.getTime() - d.getTime();
		const diffDays = Math.floor(diffMs / 86400000);
		if (diffDays === 0) return 'Today';
		if (diffDays === 1) return 'Yesterday';
		if (diffDays < 7) return `${diffDays}d ago`;
		return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}

	function getLastImage(convo: { messages: { images?: string[] }[] }): string | undefined {
		for (let i = convo.messages.length - 1; i >= 0; i--) {
			const imgs = convo.messages[i].images;
			if (imgs && imgs.length > 0) return imgs[imgs.length - 1];
		}
		return undefined;
	}

	function countImages(convo: { messages: { images?: string[] }[] }): number {
		let count = 0;
		for (const msg of convo.messages) {
			if (msg.images) count += msg.images.length;
		}
		return count;
	}
</script>

<!-- Sidebar Container -->
<svelte:window onkeydown={handleKeydown} />
<aside
	class="top-0 left-0 z-50 flex h-full flex-col border-r border-border bg-sidebar transition-all duration-0 ease-in-out md:relative md:h-full"
	class:w-full={!collapsed}
	class:w-14={collapsed}
	class:md:w-64={!collapsed}
	class:md:w-14={collapsed}
>
	<!-- Sidebar Toggle Button -->
	<button
		onclick={toggleSidebar}
		class="absolute top-3 z-20 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-accent"
		class:right-3={!collapsed}
		class:left-3={collapsed}
		aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
	>
		{#if collapsed}
			<!-- <ChevronRight class="h-4 w-4" /> -->
			<PanelLeft class="h-4 w-4" />
		{:else}
			<ChevronLeft class="h-4 w-4" />
		{/if}
	</button>

	<!-- Sidebar Header -->
	<div class="flex items-center gap-2 px-3 py-3" class:justify-center={collapsed}>
		{#if !collapsed}
			<!-- Expanded Brand -->
			<div class="flex min-w-0 flex-1 items-center gap-2">
				<span class="flex h-7 items-center justify-center truncate text-sm font-semibold text-foreground">
					ComfyUI Chat
				</span>
			</div>
		{:else}
			<!-- Collapsed Brand Spacer -->
			<div class="invisible flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
				<Bot class="h-4 w-4 text-primary-foreground" />
			</div>
		{/if}
	</div>

	<!-- Sidebar Action Buttons -->
	<div class="flex flex-col gap-1 px-2" class:items-center={collapsed}>
		{#if collapsed}
			<!-- Collapsed Actions -->
			<Tooltip>
				<TooltipTrigger>
					<Button
						variant="ghost"
						size="icon"
						onclick={() => chatStore.newConversation()}
						class="h-9 w-9 cursor-pointer"
					>
						<Plus class="h-4 w-4" />
					</Button>
				</TooltipTrigger>
				<TooltipContent side="right">New Chat <span class="text-muted-foreground">Ctrl + Shift + O</span> </TooltipContent>
			</Tooltip>

			<Tooltip>
				<TooltipTrigger>
					<Button
						variant="ghost"
						size="icon"
						onclick={() => {
							collapsed = false;
							focusSearchInput();
						}}
						class="h-9 w-9 cursor-pointer"
						aria-label="Search"
					>
						<Search class="h-4 w-4" />
					</Button>
				</TooltipTrigger>
				<TooltipContent side="right">Search <span class="text-muted-foreground">Ctrl + K</span> </TooltipContent>
			</Tooltip>

		{:else}
			<!-- Expanded Actions -->
			<Button
				variant="ghost"
				class="h-9 w-full justify-start gap-2 text-sm cursor-pointer"
				onclick={() => chatStore.newConversation()}
			>
				<Plus class="h-4 w-4 shrink-0" />
				New Chat
			</Button>

			<!-- Search Input -->
			<div class="mt-1">
				<Input
					bind:ref={searchInputEl}
					bind:value={searchInput}
					placeholder="Search conversations..."
					class="h-8 text-sm focus-visible:ring-0 focus-visible:border-input focus-visible:bg-input/50"
				/>
			</div>
		{/if}
	</div>

	<!-- Recent Conversations -->
	{#if !collapsed}
		<div class="mt-4 min-h-0 flex-1">
			<!-- Recent Header -->
			<p class="px-4 pb-1 text-xs font-light tracking-wider text-muted-foreground">
				Recents
			</p>
			<!-- Conversation Scroll Area -->
			<ScrollArea class="h-full px-2">
				{#if chatStore.filteredConversations.length === 0}
					<!-- Empty Conversations State -->
					<p class="px-2 py-4 text-center text-xs text-muted-foreground">
						{chatStore.searchQuery ? 'No results found' : 'No conversations yet'}
					</p>
				{:else}
					<!-- Conversation List -->
					<div class="flex flex-col gap-0.5 pb-4">
						{#each chatStore.filteredConversations as convo (convo.id)}
							<!-- Conversation Row -->
							<div
								class="group relative flex w-full items-center gap-2 rounded-md px-2 py-2 transition-colors hover:bg-accent"
								class:bg-accent={chatStore.activeId === convo.id}
								class:text-accent-foreground={chatStore.activeId === convo.id}
							>
								<!-- Conversation Select Button -->
								<button
									onclick={() => handleSelectConvo(convo.id)}
									class="flex min-w-0 flex-1 items-center gap-2 text-left cursor-pointer"
								>
									{#if getLastImage(convo)}
										<img src={getLastImage(convo)} alt="" class="h-7 w-7 shrink-0 rounded-md object-cover" />
									{/if}

									<div class="min-w-0 flex-1">
										<p class="truncate text-xs leading-tight font-medium">
											{convo.title}
										</p>

										<p class="flex items-center gap-1 text-[10px] text-muted-foreground">
											{formatTime(convo.updatedAt)}
											{#if countImages(convo) > 0}
												<span class="inline-flex items-center gap-0.5">
												<span class="leading-none">{countImages(convo)}</span>
													<ImageIcon class="h-2.5 w-2.5" />
												</span>
											{/if}
										</p>
									</div>
								</button>

								<!-- Conversation Delete Button -->
								<button
									onclick={(e) => handleDeleteConvo(e, convo.id)}
									class="invisible shrink-0 rounded p-0.5 group-hover:visible hover:text-destructive cursor-pointer"
									aria-label="Delete conversation"
								>
									<Trash2 class="h-3 w-3" />
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</ScrollArea>
		</div>
	{:else}
		<!-- Collapsed Sidebar Spacer -->
		<div class="flex-1"></div>
	{/if}

	<!-- Sidebar Footer -->
	<div
		class="z-20 flex flex-col gap-2 border-none border-border bg-sidebar p-2"
		class:items-center={collapsed}
		class:border-none={collapsed}
	>
		{#if collapsed}
			<!-- Collapsed Theme Toggle -->
			<Tooltip>
				<TooltipTrigger>
					<Button
						variant="ghost"
						size="icon"
						onclick={() => themeStore.toggle()}
						class="h-9 w-9 cursor-pointer"
						aria-label="Toggle theme"
					>
						{#if themeStore.isDark}
							<Sun class="h-4 w-4" />
						{:else}
							<Moon class="h-4 w-4" />
						{/if}
					</Button>
				</TooltipTrigger>
				<TooltipContent side="right">
					{themeStore.isDark ? 'Light mode' : 'Dark mode'}
						<span class="text-muted-foreground">Ctrl + Shift + H</span>
					</TooltipContent>
			</Tooltip>

			<!-- Collapsed Settings -->
			<Tooltip>
				<TooltipTrigger>
					<Button variant="ghost" size="icon" class="h-9 w-9 cursor-pointer" aria-label="Settings" onclick={() => (showSettings = true)}>
						<Settings class="h-4 w-4" />
					</Button>
				</TooltipTrigger>
				<TooltipContent side="right">Settings
						<span class="text-muted-foreground">Ctrl + Shift + S</span>
				</TooltipContent>
			</Tooltip>
		{:else}
			<!-- Expanded Settings & Theme Row -->
			<div class="flex items-center justify-between px-2 py-1.5">
				<Button variant="ghost" size="icon" class="h-9 w-9 shrink-0 cursor-pointer" aria-label="Settings" onclick={() => (showSettings = true)}>
					<Settings class="h-4 w-4" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					onclick={() => themeStore.toggle()}
					class="h-9 w-9 shrink-0 cursor-pointer"
					aria-label="Toggle theme"
				>
					{#if themeStore.isDark}
						<Sun class="h-4 w-4" />
					{:else}
						<Moon class="h-4 w-4" />
					{/if}
				</Button>
			</div>
		{/if}
	</div>
</aside>

<SettingsModal bind:open={showSettings} />
