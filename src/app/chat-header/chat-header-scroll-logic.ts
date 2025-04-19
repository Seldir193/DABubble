import { ChatHeaderComponent } from './chat-header.component';
import { Message } from '../message.models';

export function scrollToMessageIfExists(
  self: ChatHeaderComponent,
  messages: Message[],
  messageId: string,
  retries = 5
): void {
  const foundMessage = messages.find((m) => m.id === messageId);
  if (!foundMessage) return;

  setTimeout(() => {
    scrollToMessage(self, messageId, retries);
  }, 500);
}

export function scrollToMessage(
  self: ChatHeaderComponent,
  messageId: string,
  retries = 10
): void {
  if (self.hasScrolledToSearchedMessage) return;

  setTimeout(() => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageElement.classList.add('highlight');
      setTimeout(() => {
        messageElement.classList.remove('highlight');
      }, 2000);
      self.hasScrolledToSearchedMessage = true;
    } else if (retries > 0) {
      scrollToMessage(self, messageId, retries - 1);
    }
  }, 700);
}
