<script lang="ts">
	import { ExternalLink } from 'lucide-svelte';
</script>

<div class="min-h-0 flex-1 overflow-y-auto p-5 md:p-8">
	<div class="max-w-xl">
		<h1 class="text-2xl font-semibold">ComfyUI Chat</h1>
		<p class="mt-2 text-sm text-muted-foreground">A focused chat interface for running your ComfyUI workflows.</p>
		<div class="mt-8 rounded-xl border border-border p-5">
			<p class="text-sm font-medium">Version</p>
			<p class="mt-1 text-sm text-muted-foreground">0.0.1 · Local-first</p>
			<p class="mt-5 text-sm text-muted-foreground">Built for a fast, private creative workflow.</p>
			<button type="button" class="mt-5 flex cursor-pointer items-center gap-2 text-sm text-primary hover:underline">
				Project documentation <ExternalLink class="h-3.5 w-3.5" />
			</button>
		</div>
	</div>
</div>
