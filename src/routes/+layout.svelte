<script lang="ts">
	import './layout.css';

	import { TooltipProvider } from '$lib/components/ui/tooltip';
	import { Toaster } from 'svelte-sonner';

	let { children } = $props();
</script>

<!-- Document Head -->
<svelte:head>
	<link rel="icon" href="/favicon.ico" />
	<title>ComfyUI Chat</title>
</svelte:head>

<!-- Tooltip Provider -->
<TooltipProvider>
	{@render children()}
</TooltipProvider>

<Toaster richColors />
