// Centralized keyboard shortcuts definition
// Each shortcut has a readable label, the key combo, and an optional group for the modal

export interface Shortcut {
	label: string;
	keys: string[];
	ctrl?: boolean;
	shift?: boolean;
	alt?: boolean;
	group: string;
}

export const shortcuts: Shortcut[] = [
	{ label: 'New Chat', keys: ['O'], ctrl: true, shift: true, group: 'Chat' },
	{ label: 'Search', keys: ['K'], ctrl: true, group: 'Navigation' },
	{ label: 'Toggle Sidebar', keys: ['/'], ctrl: true, group: 'Navigation' },
	{ label: 'Settings', keys: ['S'], ctrl: true, shift: true, group: 'General' },
	{ label: 'Toggle Theme', keys: ['H'], ctrl: true, shift: true, group: 'General' },
	{ label: 'Keyboard Shortcuts', keys: ['/', '?'], ctrl: true, shift: true, group: 'General' },
	{ label: 'Send Message', keys: ['Enter'], group: 'Chat' },
	{ label: 'New Line', keys: ['Shift', 'Enter'], group: 'Chat' },
];

// Helper to format a shortcut for display
export function formatShortcut(shortcut: Shortcut): string {
	const parts: string[] = [];
	if (shortcut.ctrl) parts.push('Ctrl');
	if (shortcut.shift) parts.push('Shift');
	if (shortcut.alt) parts.push('Alt');
	parts.push(...shortcut.keys.map((k) => k.toUpperCase()));
	return parts.join(' + ');
}

// Check if a keyboard event matches a shortcut
export function matchesShortcut(e: KeyboardEvent, shortcut: Shortcut): boolean {
	const ctrl = e.ctrlKey || e.metaKey;
	if (shortcut.ctrl !== undefined && shortcut.ctrl !== ctrl) return false;
	if (shortcut.shift !== undefined && shortcut.shift !== e.shiftKey) return false;
	if (shortcut.alt !== undefined && shortcut.alt !== e.altKey) return false;
	const key = e.key.toLowerCase();
	return shortcut.keys.some((k) => k.toLowerCase() === key);
}
