<script lang="ts">
	import { comfyStore } from '$lib/stores/comfy-store.svelte';
	import { LoaderCircle, X, Bot } from 'lucide-svelte';

	function formatTime(ms: number): string {
		const totalSeconds = Math.floor(ms / 1000);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return `${minutes}:${String(seconds).padStart(2, '0')}`;
	}
</script>

<!-- Generating Message Row (matches MessageItem assistant layout) -->
<div class="flex items-start gap-3">
	<!-- Assistant Avatar -->
	<div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary">
		<Bot class="h-4 w-4 text-primary-foreground" />
	</div>

	<!-- Message Stack -->
	<div class="flex min-w-0 flex-col gap-1">
		<!-- Message Bubble wrapper (matches MessageItem assistant style) -->
		<div class="w-fit max-w-full px-2 py-2">
			{#if comfyStore.previewUrl}
				<!-- Preview Image -->
				<div class="overflow-hidden rounded-xl border border-border">
					<img
						src={comfyStore.previewUrl}
						alt="Generating preview"
						class="block max-h-64 w-full object-contain"
					/>
				</div>
			{:else}
				<!-- Empty loading card before first preview -->
				<div
					class="flex h-40 w-64 items-center justify-center rounded-xl border border-border bg-muted/30"
				>
					<div class="flex flex-col items-center gap-2">
						<LoaderCircle class="h-6 w-6 animate-spin text-muted-foreground" />
						<span class="text-xs text-muted-foreground">Generating...</span>
					</div>
				</div>
			{/if}
		</div>

		<!-- Progress + Timing (only while actively generating) -->
		<div class="flex flex-col gap-1.5 px-1">
			{#if comfyStore.progressMax > 0}
				<!-- Progress Bar -->
				<div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
					<div
						class="h-full rounded-full bg-primary transition-all duration-200 ease-out"
						style="width: {comfyStore.progressPct}%"
					></div>
				</div>
			{/if}

			<!-- Timing Row -->
			<div class="flex items-center gap-3 text-[11px] text-muted-foreground">
				{#if comfyStore.elapsed > 0}
					<span>{formatTime(comfyStore.elapsed)} elapsed</span>
				{/if}
				{#if comfyStore.eta > 1000}
					<span>~{formatTime(comfyStore.eta)} remaining</span>
				{/if}
			</div>

			<!-- Status + Cancel -->
			<div class="flex items-center gap-2">
				<LoaderCircle class="h-3.5 w-3.5 animate-spin text-primary" />
				<span class="text-xs text-muted-foreground">
					{#if comfyStore.currentNode}
						Executing node {comfyStore.currentNode}...
					{:else}
						Generating...
					{/if}
				</span>
				<button
					onclick={() => comfyStore.cancel()}
					class="ml-auto rounded p-0.5 text-muted-foreground hover:text-destructive cursor-pointer"
					aria-label="Cancel generation"
				>
					<X class="h-3.5 w-3.5" />
				</button>
			</div>
		</div>
	</div>
</div>
