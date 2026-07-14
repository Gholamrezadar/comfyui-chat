const SELECTED_WORKFLOW_KEY = 'selectedWorkflowId';

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
