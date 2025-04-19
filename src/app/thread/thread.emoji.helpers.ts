import { ThreadComponent } from './thread.component';

export async function addEmojiToMessageComp(
  comp: ThreadComponent,
  event: any,
  msg: any
): Promise<void> {
  if (!event?.emoji?.native) return;
  ensureEmojiArrayExistsComp(msg);
  const newEmoji = event.emoji.native;
  incrementEmojiCountComp(msg, newEmoji);
  const isSent = msg.senderId === comp.currentUser?.id;
  await handleLocalAndFirestoreEmojisComp(comp, msg, newEmoji, isSent);
  msg.isEmojiPickerVisible = false;
  await updateMessageInFirestoreComp(comp, msg);
}

export function ensureEmojiArrayExistsComp(msg: any): void {
  if (!msg.content.emojis) msg.content.emojis = [];
}

export function incrementEmojiCountComp(msg: any, newEmoji: string): void {
  const existing = msg.content.emojis.find((e: any) => e.emoji === newEmoji);
  if (existing) {
    existing.count = 1;
  } else if (msg.content.emojis.length < 13) {
    msg.content.emojis.push({ emoji: newEmoji, count: 1 });
  }
}

export function removeEmojiFromMessageComp(
  comp: ThreadComponent,
  message: any,
  emojiToRemove: string
): void {
  const index = findEmojiIndexComp(message, emojiToRemove);
  if (index === -1) return;
  removeEmojiAtIndexComp(message, index);
  updateMessageInFirestoreComp(comp, message);
}

export function findEmojiIndexComp(
  message: any,
  emojiToRemove: string
): number {
  if (!message?.content?.emojis) return -1;
  return message.content.emojis.findIndex(
    (e: any) => e.emoji === emojiToRemove
  );
}

export function removeEmojiAtIndexComp(message: any, index: number): void {
  message.content.emojis.splice(index, 1);
}

export function updateLastUsedEmojisComp(
  emojiArray: string[],
  newEmoji: string
): string[] {
  const filtered = emojiArray.filter((e) => e !== newEmoji);
  return filtered.slice(0, 2);
}

export async function handleLocalAndFirestoreEmojisComp(
  comp: ThreadComponent,
  msg: any,
  newEmoji: string,
  isSent: boolean
): Promise<void> {
  if (isSent) await updateSentEmojisComp(comp, newEmoji);
  else await updateReceivedEmojisComp(comp, newEmoji);
}

async function updateSentEmojisComp(
  comp: ThreadComponent,
  newEmoji: string
): Promise<void> {
  comp.lastUsedEmojisSent = updateLastUsedEmojisComp(
    comp.lastUsedEmojisSent,
    newEmoji
  );
  await comp.messageService.saveLastUsedThreadEmojis(
    comp.parentMessage!.id!,
    comp.lastUsedEmojisSent,
    'sent'
  );
}

async function updateReceivedEmojisComp(
  comp: ThreadComponent,
  newEmoji: string
): Promise<void> {
  comp.lastUsedEmojisReceived = updateLastUsedEmojisComp(
    comp.lastUsedEmojisReceived,
    newEmoji
  );
  await comp.messageService.saveLastUsedThreadEmojis(
    comp.parentMessage!.id!,
    comp.lastUsedEmojisReceived,
    'received'
  );
}

async function updateMessageInFirestoreComp(
  comp: ThreadComponent,
  msg: any
): Promise<void> {
  await comp.messageService.updateMessage(msg.id, {
    content: { ...msg.content },
  });
}
