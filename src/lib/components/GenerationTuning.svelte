<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { X, RefreshCw, Dices, ChevronDown, Check, Save, List, Pencil } from 'lucide-svelte';
	import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '$lib/components/ui/tooltip';
	import * as settingsService from '$lib/services/settings.service';
	const RESOLUTIONS = ['1024 x 1024', '768 x 1024', '1024 x 768', '1280 x 720', '1920 x 1080'];

	let {
		open = $bindable(false),
		overrides = [],
		seed = $bindable(3),
		randomizeEachTime = $bindable(false),
		width = $bindable(1024),
		height = $bindable(1024)
		,steps = $bindable(20)
		,cfg = $bindable(7)
	}: {
		open?: boolean;
		overrides?: string[];
		seed?: number;
		randomizeEachTime?: boolean;
		width?: number;
		height?: number;
		steps?: number;
		cfg?: number;
	} = $props();
	let customResolution = $state(false);
	let selectedResolution = $state('1024x1024');
	let showResolutionMenu = $state(false);
	let customResolutions = $state<string[]>(settingsService.loadCustomResolutions());
	let hiddenResolutions = $state<string[]>(settingsService.loadHiddenResolutions());
	let allResolutions = $derived([...RESOLUTIONS, ...customResolutions].filter((resolution, index, values) => values.indexOf(resolution) === index && !hiddenResolutions.includes(resolution)));

	function selectResolution(value: string) {
		selectedResolution = value;
		const [nextWidth, nextHeight] = value.split(' x ').map(Number);
		width = nextWidth;
		height = nextHeight;
	}

	function saveCustomResolution() {
		const value = `${width} x ${height}`;
		if (!width || !height || customResolutions.includes(value)) return;
		customResolutions = [...customResolutions, value];
		settingsService.saveCustomResolutions(customResolutions);
		selectedResolution = value;
		customResolution = false;
	}

	function deleteCustomResolution(value: string) {
		if (RESOLUTIONS.includes(value)) {
			hiddenResolutions = [...hiddenResolutions, value];
			settingsService.saveHiddenResolutions(hiddenResolutions);
		} else {
			customResolutions = customResolutions.filter((resolution) => resolution !== value);
			settingsService.saveCustomResolutions(customResolutions);
		}
		if (selectedResolution === value) selectResolution(RESOLUTIONS[0]);
	}

	$effect(() => {
		if (!customResolution) selectedResolution = `${width} x ${height}`;
	});
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
									<Button variant={randomizeEachTime ? 'secondary' : 'outline'} size="icon" class={randomizeEachTime ? 'cursor-pointer border-primary bg-primary text-primary-foreground hover:bg-primary/90' : 'cursor-pointer'} onclick={() => (randomizeEachTime = !randomizeEachTime)} aria-label="Randomize seed each time" aria-pressed={randomizeEachTime}>
										<Dices class="h-4 w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Randomize each time</TooltipContent>
							</Tooltip>
						</div>
					</div>
				{/if}
				{#if overrides.includes('STEPS')}
					<label class="grid gap-1.5 text-sm text-foreground">Steps<Input type="number" bind:value={steps} min="1" step="1" class="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" /></label>
				{/if}
				{#if overrides.includes('CFG')}
					<label class="grid gap-1.5 text-sm text-foreground">CFG<Input type="number" bind:value={cfg} min="0" step="0.1" class="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" /></label>
				{/if}
				{#if overrides.includes('WIDTH') && overrides.includes('HEIGHT')}
					<div class="grid gap-1.5">
						<label for="generation-resolution" class="text-sm text-foreground">Resolution</label>
						{#if customResolution}
													<div class="flex items-center gap-2">
								<Input type="number" bind:value={width} min="1" aria-label="Width" />
								<span class="text-muted-foreground">x</span>
								<Input type="number" bind:value={height} min="1" aria-label="Height" />
																<div class="flex gap-2"><Tooltip><TooltipTrigger><Button variant="outline" size="icon" class="h-9 w-9 cursor-pointer rounded-4xl" onclick={saveCustomResolution} aria-label="Save custom resolution"><Save class="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Save custom resolution</TooltipContent></Tooltip><Tooltip><TooltipTrigger><Button variant="outline" size="icon" class="h-9 w-9 cursor-pointer rounded-4xl" onclick={() => (customResolution = false)} aria-label="Show resolution presets"><List class="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Show resolution presets</TooltipContent></Tooltip></div>
							</div>
						{:else}
							<div class="flex items-center gap-2">
								<div class="relative min-w-0 flex-1">
										<button id="generation-resolution" type="button" class="flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-4xl border border-input bg-input/30 px-3 py-1 text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring" aria-haspopup="listbox" aria-expanded={showResolutionMenu} onclick={() => (showResolutionMenu = !showResolutionMenu)}>
										<span>{selectedResolution}</span>
										<ChevronDown class="h-3 w-3 shrink-0" />
									</button>
									{#if showResolutionMenu}
										<div class="absolute bottom-full left-0 z-50 mb-2 w-full overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg" role="listbox">
																	{#each allResolutions as resolution}
																		<div role="option" tabindex="0" aria-selected={selectedResolution === resolution} class="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-accent" onclick={() => { selectResolution(resolution); showResolutionMenu = false; }} onkeydown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectResolution(resolution); showResolutionMenu = false; } }}>
																			<span>{resolution}</span><span class="flex items-center gap-2">{#if selectedResolution === resolution}<Check class="h-3.5 w-3.5 text-primary" />{/if}<button type="button" class="cursor-pointer text-muted-foreground hover:text-destructive" onclick={(event) => { event.stopPropagation(); deleteCustomResolution(resolution); }} aria-label={`Delete ${resolution}`}><X class="h-3.5 w-3.5" /></button></span>
																			</div>
											{/each}
										</div>
									{/if}
								</div>
								<Tooltip>
								<TooltipTrigger><Button variant="outline" size="icon" class="h-9 w-9 cursor-pointer rounded-4xl" onclick={() => (customResolution = true)} aria-label="Enter custom resolution"><Pencil class="h-4 w-4" /></Button></TooltipTrigger>
									<TooltipContent>Custom resolution</TooltipContent>
								</Tooltip>
							</div>
						{/if}
					</div>
				{/if}
			</div>
			<Button class="mt-5 w-full cursor-pointer" onclick={() => (open = false)}><Save class="mr-1.5 h-4 w-4" />Save</Button>
		</div>
		</TooltipProvider>
	</div>
{/if}
