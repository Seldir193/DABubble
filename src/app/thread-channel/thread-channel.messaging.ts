import { ThreadChannelComponent } from './thread-channel.component';

export function buildThreadChannelMessageHelper(
  component: ThreadChannelComponent
) {
  return {
    type: 'thread-channel' as const,
    content: {
      text: component.channelMessage,
      image: component.imageUrl || null,
      emojis: [],
    },
    senderId: component.currentUser!.id,
    threadChannelId: component.parentMessage!.id,
    parentId: component.parentMessage!.id,
  };
}

export function waitForMessageToRenderHelper(
  component: ThreadChannelComponent,
  messageId: string,
  retries = 5
): void {
  if (retries === 0) {
    return;
  }

  setTimeout(() => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageElement.classList.add('highlight');
      setTimeout(() => messageElement.classList.remove('highlight'), 2000);
    } else {
      waitForMessageToRenderHelper(component, messageId, retries - 1);
    }
  }, 300);
}

export function highlightMessageHelper(
  component: ThreadChannelComponent,
  messageId: string,
  retries = 5
): void {
  setTimeout(() => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageElement.classList.add('highlight');
      setTimeout(() => messageElement.classList.remove('highlight'), 2000);
    } else if (retries > 0) {
      highlightMessageHelper(component, messageId, retries - 1);
    }
  }, 500);
}
