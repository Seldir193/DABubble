// private-messages-emoji-utils.ts
import { PrivateMessagesComponent } from './private-messages.component';

export async function addEmojiToMessageUtil(
  component: PrivateMessagesComponent,
  event: any,
  msg: any
): Promise<void> {
  if (!msg.content.emojis) msg.content.emojis = [];
  if (!event?.emoji?.native) return;

  const newEmoji = event.emoji.native;
  processEmojiIncrementUtil(component, msg, newEmoji);
  handleLastUsedEmojisUtil(component, msg, newEmoji);
  await saveEmojiUsageInFirestoreUtil(component, newEmoji);
  await updateEmojiInFirestoreUtil(component, msg);

  if (!component.getHasScrolledOnChange && isNearBottomEmojiUtil(component)) {
    scrollToBottomUtil(component);
  }
}

function processEmojiIncrementUtil(
  component: PrivateMessagesComponent,
  msg: any,
  newEmoji: string
): void {
  const existing = msg.content.emojis.find((e: any) => e.emoji === newEmoji);
  if (existing) {
    existing.count = 1;
  } else if (msg.content.emojis.length < 20) {
    msg.content.emojis.push({ emoji: newEmoji, count: 1 });
  } else {
  }
}

function handleLastUsedEmojisUtil(
  component: PrivateMessagesComponent,
  msg: any,
  newEmoji: string
): void {
  const isSentByMe = msg.senderId === component.currentUser?.id;
  const emojiType = isSentByMe ? 'sent' : 'received';
  if (isSentByMe) {
    component.lastUsedEmojisSent = updateLastUsedEmojisUtil(
      component.lastUsedEmojisSent,
      newEmoji
    );
  } else {
    component.lastUsedEmojisReceived = updateLastUsedEmojisUtil(
      component.lastUsedEmojisReceived,
      newEmoji
    );
  }
  if (component.conversationId) {
    component.messageService
      .saveLastUsedEmojis(component.conversationId, [newEmoji], emojiType)
      .catch(() => {});
  }
}

async function updateEmojiInFirestoreUtil(
  component: PrivateMessagesComponent,
  msg: any
): Promise<void> {
  try {
    await component.messageService.updateMessage(msg.id, {
      'content.emojis': msg.content.emojis,
    });
    component.privateMessages = component.privateMessages.map((m) =>
      m.id === msg.id
        ? { ...m, content: { ...m.content, emojis: msg.content.emojis } }
        : m
    );
  } catch {}
}

async function saveEmojiUsageInFirestoreUtil(
  component: PrivateMessagesComponent,
  newEmoji: string
): Promise<void> {
  if (!component.conversationId) return;
}

function updateLastUsedEmojisUtil(
  emojiArray: string[],
  newEmoji: string
): string[] {
  emojiArray = emojiArray.filter((e) => e !== newEmoji);
  return emojiArray.slice(0, 2);
}

export function listenForEmojiUpdatesUtil(
  component: PrivateMessagesComponent
): void {
  if (!component.conversationId) return;

  component.setUnsubscribeEmojiListener =
    component.messageService.listenForEmojiUpdates(
      component.conversationId,
      (sentEmojis, receivedEmojis) => {
        component.lastUsedEmojisSent = sentEmojis;
        component.lastUsedEmojisReceived = receivedEmojis;
      }
    );
}

export async function loadLastUsedEmojisUtil(
  component: PrivateMessagesComponent
): Promise<void> {
  if (!component.currentUser || !component.recipientId) {
    return;
  }
  try {
    const conversationId = component.messageService.generateConversationId(
      component.currentUser.id,
      component.recipientId
    );

    const [lastSent, lastReceived] = await Promise.all([
      component.messageService.getLastUsedEmojis(conversationId, 'sent'),
      component.messageService.getLastUsedEmojis(conversationId, 'received'),
    ]);

    component.lastUsedEmojisSent = lastSent || [];
    component.lastUsedEmojisReceived = lastReceived || [];
    listenForEmojiUpdatesUtil(component);
  } catch {}
}

function scrollToBottomUtil(component: PrivateMessagesComponent): void {
  component.scrollToBottomWrapper?.();
}

export function isNearBottomEmojiUtil(
  component: PrivateMessagesComponent
): boolean {
  return component.isNearBottomWrapper?.() ?? false;
}
