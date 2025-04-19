import { ChatComponent } from './chat.component';

export async function openThreadFromSearch(self: ChatComponent, message: any): Promise<void> {
  resetContextForSearchThread(self);
  const threadId = determineThreadId(self, message);

  let recipientName = message.recipientName || message.senderName;
  if (!recipientName && message.recipientId) {
    recipientName = await self['fetchRecipientName'](message.recipientId);
  }

  self.selectedThread = {
    ...message,
    recipientName: recipientName || 'Unbekannt',
    recipientId: message.recipientId || message.senderId,
    threadId: threadId,
  };

  self.isThreadActive = true;
  self.isThreadFromSearch = true;
  handleMobileViewForSearchThread(self);
}

function resetContextForSearchThread(self: ChatComponent): void {
  self.closeThreadChannel();
  self.isPrivateChat = false;
  self.showWelcomeContainer = false;
  self.selectedChannel = null;
  self.selectedMember = null;
}

function determineThreadId(self: ChatComponent, message: any): string {
  return message.threadId || message.parentId || message.id;
}

function handleMobileViewForSearchThread(self: ChatComponent): void {
  if (window.innerWidth < 1278) {
    self.currentMobileView = 'thread';
    self.showDesktopHeader = true;
  }
}
