import { SimpleChanges } from '@angular/core';
import { Message } from '../message.models';
import { ThreadChannelComponent } from './thread-channel.component';

export function parentMessageChangeDetected(changes: SimpleChanges): boolean {
  return !!(changes['parentMessage'] && changes['parentMessage'].currentValue);
}

export function cleanUpOldListeners(component: ThreadChannelComponent): void {
  if (component.unsubscribeFromThreadMessages) {
    component.unsubscribeFromThreadMessages();
    component.unsubscribeFromThreadMessages = undefined;
  }
  if (component.unsubscribeFromReplyCount) {
    component.unsubscribeFromReplyCount();
    component.unsubscribeFromReplyCount = undefined;
  }
}

export function mergeOrPushNewMessage(
  component: ThreadChannelComponent,
  newMessage: any
): void {
  if (newMessage.id === component.parentMessage?.id) {
    component.parentMessage = {
      ...component.parentMessage,
      ...newMessage,
    };
  } else {
    component.threadMessages.push(newMessage);
  }
}

export function isParentValid(
  component: ThreadChannelComponent,
  pMsg: Message | null
): pMsg is Message {
  return !!(pMsg && pMsg.id && component.channelId);
}

export async function onValidParentChange(
  component: ThreadChannelComponent,
  pMsg: Message
): Promise<void> {
  await component.loadCurrentUser();
  if (!pMsg.id) {
    return;
  }
  await component.initializeThread(pMsg.id);
  component.loadReplyCounts();

  component.unsubscribeFromReplyCount =
    component.messageService.loadReplyCountsLive(
      [pMsg.id],
      'thread-channel',
      (replyCounts) => {
        const data = replyCounts[pMsg.id || ''];
        if (!data) return;
        pMsg.replyCount = data.count;
        pMsg.lastReplyTime = data.lastResponseTime || pMsg.lastReplyTime;
        component.cdr.detectChanges();
      }
    );
}
