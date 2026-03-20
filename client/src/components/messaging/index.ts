/** Re-export Manus messaging prototypes for MarketplacePrototype / tours. */
export { default as InboxList, MOCK_CONVERSATIONS } from "../manus/messaging/InboxList";
export type { Conversation } from "../manus/messaging/InboxList";
export { default as ConversationThread, getMockMessages } from "../manus/messaging/ConversationThread";
export type { Message } from "../manus/messaging/ConversationThread";
