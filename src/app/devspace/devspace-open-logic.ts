// devspace-open-logic.ts

import { DevspaceComponent } from './devspace.component';

export function openChannelMessage(self: DevspaceComponent, msg: any): void {
  self.channelService.getChannelById(msg.channelId).then((channel) => {
    if (!channel) return;
    self.selectChannel(channel);
    setTimeout(() => {
      self.channelService.getMessages(msg.channelId).subscribe((msgs) => {
        self.scrollToMessageIfExists(msgs, msg.id);
      });
    }, 800);
  });
}

export function openPrivateMessage(self: DevspaceComponent, msg: any): void {
  const partnerId = getChatPartnerId(self, msg);
  self.memberSelected.emit({ id: partnerId, name: msg.recipientName || '' });
  launchPrivateScroll(self, msg);
}

function getChatPartnerId(self: DevspaceComponent, msg: any): string {
  const curUser = self.userService.getCurrentUserId();
  return msg.senderId === curUser ? msg.recipientId : msg.senderId;
}

function launchPrivateScroll(self: DevspaceComponent, msg: any): void {
  setTimeout(() => {
    self.messageService.getPrivateMessagesLive(msg.conversationId, (msgs) => {
      if (!self['hasScrolledToSearchedMessage']) {
        const found = msgs.find((m: any) => m.id === msg.id);
        if (found) {
          self.scrollToMessage(found.id);
          self['hasScrolledToSearchedMessage'] = true;
        }
      }
    });
  }, 800);
}

export function openThreadChannelMessage(self: DevspaceComponent, msg: any): void {
  if (!msg.threadChannelId) {
    msg.threadChannelId = msg.parentId ?? msg.id;
  }
  self.threadChannelSelected.emit(msg);
  self['hasScrolledToSearchedMessage'] = false;
  setTimeout(() => {
    self.messageService.listenForMessages('thread-channel', msg.threadChannelId, (msgs) => {
      if (!self['hasScrolledToSearchedMessage']) {
        const found = msgs.find((m: any) => m.id === msg.id);
        if (found) {
          self.scrollToMessage(found.id);
          self['hasScrolledToSearchedMessage'] = true;
        }
      }
    });
  }, 1500);
}

export function openThreadMessage(self: DevspaceComponent, msg: any): void {
  ensureThreadId(msg);
  emitThreadData(self, msg);
  launchThreadScroll(self, msg);
  self['hasScrolledToSearchedMessage'] = false;
}

function ensureThreadId(msg: any): void {
  if (!msg.threadId) {
    msg.threadId = msg.parentId ?? msg.id;
  }
}

function emitThreadData(self: DevspaceComponent, msg: any): void {
  const data = {
    ...msg,
    threadId: msg.threadId,
    messageId: msg.id,
    parentId: msg.parentId || msg.threadId,
    parentName: msg.parentName || '',
    id: msg.threadId,
  };
  self.threadSelected.emit(data);
}

function launchThreadScroll(self: DevspaceComponent, msg: any): void {
  setTimeout(() => {
    self.messageService.getThreadMessagesLive(msg.threadId, (msgs) => {
      if (!self['hasScrolledToSearchedMessage']) {
        const found = msgs.find((m: any) => m.id === msg.id);
        if (found) {
          self.scrollToMessage(found.id);
          self['hasScrolledToSearchedMessage'] = true;
        }
      }
    });
  }, 800);
}