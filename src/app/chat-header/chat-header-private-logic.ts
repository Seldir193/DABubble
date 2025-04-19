import { ChatHeaderComponent } from './chat-header.component';

export function openPrivateMessage(self: ChatHeaderComponent, msg: any): void {
  const partnerId = getChatPartnerId(self, msg);
  self.memberSelected.emit({ id: partnerId, name: msg.recipientName || '' });
  launchPrivateScroll(self, msg);
}

function getChatPartnerId(self: ChatHeaderComponent, msg: any): string {
  const currentUserId = self.userService.getCurrentUserId();
  return msg.senderId === currentUserId ? msg.recipientId : msg.senderId;
}

function launchPrivateScroll(self: ChatHeaderComponent, msg: any): void {
  setTimeout(() => {
    self.messageService.getPrivateMessagesLive(msg.conversationId, (msgs) => {
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
