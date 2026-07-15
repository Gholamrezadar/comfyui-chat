import Dexie, { type Table } from 'dexie';

export interface WorkflowOverride {
	path: string;
	value: string;
}

export interface Workflow {
	id: string;
	name: string;
	base_url: string;
	workflow: string;
	overrides: WorkflowOverride[];
	createdAt: number;
	updatedAt: number;
}

class WorkflowDatabase extends Dexie {
	workflows!: Table<Workflow, string>;

	constructor() {
		super('comfyui-chat-workflows');
		this.version(1).stores({
			workflows: 'id, updatedAt'
		});
		this.version(2).stores({
			workflows: 'id, updatedAt'
		});
	}
}

const db = new WorkflowDatabase();

function uid(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function loadWorkflows(): Promise<Workflow[]> {
	try {
		const all = await db.workflows.toArray();
		return all.sort((a, b) => b.updatedAt - a.updatedAt);
	} catch {
		return [];
	}
}

export async function saveWorkflow(workflow: Workflow): Promise<void> {
	try {
		await db.workflows.put(workflow);
	} catch {
		// Silently ignore IndexedDB errors
	}
}

export async function deleteWorkflow(id: string): Promise<void> {
	try {
		await db.workflows.delete(id);
	} catch {
		// Ignore
	}
}

export function createWorkflow(): Workflow {
	return {
		id: uid(),
		name: '',
		base_url: '',
		workflow: '',
		overrides: [],
		createdAt: Date.now(),
		updatedAt: Date.now()
	};
}
