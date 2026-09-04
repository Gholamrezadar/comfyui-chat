import type { WorkflowOverride } from './workflow.service';

export const PRESET_VALUES = ['PROMPT', 'IMAGE1', 'IMAGE2', 'IMAGE3', 'IMAGE4', 'SEED', 'WIDTH', 'HEIGHT'];
const IMAGE_PRESETS = ['IMAGE1', 'IMAGE2', 'IMAGE3', 'IMAGE4'] as const;

function base64ToBlob(base64: string, mimeType: string): Blob {
	const raw = base64.includes(',') ? base64.split(',')[1] : base64;
	const byteChars = atob(raw);
	const byteNumbers = new Array(byteChars.length);
	for (let i = 0; i < byteChars.length; i++) {
		byteNumbers[i] = byteChars.charCodeAt(i);
	}
	return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
}

function getMimeType(base64: string): string {
	if (base64.includes('image/png')) return 'image/png';
	if (base64.includes('image/jpeg') || base64.includes('image/jpg')) return 'image/jpeg';
	if (base64.includes('image/webp')) return 'image/webp';
	if (base64.includes('image/gif')) return 'image/gif';
	return 'image/png';
}

export async function uploadImages(
	images: string[],
	serverUrl: string
): Promise<Map<string, string>> {
	const nameMap = new Map<string, string>();

	const serverBase = serverUrl.replace(/\/+$/, '');
	const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
	let uploadBase = serverBase;

	// Keep the dev proxy for local development, but use the configured URL
	// when the UI is hosted remotely (for example, on Vercel).
	if (typeof window !== 'undefined' && localHosts.has(window.location.hostname)) {
		try {
			if (localHosts.has(new URL(serverBase).hostname)) uploadBase = '/comfyui-api';
		} catch {
			// The workflow URL is validated before generation.
		}
	}

	const tasks = images.map(async (image, i) => {
		const isDataUrl = image.startsWith('data:');
		const isHttpUrl = image.startsWith('http://') || image.startsWith('https://');

		let blob: Blob;
		let ext: string;

		if (isDataUrl) {
			const mimeType = getMimeType(image);
			ext = mimeType.split('/')[1] === 'jpeg' ? 'jpg' : mimeType.split('/')[1];
			blob = base64ToBlob(image, mimeType);
		} else if (isHttpUrl) {
			const response = await fetch(image);
			if (!response.ok) {
				throw new Error(`Failed to fetch image: HTTP ${response.status}`);
			}
			blob = await response.blob();
			const mimeType = blob.type || 'image/png';
			ext = mimeType.split('/')[1] === 'jpeg' ? 'jpg' : mimeType.split('/')[1];
		} else {
			throw new Error(`Unsupported image format: ${image.slice(0, 50)}`);
		}

		const filename = `chat_input_${Date.now()}_${i}.${ext}`;

		const formData = new FormData();
		formData.append('image', blob, filename);
		formData.append('type', 'input');
		formData.append('overwrite', 'true');

		const uploadResponse = await fetch(`${uploadBase}/upload/image`, {
			method: 'POST',
			body: formData
		});

		if (!uploadResponse.ok) {
			throw new Error(`Image upload failed: HTTP ${uploadResponse.status}`);
		}

		const result = await uploadResponse.json();
		nameMap.set(image, result.name);
	});

	await Promise.all(tasks);
	return nameMap;
}

export function validateImageOverrides(
	overrides: WorkflowOverride[],
	providedImages: string[]
): string | null {
	const required = overrides.filter((o) => IMAGE_PRESETS.includes(o.value as typeof IMAGE_PRESETS[number]));
	const requiredCount = required.length;
	const providedCount = providedImages.length;

	if (requiredCount > 0 && providedCount === 0) {
		return `Workflow requires ${requiredCount} image(s) (${required.map((r) => r.value).join(', ')}) but none were provided`;
	}

	if (requiredCount === 0 && providedCount > 0) {
		return 'Images were provided but the workflow has no image overrides (IMAGE1-IMAGE4). Remove the images or add image overrides to the workflow';
	}

	if (providedCount < requiredCount) {
		return `Workflow requires ${requiredCount} image(s) (${required.map((r) => r.value).join(', ')}) but only ${providedCount} were provided`;
	}

	return null;
}

function setDeep(obj: Record<string, unknown>, path: string, value: unknown): void {
	const parts = path.split('.');
	let cur: Record<string, unknown> = obj;
	for (let j = 0; j < parts.length - 1; j++) {
		if (!(parts[j] in cur)) cur[parts[j]] = {};
		cur = cur[parts[j]] as Record<string, unknown>;
	}
	cur[parts.at(-1)!] = value;
}

export function mergeWorkflow(
	workflowJson: string,
	overrides: WorkflowOverride[],
	promptText: string,
	uploadedImageNames?: string[],
	generationOptions: { seed: number; width: number; height: number } = {
		seed: 3,
		width: 1024,
		height: 1024
	}
): Record<string, unknown> {
	const parsed: Record<string, unknown> = JSON.parse(workflowJson);

	// Uploaded images are assigned to IMAGE1, IMAGE2, IMAGE3, and IMAGE4 in
	// the same order they appear in the chat input.
	const imageMap = new Map<string, string>();
	if (uploadedImageNames) {
		uploadedImageNames.forEach((name, i) => {
			imageMap.set(`IMAGE${i + 1}`, name);
		});
	}

	for (const o of overrides) {
		if (!o.path) continue;

		// Resolve the selected built-in token into the value that should be
		// written to the workflow. All other values are literal user input.
		let value: string | number;

		// PROMPT receives the final prompt text, including any replied text
		// that was prepended before this function was called.
		if (o.value === 'PROMPT') {
			value = promptText;
		// IMAGE1-IMAGE4 receive the filenames returned by ComfyUI after the
		// chat images have been uploaded.
		} else if (IMAGE_PRESETS.includes(o.value as typeof IMAGE_PRESETS[number]) && imageMap.has(o.value)) {
			value = imageMap.get(o.value)!;
		// Temporary defaults for the built-in generation controls. These will
		// later be replaced with values supplied by the UI.
		} else if (o.value === 'SEED') {
			value = generationOptions.seed;
		} else if (o.value === 'WIDTH') {
			value = generationOptions.width;
		} else if (o.value === 'HEIGHT') {
			value = generationOptions.height;
		} else {
			// Custom overrides keep the literal value entered in the builder.
			value = o.value;
		}
		setDeep(parsed, o.path, value);
	}

	return parsed;
}
