import { ChatHeaderComponent } from './chat-header.component';

export function openThreadMessage(self: ChatHeaderComponent, msg: any): void {
  ensureThreadId(self, msg);
  emitThreadEvent(self, msg);
  launchThreadScroll(self, msg);
  self.hasScrolledToSearchedMessage = false;
}

function ensureThreadId(self: ChatHeaderComponent, msg: any): void {
  if (!msg.threadId) {
    msg.threadId = msg.parentId ?? msg.id;
  }
}

function emitThreadEvent(self: ChatHeaderComponent, msg: any): void {
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

function launchThreadScroll(self: ChatHeaderComponent, msg: any): void {
  setTimeout(() => {
    self.selectedThread = msg;
    self.messageService.getThreadMessagesLive(msg.threadId, (msgs) => {
      if (!self.hasScrolledToSearchedMessage) {
        const found = msgs.find((m) => m.id === msg.id);
        if (found) {
          self.scrollToMessage(found.id);
          self.hasScrolledToSearchedMessage = true;
        }
      }
    });
  }, 800);
}
