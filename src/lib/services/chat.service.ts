import Dexie, { type Table } from 'dexie';

// Types for the chat domain
export type Role = 'user' | 'assistant';

export interface Message {
	id: string;
	role: Role;
	content: string;
	timestamp: number;
	replyToId?: string;
	replyToContent?: string;
	images?: string[];
}

export interface Conversation {
	id: string;
	title: string;
	messages: Message[];
	createdAt: number;
	updatedAt: number;
}

interface MetaEntry {
	key: string;
	value: unknown;
}

// One row per conversation (messages embedded as before), plus a small key/value meta table
class ChatDatabase extends Dexie {
	conversations!: Table<Conversation, string>;
	meta!: Table<MetaEntry, string>;

	constructor() {
		super('comfyui-chat');
		this.version(1).stores({
			conversations: 'id, updatedAt',
			meta: 'key'
		});
	}
}

const db = new ChatDatabase();

const ACTIVE_KEY = 'activeId';
const SIDEBAR_KEY = 'sidebarOpen';

// Generate a simple unique id
function uid(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Load all conversations, newest first
export async function loadConversations(): Promise<Conversation[]> {
	try {
		const all = await db.conversations.toArray();
		return all.sort((a, b) => b.updatedAt - a.updatedAt);
	} catch {
		return [];
	}
}

// Persist a single conversation, insert or update
export async function saveConversation(conversation: Conversation): Promise<void> {
	try {
		await db.conversations.put(conversation);
	} catch {
		// Quota exceeded or other IndexedDB error, silently ignore
	}
}

// Load the last active conversation id
export async function loadActiveId(): Promise<string | null> {
	const entry = await db.meta.get(ACTIVE_KEY);
	return (entry?.value as string) ?? null;
}

// Persist the active conversation id
export async function saveActiveId(id: string | null): Promise<void> {
	if (id === null) {
		await db.meta.delete(ACTIVE_KEY);
	} else {
		await db.meta.put({ key: ACTIVE_KEY, value: id });
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
export function addUserMessage(
	conversation: Conversation,
	content: string,
	replyToId?: string,
	replyToContent?: string,
	images?: string[]
): Conversation {
	const message: Message = {
		id: uid(),
		role: 'user',
		content,
		timestamp: Date.now(),
		...(replyToId ? { replyToId, replyToContent: replyToContent ?? '' } : {}),
		...(images && images.length > 0 ? { images } : {})
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
	onComplete: (updated: Conversation) => void,
	replyToId?: string,
	replyToContent?: string,
	images?: string[]
): void {
	// Fake streaming delay
	setTimeout(() => {
		const message: Message = {
			id: uid(),
			role: 'assistant',
			content: 'Hello! How can I help you today?',
			timestamp: Date.now(),
			...(replyToId ? { replyToId, replyToContent: replyToContent ?? '' } : {}),
			...(images && images.length > 0 ? { images } : {})
		};

		const updated: Conversation = {
			...conversation,
			messages: [...conversation.messages, message],
			updatedAt: Date.now()
		};

		onComplete(updated);
	}, 600);
}

// Edit a message's content and return the updated conversation
export function editMessage(
	conversation: Conversation,
	messageId: string,
	newContent: string
): Conversation {
	return {
		...conversation,
		messages: conversation.messages.map((m) =>
			m.id === messageId ? { ...m, content: newContent } : m
		),
		updatedAt: Date.now()
	};
}

// Delete a message and return the updated conversation
export function deleteMessage(conversation: Conversation, messageId: string): Conversation {
	return {
		...conversation,
		messages: conversation.messages.filter((m) => m.id !== messageId),
		updatedAt: Date.now()
	};
}

// Delete a conversation by id, both from the database and the given in-memory list
export async function deleteConversation(
	conversations: Conversation[],
	id: string
): Promise<Conversation[]> {
	try {
		await db.conversations.delete(id);
	} catch {
		// Ignore, conversation may already be gone
	}
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

export async function saveSidebarState(isOpen: boolean): Promise<void> {
	await db.meta.put({ key: SIDEBAR_KEY, value: isOpen });
}

export async function loadSidebarState(): Promise<boolean> {
	const entry = await db.meta.get(SIDEBAR_KEY);
	return (entry?.value as boolean) ?? false;
}