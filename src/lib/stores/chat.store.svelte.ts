import { type Conversation, type Message } from '$lib/services/chat.service';
import * as chatService from '$lib/services/chat.service';

function createChatStore() {
	let conversations = $state<Conversation[]>([]);
	let activeId = $state<string | null>(null);
	let isResponding = $state(false);
	let searchQuery = $state('');
	let isSidebarOpen = $state(false);
	let replyToMessage = $state<Message | null>(null);
	let editingMessage = $state<Message | null>(null);

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

		isSidebarOpen = chatService.loadSidebarState();
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
	function sendMessage(content: string, images?: string[]) {
		const hasContent = content.trim().length > 0;
		const hasImages = images && images.length > 0;
		if ((!hasContent && !hasImages) || isResponding) return;

		// Auto-create a conversation if none is active
		let convo = activeConversation;
		if (!convo) {
			convo = chatService.createConversation();
			conversations = [convo, ...conversations];
			activeId = convo.id;
		}

		// Capture reply context before clearing
		const replyId = replyToMessage?.id;
		const replyContent = replyToMessage?.content;
		replyToMessage = null;

		// Add the user message
		const afterUser = chatService.addUserMessage(convo, content, replyId, replyContent, images);
		conversations = conversations.map((c) => (c.id === afterUser.id ? afterUser : c));
		isResponding = true;
		persist();

		// Assistant replies to the user message we just sent
		const newUserMsg = afterUser.messages[afterUser.messages.length - 1];

		// Fake assistant response via service callback
		chatService.addAssistantMessage(
			afterUser,
			(afterAssistant) => {
				conversations = conversations.map((c) =>
					c.id === afterAssistant.id ? afterAssistant : c
				);
				isResponding = false;
				persist();
			},
			newUserMsg.id,
			newUserMsg.content
		);
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

	function saveSidebarState(isOpen: boolean) {
		chatService.saveSidebarState(isOpen);
	}

	// Set a message as the reply target
	function setReplyTo(message: Message) {
		replyToMessage = message;
		editingMessage = null;
	}

	// Cancel the current reply
	function cancelReply() {
		replyToMessage = null;
	}

	// Set a message for inline editing
	function setEditing(message: Message) {
		editingMessage = message;
		replyToMessage = null;
	}

	// Cancel the current edit
	function cancelEdit() {
		editingMessage = null;
	}

	// Edit a message's content
	function editMessage(messageId: string, newContent: string) {
		let convo = activeConversation;
		if (!convo) return;

		const updated = chatService.editMessage(convo, messageId, newContent);
		conversations = conversations.map((c) => (c.id === updated.id ? updated : c));
		editingMessage = null;
		persist();
	}

	// Delete a message
	function deleteMessage(messageId: string) {
		let convo = activeConversation;
		if (!convo) return;

		const updated = chatService.deleteMessage(convo, messageId);
		conversations = conversations.map((c) => (c.id === updated.id ? updated : c));
		persist();
	}

	return {
		// State (read-only from outside via getters)
		get conversations() { return conversations; },
		get activeId() { return activeId; },
		get activeConversation() { return activeConversation; },
		get filteredConversations() { return filteredConversations; },
		get isResponding() { return isResponding; },
		get searchQuery() { return searchQuery; },
		get isSidebarOpen() { return isSidebarOpen; },
		get replyToMessage() { return replyToMessage; },
		get editingMessage() { return editingMessage; },

		// Actions
		init,
		newConversation,
		selectConversation,
		sendMessage,
		deleteConversation,
		setSearchQuery,
		saveSidebarState,
		setReplyTo,
		cancelReply,
		setEditing,
		cancelEdit,
		editMessage,
		deleteMessage,
	};
}

export const chatStore = createChatStore();
