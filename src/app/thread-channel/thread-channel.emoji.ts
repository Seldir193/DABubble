import { ThreadChannelComponent } from './thread-channel.component';

export function ensureEmojiArrayHelper(msg: any) {
  if (!msg.content.emojis) {
    msg.content.emojis = [];
  }
}

export function addOrIncrementEmojiHelper(msg: any, newEmoji: string) {
  const existing = msg.content.emojis.find((e: any) => e.emoji === newEmoji);
  if (existing) {
    existing.count = 1;
  } else if (msg.content.emojis.length < 13) {
    msg.content.emojis.push({ emoji: newEmoji, count: 1 });
  }
}

export function updateLocalEmojiCacheHelper(
  component: ThreadChannelComponent,
  msg: any,
  newEmoji: string
) {
  const isSent = msg.senderName === component.currentUser?.name;
  const localArray = isSent
    ? component.lastUsedEmojisSent
    : component.lastUsedEmojisReceived;

  const updated = updateLastUsedEmojisHelper(localArray, newEmoji);

  if (isSent) {
    component.lastUsedEmojisSent = updated;
    if (component.selectedChannel?.id) {
      component.channelService.saveLastUsedEmojis(
        component.selectedChannel.id,
        updated,
        'sent'
      );
    }
  } else {
    component.lastUsedEmojisReceived = updated;
    if (component.selectedChannel?.id) {
      component.channelService.saveLastUsedEmojis(
        component.selectedChannel.id,
        updated,
        'received'
      );
    }
  }
}

export function updateLastUsedEmojisHelper(
  emojiArray: string[],
  newEmoji: string
): string[] {
  emojiArray = emojiArray.filter((e) => e !== newEmoji);
  return emojiArray.slice(0, 2);
}

export function findEmojiIndexHelper(
  message: any,
  emojiToRemove: string
): number {
  if (!message?.content?.emojis) return -1;
  return message.content.emojis.findIndex(
    (emojiObj: any) => emojiObj.emoji === emojiToRemove
  );
}

export function removeEmojiAtIndexHelper(message: any, index: number) {
  message.content.emojis.splice(index, 1);
}

export async function updateMessageInFirestoreHelper(
  component: ThreadChannelComponent,
  msg: any
) {
  if (!msg.id) {
    component.hideTooltip();
    return;
  }
  try {
    await component.messageService.updateMessage(msg.id, {
      content: { ...msg.content },
    });
  } catch (error) {
  } finally {
    component.hideTooltip();
  }
}

export function removeEmojiFromMessageHelper(
  component: ThreadChannelComponent,
  message: any,
  emojiToRemove: string
): void {
  const index = findEmojiIndexHelper(message, emojiToRemove);
  if (index === -1) return;
  removeEmojiAtIndexHelper(message, index);
  updateMessageInFirestoreHelper(component, message);
}
