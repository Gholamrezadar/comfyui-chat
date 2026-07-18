<script lang="ts">
	import { comfyStore } from '$lib/stores/comfy-store.svelte';
	import { LoaderCircle, X } from 'lucide-svelte';

	function formatTime(ms: number): string {
		const totalSeconds = Math.floor(ms / 1000);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return `${minutes}:${String(seconds).padStart(2, '0')}`;
	}
</script>

<!-- Generating Message Row -->
<div class="flex items-start gap-3">
	<!-- Message Stack -->
	<div class="flex min-w-0 flex-col gap-1">
		<!-- Preview Image -->
		{#if comfyStore.previewUrl}
			<div class="overflow-hidden rounded-xl border border-border">
				<img
					src={comfyStore.previewUrl}
					alt="Generating preview"
					class="block max-h-64 w-full object-contain"
				/>
			</div>
		{/if}

		<!-- Progress + Timing -->
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
