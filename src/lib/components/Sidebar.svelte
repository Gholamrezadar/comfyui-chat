<script lang="ts">
	import { chatStore } from '$lib/stores/chat.store.svelte';
	import { themeStore } from '$lib/stores/theme.store.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Tooltip, TooltipContent, TooltipTrigger } from '$lib/components/ui/tooltip';
	import SettingsModal from '$lib/components/Settings.svelte';
	import ShortcutsModal from '$lib/components/ShortcutsModal.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { shortcuts, matchesShortcut, formatShortcut } from '$lib/shortcuts';
	import { tick } from 'svelte';
	import {
		Search,
		Settings,
		ChevronLeft,
		Trash2,
		Bot,
		PanelLeft,
		ImageIcon,
		Plus,
		Sun,
		Moon
	} from 'lucide-svelte';

	// Props
	let { collapsed = $bindable(false) }: { collapsed: boolean } = $props();

	let searchInput = $state('');
	let searchInputEl: HTMLInputElement | null = $state(null);
	let showSettings = $state(false);
	let showShortcuts = $state(false);
	let showDeleteConfirm = $state(false);
	let deleteTargetId = $state('');

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
		if (matchesShortcut(e, shortcuts[0])) {
			// Ctrl+Shift+O: New Chat
			e.preventDefault();
			chatStore.newConversation();
		} else if (matchesShortcut(e, shortcuts[3])) {
			// Ctrl+Shift+S: Settings
			e.preventDefault();
			showSettings = true;
		} else if (matchesShortcut(e, shortcuts[4])) {
			// Ctrl+Shift+H: Toggle Theme
			e.preventDefault();
			themeStore.toggle();
		} else if (matchesShortcut(e, shortcuts[1])) {
			// Ctrl+K: Search
			e.preventDefault();
			if (collapsed) collapsed = false;
			focusSearchInput();
		} else if (matchesShortcut(e, shortcuts[2])) {
			// Ctrl+/: Toggle Sidebar
			e.preventDefault();
			toggleSidebar();
		} else if (matchesShortcut(e, shortcuts[5])) {
			// Ctrl+Shift+/: Keyboard Shortcuts
			e.preventDefault();
			showShortcuts = true;
		}
	}

	function dismissSidebarOnMobile() {
		if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
			collapsed = true;
			chatStore.saveSidebarState(false);
		}
	}

	function handleSelectConvo(id: string) {
		chatStore.selectConversation(id);
		dismissSidebarOnMobile();
	}

	function handleNewConversation() {
		chatStore.newConversation();
		dismissSidebarOnMobile();
	}

	function handleDeleteConvo(e: MouseEvent, id: string) {
		e.stopPropagation();
		deleteTargetId = id;
		showDeleteConfirm = true;
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
{#if !collapsed}
	<!-- Mobile-only backdrop: the drawer slides over content, never squeezes it -->
	<button
		type="button"
		tabindex={-1}
		aria-label="Close sidebar"
		class="sidebar-backdrop-in fixed inset-0 z-40 cursor-default bg-background/60 backdrop-blur-sm md:hidden"
		onclick={() => {
			collapsed = true;
			chatStore.saveSidebarState(false);
		}}
	></button>
{/if}
<aside
	class="top-0 left-0 z-50 flex h-full w-72 max-w-[85vw] shrink-0 flex-col overflow-hidden border-r border-border bg-sidebar transition-[width,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] max-md:fixed max-md:inset-y-0 max-md:shadow-2xl md:relative"
	class:max-md:-translate-x-full={collapsed}
	class:max-md:translate-x-0={!collapsed}
	class:md:w-64={!collapsed}
	class:md:w-14={collapsed}
>
	<!-- Sidebar Toggle Button -->
	<div class="absolute top-2.75 right-3 z-20">
	<Tooltip>
		<TooltipTrigger>
			<button
				onclick={toggleSidebar}
				class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-accent"
				class:right-3={!collapsed}
				class:left-3={collapsed}
				aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
				tabindex={1}
			>
				{#if collapsed}
					<!-- <ChevronRight class="h-4 w-4" /> -->
					<PanelLeft class="h-4 w-4" />
				{:else}
					<ChevronLeft class="h-4 w-4" />
				{/if}
			</button>
		</TooltipTrigger>
		<TooltipContent side="right" alignOffset={10}>
			{collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
			<span class="text-muted-foreground">{formatShortcut(shortcuts[2])}</span>
		</TooltipContent>
	</Tooltip>
	</div>

	<!-- Sidebar Header -->
	<div class="flex items-center gap-2 px-3 py-3" class:justify-center={collapsed}>
		{#if !collapsed}
			<!-- Expanded Brand -->
			<div class="sidebar-content-in flex min-w-0 flex-1 items-center gap-2">
				<span class="flex h-7 items-center justify-center truncate text-sm font-semibold text-foreground">
					ComfyUI Chat
				</span>
			</div>
		{:else}
			<!-- Collapsed Brand Spacer -->
			<div class="sidebar-content-in invisible flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
				<Bot class="h-4 w-4 text-primary-foreground" />
			</div>
		{/if}
	</div>

	<!-- Sidebar Action Buttons -->
	<div class="flex flex-col gap-1 px-2" class:items-center={collapsed}>
		{#if collapsed}
			<!-- Collapsed Actions -->
			<div class="sidebar-content-in flex flex-col items-center gap-1">
			<Tooltip>
				<TooltipTrigger>
					<Button
						variant="ghost"
						size="icon"
						onclick={handleNewConversation}
						class="h-9 w-9 cursor-pointer"
					tabindex={2}
				>
					<Plus class="h-4 w-4" />
				</Button>
			</TooltipTrigger>
		<TooltipContent side="right">New Chat <span class="text-muted-foreground">{formatShortcut(shortcuts[0])}</span> </TooltipContent>
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
				tabindex={3}
			>
					<Search class="h-4 w-4" />
				</Button>
			</TooltipTrigger>
			<TooltipContent side="right">Search <span class="text-muted-foreground">{formatShortcut(shortcuts[1])}</span> </TooltipContent>
		</Tooltip>
		</div>

		{:else}
			<!-- Expanded Actions -->
			<Button
				variant="ghost"
				class="sidebar-content-in h-9 w-full justify-start gap-2 text-sm cursor-pointer"
				onclick={handleNewConversation}
				tabindex={2}
			>
				<Plus class="h-4 w-4 shrink-0" />
				New Chat
			</Button>

			<!-- Search Input -->
			<div class="sidebar-content-in mt-1">
				<Input
					bind:ref={searchInputEl}
					bind:value={searchInput}
					placeholder="Search conversations..."
					class="h-8 text-sm focus-visible:ring-0 focus-visible:border-input focus-visible:bg-input/50"
					tabindex={3}
				/>
			</div>
		{/if}
	</div>

	<!-- Recent Conversations -->
	{#if !collapsed}
		<div class="sidebar-content-in mt-4 min-h-0 flex-1">
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
									tabindex={4}
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
									class="shrink-0 rounded p-0.5 hover:text-destructive cursor-pointer md:invisible md:group-hover:visible"
									aria-label="Delete conversation"
									tabindex={-1}
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
		<div class="sidebar-content-in flex-1"></div>
	{/if}

	<!-- Sidebar Footer -->
	<div
		class="z-20 flex flex-col gap-2 border-none border-border bg-sidebar p-2"
		class:items-center={collapsed}
		class:border-none={collapsed}
	>
		{#if collapsed}
			<!-- Collapsed Theme Toggle (mobile only) -->
			<div class="sidebar-content-in flex flex-col items-center gap-2">
			<Tooltip>
				<TooltipTrigger>
					<Button
						variant="ghost"
						size="icon"
						onclick={() => themeStore.toggle()}
						class="h-9 w-9 cursor-pointer md:hidden"
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
					<span class="text-muted-foreground">{formatShortcut(shortcuts[4])}</span>
				</TooltipContent>
			</Tooltip>

			<!-- Collapsed Settings -->
			<Tooltip>
				<TooltipTrigger>
					<Button variant="ghost" size="icon" class="h-9 w-9 cursor-pointer" aria-label="Settings" onclick={() => (showSettings = true)} tabindex={5}>
						<Settings class="h-4 w-4" />
					</Button>
				</TooltipTrigger>
			<TooltipContent side="right">Settings
					<span class="text-muted-foreground">{formatShortcut(shortcuts[3])}</span>
			</TooltipContent>
			</Tooltip>
			</div>
		{:else}
			<!-- Expanded: Theme Toggle (mobile only) + Settings -->
			<div class="sidebar-content-in flex items-center justify-between px-2 py-1.5">
				<Button
					variant="ghost"
					size="icon"
					onclick={() => themeStore.toggle()}
					class="h-9 w-9 shrink-0 cursor-pointer md:hidden"
					aria-label="Toggle theme"
				>
					{#if themeStore.isDark}
						<Sun class="h-4 w-4" />
					{:else}
						<Moon class="h-4 w-4" />
					{/if}
				</Button>
				<Button variant="ghost" size="icon" class="h-9 w-9 shrink-0 cursor-pointer" aria-label="Settings" onclick={() => (showSettings = true)} tabindex={5}>
					<Settings class="h-4 w-4" />
				</Button>
			</div>
		{/if}
	</div>
</aside>

<SettingsModal bind:open={showSettings} />
<ShortcutsModal bind:open={showShortcuts} />
<ConfirmDialog
	bind:open={showDeleteConfirm}
	title="Delete Chat"
	message="Are you sure you want to delete this chat? This action cannot be undone."
	onconfirm={() => chatStore.deleteConversation(deleteTargetId)}
/>
