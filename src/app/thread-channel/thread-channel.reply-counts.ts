import { ThreadChannelComponent } from './thread-channel.component';
import { Message } from '../message.models';

export function loadReplyCountsHelper(component: ThreadChannelComponent): void {
  const pMsg = component.parentMessage;
  if (!pMsg || !pMsg.id) return;

  component.messageService
    .getReplyCountsForMessages([pMsg.id], 'thread-channel')
    .then((replyCounts) => {
      updateReplyCountsHelper(component, replyCounts, pMsg);
    })
    .catch(() => {});
}

export function updateReplyCountsHelper(
  component: ThreadChannelComponent,
  replyCounts: any,
  pMsg: Message
): void {
  const replyCountData = replyCounts[pMsg.id!];
  if (!replyCountData) return;
  pMsg.replyCount = replyCountData.count;
  pMsg.lastReplyTime = replyCountData.lastResponseTime || pMsg.lastReplyTime;
  component.cdr.detectChanges();
}
