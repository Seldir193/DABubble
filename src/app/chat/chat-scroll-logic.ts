import { ChatComponent } from './chat.component';

export function scrollToMessage(self: ChatComponent, messageId: string, retries = 5): void {
  setTimeout(() => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('highlight');
      setTimeout(() => element.classList.remove('highlight'), 2000);
    } else if (retries > 0) {
      scrollToMessage(self, messageId, retries - 1);
    }
  }, 300);
}
