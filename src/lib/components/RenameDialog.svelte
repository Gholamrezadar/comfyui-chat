<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { X, Pencil } from 'lucide-svelte';

	let {
		open = $bindable(false),
		title = 'Rename',
		initialValue = '',
		saveLabel = 'Save',
		onsave
	}: {
		open: boolean;
		title: string;
		initialValue: string;
		saveLabel?: string;
		onsave: (value: string) => void;
	} = $props();

	let draft = $state(initialValue);

	// Reset the draft and focus the input every time the dialog opens
	// (explicit user action, so focusing on touch devices is welcome here)
	$effect(() => {
		if (open) {
			draft = initialValue;
			requestAnimationFrame(() => {
				(document.getElementById('rename-input') as HTMLInputElement | null)?.focus();
			});
		}
	});

	function save() {
		const value = draft.trim();
		if (!value) return;
		open = false;
		onsave(value);
	}

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
			e.preventDefault();
			save();
		}
	}
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
			id="rename-dialog"
		>
			<!-- Header -->
			<div class="flex items-center justify-between px-6 py-4">
				<div class="flex items-center gap-2">
					<Pencil class="h-4 w-4 text-muted-foreground" />
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
			<div class="px-6 pb-2">
				<Input
					id="rename-input"
					bind:value={draft}
					class="rounded-lg"
					onfocus={(e) => (e.target as HTMLInputElement).select()}
				/>
			</div>

			<!-- Footer -->
			<div class="flex items-center justify-end gap-2 px-6 py-4">
				<Button
					variant="outline"
					class="cursor-pointer"
					onclick={() => (open = false)}
					tabindex={0}
				>
					Cancel
				</Button>
				<Button variant="default" class="cursor-pointer" onclick={save} tabindex={0}>
					{saveLabel}
				</Button>
			</div>
		</div>
	</div>
{/if}
