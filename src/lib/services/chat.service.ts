// Types for the chat domain
export type Role = 'user' | 'assistant';

export interface Message {
	id: string;
	role: Role;
	content: string;
	timestamp: number;
}

export interface Conversation {
	id: string;
	title: string;
	messages: Message[];
	createdAt: number;
	updatedAt: number;
}

const STORAGE_KEY = 'comfyui-chat-conversations';
const ACTIVE_KEY = 'comfyui-chat-active-id';
const SIDEBAR_KEY = 'comfyui-chat-sidebar-open';

// Generate a simple unique id
function uid(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Load all conversations from localStorage
export function loadConversations(): Conversation[] {
	if (typeof localStorage === 'undefined') return [];
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}

// Persist all conversations to localStorage
export function saveConversations(conversations: Conversation[]): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
}

// Load the last active conversation id
export function loadActiveId(): string | null {
	if (typeof localStorage === 'undefined') return null;
	return localStorage.getItem(ACTIVE_KEY);
}

// Persist the active conversation id
export function saveActiveId(id: string | null): void {
	if (typeof localStorage === 'undefined') return;
	if (id === null) {
		localStorage.removeItem(ACTIVE_KEY);
	} else {
		localStorage.setItem(ACTIVE_KEY, id);
	}
}

// Create a brand-new conversation
export function createConversation(): Conversation {
	return {
		id: uid(),
		title: 'New Chat',
		messages: [],
		createdAt: Date.now(),
		updatedAt: Date.now()
	};
}

// Add a user message and return the updated conversation
export function addUserMessage(conversation: Conversation, content: string): Conversation {
	const message: Message = {
		id: uid(),
		role: 'user',
		content,
		timestamp: Date.now()
	};

	// Derive a title from the first user message
	const title =
		conversation.messages.length === 0 ? content.slice(0, 40) : conversation.title;

	return {
		...conversation,
		title,
		messages: [...conversation.messages, message],
		updatedAt: Date.now()
	};
}

// Simulate an LLM response and return the updated conversation
export function addAssistantMessage(
	conversation: Conversation,
	onComplete: (updated: Conversation) => void
): void {
	// Fake streaming delay
	setTimeout(() => {
		const message: Message = {
			id: uid(),
			role: 'assistant',
			content: 'Hello! How can I help you today?',
			timestamp: Date.now()
		};

		const updated: Conversation = {
			...conversation,
			messages: [...conversation.messages, message],
			updatedAt: Date.now()
		};

		onComplete(updated);
	}, 600);
}

// Delete a conversation by id, returns the new list
export function deleteConversation(
	conversations: Conversation[],
	id: string
): Conversation[] {
	return conversations.filter((c) => c.id !== id);
}

// Filter conversations by a search query
export function searchConversations(
	conversations: Conversation[],
	query: string
): Conversation[] {
	const q = query.toLowerCase().trim();
	if (!q) return conversations;
	return conversations.filter(
		(c) =>
			c.title.toLowerCase().includes(q) ||
			c.messages.some((m) => m.content.toLowerCase().includes(q))
	);
}


export function saveSidebarState(isOpen: boolean) {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(SIDEBAR_KEY, isOpen.toString());
}

export function loadSidebarState(): boolean {
	if (typeof localStorage === 'undefined') return false;

	const value = localStorage.getItem(SIDEBAR_KEY);
	if (value === null) return false;

	return value === 'true';
}