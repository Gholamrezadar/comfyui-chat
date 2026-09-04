<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { X, RefreshCw, Dices } from 'lucide-svelte';
	import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '$lib/components/ui/tooltip';

	let {
		open = $bindable(false),
		overrides = [],
		seed = $bindable(3),
		randomizeEachTime = $bindable(false),
		width = $bindable(1024),
		height = $bindable(1024)
	}: {
		open?: boolean;
		overrides?: string[];
		seed?: number;
		randomizeEachTime?: boolean;
		width?: number;
		height?: number;
	} = $props();
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm" role="presentation" onclick={(e) => e.target === e.currentTarget && (open = false)}>
		<TooltipProvider delayDuration={500}>
		<div class="flex w-full max-w-sm flex-col rounded-2xl border border-border bg-card p-5 shadow-lg" role="dialog" aria-modal="true" aria-labelledby="tuning-title">
			<div class="mb-5 flex items-center justify-between">
				<h2 id="tuning-title" class="text-base font-semibold text-foreground">Generation settings</h2>
				<Button variant="ghost" size="icon-sm" class="cursor-pointer text-muted-foreground" onclick={() => (open = false)} aria-label="Close generation settings">
					<X class="h-4 w-4" />
				</Button>
			</div>
			<div class="grid gap-4">
				{#if overrides.includes('SEED')}
					<div class="grid gap-1.5">
						<label for="generation-seed" class="text-sm text-foreground">Seed</label>
						<div class="flex gap-2">
							<Input id="generation-seed" type="number" bind:value={seed} min="0" class="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
							<Tooltip>
								<TooltipTrigger>
									<Button variant="outline" size="icon" class="cursor-pointer" onclick={() => (seed = Math.floor(Math.random() * 2147483648))} aria-label="Generate random seed">
										<RefreshCw class="h-4 w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Generate random seed</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger>
									<Button variant={randomizeEachTime ? 'secondary' : 'outline'} size="icon" class={randomizeEachTime ? 'cursor-pointer border-emerald-400 bg-emerald-200 text-green-900 hover:bg-emerald-300' : 'cursor-pointer'} onclick={() => (randomizeEachTime = !randomizeEachTime)} aria-label="Randomize seed each time" aria-pressed={randomizeEachTime}>
										<Dices class="h-4 w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Randomize each time</TooltipContent>
							</Tooltip>
						</div>
					</div>
				{/if}
				{#if overrides.includes('WIDTH')}
					<label class="grid gap-1.5 text-sm text-foreground">Width<Input type="number" bind:value={width} min="1" /></label>
				{/if}
				{#if overrides.includes('HEIGHT')}
					<label class="grid gap-1.5 text-sm text-foreground">Height<Input type="number" bind:value={height} min="1" /></label>
				{/if}
			</div>
			<Button class="mt-5 w-full cursor-pointer" onclick={() => (open = false)}>Done</Button>
		</div>
		</TooltipProvider>
	</div>
{/if}
