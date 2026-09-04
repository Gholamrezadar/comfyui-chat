const SELECTED_WORKFLOW_KEY = 'selectedWorkflowId';
const GENERATION_SETTINGS_KEY = 'generationSettings';
const CUSTOM_RESOLUTIONS_KEY = 'customResolutions';
const HIDDEN_RESOLUTIONS_KEY = 'hiddenResolutions';

export interface GenerationSettings {
	seed: number;
	width: number;
	height: number;
	randomizeEachTime: boolean;
}

export function loadSelectedWorkflowId(): string | null {
	return localStorage.getItem(SELECTED_WORKFLOW_KEY);
}

export function saveSelectedWorkflowId(id: string | null): void {
	if (id) {
		localStorage.setItem(SELECTED_WORKFLOW_KEY, id);
	} else {
		localStorage.removeItem(SELECTED_WORKFLOW_KEY);
	}
}

export function loadGenerationSettings(): Partial<GenerationSettings> {
	try {
		const stored = localStorage.getItem(GENERATION_SETTINGS_KEY);
		return stored ? (JSON.parse(stored) as Partial<GenerationSettings>) : {};
	} catch {
		return {};
	}
}

export function saveGenerationSettings(settings: GenerationSettings): void {
	localStorage.setItem(GENERATION_SETTINGS_KEY, JSON.stringify(settings));
}

export function loadCustomResolutions(): string[] {
	try { return JSON.parse(localStorage.getItem(CUSTOM_RESOLUTIONS_KEY) ?? '[]') as string[]; } catch { return []; }
}

export function saveCustomResolutions(resolutions: string[]): void {
	localStorage.setItem(CUSTOM_RESOLUTIONS_KEY, JSON.stringify(resolutions));
}

export function loadHiddenResolutions(): string[] {
	try { return JSON.parse(localStorage.getItem(HIDDEN_RESOLUTIONS_KEY) ?? '[]') as string[]; } catch { return []; }
}

export function saveHiddenResolutions(resolutions: string[]): void {
	localStorage.setItem(HIDDEN_RESOLUTIONS_KEY, JSON.stringify(resolutions));
}
