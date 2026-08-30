import { type Workflow } from '$lib/services/workflow.service';
import * as workflowService from '$lib/services/workflow.service';

function createWorkflowStore() {
	let workflows = $state<Workflow[]>([]);
	let activeId = $state<string | null>(null);

	const activeWorkflow = $derived(
		workflows.find((w) => w.id === activeId) ?? null
	);

	async function init() {
		workflows = await workflowService.loadWorkflows();
	}

	function selectWorkflow(id: string | null) {
		activeId = id;
	}

	function newWorkflow() {
		const wf = workflowService.createWorkflow();
		workflows = [wf, ...workflows];
		activeId = wf.id;
	}

	async function saveWorkflow(workflow: Workflow) {
		const updated = { ...workflow, updatedAt: Date.now() };
		await workflowService.saveWorkflow(updated);
		workflows = workflows.map((w) => (w.id === updated.id ? updated : w));
	}

	async function cloneWorkflow(workflow: Workflow, name: string) {
		const clone = {
			...workflowService.createWorkflow(),
			name,
			base_url: workflow.base_url,
			workflow: workflow.workflow,
			overrides: workflow.overrides.map((override) => ({ ...override }))
		};
		await workflowService.saveWorkflow(clone);
		workflows = [clone, ...workflows];
		activeId = clone.id;
	}

	async function deleteWorkflow(id: string) {
		await workflowService.deleteWorkflow(id);
		workflows = workflows.filter((w) => w.id !== id);
		if (activeId === id) {
			activeId = workflows[0]?.id ?? null;
		}
	}

	return {
		get workflows() { return workflows; },
		get activeId() { return activeId; },
		get activeWorkflow() { return activeWorkflow; },
		init,
		selectWorkflow,
		newWorkflow,
		saveWorkflow,
		cloneWorkflow,
		deleteWorkflow
	};
}

export const workflowStore = createWorkflowStore();
