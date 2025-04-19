// thread.open-thread.helpers.ts
import { ThreadComponent } from './thread.component';
import { Message } from '../message.models';
import { formatDate } from '@angular/common';

export function openThreadEventComp(comp: ThreadComponent, msg: Message): void {
  if (!msg?.id) return;
  comp.parentMessage = { ...msg };
  const pm = comp.parentMessage;
  if (!pm?.id) return;
  comp.threadId = pm.id;
  if (pm.timestamp) {
    const ts = comp.safeConvertTimestamp(pm.timestamp);
    comp.formattedParentMessageDate = comp.getFormattedDate(ts);
    comp.formattedMessageTime = formatDate(ts, 'HH:mm', 'de');
  }
  comp.openThread.emit({
    ...pm,
    threadId: pm.id,
    parentId: pm.parentId ?? pm.id,
    timestamp: pm.timestamp,
  });
  comp.loadThreadMessagesLive();
}

export function listenForReplyCountUpdatesComp(comp: ThreadComponent): void {
  const pm = comp.parentMessage;
  if (!pm?.id) return;
  comp.unsubscribeReplyCount = comp.messageService.loadReplyCountsLive(
    [pm.id!],
    'thread',
    (counts) => {
      if (!counts[pm.id!]) return;
      comp.replyCount = counts[pm.id!].count || 0;
      pm.replyCount = comp.replyCount;
    }
  );
}

export async function setupThreadLiveUpdatesComp(
  comp: ThreadComponent,
  threadId: string
): Promise<void> {
  listenForReplyCountUpdatesComp(comp);
  comp.listenForThreadEmojiUpdates();
  await comp.loadLastUsedEmojisLive(threadId);
  comp.loadThreadMessagesLive();
}

export function subscribeReplyCountsComp(
  comp: ThreadComponent,
  pm: Message
): void {
  comp.unsubscribeReplyCount = comp.messageService.loadReplyCountsLive(
    [pm.id!],
    'thread',
    (updatedCounts) => {
      pm.replyCount = updatedCounts[pm.id!]?.count || 0;
    }
  );
}
