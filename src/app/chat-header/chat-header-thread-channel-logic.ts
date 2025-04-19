import { ChatHeaderComponent } from './chat-header.component';

export function openThreadChannelMessage(self: ChatHeaderComponent, msg: any): void {
  ensureThreadChannelId(self, msg);
  self.threadChannelSelected.emit(msg);
  launchThreadChannelScroll(self, msg);
  self.hasScrolledToSearchedMessage = false;
}

function ensureThreadChannelId(self: ChatHeaderComponent, msg: any): void {
  if (!msg.threadChannelId) {
    msg.threadChannelId = msg.parentId ?? msg.id;
  }
}

function launchThreadChannelScroll(self: ChatHeaderComponent, msg: any): void {
  setTimeout(() => {
    self.messageService.listenForMessages(
      'thread-channel',
      msg.threadChannelId,
      (msgs) => {
        if (!self.hasScrolledToSearchedMessage) {
          const found = msgs.find((m) => m.id === msg.id);
          if (found) {
            self.scrollToMessage(found.id);
            self.hasScrolledToSearchedMessage = true;
          }
        }
      }
    );
  }, 800);
}
