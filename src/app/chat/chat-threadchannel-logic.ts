
import { ChatComponent } from './chat.component';

export async function openThreadChannelFromSearchLogic(
  component: ChatComponent,
  result: any
): Promise<void> {
  prepThreadChannelSearch(component, result);

  const threadChannelId = getThreadChannelId(component, result);
  if (!threadChannelId) return;

  const { parentDoc, channelName } = await prepareParentDoc(component, threadChannelId);
  const formattedMessages = await prepareChildMessages(component, threadChannelId);

  const parentMessage = buildParentMessage(
    component,
    parentDoc,
    result,
    channelName,
    threadChannelId
  );

  assignThreadChannel(component, result, parentMessage, formattedMessages);
  addFallbackMessageIfNeeded(component, result, threadChannelId);
  handleResponsiveThreadChannelView(component);
}

function prepThreadChannelSearch(component: ChatComponent, result: any): void {
  if (component.selectedThread) {
    component.closeThread();
  }
  component.isThreadChannelFromSearch = true;
  component.isPrivateChat = false;
  component.isSearchActive = false;
  component.showWelcomeContainer = false;
  component.selectedChannel = null;
  component.selectedMember = null;
}

function getThreadChannelId(component: ChatComponent, result: any): string | null {
  const threadChannelId = result.threadChannelId || result.parentId || result.id;
  return threadChannelId || null;
}

async function prepareParentDoc(
  component: ChatComponent,
  threadChannelId: string
): Promise<{ parentDoc: any; channelName: string }> {
  const parentDoc = await loadParentDoc(component, threadChannelId);
  const channelName = await loadChannelNameIfNeeded(component, parentDoc);
  return { parentDoc, channelName };
}

async function prepareChildMessages(
  component: ChatComponent,
  threadChannelId: string
): Promise<any[]> {
  const childMessages = await loadChildMessages(component, threadChannelId);
  return formatThreadMessages(childMessages);
}

function assignThreadChannel(
  component: ChatComponent,
  result: any,
  parentMessage: any,
  formattedMessages: any[]
): void {
  component.selectedThreadChannel = {
    ...result,
    parentMessage,
    messages: formattedMessages,
  };
}

function addFallbackMessageIfNeeded(
  component: ChatComponent,
  result: any,
  threadChannelId: string
): void {
  if (result.id !== threadChannelId) {
    const fallbackContent = result.content ?? {
      text: 'Kein Text',
      emojis: [],
    };
    const fallbackTimestamp = result.timestamp || new Date();
    component.selectedThreadChannel.messages.push({
      ...result,
      content: fallbackContent,
      timestamp: fallbackTimestamp,
    });
  }
}

function handleResponsiveThreadChannelView(component: ChatComponent): void {
  if (window.innerWidth < 1278) {
    component.currentMobileView = 'threadChannel';
    component.showDesktopHeader = true;
  }
}

async function loadParentDoc(component: ChatComponent, threadChannelId: string): Promise<any | null> {
  const doc = await component.messageService.getMessage('thread-channel', threadChannelId);
  return doc || null;
}


async function loadChannelNameIfNeeded(component: ChatComponent, parentDoc: any): Promise<string> {
  let channelName = parentDoc?.channelName || 'Unbekannt';
  if (!parentDoc?.channelName && parentDoc?.channelId) {
    const channelData = await component.channelService.getChannelById(parentDoc.channelId);
    channelName = channelData?.name || 'Unbekannt';
  }
  return channelName;
}

async function loadChildMessages(
  component: ChatComponent,
  threadChannelId: string
): Promise<any[]> {
  const msgs = await component.messageService.getMessagesOnce('thread-channel', threadChannelId);
  return msgs || [];
}

function formatThreadMessages(childMessages: any[]): any[] {
  return (childMessages || []).map((msg) => ({
    ...msg,
    content: msg.content ?? { text: 'Kein Text', emojis: [] },
    timestamp: msg.timestamp || new Date(),
  }));
}

function buildParentMessage(
  component: ChatComponent,
  parentDoc: any,
  result: any,
  channelName: string,
  threadChannelId: string
) {
  return {
    id: threadChannelId,
    text: parentDoc?.content?.text ?? result?.content?.text ?? 'Kein Text',
    senderName: parentDoc?.senderName || result.senderName || 'Unbekannt',
    senderAvatar:
      parentDoc?.senderAvatar ||
      result.senderAvatar ||
      'assets/img/default-avatar.png',
    timestamp: parentDoc?.timestamp || result.timestamp || new Date(),
    replyCount: parentDoc?.replyCount || result.replyCount || 0,
    channelName,
    channelId: parentDoc?.channelId || null,
    content: parentDoc?.content ?? { text: 'Kein Text', emojis: [] },
  };
}
