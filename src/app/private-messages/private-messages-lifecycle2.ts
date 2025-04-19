// private-messages-lifecycle2.ts
import { PrivateMessagesComponent } from './private-messages.component';

export function updateMessageDatesUtil(c: PrivateMessagesComponent) {
  const updated = c.privateMessages.map((msg) => ({
    ...msg,
    formattedDate: c.getFormattedDate(msg.timestamp),
  }));
  c.privateMessages = [...updated];
}

export function setupRecipientListenerUtil(c: PrivateMessagesComponent) {
  c.unsubscribeRecipient = c.messageService.onRecipientStatusChanged(
    c.recipientId,
    (data) => {
      c.recipientStatus = data.isOnline ? 'Aktiv' : 'Abwesend';
      c.recipientAvatarUrl = data.avatarUrl;
      c.recipientName = data.name;
    }
  );
}

export function setupMessageListenerUtil(c: PrivateMessagesComponent) {
  if (c.unsubscribeFromThreadMessages) {
    c.unsubscribeFromThreadMessages();
    c.unsubscribeFromThreadMessages = null;
  }

  c.hasScrolledOnChange = false;
  let oldCount = c.privateMessages.length;

  c.unsubscribeFromThreadMessages = c.messageService.listenMessages(
    'private',
    c.conversationId!,
    (rawMessages) => {
      c.processIncomingMessages(rawMessages);

      const wasNearBottom = c.isNearBottom(150);
      const newCount = rawMessages.length;
      if (newCount > oldCount || wasNearBottom) {
        c.scrollToBottom();
      }
      oldCount = newCount;
    }
  );
}

export function ngOnDestroyUtil(c: PrivateMessagesComponent) {
  if (c.unsubscribeFromThreadMessages) {
    c.unsubscribeFromThreadMessages();
    c.unsubscribeFromThreadMessages = null;
  }
  if (c.unsubscribeFromThreadDetails) {
    c.unsubscribeFromThreadDetails();
    c.unsubscribeFromThreadDetails = null;
  }
  if (c.unsubscribeEmojiListener) {
    c.unsubscribeEmojiListener();
  }
  if (c.unsubscribeLiveReplyCounts) {
    c.unsubscribeLiveReplyCounts();
    c.unsubscribeLiveReplyCounts = null;
  }
  c.replyCache.clear();
}

export function ngOnHelpDestroyUtil(c: PrivateMessagesComponent) {
  if (c.unsubscribeFromPrivateMessages) {
    c.unsubscribeFromPrivateMessages();
  }
  if (c.unsubscribeRecipient) {
    c.unsubscribeRecipient();
  }
  if (c.unsubscribeChannels) {
    c.unsubscribeChannels();
  }
  if (c.unsubscribeUsers) {
    c.unsubscribeUsers();
  }
}
