import type { OutputImage } from './comfyui-client';

type EventCallback = (...args: unknown[]) => void;

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateUUID(): string {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
	});
}

// ── Hand-picked palettes — preview + final share the same color per generation ──

type Palette = { name: string; dark: string; mid: string; light: string };

const PALETTES: Palette[] = [
	{ name: 'blue', dark: '#1a365d', mid: '#2b6cb0', light: '#63b3ed' },
	{ name: 'green', dark: '#1a4731', mid: '#2f855a', light: '#48bb78' },
	{ name: 'red', dark: '#742a2a', mid: '#c53030', light: '#fc8181' },
	{ name: 'orange', dark: '#7b341e', mid: '#dd6b20', light: '#fbd38d' },
	{ name: 'purple', dark: '#322659', mid: '#6b46c1', light: '#b794f6' }
];

function pickRandomPalette(): Palette {
	return PALETTES[Math.floor(Math.random() * PALETTES.length)];
}

function blobToDataUrl(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => resolve(reader.result as string);
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
}

// ── Mock image generation using Canvas API ────────────────────────────────

function generatePreviewImage(progress = 0, palette: Palette = PALETTES[0]): Promise<Blob> {
	return new Promise((resolve) => {
		const canvas = document.createElement('canvas');
		canvas.width = 512;
		canvas.height = 512;
		const ctx = canvas.getContext('2d')!;

		const blur = Math.max(0, (1 - progress) * 40);
		ctx.filter = blur > 0.1 ? `blur(${blur}px)` : 'none';

		// Radial gradient background — same as final but smaller canvas
		const gradient = ctx.createRadialGradient(256, 256, 50, 256, 256, 300);
		gradient.addColorStop(0, palette.mid);
		gradient.addColorStop(0.5, palette.mid);
		gradient.addColorStop(1, palette.dark);
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, 512, 512);

		// Zigzag lines — same pattern as final
		ctx.globalAlpha = 0.12;
		ctx.strokeStyle = '#ffffff';
		ctx.lineWidth = 1;
		for (let i = 0; i < 8; i++) {
			const y = 50 + i * 60;
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(512, y + (i % 2 === 0 ? 20 : -20));
			ctx.stroke();
		}

		// Circles — matching final positioning (scaled 0.5x)
		ctx.globalAlpha = 0.1;
		ctx.fillStyle = '#ffffff';
		ctx.beginPath();
		ctx.arc(150, 200, 100, 0, Math.PI * 2);
		ctx.fill();
		ctx.beginPath();
		ctx.arc(375, 300, 75, 0, Math.PI * 2);
		ctx.fill();

		// Diamond — centered
		if (progress > 0.3) {
			ctx.globalAlpha = (progress - 0.3) * 0.12;
			ctx.fillStyle = '#ffffff';
			ctx.beginPath();
			ctx.moveTo(256, 100);
			ctx.lineTo(306, 150);
			ctx.lineTo(256, 200);
			ctx.lineTo(206, 150);
			ctx.closePath();
			ctx.fill();
		}

		// Reset filter for crisp text
		ctx.filter = 'none';

		// Label
		ctx.globalAlpha = 0.25 + progress * 0.45;
		ctx.fillStyle = '#ffffff';
		ctx.font = 'bold 28px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText('Generating...', 256, 250);
		if (progress > 0) {
			ctx.globalAlpha = 0.5;
			ctx.font = '16px sans-serif';
			ctx.fillText(`${Math.round(progress * 100)}%`, 256, 280);
		}

		canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.7);
	});
}

function generateFinalImage(palette: Palette = PALETTES[0]): Promise<Blob> {
	return new Promise((resolve) => {
		const canvas = document.createElement('canvas');
		canvas.width = 1024;
		canvas.height = 1024;
		const ctx = canvas.getContext('2d')!;

		// Gradient background — toned-down center glow
		const gradient = ctx.createRadialGradient(512, 512, 100, 512, 512, 600);
		gradient.addColorStop(0, palette.mid);
		gradient.addColorStop(0.3, palette.mid);
		gradient.addColorStop(1, palette.dark);
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, 1024, 1024);

		// Geometric patterns
		ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
		ctx.lineWidth = 2;
		for (let i = 0; i < 8; i++) {
			const y = 100 + i * 120;
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(1024, y + (i % 2 === 0 ? 40 : -40));
			ctx.stroke();
		}

		// Circles
		ctx.globalAlpha = 0.1;
		ctx.fillStyle = '#ffffff';
		ctx.beginPath();
		ctx.arc(300, 400, 200, 0, Math.PI * 2);
		ctx.fill();
		ctx.beginPath();
		ctx.arc(750, 600, 150, 0, Math.PI * 2);
		ctx.fill();

		// Diamond accents
		ctx.globalAlpha = 0.08;
		ctx.beginPath();
		ctx.moveTo(512, 200);
		ctx.lineTo(612, 300);
		ctx.lineTo(512, 400);
		ctx.lineTo(412, 300);
		ctx.closePath();
		ctx.fill();

		// Label
		ctx.globalAlpha = 0.35;
		ctx.fillStyle = '#ffffff';
		ctx.font = 'bold 36px sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText('Mock Generated Image', 512, 520);
		ctx.font = '20px sans-serif';
		ctx.fillText('(Demo Mode)', 512, 560);

		canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.9);
	});
}

