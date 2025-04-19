// thread.channel-thread.helpers.ts
import { ThreadChannelComponent } from './thread-channel.component';

export async function initializeThreadChannelComp(
  comp: ThreadChannelComponent,
  threadChannelId: string
): Promise<void> {
  try {
    const [emojisSent, emojisReceived] = await Promise.all([
      comp.messageService.getLastUsedEmojis(threadChannelId, 'sent'),
      comp.messageService.getLastUsedEmojis(threadChannelId, 'received'),
    ]);
    comp.lastUsedEmojisSent = emojisSent || [];
    comp.lastUsedEmojisReceived = emojisReceived || [];
  } catch {}
  setupThreadSubscriptionChannelComp(comp, threadChannelId);
}

export async function setupThreadSubscriptionChannelComp(
  comp: ThreadChannelComponent,
  threadId: string
): Promise<void> {
  if (comp.unsubscribeFromThreadMessages) {
    comp.unsubscribeFromThreadMessages();
    comp.unsubscribeFromThreadMessages = undefined;
  }
  comp.unsubscribeFromThreadMessages = comp.messageService.listenForMessages(
    'thread-channel',
    threadId,
    async (messages: any[]) => {
      await handleIncomingMessagesChannelComp(comp, messages, threadId);
    }
  );
}

export async function handleIncomingMessagesChannelComp(
  comp: ThreadChannelComponent,
  messages: any[],
  threadId: string
): Promise<void> {
  if (!messages?.length) {
    comp.threadMessages = [];
    return;
  }
  const filtered = await filterMessagesForUserChannels(comp, messages);
  await reloadParentIfMismatchChannelComp(comp, filtered, threadId);
  setThreadMessagesExcludingParentChannelComp(comp, filtered);
  detectChangesAndScroll(comp);
}

async function filterMessagesForUserChannels(
  comp: ThreadChannelComponent,
  messages: any[]
): Promise<any[]> {
  const userChannels = await comp.channelService.getAllChannelsOnce();
  const userChannelIds = new Set(userChannels.map((ch) => ch.id));
  const filtered: any[] = [];
  for (const m of messages) {
    const cId = await comp.messageService.findChannelIdIfMissing(m);
    if (cId && userChannelIds.has(cId)) filtered.push(m);
  }
  return filtered;
}

function detectChangesAndScroll(comp: ThreadChannelComponent) {
  comp.cdr.detectChanges();
  setTimeout(() => comp.scrollToBottom(), 300);
}

export async function reloadParentIfMismatchChannelComp(
  comp: ThreadChannelComponent,
  messages: any[],
  threadId: string
): Promise<void> {
  if (comp.parentMessage?.id === threadId) return;

  const parentInMessages = messages.find((m) => m.id === threadId);
  if (parentInMessages) {
    setParentFromMessage(comp, parentInMessages);
    return;
  }

  const parentDoc = await fetchParentDoc(comp, threadId);
  if (parentDoc) await setParentFromDoc(comp, parentDoc, threadId);
}

function setParentFromMessage(
  comp: ThreadChannelComponent,
  parentInMessages: any
) {
  comp.parentMessage = comp.formatMessage({
    ...parentInMessages,
    content: parentInMessages.content ?? {
      text: '🔍 No text found',
      emojis: [],
    },
  });
}

async function fetchParentDoc(comp: ThreadChannelComponent, threadId: string) {
  return comp.messageService.getMessage('thread-channel', threadId);
}

async function setParentFromDoc(
  comp: ThreadChannelComponent,
  parentDoc: any,
  threadId: string
) {
  comp.parentMessage = comp.formatMessage({
    id: threadId,
    text: parentDoc.content?.text ?? '🔍 No text found',
    senderName: parentDoc.senderId || 'Unknown',
    senderAvatar: parentDoc.senderId || 'assets/img/default-avatar.png',
    timestamp: parentDoc.timestamp ?? new Date(),
    replyCount: parentDoc.replyCount || 0,
    channelName: parentDoc.channelName || 'Unknown',
    channelId: parentDoc.channelId || null,
  });
}

export function setThreadMessagesExcludingParentChannelComp(
  comp: ThreadChannelComponent,
  messages: any[]
): void {
  comp.threadMessages = messages
    .filter((msg) => msg.id !== comp.parentMessage?.id)
    .map((msg) =>
      comp.formatMessage({
        ...msg,
        content: msg.content ?? { text: '🔍 No text found', emojis: [] },
      })
    );
}
