// message-utils.ts

import { sendMessage } from './entwicklerteam-message-logic';
import { highlightMessage, closePopup, toggleEmojiPopup } from './entwicklerteam-message-ui-logic';

export function scrollToBottom(component: any): void {
  setTimeout(() => {
    if (component.messageList?.nativeElement) {
      component.messageList.nativeElement.scrollTop =
        component.messageList.nativeElement.scrollHeight;
    }
    setTimeout(() => {
      if (component.messageList?.nativeElement) {
        component.messageList.nativeElement.scrollTop =
          component.messageList.nativeElement.scrollHeight;
      }
    }, 200);
  }, 100);
}

export function handleKeyDown(component: any, e: KeyboardEvent, txtArea: HTMLTextAreaElement): void {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage(component, txtArea);
  }
}

export function onSendMessage(component: any, txtArea: HTMLTextAreaElement): void {
  sendMessage(component, txtArea);
}

export function toggleEditMessage(component: any, msg: any): void {
  msg.isEditing = true;
  component.originalMessage = { ...msg };
}

export function cancelEditing(component: any, msg: any): void {
  msg.isEditing = false;
  if (component.originalMessage) {
    msg.content = { ...component.originalMessage.content };
    component.originalMessage = null;
  }
  component.showEditOptions = false;
}

export function saveMessage(component: any, msg: any): void {
  if (!msg?.isEditing || !msg.id || !component.selectedChannel) return;
  msg.isEditing = false;
  const o = component.originalMessage?.content?.text || '';
  const n = msg.content?.text || '';
  const c = o !== n;
  const upd = { ...msg.content };
  component.channelService
    .updateMessage(component.selectedChannel.id, msg.id, upd, c)
    .then(() => {
      component.messages = component.messages.map((m: any) =>
        m.id === msg.id ? { ...m, isEditing: false, edited: c, content: upd } : m
      );
    });
}

export function toggleEditOptions(component: any, msgId: string): void {
  if (component.currentMessageId === msgId && component.showEditOptions) {
    component.showEditOptions = false;
    component.currentMessageId = null;
  } else {
    component.showEditOptions = true;
    component.currentMessageId = msgId;
  }
}

export function startEditing(component: any, msg: any): void {
  msg.isEditing = true;
  component.originalMessage = JSON.parse(JSON.stringify(msg));
  component.showEditOptions = false;
}

export function onHighlightMessage(component: any, id: string): void {
  highlightMessage(component, id);
}

export function onClosePopup(component: any, msg: any): void {
  closePopup(component, msg);
}

export function onToggleEmojiPopup(component: any, msg: any): void {
  toggleEmojiPopup(component, msg);
}
