// thread.message.helpers.ts
import { ThreadComponent } from './thread.component';
import { serverTimestamp } from '@angular/fire/firestore';

export async function sendThreadMessageComp(
  comp: ThreadComponent,
  msgContent: string | null,
  imgUrl: string | null,
  textArea: HTMLTextAreaElement
): Promise<void> {
  if (!validateThreadSubmissionComp(comp, msgContent, imgUrl)) return;
  if (!comp.parentMessage?.id) return;
  if (!comp.parentMessage.threadId)
    comp.parentMessage.threadId = comp.parentMessage.id!;
  const threadMsg = createThreadMessageComp(comp, msgContent, imgUrl);
  if (!threadMsg) return;
  await commitThreadMessageComp(comp, threadMsg);
  comp.privateMessage = '';
  comp.imageUrl = null;
  if (textArea) comp.resetTextareaHeight(textArea);
}

export function validateThreadSubmissionComp(
  comp: ThreadComponent,
  msgContent: string | null,
  imgUrl: string | null
): boolean {
  if (!msgContent?.trim() && !imgUrl) return false;
  if (!comp.currentUser) return false;
  if (!comp.currentUser.uid) return false;
  if (!comp.parentMessage?.id) return false;
  return true;
}

export async function commitThreadMessageComp(
  comp: ThreadComponent,
  threadMsg: any
): Promise<void> {
  await comp.messageService.sendMessage(threadMsg);
  await comp.messageService.updateMessage(comp.parentMessage!.id!, {
    lastResponseTime: serverTimestamp(),
  });
  await comp.messageService.updateReplyCount(comp.parentMessage!.id!, 'thread');
  await refreshThreadEmojisComp(comp);
  listenForThreadEmojiUpdatesComp(comp);
}

export async function refreshThreadEmojisComp(
  comp: ThreadComponent
): Promise<void> {
  const [sent, received] = await Promise.all([
    comp.messageService.getLastUsedThreadEmojis(
      comp.parentMessage!.id!,
      'sent'
    ),
    comp.messageService.getLastUsedThreadEmojis(
      comp.parentMessage!.id!,
      'received'
    ),
  ]);
  comp.lastUsedEmojisSent = sent || [];
  comp.lastUsedEmojisReceived = received || [];
}

export function createThreadMessageComp(
  comp: ThreadComponent,
  msgContent: string | null,
  imgUrl: string | null
): any {
  if (!comp.currentUser?.uid) return null;
  if (!comp.parentMessage?.id) return null;
  return buildThreadMsgObj(comp, msgContent || '', imgUrl || '');
}

function buildThreadMsgObj(comp: ThreadComponent, text: string, image: string) {
  return {
    type: 'thread',
    threadId: comp.parentMessage!.id,
    parentId: comp.parentMessage!.id,
    content: { text, image, emojis: [] },
    senderId: comp.currentUser.uid,
    senderName: comp.currentUser.name ?? 'Unbekannt',
    senderAvatar: comp.currentUser.avatarUrl || 'assets/default-avatar.png',
    recipientId: comp.parentMessage!.senderId || null,
    timestamp: serverTimestamp(),
    isReply: true,
    lastReplyTime: serverTimestamp(),
  };
}

export function loadThreadMessagesLiveComp(comp: ThreadComponent): void {
  if (!comp.parentMessage?.id) return;
  if (comp.unsubscribeFromThreadMessages) comp.unsubscribeFromThreadMessages();
  comp.unsubscribeFromThreadMessages = comp.messageService.listenMessages(
    'thread',
    comp.parentMessage.id,
    (msgs) => {
      comp.threadMessages = msgs.map((m) => formatMessageComp(comp, m));
      comp.scrollToBottom();
    }
  );
}

export async function initializeThreadComp(
  comp: ThreadComponent
): Promise<void> {
  if (!comp.threadId) return;
  try {
    await loadThreadDataAndEmojisComp(comp);
    listenForThreadEmojiUpdatesComp(comp);
    loadThreadMessagesLiveComp(comp);
  } catch {}
}

export async function loadThreadDataAndEmojisComp(
  comp: ThreadComponent
): Promise<void> {
  const [sent, received, msgs] = await Promise.all([
    comp.messageService.getLastUsedThreadEmojis(comp.threadId!, 'sent'),
    comp.messageService.getLastUsedThreadEmojis(comp.threadId!, 'received'),
    comp.messageService.getMessagesOnce('thread', comp.threadId!),
  ]);
  comp.lastUsedEmojisSent = sent || [];
  comp.lastUsedEmojisReceived = received || [];
  comp.threadMessages = msgs.map((m) => ({
    ...m,
    content: { ...m.content, emojis: m.content?.emojis || [] },
  }));
}

export function listenForThreadEmojiUpdatesComp(comp: ThreadComponent): void {
  if (!comp.parentMessage?.id) return;
  if (comp.unsubscribeEmojiListener) comp.unsubscribeEmojiListener();
  comp.unsubscribeEmojiListener =
    comp.messageService.listenForThreadEmojiUpdates(
      comp.parentMessage.id,
      (sent, received) => {
        comp.lastUsedEmojisSent = sent.slice(-2);
        comp.lastUsedEmojisReceived = received.slice(-2);
      }
    );
}

export function formatMessageComp(comp: ThreadComponent, msg: any): any {
  return {
    ...msg,
    timestamp: msg.timestamp
      ? comp.messageService.convertToDate(msg.timestamp)
      : new Date(),
  };
}

export function highlightThreadMessageComp(
  comp: ThreadComponent,
  msgId: string,
  retries = 5
): void {
  setTimeout(() => {
    const el = document.getElementById(`message-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('highlight');
      setTimeout(() => el.classList.remove('highlight'), 2000);
    } else if (retries > 0) {
      highlightThreadMessageComp(comp, msgId, retries - 1);
    }
  }, 500);
}
