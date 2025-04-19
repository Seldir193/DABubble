export interface EmojiContext {
  currentUser: any;
  lastUsedEmojisSent: string[];
  lastUsedEmojisReceived: string[];
}

export async function loadLastUsedEmojis(
  context: EmojiContext,
  getMessagesOnce: (mode: string, conversationId: string) => Promise<any[]>,
  conversationId: string
): Promise<void> {
  if (!conversationId) return;

  try {
    const messages = await getMessagesOnce('private', conversationId);
    const lastMessages = messages.slice(-10);

    context.lastUsedEmojisSent = [];
    context.lastUsedEmojisReceived = [];

    lastMessages.forEach((msg: any) => {
      if (msg.content?.emojis) {
        if (msg.senderId === context.currentUser.id) {
          context.lastUsedEmojisSent.push(
            ...msg.content.emojis.map((e: any) => e.emoji)
          );
        } else {
          context.lastUsedEmojisReceived.push(
            ...msg.content.emojis.map((e: any) => e.emoji)
          );
        }
      }
    });

    context.lastUsedEmojisSent = [...new Set(context.lastUsedEmojisSent)].slice(
      0,
      5
    );
    context.lastUsedEmojisReceived = [
      ...new Set(context.lastUsedEmojisReceived),
    ].slice(0, 5);
  } catch (error) {}
}

export function addEmojiToMessage(
  context: EmojiContext,
  event: any,
  msg: any
): void {
  if (!msg.content.emojis) {
    msg.content.emojis = [];
  }
  const newEmoji = event.emoji.native;
  const existingEmoji = msg.content.emojis.find(
    (e: any) => e.emoji === newEmoji
  );

  if (existingEmoji) {
    existingEmoji.count += 1;
  } else {
    msg.content.emojis.push({ emoji: newEmoji, count: 1 });
  }

  if (msg.senderName === context.currentUser?.name) {
    if (!context.lastUsedEmojisSent.includes(newEmoji)) {
      context.lastUsedEmojisSent = [
        newEmoji,
        ...context.lastUsedEmojisSent,
      ].slice(0, 2);
    }
  } else {
    if (!context.lastUsedEmojisReceived.includes(newEmoji)) {
      context.lastUsedEmojisReceived = [
        newEmoji,
        ...context.lastUsedEmojisReceived,
      ].slice(0, 2);
    }
  }
}

export async function closeEmojiPicker(
  msg: any,
  updateMessageFn: (id: string, data: any) => Promise<void>
): Promise<void> {
  msg.isEmojiPickerVisible = false;
  try {
    await updateMessageFn(msg.id, { 'content.emojis': msg.content.emojis });
  } catch (error) {}
}

export function processEmojisFromMessages(
  context: EmojiContext,
  lastMessages: any[]
): void {
  context.lastUsedEmojisSent = [];
  context.lastUsedEmojisReceived = [];

  lastMessages.forEach((msg: any) => {
    if (msg.content?.emojis) {
      if (msg.senderId === context.currentUser.id) {
        context.lastUsedEmojisSent.push(
          ...msg.content.emojis.map((e: any) => e.emoji)
        );
      } else {
        context.lastUsedEmojisReceived.push(
          ...msg.content.emojis.map((e: any) => e.emoji)
        );
      }
    }
  });
}

export function limitTopEmojis(context: EmojiContext): void {
  context.lastUsedEmojisSent = [...new Set(context.lastUsedEmojisSent)].slice(
    0,
    5
  );
  context.lastUsedEmojisReceived = [
    ...new Set(context.lastUsedEmojisReceived),
  ].slice(0, 5);
}
