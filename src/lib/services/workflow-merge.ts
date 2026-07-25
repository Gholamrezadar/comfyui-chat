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
	base64Images: string[],
	serverUrl: string
): Promise<Map<string, string>> {
	const nameMap = new Map<string, string>();

	// Build proxy URL: "http://127.0.0.1:8188" → "/comfyui-api"
	const proxyBase = '/comfyui-api';

	const tasks = base64Images.map(async (base64, i) => {
		const mimeType = getMimeType(base64);
		const ext = mimeType.split('/')[1] === 'jpeg' ? 'jpg' : mimeType.split('/')[1];
		const filename = `chat_input_${Date.now()}_${i}.${ext}`;
		const blob = base64ToBlob(base64, mimeType);

		const formData = new FormData();
		formData.append('image', blob, filename);
		formData.append('type', 'input');
		formData.append('overwrite', 'true');

		const response = await fetch(`${proxyBase}/upload/image`, {
			method: 'POST',
			body: formData
		});

		if (!response.ok) {
			throw new Error(`Image upload failed: HTTP ${response.status}`);
		}

		const result = await response.json();
		nameMap.set(base64, result.name);
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
