import { ThreadChannelComponent } from './thread-channel.component';

export async function sendThreadMessageHelper(
  component: ThreadChannelComponent,
  textArea: HTMLTextAreaElement
): Promise<void> {
  if (!isReadyToSendHelper(component)) return;
  await ensureCurrentUserHelper(component);
  if (!component.currentUser || !hasValidParentHelper(component)) return;

  const message = component.buildThreadChannelMessage();
  try {
    await component.messageService.sendMessage(message);
    component.channelMessage = '';
    component.imageUrl = null;
    if (textArea) {
      component.resetTextareaHeight(textArea);
    }
    component.scrollToBottom();
  } catch {}
}

export function isReadyToSendHelper(
  component: ThreadChannelComponent
): boolean {
  return Boolean(component.channelMessage.trim() || component.imageUrl);
}

export async function ensureCurrentUserHelper(
  component: ThreadChannelComponent
): Promise<void> {
  if (!component.currentUser) {
    await component.loadCurrentUser();
  }
}

export function hasValidParentHelper(
  component: ThreadChannelComponent
): boolean {
  return Boolean(component.parentMessage?.id);
}

export function handleKeyDownHelper(
  component: ThreadChannelComponent,
  event: KeyboardEvent,
  textArea: HTMLTextAreaElement
): void {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    if (component.channelMessage.trim() || component.imageUrl) {
      sendThreadMessageHelper(component, textArea);
    }
    if (textArea) {
      component.resetTextareaHeight(textArea);
    }
  }
}

export function sendMessageHelper(component: ThreadChannelComponent): void {
  component.channelMessage = '';
}

export async function saveMessageHelper(
  component: ThreadChannelComponent,
  msg: any
): Promise<void> {
  if (!component.parentMessage?.id || !msg.id) {
    return;
  }
  try {
    await component.messageService.updateMessage(msg.id, {
      content: {
        text: msg.content.text,
        ...(msg.content.image && { image: msg.content.image }),
        ...(msg.content.emojis && { emojis: msg.content.emojis }),
      },
      edited: true,
    });
    msg.isEditing = false;
  } catch (error) {}
}

export function cancelEditingHelper(
  component: ThreadChannelComponent,
  msg: any
): void {
  msg.isEditing = false;
  if (component.originalMessage) {
    msg.content = { ...component.originalMessage.content };
    component.originalMessage = null;
  }
  component.showEditOptions = false;
}

export function startEditingHelper(
  component: ThreadChannelComponent,
  msg: any
): void {
  msg.isEditing = true;
  component.originalMessage = JSON.parse(JSON.stringify(msg));
  component.showEditOptions = false;
  component.currentMessageId = null;
}

export function getFilteredChannelsHelper(
  component: ThreadChannelComponent
): any[] {
  if (!component.currentUser?.uid || !component.allChannels) {
    return [];
  }
  return component.allChannels.filter((ch) =>
    ch.members?.some((m: any) => m.uid === component.currentUser.uid)
  );
}
