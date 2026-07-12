<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { X } from 'lucide-svelte';

	let { open = $bindable(false) }: { open: boolean } = $props();

	let name = $state('');
	let description = $state('');

	function handleSave() {
		open = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			open = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-0 backdrop-blur-sm md:p-4">
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div
			class="flex h-full w-full flex-col bg-card md:h-auto md:max-w-lg md:rounded-2xl md:border md:border-border md:shadow-lg"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			aria-label="Settings"
		>
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-border px-6 py-4 md:rounded-t-2xl md:border-b">
				<h2 class="text-lg font-semibold text-foreground">Settings</h2>
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
			<div class="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
				<div class="flex flex-col gap-1.5">
					<label for="settings-name" class="text-sm font-medium text-foreground">Name</label>
					<Input
						id="settings-name"
						bind:value={name}
						placeholder="Enter name..."
					/>
				</div>
				<div class="flex flex-col gap-1.5">
					<label for="settings-desc" class="text-sm font-medium text-foreground">Description</label>
					<Textarea
						id="settings-desc"
						bind:value={description}
						placeholder="Enter description..."
						rows={4}
					/>
				</div>
			</div>

			<!-- Footer -->
			<div class="border-t border-border px-6 py-4">
				<Button onclick={handleSave} class="w-full cursor-pointer">Save</Button>
			</div>
		</div>
	</div>
{/if}
