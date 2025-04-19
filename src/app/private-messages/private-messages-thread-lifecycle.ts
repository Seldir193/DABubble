import { PrivateMessagesComponent } from './private-messages.component';
import { SimpleChanges } from '@angular/core';
import { formatDate } from '@angular/common';

export function handleThreadDataChangesUtil(
  c: PrivateMessagesComponent,
  ch: SimpleChanges
) {
  const td = ch['threadData']?.currentValue;
  if (!td?.timestamp) return;
  c.getFormattedDate(td.timestamp);
  formatDate(td.timestamp, 'HH:mm', 'de');
}

export function handlePrivateMessagesLiveUtil(
  c: PrivateMessagesComponent,
  messages: any[]
) {
  c.privateMessages = messages.map((msg) => {
    const ts = c.safeConvertTimestamp(msg.timestamp);
    const lr = msg.lastResponseTime
      ? c.safeConvertTimestamp(msg.lastResponseTime)
      : ts;
    return {
      ...msg,
      timestamp: ts,
      lastResponseTime: lr,
      formattedDate: c.getFormattedDate(ts),
      content: { ...msg.content, emojis: msg.content?.emojis || [] },
    };
  });
  setTimeout(() => c.scrollToBottom(), 200);
}

export function cleanupListenersUtil(c: PrivateMessagesComponent) {
  if (c.hasLiveReplyCountsUnsubscribe()) c.clearLiveReplyCountsUnsubscribe();
  if (c.unsubscribeFromThreadMessages) {
    c.unsubscribeFromThreadMessages();
    c.unsubscribeFromThreadMessages = null;
  }
}
