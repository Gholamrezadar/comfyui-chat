/**
 * ComfyUI TypeScript client — ported from comfyui-api.js
 *
 * Handles WebSocket connection, binary preview frame parsing,
 * JSON event dispatch, and HTTP API calls to a local ComfyUI server.
 */

export interface OutputImage {
	filename: string;
	subfolder: string;
	type: string;
}

type EventCallback = (...args: unknown[]) => void;

export class ComfyUIClient {
	private _serverUrl: string;
	private _clientId: string;
	private _ws: WebSocket | null = null;
	private _listeners: Record<string, EventCallback[]> = {};
	private _lastPreviewUrl: string | null = null;

	constructor(serverUrl: string) {
		this._serverUrl = serverUrl.replace(/\/+$/, '');
		this._clientId = ComfyUIClient.generateUUID();
	}

	get clientId(): string {
		return this._clientId;
	}

	get serverUrl(): string {
		return this._serverUrl;
	}

	get isConnected(): boolean {
		return this._ws?.readyState === WebSocket.OPEN;
	}

	setServerUrl(url: string): void {
		this.disconnect();
		this._serverUrl = url.replace(/\/+$/, '');
	}

	// ── Event system ─────────────────────────────────────────────────────────

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
				console.error(`[ComfyUIClient] error in "${event}" handler:`, e);
			}
		});
	}

	// ── Connection ───────────────────────────────────────────────────────────

	connect(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (this._ws) {
				this._ws.onclose = null;
				this._ws.close();
			}

			const wsUrl = this._serverUrl.replace(/^http/, 'ws') + `/ws?clientId=${this._clientId}`;
			this._ws = new WebSocket(wsUrl);
			this._ws.binaryType = 'arraybuffer';

			this._ws.onopen = () => {
				this._emit('connected');
				resolve();
			};

			this._ws.onerror = () => {
				this._emit('error', 'WebSocket connection error');
				reject(new Error('WebSocket connection failed'));
			};

			this._ws.onclose = () => {
				this._emit('disconnected');
			};

			this._ws.onmessage = (event) => this._handleMessage(event);
		});
	}

	disconnect(): void {
		if (this._ws) {
			this._ws.onclose = null;
			this._ws.close();
			this._ws = null;
		}
	}

	// ── Message handling ─────────────────────────────────────────────────────

	private _handleMessage(event: MessageEvent): void {
		if (event.data instanceof ArrayBuffer) {
			this._handleBinaryFrame(event.data);
			return;
		}
		if (event.data instanceof Blob) {
			event.data.arrayBuffer().then((buf) => this._handleBinaryFrame(buf));
			return;
		}

		if (typeof event.data !== 'string') return;
		let msg: { type: string; data: Record<string, unknown> };
		try {
			msg = JSON.parse(event.data);
		} catch {
			return;
		}

		const { type, data } = msg;

		switch (type) {
			case 'status': {
				const statusData = data?.status as Record<string, unknown> | undefined;
				const execInfo = statusData?.exec_info as Record<string, unknown> | undefined;
				const q = execInfo?.queue_remaining;
				if (q !== undefined) this._emit('status', q);
				break;
			}
			case 'execution_start':
				this._emit('start', data.prompt_id);
				break;
			case 'execution_cached':
				this._emit('cached', (data.nodes as unknown[])?.length ?? 0);
				break;
			case 'executing':
				if (data.node === null) {
					this._emit('done', data.prompt_id);
				} else {
					this._emit('executing', String(data.node));
				}
				break;
			case 'progress': {
				const value = data.value as number;
				const max = data.max as number;
				const pct = Math.round((value / max) * 100);
				this._emit('progress', value, max, pct);
				break;
			}
			case 'executed': {
				const outputData = data?.output as Record<string, unknown> | undefined;
				const images = (outputData?.images as OutputImage[]) ?? [];
				this._emit('executed', String(data.node), images);
				break;
			}
			case 'execution_error':
				this._emit('error:exec', data.exception_message);
				break;
			case 'execution_interrupted':
				this._emit('error:exec', 'Interrupted');
				break;
		}
	}

	// ── Binary frame parsing (preview images) ────────────────────────────────

	private _handleBinaryFrame(buffer: ArrayBuffer): void {
		if (buffer.byteLength < 4) return;

		const view = new DataView(buffer);

		const frameType = view.getUint32(0, false);
		if (frameType === 1) {
			if (buffer.byteLength < 8) return;
			const imageType = view.getUint32(4, false);
			const mime = imageType === 1 ? 'image/jpeg' : 'image/png';
			const imageBytes = buffer.slice(8);
			this._emitPreview(imageBytes, mime);
			return;
		}

		const firstByte = view.getUint8(0);
		if (firstByte === 1 && buffer.byteLength > 4) {
			const imageBytes = buffer.slice(4);
			const peek = new Uint8Array(imageBytes, 0, Math.min(4, imageBytes.byteLength));
			let mime: string;
			if (peek[0] === 0x89 && peek[1] === 0x50 && peek[2] === 0x4e && peek[3] === 0x47) {
				mime = 'image/png';
			} else if (peek[0] === 0xff && peek[1] === 0xd8 && peek[2] === 0xff) {
				mime = 'image/jpeg';
			} else {
				return;
			}
			this._emitPreview(imageBytes, mime);
		}
	}

	private _emitPreview(imageBytes: ArrayBuffer, mime: string): void {
		const blob = new Blob([imageBytes], { type: mime });
		const url = URL.createObjectURL(blob);
		if (this._lastPreviewUrl) URL.revokeObjectURL(this._lastPreviewUrl);
		this._lastPreviewUrl = url;
		this._emit('preview', url);
	}

	revokePreview(): void {
		if (this._lastPreviewUrl) {
			URL.revokeObjectURL(this._lastPreviewUrl);
			this._lastPreviewUrl = null;
		}
	}

	// ── HTTP API ─────────────────────────────────────────────────────────────

	async submitPrompt(workflow: Record<string, unknown>): Promise<{ promptId: string; number: number }> {
		const resp = await fetch(`${this._serverUrl}/prompt`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ prompt: workflow, client_id: this._clientId })
		});

		if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);

		const result = await resp.json();

		if (result.error) {
			const err = new Error(`Server error: ${result.error}`);
			(err as Error & { nodeErrors: unknown }).nodeErrors = result.node_errors;
			throw err;
		}

		return { promptId: result.prompt_id, number: result.number };
	}

	async interrupt(): Promise<void> {
		await fetch(`${this._serverUrl}/interrupt`, { method: 'POST' });
	}

	async fetchHistory(promptId: string): Promise<Record<string, unknown>> {
		const resp = await fetch(`${this._serverUrl}/history/${promptId}`);
		if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
		const data = await resp.json();
		return data[promptId] ?? {};
	}

	getImageUrl(filename: string, subfolder = '', type = 'output'): string {
		const params = new URLSearchParams({ filename, subfolder, type });
		return `${this._serverUrl}/view?${params}`;
	}

	collectOutputImages(historyEntry: Record<string, unknown>): (OutputImage & { nodeId: string })[] {
		const outputs = (historyEntry?.outputs ?? {}) as Record<
			string,
			{ images?: OutputImage[] }
		>;
		const images: (OutputImage & { nodeId: string })[] = [];
		for (const [nodeId, nodeOut] of Object.entries(outputs)) {
			for (const img of nodeOut.images ?? []) {
				images.push({ ...img, nodeId });
			}
		}
		return images;
	}

	// ── Utilities ────────────────────────────────────────────────────────────

	static generateUUID(): string {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
			const r = (Math.random() * 16) | 0;
			return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
		});
	}

	static fmtDuration(ms: number): string {
		const s = Math.floor(ms / 1000);
		if (s < 60) return `${s}s`;
		const m = Math.floor(s / 60);
		return `${m}m ${s % 60}s`;
	}
}
