import { formatDate } from '@angular/common';
import { MessageService } from '../message.service';

export interface BroadcastContext {
  currentUser: any;
  messageToAll: string;
  imageUrl: string | null;
  isEmojiPickerVisible: boolean;
  resetTextareaHeightFn: (textArea: HTMLTextAreaElement) => void;
  scrollToBottomFn: () => void;
  messageService: MessageService;
}

export async function sendMessageToAllCompletely(
  context: BroadcastContext,
  textArea: HTMLTextAreaElement,
  selectedRecipients: any[],
  shouldCancelBroadcastFn: () => boolean
): Promise<void> {
  if (shouldCancelBroadcastFn()) return;

  const channels = selectedRecipients.filter((r) => r.type === 'channel');
  const users = selectedRecipients.filter((r) => r.type === 'user');

  await sendToAllUsers(context, users);

  if (channels.length) {
    for (const ch of channels) {
      await sendChannelMessageToSingleChannel(context, ch);
    }
  }

  finishBroadcast(context, textArea);
  clearBroadcastInput(context, textArea);
}

export async function sendChannelMessageToSingleChannel(
  context: BroadcastContext,
  ch: any
): Promise<void> {
  const text = context.messageToAll.trim();
  const image = typeof context.imageUrl === 'string' ? context.imageUrl : '';
  const channelMsg = {
    channelId: ch.id,
    senderId: context.currentUser.id,
    senderName: context.currentUser.name || 'Unbekannt',
    date: formatDate(new Date(), 'dd.MM.yyyy', 'en'),
    time: new Date().toLocaleTimeString(),
    timestamp: new Date(),
    content: {
      text,
      image,
      emojis: [],
    },
    messageFormat: 'text',
  };
  await context.messageService.sendChannelMessage(channelMsg);
}

export async function sendToAllUsers(
  context: BroadcastContext,
  users: any[]
): Promise<void> {
  for (const u of users) {
    await sendToSingleRecipient(context, u);
  }
}

export async function sendToSingleRecipient(
  context: BroadcastContext,
  recipient: any
): Promise<void> {
  if (recipient.type === 'user') {
    const convId = context.messageService.generateConversationId(
      context.currentUser.id,
      recipient.id
    );
    const msgData = createBroadcastMessageData(context, convId, recipient.id);
    await context.messageService.sendMessage(msgData);
  }
}

export function createBroadcastMessageData(
  context: BroadcastContext,
  conversationId: string,
  recipientId: string
) {
  return {
    type: 'private' as const,
    conversationId,
    content: {
      text: context.messageToAll.trim(),
      image: typeof context.imageUrl === 'string' ? context.imageUrl : '',
      emojis: [],
    },
    date: formatDate(new Date(), 'dd.MM.yyyy', 'en'),
    timestamp: new Date(),
    time: new Date().toLocaleTimeString(),
    senderId: context.currentUser.id,
    senderName: context.currentUser.name || 'Unbekannt',
    senderAvatar: context.currentUser.avatarUrl || '',
    recipientId,
  };
}

export function finishBroadcast(
  context: BroadcastContext,
  textArea: HTMLTextAreaElement
): void {
  context.messageToAll = '';
  context.imageUrl = null;
  if (textArea) context.resetTextareaHeightFn(textArea);
  context.isEmojiPickerVisible = false;
  context.scrollToBottomFn();
}

export function clearBroadcastInput(
  context: BroadcastContext,
  textArea: HTMLTextAreaElement
): void {
  context.messageToAll = '';
  context.imageUrl = null;
  if (textArea) context.resetTextareaHeightFn(textArea);
  context.isEmojiPickerVisible = false;
  context.scrollToBottomFn();
}
