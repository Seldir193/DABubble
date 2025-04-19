import { PrivateMessagesComponent } from './private-messages.component';
import { Message } from '../message.models';
import { formatDate } from '@angular/common';

export function processIncomingMessagesUtil(
  c: PrivateMessagesComponent,
  raw: Message[]
): void {
  raw.forEach((msg) => {
    if (msg.senderId && !c.userMap[msg.senderId])
      loadUserIntoMapUtil(c, msg.senderId);
  });
  let prev: Date | null = null;
  const updated = raw.map((msg, i) => {
    const ts = c.convertTimestampWrapper(msg.timestamp);
    const showSep = i === 0 || !c.isSameDayWrapper(prev, ts);
    prev = ts;
    return transformIncomingMessageUtil(c, msg, ts, showSep);
  });
  c.privateMessages = [...updated];
  updateLiveReplyCountsUtil(c, updated);
}

export function loadUserIntoMapUtil(
  c: PrivateMessagesComponent,
  userId: string
): void {
  c.userService
    .getUserById(userId)
    .then((u) => {
      if (u) {
        c.userMap[userId] = {
          name: u.name || 'Unbekannt',
          avatarUrl: u.avatarUrl || 'assets/img/avatar.png',
        };
      }
    })
    .catch(() => {});
}

export function transformIncomingMessageUtil(
  c: PrivateMessagesComponent,
  msg: Message,
  ts: Date,
  showDateSeparator: boolean
): Message & { showDateSeparator: boolean } {
  const lr = msg.lastResponseTime
    ? c.convertTimestampWrapper(msg.lastResponseTime)
    : ts;
  return {
    ...msg,
    timestamp: ts,
    lastResponseTime: lr,
    formattedDate: c.getFormattedDate(ts),
    showDateSeparator,
    time: formatDate(ts, 'HH:mm', 'de'),
    content: {
      ...msg.content,
      emojis: msg.content?.emojis?.slice() || [],
    },
    replyCount: msg.replyCount ?? 0,
  };
}

export function applyPartialCountsUtil(
  c: PrivateMessagesComponent,
  partialCounts: Record<string, { count: number; lastResponseTime?: any }>
): void {
  for (const [msgId, data] of Object.entries(partialCounts)) {
    const idx = c.privateMessages.findIndex((m) => m.id === msgId);
    if (idx === -1) continue;
    c.privateMessages[idx] = {
      ...c.privateMessages[idx],
      replyCount: data.count,
      timestamp: c.privateMessages[idx].timestamp,
      time: c.privateMessages[idx].time,
    };
  }
}

export function updateLiveReplyCountsUtil(
  c: PrivateMessagesComponent,
  messages: Message[]
): void {
  const ids = messages
    .map((m) => m.id)
    .filter((id): id is string => id !== undefined);
  if (!ids.length) return;
  const unsub = c.messageService.loadReplyCountsLive(ids, 'private', (pc) => {
    applyPartialCountsUtil(c, pc);
  });
  c.setLiveReplyCountsUnsubscribe(unsub);
}

export function startLiveReplyCountUpdatesUtil(
  c: PrivateMessagesComponent
): void {
  c.clearLiveReplyCountsUnsubscribe();
  const ids = c.privateMessages.map((m) => m.id || '').filter((x) => x);
  if (!ids.length) return;
  const unsub = c.messageService.loadReplyCountsLive(ids, 'private', (pc) => {
    applyReplyCountsUtil(c, pc);
  });
  c.setLiveReplyCountsUnsubscribe(unsub);
}

export function applyReplyCountsUtil(
  c: PrivateMessagesComponent,
  partialCounts: any
): void {
  c.privateMessages = c.privateMessages.map((msg) => {
    const data = partialCounts[msg.id || ''];
    if (!data) return msg;
    return {
      ...msg,
      replyCount: data.count,
      lastResponseTime: data.lastResponseTime
        ? c.convertTimestampWrapper(data.lastResponseTime)
        : null,
    };
  });
}
