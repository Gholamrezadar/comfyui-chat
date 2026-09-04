<script lang="ts">
	import { ChevronLeft, ChevronRight } from 'lucide-svelte';

	export type LightboxItem = {
		src: string;
		caption: string;
	};

	let {
		images,
		index = $bindable(0),
		onClose
	}: {
		images: LightboxItem[];
		index: number;
		onClose: () => void;
	} = $props();

	const lightboxItem = $derived(images[index]);

	let viewportEl: HTMLDivElement | undefined = $state();

	function goToLightbox(target: number) {
		if (!images.length) return;
		index = Math.min(Math.max(target, 0), images.length - 1);
		dragX = 0;
	}

	function navigateLightbox(direction: -1 | 1) {
		if (!images.length) return handleClose();
		goToLightbox(index + direction);
	}

	function handleClose() {
		resetLightboxDrag();
		onClose();
	}

	const MAX_VISIBLE_DOTS = 9;
	const visibleDotIndices = $derived.by(() => {
		const count = images.length;
		if (count <= MAX_VISIBLE_DOTS) return Array.from({ length: count }, (_, i) => i);
		const half = Math.floor(MAX_VISIBLE_DOTS / 2);
		let start = Math.min(Math.max(index - half, 0), count - MAX_VISIBLE_DOTS);
		return Array.from({ length: MAX_VISIBLE_DOTS }, (_, i) => start + i);
	});

	function handleLightboxKeydown(event: KeyboardEvent) {
		if (!images.length) return;
		if (event.key === 'Escape') {
			event.preventDefault();
			handleClose();
		} else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
			event.preventDefault();
			navigateLightbox(-1);
		} else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
			event.preventDefault();
			navigateLightbox(1);
		}
	}

	let dragX = $state(0);
	let isDraggingLightbox = $state(false);
	let activeLightboxPointerId: number | null = null;
	let swipeStartX = 0;
	let swipeStartY = 0;
	let isHorizontalSwipe: boolean | null = null;

	function resetLightboxDrag() {
		dragX = 0;
		isDraggingLightbox = false;
		activeLightboxPointerId = null;
		isHorizontalSwipe = null;
	}

	function getSwipeThreshold(): number {
		const width = viewportEl?.clientWidth ?? 0;
		return Math.max(60, width * 0.15);
	}

	function applyDragResistance(dx: number): number {
		if (!images.length) return dx;
		const atStart = index <= 0 && dx > 0;
		const atEnd = index >= images.length - 1 && dx < 0;
		return atStart || atEnd ? dx * 0.35 : dx;
	}

	function handleLightboxPointerDown(event: PointerEvent) {
		if (!event.isPrimary) return;
		activeLightboxPointerId = event.pointerId;
		swipeStartX = event.clientX;
		swipeStartY = event.clientY;
		isHorizontalSwipe = null;
		isDraggingLightbox = true;
		dragX = 0;
		viewportEl?.setPointerCapture(event.pointerId);
	}

	function handleLightboxPointerMove(event: PointerEvent) {
		if (!isDraggingLightbox || event.pointerId !== activeLightboxPointerId) return;
		const dx = event.clientX - swipeStartX;
		const dy = event.clientY - swipeStartY;
		if (isHorizontalSwipe === null && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
			isHorizontalSwipe = Math.abs(dx) > Math.abs(dy);
		}
		if (isHorizontalSwipe) {
			dragX = applyDragResistance(dx);
		}
	}

	function endLightboxDrag(event: PointerEvent) {
		if (!isDraggingLightbox || event.pointerId !== activeLightboxPointerId) return;
		const dx = event.clientX - swipeStartX;
		const dy = event.clientY - swipeStartY;
		isDraggingLightbox = false;
		activeLightboxPointerId = null;
		if (
			images.length > 1 &&
			isHorizontalSwipe &&
			Math.abs(dx) >= getSwipeThreshold() &&
			Math.abs(dx) > Math.abs(dy)
		) {
			navigateLightbox(dx < 0 ? 1 : -1);
		} else {
			dragX = 0;
		}
		isHorizontalSwipe = null;
	}
</script>

