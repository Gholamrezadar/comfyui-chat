const SELECTED_WORKFLOW_KEY = 'selectedWorkflowId';
const GENERATION_SETTINGS_KEY = 'generationSettings';

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
