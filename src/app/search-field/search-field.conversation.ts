import { Message } from '../message.models';

export function loadPrivateMessagesHelper(
  senderId: string,
  recipientId: string,
  messageService: {
    generateConversationId: (a: string, b: string) => string;
    getMessagesOnce: (
      mode: 'private',
      conversationId: string
    ) => Promise<Message[]>;
  },
  updateMessages: (messages: Message[]) => void,
  scrollToBottomFn: () => void
): void {
  if (senderId && recipientId) {
    const conversationId = messageService.generateConversationId(
      senderId,
      recipientId
    );
    messageService
      .getMessagesOnce('private', conversationId)
      .then((messages: Message[]) => {
        const msgs = messages.map((msg) => ({
          ...msg,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(),
        }));
        updateMessages(msgs);
        scrollToBottomFn();
      })
      .catch(() => {});
  }
}

export async function initializeConversationHelper(
  currentUser: any,
  recipientId: string,
  messageService: {
    generateConversationId: (a: string, b: string) => string;
  },
  loadLastUsedEmojisForConversationFn: (
    conversationId: string
  ) => Promise<void>,
  loadPrivateMessagesForConversationFn: (conversationId: string) => void
): Promise<void> {
  if (!currentUser || !recipientId) {
    return;
  }
  const conversationId = messageService.generateConversationId(
    currentUser.id,
    recipientId
  );
  await loadLastUsedEmojisForConversationFn(conversationId);
  loadPrivateMessagesForConversationFn(conversationId);
}

export async function loadLastUsedEmojisForConversationHelper(
  conversationId: string,
  messageService: {
    getMessagesOnce: (
      mode: 'private',
      conversationId: string
    ) => Promise<Message[]>;
  },
  getEmojiContextFn: () => any,
  processEmojisFromMessagesFn: (context: any, messages: Message[]) => void,
  limitTopEmojisFn: (context: any) => void,
  errorCallback?: (error: any) => void
): Promise<void> {
  try {
    const lastMessages = await fetchLastTenMessagesHelper(
      conversationId,
      messageService
    );
    const context = getEmojiContextFn();
    processEmojisFromMessagesFn(context, lastMessages);
    limitTopEmojisFn(context);
  } catch (error: any) {
    if (errorCallback) errorCallback(error);
  }
}

export async function fetchLastTenMessagesHelper(
  conversationId: string,
  messageService: {
    getMessagesOnce: (
      mode: 'private',
      conversationId: string
    ) => Promise<Message[]>;
  }
): Promise<Message[]> {
  const messages: Message[] = await messageService.getMessagesOnce(
    'private',
    conversationId
  );
  return messages.slice(-10);
}

export function loadPrivateMessagesForConversationHelper(
  conversationId: string,
  messageService: {
    getMessagesOnce: (
      mode: 'private',
      conversationId: string
    ) => Promise<Message[]>;
  },
  updateMessages: (messages: Message[]) => void,
  scrollToBottomFn: () => void,
  errorCallback?: (error: any) => void
): void {
  messageService
    .getMessagesOnce('private', conversationId)
    .then((messages: Message[]) => {
      const msgs = messages.map((msg: Message) => ({
        ...msg,
        content: { ...msg.content, emojis: msg.content?.emojis || [] },
      }));
      updateMessages(msgs);
      scrollToBottomFn();
    })
    .catch((error: any) => {
      if (errorCallback) errorCallback(error);
    });
}

export async function saveMessageHelper(
  msg: any,
  messageService: { updateMessage: (id: string, data: any) => Promise<void> },
  updateMessages: (updater: (messages: any[]) => any[]) => void
): Promise<void> {
  if (msg?.isEditing !== undefined) {
    msg.isEditing = false;
    const messageId = msg.id;
    if (messageId) {
      try {
        await messageService.updateMessage(messageId, { content: msg.content });
        updateMessages((messages) =>
          messages.map((m) =>
            m.id === messageId ? { ...msg, isEditing: false } : m
          )
        );
      } catch (err) {}
    }
  }
}
