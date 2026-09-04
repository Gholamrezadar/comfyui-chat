<script lang="ts">
	import { Reply, Pencil, Trash2 } from 'lucide-svelte';

	let {
		open = $bindable(false),
		onReply,
		onEdit,
		onDelete
	}: {
		open: boolean;
		onReply: () => void;
		onEdit: () => void;
		onDelete: () => void;
	} = $props();

	function close() {
		open = false;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && open) {
			event.preventDefault();
			close();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div
		class="sheet-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={(event) => {
			if (!(event.target as HTMLElement).closest?.('[data-sheet-panel]')) close();
		}}
		onkeydown={(event) => event.key === 'Escape' && close()}
		role="dialog"
		tabindex="-1"
		aria-modal="true"
		aria-label="Message actions"
	>
		<div
			class="sheet-panel w-full max-w-xs rounded-2xl border border-border bg-card shadow-xl"
			data-sheet-panel
			role="document"
		>
			<!-- Actions -->
			<div class="flex flex-col gap-0.5 p-2">
				<button
					type="button"
					class="flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-accent"
					onclick={() => {
						close();
						onReply();
					}}
				>
					<Reply class="h-4 w-4 shrink-0 text-muted-foreground" />
					Reply
				</button>
				<button
					type="button"
					class="flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-accent"
					onclick={() => {
						close();
						onEdit();
					}}
				>
					<Pencil class="h-4 w-4 shrink-0 text-muted-foreground" />
					Edit
				</button>
				<button
					type="button"
					class="flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
					onclick={() => {
						close();
						onDelete();
					}}
				>
					<Trash2 class="h-4 w-4 shrink-0" />
					Delete
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.sheet-backdrop {
		animation: sheet-backdrop-in 0.16s ease-out;
	}

	.sheet-panel {
		animation: sheet-panel-in 0.22s cubic-bezier(0.32, 0.72, 0, 1);
	}

	@keyframes sheet-backdrop-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes sheet-panel-in {
		from {
			opacity: 0;
			transform: scale(0.94) translateY(10px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.sheet-backdrop,
		.sheet-panel {
			animation: none;
		}
	}
</style>
