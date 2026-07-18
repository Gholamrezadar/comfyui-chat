import type { WorkflowOverride } from './workflow.service';

/**
 * Set a value at a dot-notation path in an object.
 * E.g. setDeep(obj, "6.inputs.text", "hello") → obj[6].inputs.text = "hello"
 */
function setDeep(obj: Record<string, unknown>, path: string, value: unknown): void {
	const parts = path.split('.');
	let cur: Record<string, unknown> = obj;
	for (let j = 0; j < parts.length - 1; j++) {
		if (!(parts[j] in cur)) cur[parts[j]] = {};
		cur = cur[parts[j]] as Record<string, unknown>;
	}
	cur[parts.at(-1)!] = value;
}

/**
 * Merge a workflow JSON string with overrides and the user's prompt text.
 *
 * 1. Parses the workflow JSON
 * 2. Applies each override at its dot-notation path
 * 3. Any override with value "PROMPT" is replaced with the actual user prompt text
 *
 * Returns the merged workflow object ready for ComfyUIClient.submitPrompt().
 */
export function mergeWorkflow(
	workflowJson: string,
	overrides: WorkflowOverride[],
	promptText: string
): Record<string, unknown> {
	const parsed: Record<string, unknown> = JSON.parse(workflowJson);

	for (const o of overrides) {
		if (!o.path) continue;
		const value = o.value === 'PROMPT' ? promptText : o.value;
		setDeep(parsed, o.path, value);
	}

	return parsed;
}
