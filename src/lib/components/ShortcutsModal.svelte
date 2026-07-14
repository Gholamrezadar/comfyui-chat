<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { shortcuts, formatShortcut, type Shortcut } from '$lib/shortcuts';
	import { X, Keyboard } from 'lucide-svelte';

	let { open = $bindable(false) }: { open: boolean } = $props();

	// Group shortcuts by their group property
	const grouped = $derived(() => {
		const map = new Map<string, Shortcut[]>();
		for (const s of shortcuts) {
			const existing = map.get(s.group) ?? [];
			existing.push(s);
			map.set(s.group, existing);
		}
		return map;
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			open = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div
			class="flex w-full max-w-md flex-col rounded-2xl border border-border bg-card shadow-lg"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			aria-label="Keyboard Shortcuts"
			tabindex="0"
		>
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-border px-6 py-4">
				<div class="flex items-center gap-2">
					<Keyboard class="h-4 w-4 text-foreground" />
					<h2 class="text-lg font-semibold text-foreground">Keyboard Shortcuts</h2>
				</div>
				<Button
					variant="ghost"
					size="icon"
					class="h-8 w-8 cursor-pointer"
					onclick={() => (open = false)}
					aria-label="Close"
				>
					<X class="h-4 w-4" />
				</Button>
			</div>

			<!-- Content -->
			<div class="flex flex-col gap-4 overflow-y-auto p-6">
				{#each grouped() as [group, items]}
					<div class="flex flex-col gap-2">
						<h3 class="text-xs font-medium uppercase tracking-wider text-muted-foreground">{group}</h3>
						<div class="flex flex-col gap-1">
							{#each items as shortcut}
								<div class="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent">
									<span class="text-foreground">{shortcut.label}</span>
									<kbd class="rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
										{formatShortcut(shortcut)}
									</kbd>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}
