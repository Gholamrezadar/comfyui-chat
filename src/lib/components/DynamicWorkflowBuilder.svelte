<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { X, Plus, ChevronDown } from 'lucide-svelte';
	import type { WorkflowOverride } from '$lib/services/workflow.service';

	let {
		workflowText = '',
		initialOverrides = [],
		onOverridesChange
	}: {
		workflowText: string;
		initialOverrides?: WorkflowOverride[];
		onOverridesChange?: (overrides: WorkflowOverride[]) => void;
	} = $props();

	interface OverrideRow {
		id: number;
		path: string;
		value: string;
	}
	let rows = $state<OverrideRow[]>(initialOverrides.map((o, i) => ({ id: i, path: o.path, value: o.value })));
	let idSeq = $state(initialOverrides.length);
	let openPresetRowId = $state<number | null>(null);

	const PRESET_VALUES = ['PROMPT', 'IMAGE1', 'IMAGE2', 'IMAGE3', 'IMAGE4'];

	export function addRowAtOffset(offset: number) {
		const path = pathAtOffset(workflowText, offset);
		if (path) rows = [...rows, { id: idSeq++, path, value: '' }];
	}

	function addRow() {
		rows = [...rows, { id: idSeq++, path: '', value: '' }];
	}

	function removeRow(id: number) {
		rows = rows.filter((r) => r.id !== id);
	}

	function pathAtOffset(jsonText: string, offset: number): string | null {
		let i = 0;
		const pathStack: (string | number)[] = [];
		const tokens: { path: string; start: number }[] = [];

		function skipWs() {
			while (i < jsonText.length && /\s/.test(jsonText[i])) i++;
		}

		function readString(): { start: number; end: number } {
			const start = i;
			i++;
			while (i < jsonText.length) {
				if (jsonText[i] === '\\') {
					i += 2;
					continue;
				}
				if (jsonText[i] === '"') {
					i++;
					break;
				}
				i++;
			}
			return { start, end: i };
		}

		function skipValue() {
			skipWs();
			const ch = jsonText[i];
			if (ch === '"') {
				readString();
			} else if (ch === '{') {
				readObject();
			} else if (ch === '[') {
				readArray();
			} else {
				while (i < jsonText.length && !',}]'.includes(jsonText[i]) && !/\s/.test(jsonText[i])) i++;
			}
		}

		function readObject() {
			i++;
			skipWs();
			while (i < jsonText.length && jsonText[i] !== '}') {
				skipWs();
				if (jsonText[i] !== '"') {
					i++;
					continue;
				}
				const { start, end } = readString();
				const key = jsonText.slice(start + 1, end - 1);
				pathStack.push(key);
				tokens.push({ path: pathStack.join('.'), start });
				skipWs();
				if (jsonText[i] === ':') i++;
				skipWs();
				skipValue();
				skipWs();
				if (jsonText[i] === ',') i++;
				skipWs();
				pathStack.pop();
			}
			if (jsonText[i] === '}') i++;
		}

		function readArray() {
			i++;
			let idx = 0;
			skipWs();
			while (i < jsonText.length && jsonText[i] !== ']') {
				pathStack.push(idx);
				skipValue();
				pathStack.pop();
				idx++;
				skipWs();
				if (jsonText[i] === ',') i++;
				skipWs();
			}
			if (jsonText[i] === ']') i++;
		}

		try {
			skipWs();
			if (jsonText[i] === '{') readObject();
			else if (jsonText[i] === '[') readArray();
		} catch {
			return null;
		}

		let result: { path: string; start: number } | null = null;
		for (const tok of tokens) {
			if (tok.start <= offset) result = tok;
			if (tok.start > offset) break;
		}
		return result?.path ?? null;
	}

	function setDeep(obj: Record<string, unknown>, path: string, value: unknown) {
		const parts = path.split('.');
		let cur: Record<string, unknown> = obj;
		for (let j = 0; j < parts.length - 1; j++) {
			if (!(parts[j] in cur)) cur[parts[j]] = {};
			cur = cur[parts[j]] as Record<string, unknown>;
		}
		cur[parts.at(-1)!] = value;
	}

	function generate(): string | null {
		try {
			const parsed = JSON.parse(workflowText);
			for (const r of rows) {
				if (!r.path) continue;
				setDeep(parsed, r.path, r.value);
			}
			const result = JSON.stringify(parsed, null, 2);
			console.log('[workflow-override]', result);
			return result;
		} catch {
			return null;
		}
	}

	$effect(() => {
		for (const r of rows) {
			void r.path;
			void r.value;
		}
		onOverridesChange?.(rows.map((r) => ({ path: r.path, value: r.value })));
	});
</script>

<svelte:window onclick={() => (openPresetRowId = null)} />

<div class="flex flex-col gap-1.5">
	<label class="text-sm font-medium text-foreground">
		Overrides
		<span class="text-xs font-normal text-muted-foreground">(double-click a field to override, use PROMPT for chat text)</span
		>
	</label>
	{#if rows.length > 0}
		<div class="flex flex-col gap-1.5">
			{#each rows as r (r.id)}
				<div class="flex items-center gap-1.5">
					<Input bind:value={r.path} placeholder="path" class="flex-1 font-mono text-xs" />
					<div class="relative flex-1">
						<Input bind:value={r.value} placeholder="value" class="pr-7 font-mono text-xs" />
						<button
							type="button"
							class="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded p-0.5 text-muted-foreground hover:text-foreground"
							onclick={(e) => {
								e.stopPropagation();
								openPresetRowId = openPresetRowId === r.id ? null : r.id;
							}}
						>
							<ChevronDown class="h-3.5 w-3.5" />
						</button>
						{#if openPresetRowId === r.id}
							<div
								class="absolute right-0 bottom-full z-50 mb-1 w-36 overflow-hidden rounded-xl border border-border bg-card shadow-lg"
								onclick={(e) => e.stopPropagation()}
							>
								{#each PRESET_VALUES as preset}
									<button
										type="button"
										class="flex w-full cursor-pointer px-3 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-accent"
										onclick={() => {
											r.value = preset;
											openPresetRowId = null;
										}}
									>
										{preset}
									</button>
								{/each}
							</div>
						{/if}
					</div>
					<Button
						variant="ghost"
						size="icon"
						class="h-7 w-7 shrink-0 cursor-pointer text-muted-foreground hover:text-destructive"
						onclick={() => removeRow(r.id)}
					>
						<X class="h-3.5 w-3.5" />
					</Button>
				</div>
			{/each}
		</div>
	{/if}
	<div class="flex w-full items-center justify-center gap-1.5">
		<Button
			variant="ghost"
			size="sm"
			class="w-32 cursor-pointer text-xs text-muted-foreground hover:text-foreground"
			onclick={() => addRow()}
		>
			<Plus class="mr-1 h-3 w-3" />
			Add override
		</Button>
	</div>
</div>
