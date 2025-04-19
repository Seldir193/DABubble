// private-messages-mini-helpers.ts
import { PrivateMessagesComponent } from './private-messages.component';
import { sendPrivateMessageUtil } from './private-message-utils';

export function openImageModalUtil(c: PrivateMessagesComponent): void {
  c.isImageModalOpen = true;
}

export function closeImageModalUtil(c: PrivateMessagesComponent): void {
  c.isImageModalOpen = false;
}

export async function sendPrivateMessageWrapper(
  c: PrivateMessagesComponent,
  textArea: HTMLTextAreaElement
): Promise<void> {
  return c.messageService
    ? sendPrivateMessageUtil(c, textArea)
    : Promise.resolve();
}

export function getYesterdayDateUtil(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d;
}

export async function loadCurrentUserUtil(
  c: PrivateMessagesComponent
): Promise<void> {
  try {
    const user = await c.userService.getCurrentUserData();
    c.currentUser = user;
  } catch {}
}

export function filteredChannelsUtil(c: PrivateMessagesComponent): any[] {
  if (!c.currentUser?.uid || !c.allChannels) return [];
  return c.allChannels.filter((ch: any) =>
    ch.members?.some((m: any) => m.uid === c.currentUser.uid)
  );
}

export function generateConversationIdUtil(u1: string, u2: string): string {
  return [u1, u2].sort().join('_');
}