// ── Mock ComfyUIClient ───────────────────────────────────────────────────

export class MockComfyUIClient {
	private _serverUrl: string;
	private _clientId: string;
	private _listeners: Record<string, EventCallback[]> = {};
	private _lastPreviewUrl: string | null = null;
	private _mockOutputUrl: string | null = null;
	private _connected = false;
	private _cancelled = false;

	constructor(serverUrl: string) {
		this._serverUrl = serverUrl.replace(/\/+$/, '');
		this._clientId = generateUUID();
	}

	get clientId(): string {
		return this._clientId;
	}

	get serverUrl(): string {
		return this._serverUrl;
	}

	get isConnected(): boolean {
		return this._connected;
	}

	setServerUrl(url: string): void {
		this.disconnect();
		this._serverUrl = url.replace(/\/+$/, '');
	}

	// ── Event system (same as ComfyUIClient) ──────────────────────────────

	on(event: string, callback: EventCallback): this {
		if (!this._listeners[event]) this._listeners[event] = [];
		this._listeners[event].push(callback);
		return this;
	}

	off(event: string, callback?: EventCallback): this {
		if (!callback) {
			this._listeners[event] = [];
			return this;
		}
		const list = this._listeners[event];
		if (list) this._listeners[event] = list.filter((fn) => fn !== callback);
		return this;
	}

	private _emit(event: string, ...args: unknown[]): void {
		(this._listeners[event] || []).forEach((fn) => {
			try {
				fn(...args);
			} catch (e) {
				console.error(`[MockComfyUIClient] error in "${event}" handler:`, e);
			}
		});
	}

	// ── Connection ────────────────────────────────────────────────────────

	connect(): Promise<void> {
		this._connected = true;
		this._emit('connected');
		return Promise.resolve();
	}

	disconnect(): void {
		this._connected = false;
		this._cancelled = false;
		this._emit('disconnected');
	}

	// ── HTTP API (mocked) ─────────────────────────────────────────────────

	async submitPrompt(workflow: Record<string, unknown>): Promise<{ promptId: string; number: number }> {
		const promptId = generateUUID();
		const number = Math.floor(Math.random() * 1000) + 1;

		// Start the mock execution sequence asynchronously
		this._simulateExecution(promptId);

		return { promptId, number };
	}

	async interrupt(): Promise<void> {
		this._cancelled = true;
	}

	async fetchHistory(_promptId: string): Promise<Record<string, unknown>> {
		return {
			outputs: {
				'3': {
					images: [{ filename: 'mock_output.jpg', subfolder: '', type: 'output' }]
				}
			}
		};
	}

	getImageUrl(_filename: string, _subfolder = '', _type = 'output'): string {
		return this._mockOutputUrl ?? '';
	}

	collectOutputImages(historyEntry: Record<string, unknown>): (OutputImage & { nodeId: string })[] {
		const outputs = (historyEntry?.outputs ?? {}) as Record<string, { images?: OutputImage[] }>;
		const images: (OutputImage & { nodeId: string })[] = [];
		for (const [nodeId, nodeOut] of Object.entries(outputs)) {
			for (const img of nodeOut.images ?? []) {
				images.push({ ...img, nodeId });
			}
		}
		return images;
	}

	revokePreview(): void {
		if (this._lastPreviewUrl) {
			URL.revokeObjectURL(this._lastPreviewUrl);
			this._lastPreviewUrl = null;
		}
	}

	// ── Mock execution simulation ─────────────────────────────────────────

	private async _simulateExecution(promptId: string): Promise<void> {
		this._cancelled = false;

		// Pick one palette for this entire generation — preview + final share it
		const palette = pickRandomPalette();

		// Pre-generate final image only; previews are generated progressively
		const finalBlob = await generateFinalImage(palette);
		this._mockOutputUrl = await blobToDataUrl(finalBlob);

		// 1. execution_start
		this._emit('start', promptId);
		await sleep(150);
		if (this._cancelled) return this._emitError('Interrupted');

		// 2. execution_cached
		this._emit('cached', 2);
		await sleep(100);
		if (this._cancelled) return this._emitError('Interrupted');

		// 3. executing node 3 (sampler)
		this._emit('executing', '3');
		await sleep(100);
		if (this._cancelled) return this._emitError('Interrupted');

		// 4. progress events with preview — blur decreases each step
		const totalSteps = 10;
		for (let step = 1; step <= totalSteps; step++) {
			if (this._cancelled) return this._emitError('Interrupted');

			this._emit('progress', step, totalSteps, Math.round((step / totalSteps) * 100));

			// Generate a new preview where blur = (1 - progress) * 14px, same palette as final
			const progress = step / totalSteps;
			const previewBlob = await generatePreviewImage(progress, palette);
			const previewUrl = URL.createObjectURL(previewBlob);
			if (this._lastPreviewUrl) URL.revokeObjectURL(this._lastPreviewUrl);
			this._lastPreviewUrl = previewUrl;
			this._emit('preview', previewUrl);

			await sleep(300);
		}

		// 5. executed — output images
		this._emit('executed', '3', [
			{ filename: 'mock_output.jpg', subfolder: '', type: 'output' }
		]);
		await sleep(100);

		// 6. executing null — done
		this._emit('done', promptId);
	}

	private _emitError(message: string): void {
		this._emit('error:exec', message);
	}
}
