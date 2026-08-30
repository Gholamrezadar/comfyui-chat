import type { WorkflowOverride } from './workflow.service';

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
	uploadedImageNames?: string[]
): Record<string, unknown> {
	const parsed: Record<string, unknown> = JSON.parse(workflowJson);

	const imageMap = new Map<string, string>();
	if (uploadedImageNames) {
		uploadedImageNames.forEach((name, i) => {
			imageMap.set(`IMAGE${i + 1}`, name);
		});
	}

	for (const o of overrides) {
		if (!o.path) continue;
		let value: string;
		if (o.value === 'PROMPT') {
			value = promptText;
		} else if (IMAGE_PRESETS.includes(o.value as typeof IMAGE_PRESETS[number]) && imageMap.has(o.value)) {
			value = imageMap.get(o.value)!;
		} else {
			value = o.value;
		}
		setDeep(parsed, o.path, value);
	}

	return parsed;
}
