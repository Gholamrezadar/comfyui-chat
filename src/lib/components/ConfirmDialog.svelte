<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { X, AlertTriangle } from 'lucide-svelte';

	let {
		open = $bindable(false),
		title = 'Confirm',
		message = 'Are you sure?',
		confirmLabel = 'Delete',
		confirmVariant = 'destructive',
		onconfirm
	}: {
		open: boolean;
		title: string;
		message: string;
		confirmLabel?: string;
		confirmVariant?: 'destructive' | 'outline';
		onconfirm: () => void;
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
		} else if (e.key === 'Enter' && open) {
			open = false;
			onconfirm();
		}
	}

	$effect(() => {
		if (open) {
			const dialog = document.getElementById('confirm-dialog');
			if (dialog) {
				requestAnimationFrame(() => dialog.focus());
			}
		}
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div
			class="flex w-full max-w-sm flex-col rounded-2xl border border-border bg-card shadow-lg"
			onclick={(e) => e.stopPropagation()}
			onkeydown={handleDialogKeydown}
			role="alertdialog"
			aria-modal="true"
			aria-label={title}
			tabindex="-1"
			id="confirm-dialog"
		>
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-border px-6 py-4">
				<div class="flex items-center gap-2">
					<AlertTriangle class="h-4 w-4 text-destructive" />
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
			<div class="p-6">
				<p class="text-sm text-muted-foreground">{message}</p>
			</div>

			<!-- Footer -->
			<div class="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
				<Button
					variant="outline"
					class="cursor-pointer"
					onclick={() => (open = false)}
					tabindex={0}
				>
					Cancel
				</Button>
				<Button
					variant={confirmVariant}
					class="cursor-pointer"
					onclick={() => {
						open = false;
						onconfirm();
					}}
					tabindex={0}
				>
					{confirmLabel}
				</Button>
			</div>
		</div>
	</div>
{/if}
