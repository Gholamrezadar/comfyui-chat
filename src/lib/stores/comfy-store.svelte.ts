import { ComfyUIClient, type OutputImage } from '$lib/services/comfyui-client';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface GenerateResult {
	images: (OutputImage & { nodeId: string })[];
	imageUrls: string[];
}

function createComfyStore() {
	let client: ComfyUIClient | null = null;

	let connectionStatus = $state<ConnectionStatus>('disconnected');
	let isGenerating = $state(false);
	let progressValue = $state(0);
	let progressMax = $state(0);
	let progressPct = $state(0);
	let previewUrl = $state<string | null>(null);
	let currentPromptId = $state<string | null>(null);
	let error = $state<string | null>(null);
	let startTime = $state(0);
	let elapsed = $state(0);
	let eta = $state(0);
	let currentNode = $state<string | null>(null);

	let _timerInterval: ReturnType<typeof setInterval> | null = null;
	let _resolveGenerate: ((result: GenerateResult) => void) | null = null;
	let _rejectGenerate: ((err: Error) => void) | null = null;

	function connect(url: string): Promise<void> {
		if (client) {
			client.disconnect();
		}

		connectionStatus = 'connecting';
		error = null;
		client = new ComfyUIClient(url);

		client.on('connected', () => {
			connectionStatus = 'connected';
		});

		client.on('disconnected', () => {
			connectionStatus = 'disconnected';
		});

		client.on('error', (msg: unknown) => {
			connectionStatus = 'error';
			error = String(msg);
		});

		return client.connect();
	}

	function disconnect(): void {
		if (client) {
			client.disconnect();
			client = null;
		}
		connectionStatus = 'disconnected';
	}

	function _startTimer(): void {
		_stopTimer();
		startTime = Date.now();
		elapsed = 0;
		_timerInterval = setInterval(() => {
			elapsed = Date.now() - startTime;
		}, 100);
	}

	function _stopTimer(): void {
		if (_timerInterval) {
			clearInterval(_timerInterval);
			_timerInterval = null;
		}
	}

	function _resetState(): void {
		isGenerating = false;
		progressValue = 0;
		progressMax = 0;
		progressPct = 0;
		currentPromptId = null;
		currentNode = null;
		error = null;
		elapsed = 0;
		eta = 0;
		if (previewUrl) {
			// Don't revoke here — the component may still be displaying it
			previewUrl = null;
		}
		_stopTimer();
	}

	async function generate(
		serverUrl: string,
		workflow: Record<string, unknown>,
		onPreviewUrl?: (url: string) => void
	): Promise<GenerateResult> {
		_resetState();
		isGenerating = true;
		error = null;

		// Connect if needed
		if (!client || client.serverUrl !== serverUrl || !client.isConnected) {
			try {
				await connect(serverUrl);
			} catch (e) {
				isGenerating = false;
				connectionStatus = 'error';
				error = e instanceof Error ? e.message : 'Connection failed';
				throw e;
			}
		}

		return new Promise<GenerateResult>((resolve, reject) => {
			_resolveGenerate = resolve;
			_rejectGenerate = reject;

			const _onStart = (promptId: unknown) => {
				currentPromptId = String(promptId);
				_startTimer();
			};

			const _onCached = (nodeCount: unknown) => {
				// cached nodes — not critical to display
				void nodeCount;
			};

			const _onExecuting = (nodeId: unknown) => {
				currentNode = String(nodeId);
			};

			const _onProgress = (value: unknown, max: unknown, pct: unknown) => {
				progressValue = Number(value);
				progressMax = Number(max);
				progressPct = Number(pct);

				// Calculate ETA based on progress
				if (Number(pct) > 0) {
					const elapsedMs = Date.now() - startTime;
					const total = elapsedMs / (Number(pct) / 100);
					eta = Math.max(0, total - elapsedMs);
				}
			};

			const _onPreview = (url: unknown) => {
				previewUrl = String(url);
				onPreviewUrl?.(String(url));
			};

			const _onDone = async (promptId: unknown) => {
				_stopTimer();
				elapsed = Date.now() - startTime;

				// Cleanup event listeners
				if (client) {
					client.off('start', _onStart);
					client.off('cached', _onCached);
					client.off('executing', _onExecuting);
					client.off('progress', _onProgress);
					client.off('preview', _onPreview);
					client.off('done', _onDone);
					client.off('error:exec', _onErrorExec);
				}

				// Fetch history and collect output images
				try {
					const history = await client!.fetchHistory(String(promptId));
					const outputImages = client!.collectOutputImages(history);
					const imageUrls = outputImages.map((img) =>
						client!.getImageUrl(img.filename, img.subfolder, img.type)
					);

					isGenerating = false;
					_resolveGenerate?.({ images: outputImages, imageUrls });
				} catch (e) {
					isGenerating = false;
					error = e instanceof Error ? e.message : 'Failed to fetch history';
					_rejectGenerate?.(e instanceof Error ? e : new Error(String(e)));
				}
			};

			const _onErrorExec = (message: unknown) => {
				_stopTimer();
				isGenerating = false;
				error = String(message);

				if (client) {
					client.off('start', _onStart);
					client.off('cached', _onCached);
					client.off('executing', _onExecuting);
					client.off('progress', _onProgress);
					client.off('preview', _onPreview);
					client.off('done', _onDone);
					client.off('error:exec', _onErrorExec);
				}

				_rejectGenerate?.(new Error(String(message)));
			};

			// Register listeners
			client!.on('start', _onStart);
			client!.on('cached', _onCached);
			client!.on('executing', _onExecuting);
			client!.on('progress', _onProgress);
			client!.on('preview', _onPreview);
			client!.on('done', _onDone);
			client!.on('error:exec', _onErrorExec);

			// Submit the prompt
			client!
				.submitPrompt(workflow)
				.then((result) => {
					currentPromptId = result.promptId;
				})
				.catch((e) => {
					_stopTimer();
					isGenerating = false;
					error = e instanceof Error ? e.message : 'Submit failed';

					if (client) {
						client.off('start', _onStart);
						client.off('cached', _onCached);
						client.off('executing', _onExecuting);
						client.off('progress', _onProgress);
						client.off('preview', _onPreview);
						client.off('done', _onDone);
						client.off('error:exec', _onErrorExec);
					}

					_rejectGenerate?.(e instanceof Error ? e : new Error(String(e)));
				});
		});
	}

	async function cancel(): Promise<void> {
		if (client?.isConnected) {
			await client.interrupt();
		}
		_stopTimer();
		isGenerating = false;
	}

	return {
		get connectionStatus(): ConnectionStatus {
			return connectionStatus;
		},
		get isGenerating(): boolean {
			return isGenerating;
		},
		get progressValue(): number {
			return progressValue;
		},
		get progressMax(): number {
			return progressMax;
		},
		get progressPct(): number {
			return progressPct;
		},
		get previewUrl(): string | null {
			return previewUrl;
		},
		get currentPromptId(): string | null {
			return currentPromptId;
		},
		get error(): string | null {
			return error;
		},
		get elapsed(): number {
			return elapsed;
		},
		get eta(): number {
			return eta;
		},
		get currentNode(): string | null {
			return currentNode;
		},
		get client(): ComfyUIClient | null {
			return client;
		},

		connect,
		disconnect,
		generate,
		cancel
	};
}

export const comfyStore = createComfyStore();