<svelte:window onkeydown={handleLightboxKeydown} />

<!-- Image Lightbox Gallery -->
{#if lightboxItem}
	<div
		class="fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center gap-4 bg-background/80 p-4 backdrop-blur-sm"
		onclick={(event) => {
			if (!(event.target as HTMLElement).closest?.('[data-gallery-content]')) handleClose();
		}}
		onkeydown={(event) => event.key === 'Escape' && handleClose()}
		role="dialog"
		tabindex="0"
		aria-label="Close image preview"
		aria-roledescription="Image gallery"
	>
		<!-- Stage: clicks on empty stage area bubble up and close; image viewport stops propagation -->
		<div class="relative flex w-full max-w-3xl flex-1 cursor-default items-center justify-center overflow-hidden">
			<!-- Swipe viewport -->
			<div
				bind:this={viewportEl}
				role="region"
				aria-roledescription="carousel"
				aria-label="Image gallery. Swipe or drag to browse images."
				data-gallery-content
				class="w-full touch-pan-y overflow-hidden select-none {images.length > 1
					? 'cursor-grab active:cursor-grabbing'
					: ''}"
				onpointerdown={handleLightboxPointerDown}
				onpointermove={handleLightboxPointerMove}
				onpointerup={(event) => endLightboxDrag(event)}
				onpointercancel={(event) => endLightboxDrag(event)}
			>
				<!-- Sliding track: adjacent images stay mounted so the next/prev image slides in -->
				<div
					class="flex w-full will-change-transform"
					style="transform: translateX(calc({-index * 100}% + {dragX}px)); transition: {isDraggingLightbox
						? 'none'
						: 'transform 0.3s ease-out'};"
				>
					{#each images as image, i (image.src + i)}
						<div
							class="flex w-full shrink-0 flex-col items-center justify-center px-4"
							aria-hidden={i !== index}
						>
							<img
								src={image.src}
								alt="Full size"
								class="max-h-[68vh] w-full rounded-lg object-contain"
								draggable={false}
							/>
							{#if image.caption}
								<p
									class="pointer-events-none mt-3 w-full max-w-[min(90vw,36rem)] truncate text-center text-sm text-foreground/85"
								>
									{image.caption}
								</p>
							{/if}
						</div>
					{/each}
				</div>
			</div>

			<!-- Prev / Next chevrons -->
			{#if images.length > 1}
				<button
					type="button"
					class="absolute top-1/2 left-4 -translate-y-1/2 cursor-pointer rounded-full p-2 text-foreground/70 transition-all hover:bg-foreground/10 hover:text-foreground disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-foreground/70"
					disabled={index <= 0}
					onclick={(event) => {
						event.stopPropagation();
						navigateLightbox(-1);
					}}
					aria-label="Previous image"
				>
					<ChevronLeft class="h-5 w-5" />
				</button>
				<button
					type="button"
					class="absolute top-1/2 right-4 -translate-y-1/2 cursor-pointer rounded-full p-2 text-foreground/70 transition-all hover:bg-foreground/10 hover:text-foreground disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-foreground/70"
					disabled={index >= images.length - 1}
					onclick={(event) => {
						event.stopPropagation();
						navigateLightbox(1);
					}}
					aria-label="Next image"
				>
					<ChevronRight class="h-5 w-5" />
				</button>
			{/if}
		</div>

		<!-- Position dots: active is a white pill, rest are small circles -->
		{#if images.length > 1}
			<div
				class="flex items-center justify-center gap-1.5"
				role="group"
				aria-label="Image position"
				data-gallery-content
			>
				{#each visibleDotIndices as i (i)}
					<button
						type="button"
						aria-current={i === index ? 'true' : undefined}
						aria-label="Go to image {i + 1} of {images.length}"
						onclick={(event) => {
							event.stopPropagation();
							goToLightbox(i);
						}}
						class="h-1.5 rounded-full transition-all duration-300 {i === index
							? 'w-6 bg-white'
							: 'w-1.5 bg-white/40 hover:bg-white/70'}"
					></button>
				{/each}
			</div>
		{/if}
	</div>
{/if}
