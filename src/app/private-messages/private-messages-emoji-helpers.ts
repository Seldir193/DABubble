// private-messages-emoji-helpers.ts
import { PrivateMessagesComponent } from './private-messages.component';

export function findEmojiIndexUtil(
  c: PrivateMessagesComponent,
  message: any,
  emojiToRemove: string
): number {
  if (!message?.content?.emojis) return -1;
  return message.content.emojis.findIndex(
    (emojiObj: any) => emojiObj.emoji === emojiToRemove
  );
}

export function removeEmojiAtIndexUtil(
  c: PrivateMessagesComponent,
  message: any,
  index: number
): void {
  message.content.emojis.splice(index, 1);
}

export function updateMessageInFirestoreUtil(
  c: PrivateMessagesComponent,
  message: any
): void {
  if (!message.id) {
    c.hideTooltip();
    return;
  }
  c.messageService
    .updateMessage(message.id, { content: message.content })
    .then(() => c.hideTooltip())
    .catch(() => c.hideTooltip());
}
