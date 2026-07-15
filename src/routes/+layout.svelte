<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	import { TooltipProvider } from '$lib/components/ui/tooltip';
	import { Toaster } from 'svelte-sonner';

	let { children } = $props();
</script>

<!-- Document Head -->
<svelte:head>
	<link rel="icon" href={favicon} />
	<title>ComfyUI Chat</title>
</svelte:head>

<!-- Tooltip Provider -->
<TooltipProvider>
	{@render children()}
</TooltipProvider>

<Toaster richColors />
