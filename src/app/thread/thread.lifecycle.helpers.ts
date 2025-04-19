// thread.lifecycle.helpers.ts
import { ThreadComponent } from './thread.component';
import { SimpleChanges } from '@angular/core';
import { Message } from '../message.models';
import { formatDate } from '@angular/common';

export async function onInitThreadComp(comp: ThreadComponent): Promise<void> {
  checkDesktopWidthComp(comp);
  if (!verifyParentMessageComp(comp)) return;
  await loadCurrentUserComp(comp);
  if (!isCurrentUserValidComp(comp)) return;
  try {
    await initializeThreadDataComp(comp, comp.parentMessage!);
  } catch {
    comp.closeThread.emit();
  }
  setupChannelsSubComp(comp);
  setupUsersSubComp(comp);
  setupParentSubComp(comp);
}

export function verifyParentMessageComp(comp: ThreadComponent): boolean {
  if (!comp.parentMessage?.id) {
    comp.closeThread.emit();
    return false;
  }
  return true;
}

export async function loadCurrentUserComp(
  comp: ThreadComponent
): Promise<void> {
  try {
    comp.currentUser = await comp.userService.getCurrentUserData();
    if (!comp.currentUser?.uid) throw new Error('User data invalid.');
  } catch {
    comp.currentUser = null;
  }
}

export function isCurrentUserValidComp(comp: ThreadComponent): boolean {
  if (!comp.currentUser?.uid) {
    comp.closeThread.emit();
    return false;
  }
  return true;
}

export async function initializeThreadDataComp(
  comp: ThreadComponent,
  pm: Message
): Promise<void> {
  const tid = pm.id!;
  const [msgs, sent, rec] = await comp.loadInitialThreadData(tid);
  comp.lastUsedEmojisSent = sent;
  comp.lastUsedEmojisReceived = rec;
  comp.loadLastUsedThreadEmojis();
  comp.setupThreadLiveUpdates(tid);
  comp.formatParentTimestamp(pm);
  comp.subscribeReplyCounts(pm);
}

export function checkDesktopWidthComp(comp: ThreadComponent): void {
  comp.isDesktop = window.innerWidth >= 1278;
}

export function onChangesThreadComp(
  comp: ThreadComponent,
  changes: SimpleChanges
): void {
  if (!changes['parentMessage']?.currentValue) return;
  const pm = changes['parentMessage'].currentValue;
  ensureThreadIdExistsComp(pm);
  setupParentMessageComp(comp, pm);
  setupRecipientNameComp(comp, pm);
  updateThreadTimestampComp(comp);
  initThreadDataComp(comp);
}

export function ensureThreadIdExistsComp(pm: any): void {
  if (!pm.threadId) pm.threadId = pm.id;
}

export function setupParentMessageComp(comp: ThreadComponent, pm: any): void {
  comp.parentMessage = {
    ...pm,
    content: {
      text: pm.content?.text || pm.text || '⚠️ Kein Text gefunden!',
      image: pm.content?.image || null,
      emojis: pm.content?.emojis || [],
    },
  };
}

export function setupRecipientNameComp(comp: ThreadComponent, pm: any): void {
  if (!comp.recipientName) {
    comp.recipientName = pm.recipientName || 'Lade...';
    if (
      comp.recipientName === 'Lade...' &&
      typeof pm.recipientId === 'string'
    ) {
      comp.fetchRecipientName(pm.recipientId);
    }
  }
  comp.threadId = comp.parentMessage?.id || '';
}

export function updateThreadTimestampComp(comp: ThreadComponent): void {
  if (!comp.parentMessage?.timestamp) return;
  const ts = comp.safeConvertTimestamp(comp.parentMessage.timestamp);
  comp.formattedParentMessageDate = comp.getFormattedDate(ts);
  comp.formattedMessageTime = formatDate(ts, 'HH:mm', 'de');
}

export function initThreadDataComp(comp: ThreadComponent): void {
  const pm = comp.parentMessage;
  if (!pm || !pm.id) return;
  comp.loadOriginalPrivateMessage(pm.id);
  comp.listenForReplyCountUpdates();
  comp.loadThreadMessagesLive();
  comp.loadLastUsedThreadEmojis();
  comp.listenForThreadEmojiUpdates();
}

function setupChannelsSubComp(comp: ThreadComponent): void {
  comp.unsubscribeChannels = comp.channelService.getAllChannels((ch) => {
    comp.allChannels = ch;
    comp.allChannelsOriginal = [...ch]; 
  });
}

function setupUsersSubComp(comp: ThreadComponent): void {
  comp.unsubscribeUsers = comp.userService.getAllUsersLive((users) => {
    comp.allUsers = users;
    comp.allUsersOriginal = [...users];   
    users.forEach((u) => {
      comp.userMap[u.id] = {
        name: u.name || 'Unbekannt',
        avatarUrl: u.avatarUrl || 'assets/img/avatar.png',
      };
    });
  });
}

function setupParentSubComp(comp: ThreadComponent): void {
  if (!comp.parentMessage?.id) return;
  comp.unsubscribeParent = comp.messageService.listenForThreadDetails(
    comp.parentMessage.id,
    (data) => {
      if (data) comp.parentMessage = { ...comp.parentMessage, ...data };
    }
  );
}

export function onDestroyThreadComp(comp: ThreadComponent): void {
  if (comp.unsubscribeFromThreadMessages) comp.unsubscribeFromThreadMessages();

  if (comp.unsubscribeEmojiListener) comp.unsubscribeEmojiListener();

  if (comp.unsubscribeReplyCount) comp.unsubscribeReplyCount();

  if (comp.unsubscribeChannels) comp.unsubscribeChannels();

  if (comp.unsubscribeUsers) comp.unsubscribeUsers();

  if (comp.unsubscribeParent) comp.unsubscribeParent();
}
