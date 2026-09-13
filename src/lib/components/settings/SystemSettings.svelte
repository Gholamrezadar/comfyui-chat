<script lang="ts">
	import { CheckCircle2 } from 'lucide-svelte';
</script>

<div class="min-h-0 flex-1 overflow-y-auto p-5 md:p-8">
	<div class="max-w-xl">
		<h1 class="text-2xl font-semibold">System preferences</h1>
		<p class="mt-2 text-sm text-muted-foreground">Manage how ComfyUI Chat connects and behaves.</p>
		<div class="mt-8 divide-y divide-border rounded-xl border border-border">
			<div class="flex items-center justify-between gap-4 p-4">
				<div>
					<p class="text-sm font-medium">Connection status</p>
					<p class="mt-1 text-xs text-muted-foreground">Ready to connect to a ComfyUI server</p>
				</div>
				<span class="flex items-center gap-1.5 text-xs text-emerald-600"><CheckCircle2 class="h-4 w-4" />Local</span>
			</div>
			<div class="flex items-center justify-between gap-4 p-4">
				<div>
					<p class="text-sm font-medium">Storage</p>
					<p class="mt-1 text-xs text-muted-foreground">Your workflows and chats stay in this browser</p>
				</div>
				<span class="text-xs text-muted-foreground">IndexedDB</span>
			</div>
		</div>
	</div>
</div>
