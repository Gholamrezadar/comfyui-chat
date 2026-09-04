<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { X, Info } from 'lucide-svelte';

	let {
		open = $bindable(false),
		title = 'Info',
		message = '',
		bullets = []
	}: {
		open: boolean;
		title: string;
		message?: string;
		bullets?: string[];
	} = $props();

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			open = false;
		}
	}

	function handleDialogKeydown(e: KeyboardEvent) {
		e.stopPropagation();
		if (e.key === 'Escape' && open) {
			open = false;
		}
	}

	$effect(() => {
		if (open) {
			const dialog = document.getElementById('info-dialog');
			if (dialog) {
				requestAnimationFrame(() => dialog.focus());
			}
		}
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-background/10 p-4 backdrop-blur-sm">
		<div
			class="flex w-full max-w-sm flex-col rounded-2xl border border-border bg-card shadow-lg"
			onclick={(e) => e.stopPropagation()}
			onkeydown={handleDialogKeydown}
			role="dialog"
			aria-modal="true"
			aria-label={title}
			tabindex="-1"
			id="info-dialog"
		>
			<!-- Header -->
			<div class="flex items-center justify-between px-6 py-4">
				<div class="flex items-center gap-2">
					<Info class="h-4 w-4 text-muted-foreground" />
					<h2 class="text-lg font-semibold text-foreground">{title}</h2>
				</div>
				<Button
					variant="ghost"
					size="icon"
					class="h-8 w-8 cursor-pointer"
					onclick={() => (open = false)}
					aria-label="Close"
					tabindex={0}
				>
					<X class="h-4 w-4" />
				</Button>
			</div>

			<!-- Content -->
			<div class="px-6 pb-6">
				{#if bullets.length}
					<ul class="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
						{#each bullets as bullet (bullet)}
							<li>{bullet}</li>
						{/each}
					</ul>
				{:else}
					<p class="text-sm text-muted-foreground">{message}</p>
				{/if}
			</div>
		</div>
	</div>
{/if}
