import { EntwicklerteamComponent } from './entwicklerteam.component';

export async function openThreadEvent(
  self: EntwicklerteamComponent,
  msg: any
): Promise<void> {
  if (!msg?.id) return;
  if (self.unsubscribeFromThreadMessages) self.unsubscribeFromThreadMessages();
  if (self.unsubscribeFromThreadDetails) self.unsubscribeFromThreadDetails();

  const tid = msg.threadChannelId || msg.parentId || msg.id;
  const parentDoc = await self.messageService.getMessage('thread-channel', tid);
  const cName = await resolveThreadChannelName(self, parentDoc, msg);
  const kids = await self.messageService.getMessagesOnce('thread-channel', tid);
  const dataObj = buildThreadDataObj(self, msg, parentDoc, cName, kids);

  listenThreadMessages(self, tid);
  listenThreadReplyCounts(self, tid, dataObj.parentMessage);

  if (self.messageService.listenForThreadDetails) {
    self.unsubscribeFromThreadDetails =
      self.messageService.listenForThreadDetails(tid, () => {});
  }
  setTimeout(() => positionOverlays(self), 300);
  self.openThread.emit(dataObj);
}

async function resolveThreadChannelName(
  self: EntwicklerteamComponent,
  pd: any,
  msg: any
): Promise<string> {
  if (pd?.channelName) return pd.channelName;
  if (!pd?.channelId) return 'Unbekannt';
  const ch = await self.channelService.getChannelById(pd.channelId);
  return ch?.name || 'Unbekannt';
}

function buildThreadDataObj(
  self: EntwicklerteamComponent,
  msg: any,
  parentDoc: any,
  channelName: string,
  children: any[]
): any {
  const p = parentDoc || {};
  const tid = msg.threadChannelId || msg.parentId || msg.id;
  const parentMessage = buildParentMessage(msg, p, tid, channelName);
  const fm = buildChildrenMessages(children, msg, tid);
  return { parentMessage, messages: fm };
}

function buildParentMessage(
  msg: any,
  p: any,
  tid: string,
  channelName: string
): any {
  return {
    id: tid,
    text: (p.content?.text ?? msg.text) || 'Kein Text',
    senderId: p.senderId || msg.senderId || 'unknown',
    timestamp: p.timestamp || msg.timestamp || new Date(),
    replyCount: p.replyCount || msg.replyCount || 0,
    channelName,
    channelId: p.channelId || null,
    content: p.content ?? msg.content ?? { text: 'Kein Text', emojis: [] },
  };
}

function buildChildrenMessages(children: any[], msg: any, tid: string): any[] {
  const fm = (children || []).map((c) => ({
    ...c,
    content: c.content ?? { text: 'Kein Text', emojis: [] },
    timestamp: c.timestamp || new Date(),
  }));
  if (msg.id !== tid) {
    fm.push({
      ...msg,
      content: msg.content || { text: 'Kein Text', emojis: [] },
      timestamp: msg.timestamp || new Date(),
    });
  }
  return fm;
}

function listenThreadMessages(
  self: EntwicklerteamComponent,
  threadId: string
): void {
  self.unsubscribeFromThreadMessages = self.messageService.listenForMessages(
    'thread-channel',
    threadId,
    () => {}
  );
}

function listenThreadReplyCounts(
  self: EntwicklerteamComponent,
  tid: string,
  parentMsg: any
): void {
  self.messageService.loadReplyCountsLive([tid], 'thread-channel', (rc) => {
    const d = rc[tid] || { count: 0, lastResponseTime: null };
    parentMsg.replyCount = d.count;
    parentMsg.timestamp = d.lastResponseTime || parentMsg.timestamp;
  });
}

function positionOverlays(self: EntwicklerteamComponent): void {
  self.positions.forEach((p) => (p.offsetX = -250));
  self.membersOverlay?.overlayRef?.updatePosition();
  self.positionsAddMembers.forEach((p) => (p.offsetX = -500));
  self.addMembersOverlay?.overlayRef?.updatePosition();
}
