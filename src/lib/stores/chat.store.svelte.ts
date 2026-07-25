import { type Conversation, type Message } from '$lib/services/chat.service';
import * as chatService from '$lib/services/chat.service';
import { comfyStore } from '$lib/stores/comfy-store.svelte';
import { mergeWorkflow, uploadImages, validateImageOverrides } from '$lib/services/workflow-merge';
import type { Workflow } from '$lib/services/workflow.service';
import { toast } from 'svelte-sonner';

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

	// Bootstrap from IndexedDB on first load
	async function init() {
		conversations = await chatService.loadConversations();
		const savedId = await chatService.loadActiveId();
		// Only restore if that conversation still exists
		if (savedId && conversations.some((c) => c.id === savedId)) {
			activeId = savedId;
		}

		isSidebarOpen = await chatService.loadSidebarState();
	}

	// Select or deselect a conversation
	function selectConversation(id: string | null) {
		activeId = id;
		chatService.saveActiveId(id);
	}

	// Create a fresh conversation and make it active
	// Guard: don't create a new one if the active conversation is already empty
	function newConversation() {
		if (activeConversation && activeConversation.messages.length === 0) return;
		const convo = chatService.createConversation();
		conversations = [convo, ...conversations];
		activeId = convo.id;
		chatService.saveConversation($state.snapshot(convo));
		chatService.saveActiveId(convo.id);
	}

	// Send a user message in the active conversation
	function sendMessage(content: string, images?: string[], workflow?: Workflow) {
		const hasContent = content.trim().length > 0;
		const hasImages = images && images.length > 0;
		if ((!hasContent && !hasImages) || isResponding || comfyStore.isGenerating) return;

		// Auto-create a conversation if none is active
		let convo = activeConversation;
		if (!convo) {
			convo = chatService.createConversation();
			conversations = [convo, ...conversations];
			activeId = convo.id;
			chatService.saveActiveId(convo.id);
		}

		// Capture reply context before clearing
		const replyId = replyToMessage?.id;
		const replyContent = replyToMessage?.content;
		const replyImages = replyToMessage?.images;
		replyToMessage = null;

		// Add the user message (snapshot the proxied conversation before mutating it)
		const afterUser = chatService.addUserMessage(
			$state.snapshot(convo),
			content,
			replyId,
			replyContent,
			images
		);
		conversations = conversations.map((c) => (c.id === afterUser.id ? afterUser : c));
		chatService.saveConversation(afterUser);

		// Assistant replies to the user message we just sent
		const newUserMsg = afterUser.messages[afterUser.messages.length - 1];

		if (workflow && workflow.workflow && workflow.base_url) {
			// Collect images: reply image gets IMAGE1 precedence, then uploaded images
			const allImages: string[] = [];
			if (replyImages && replyImages.length > 0) {
				allImages.push(replyImages[0]);
			}
			if (images && images.length > 0) {
				allImages.push(...images);
			}
			// Real ComfyUI generation — comfyStore.isGenerating handles the loading state
			generateWithComfyUI(afterUser, newUserMsg.id, newUserMsg.content, workflow, allImages);
		} else {
			// Fake assistant response via service callback (no workflow selected)
			isResponding = true;
			chatService.addAssistantMessage(
				afterUser,
				(afterAssistant) => {
					conversations = conversations.map((c) =>
						c.id === afterAssistant.id ? afterAssistant : c
					);
					isResponding = false;
					chatService.saveConversation(afterAssistant);
				},
				newUserMsg.id,
				newUserMsg.content
			);
		}
	}

	async function generateWithComfyUI(
		convo: Conversation,
		replyToId: string,
		userPrompt: string,
		workflow: Workflow,
		images?: string[]
	) {
		try {
			// Validate image overrides against provided images
			const imageError = validateImageOverrides(workflow.overrides ?? [], images ?? []);
			if (imageError) {
				toast.error(imageError);
				throw new Error(imageError);
			}

			// Upload images to ComfyUI and get filenames
			let uploadedNames: string[] | undefined;
			if (images && images.length > 0) {
				const nameMap = await uploadImages(images, workflow.base_url);
				uploadedNames = images.map((img) => nameMap.get(img) ?? '');
			}

			const merged = mergeWorkflow(
				workflow.workflow,
				workflow.overrides ?? [],
				userPrompt,
				uploadedNames
			);

			const result = await comfyStore.generate(workflow.base_url, merged);

			// Capture elapsed time before it resets
			const generationTime = comfyStore.elapsed;

			// Create assistant message with generated images
			const assistantMsg: Message = {
				id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
				role: 'assistant',
				content: '',
				timestamp: Date.now(),
				replyToId,
				replyToContent: userPrompt,
				images: result.imageUrls.length > 0 ? result.imageUrls : undefined,
				generationTime: generationTime > 0 ? generationTime : undefined
			};

			const updated: Conversation = {
				...convo,
				messages: [...convo.messages, assistantMsg],
				updatedAt: Date.now()
			};

			conversations = conversations.map((c) => (c.id === updated.id ? updated : c));
			isResponding = false;
			chatService.saveConversation(updated);
		} catch (e) {
			const wasCancelled = comfyStore.cancelled;

			// Create assistant message
			const errorMsg: Message = {
				id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
				role: 'assistant',
				content: wasCancelled ? 'Generation Cancelled!' : `Generation failed: ${e instanceof Error ? e.message : 'Unknown error'}`,
				timestamp: Date.now(),
				replyToId,
				replyToContent: userPrompt,
				cancelled: wasCancelled || undefined
			};

			const updated: Conversation = {
				...convo,
				messages: [...convo.messages, errorMsg],
				updatedAt: Date.now()
			};

			conversations = conversations.map((c) => (c.id === updated.id ? updated : c));
			isResponding = false;
			chatService.saveConversation(updated);
		}
	}

	// Edit a message's content
	function editMessage(messageId: string, newContent: string) {
		const convo = activeConversation;
		if (!convo) return;

		const updated = chatService.editMessage($state.snapshot(convo), messageId, newContent);
		conversations = conversations.map((c) => (c.id === updated.id ? updated : c));
		editingMessage = null;
		chatService.saveConversation(updated);
	}

	// Delete a message
	function deleteMessage(messageId: string) {
		const convo = activeConversation;
		if (!convo) return;

		const updated = chatService.deleteMessage($state.snapshot(convo), messageId);
		conversations = conversations.map((c) => (c.id === updated.id ? updated : c));
		chatService.saveConversation(updated);
	}

	

	// Delete a conversation; deselect if it was active
	async function deleteConversation(id: string) {
		conversations = await chatService.deleteConversation(conversations, id);
		if (activeId === id) {
			activeId = conversations[0]?.id ?? null;
			chatService.saveActiveId(activeId);
		}
	}

	// Update the search query
	function setSearchQuery(q: string) {
		searchQuery = q;
	}

	function saveSidebarState(isOpen: boolean) {
		isSidebarOpen = isOpen;
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