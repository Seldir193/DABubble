import { Message } from '../message.models';

export const generateConversationId = (
  userId1: string,
  userId2: string
): string => [userId1, userId2].sort().join('_');

export const initializeDirectConversation = (
  currentUser: any,
  recipientId: string,
  messageService: {
    generateConversationId: (userId1: string, userId2: string) => string;
    getMessagesOnce: (
      mode: 'private',
      conversationId: string
    ) => Promise<Message[]>;
  },
  updateMessages: (msgs: Message[]) => void,
  scrollToBottomFn: () => void,
  loadLastUsedEmojisFn: (
    context: any,
    getMessages: (mode: string, convId: string) => Promise<Message[]>,
    convId: string
  ) => void,
  getEmojiContextFn: () => any
): string => {
  const conversationId = messageService.generateConversationId(
    currentUser.id,
    recipientId
  );

  messageService
    .getMessagesOnce('private', conversationId)
    .then((messages: Message[]) => {
      const msgs = messages.map((msg) => ({
        ...msg,
        content: { ...msg.content, emojis: msg.content?.emojis || [] },
      }));
      updateMessages(msgs);
      scrollToBottomFn();
    })
    .catch(() => {});

  loadLastUsedEmojisFn(
    getEmojiContextFn(),
    (mode, convId) => messageService.getMessagesOnce(mode as 'private', convId),
    conversationId
  );

  return conversationId;
};
