import { PrivateMessagesComponent } from './private-messages.component';

export function loadThreadEvent(c: PrivateMessagesComponent, msg: any) {
  c.parentMessage = msg;
  const t = msg.threadId || msg.id;
  if (c.unsubscribeFromThreadMessages) {
    c.unsubscribeFromThreadMessages();
    c.unsubscribeFromThreadMessages = null;
  }
  if (c.replyCache.has(t)) {
    msg.replies = c.replyCache.get(t) || [];
    c.openThread.emit(msg);
    return;
  }
  loadThread(c, t, msg);
}

function loadThread(c: PrivateMessagesComponent, t: string, o: any) {
  c.unsubscribeFromThreadMessages = c.messageService.listenMessages(
    'thread',
    t,
    (m) => {
      handleThreadMessages(c, m, o);
    }
  );
}

function handleThreadMessages(
  c: PrivateMessagesComponent,
  list: any[],
  origin: any
) {
  const last = list.length
    ? c['safeConvertTimestamp'](list[list.length - 1].timestamp)
    : null;
  c.privateMessages = c.privateMessages.map((msg) => {
    if (msg.id !== origin.id) return msg;
    return {
      ...msg,
      replies: [...list],
      replyCount: list.length,
      lastResponseTime: last,
    };
  });
  c.openThread.emit(origin);
}
