import { type Conversation } from '$lib/services/chat.service';
import * as chatService from '$lib/services/chat.service';

// Svelte 5 rune-based reactive store
// All state mutations go through these functions; service never touches UI

function createChatStore() {
	let conversations = $state<Conversation[]>([]);
	let activeId = $state<string | null>(null);
	let isResponding = $state(false);
	let searchQuery = $state('');

	// Derived: currently active conversation
	const activeConversation = $derived(
		conversations.find((c) => c.id === activeId) ?? null
	);

	// Derived: conversations filtered by search
	const filteredConversations = $derived(
		chatService.searchConversations(conversations, searchQuery)
	);

	// Bootstrap from localStorage on first load
	function init() {
		conversations = chatService.loadConversations();
		const savedId = chatService.loadActiveId();
		// Only restore if that conversation still exists
		if (savedId && conversations.some((c) => c.id === savedId)) {
			activeId = savedId;
		}
	}

	// Persist helpers called after every mutation
	function persist() {
		chatService.saveConversations(conversations);
		chatService.saveActiveId(activeId);
	}

	// Select or deselect a conversation
	function selectConversation(id: string | null) {
		activeId = id;
		chatService.saveActiveId(id);
	}

	// Create a fresh conversation and make it active
	function newConversation() {
		const convo = chatService.createConversation();
		conversations = [convo, ...conversations];
		activeId = convo.id;
		persist();
	}

	// Send a user message in the active conversation
	function sendMessage(content: string) {
		if (!content.trim() || isResponding) return;

		// Auto-create a conversation if none is active
		let convo = activeConversation;
		if (!convo) {
			convo = chatService.createConversation();
			conversations = [convo, ...conversations];
			activeId = convo.id;
		}

		// Add the user message
		const afterUser = chatService.addUserMessage(convo, content);
		conversations = conversations.map((c) => (c.id === afterUser.id ? afterUser : c));
		isResponding = true;
		persist();

		// Fake assistant response via service callback
		chatService.addAssistantMessage(afterUser, (afterAssistant) => {
			conversations = conversations.map((c) =>
				c.id === afterAssistant.id ? afterAssistant : c
			);
			isResponding = false;
			persist();
		});
	}

	// Delete a conversation; deselect if it was active
	function deleteConversation(id: string) {
		conversations = chatService.deleteConversation(conversations, id);
		if (activeId === id) {
			activeId = conversations[0]?.id ?? null;
		}
		persist();
	}

	// Update the search query
	function setSearchQuery(q: string) {
		searchQuery = q;
	}

	return {
		// State (read-only from outside via getters)
		get conversations() { return conversations; },
		get activeId() { return activeId; },
		get activeConversation() { return activeConversation; },
		get filteredConversations() { return filteredConversations; },
		get isResponding() { return isResponding; },
		get searchQuery() { return searchQuery; },

		// Actions
		init,
		newConversation,
		selectConversation,
		sendMessage,
		deleteConversation,
		setSearchQuery
	};
}

export const chatStore = createChatStore();
