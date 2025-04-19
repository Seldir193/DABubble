import { PrivateMessagesComponent } from './private-messages.component';

export function toggleEmojiPickerForMessageUtil(
  c: PrivateMessagesComponent,
  msg: any
): void {
  const v = msg.isEmojiPickerVisible;
  c.privateMessages.forEach((m) => (m.isEmojiPickerVisible = false));
  msg.isEmojiPickerVisible = !v;
}

export function toggleEditOptionsUtil(
  c: PrivateMessagesComponent,
  msgId: string
): void {
  if (c.currentMessageId === msgId && c.showEditOptions) {
    c.showEditOptions = false;
    c.currentMessageId = null;
  } else {
    c.showEditOptions = true;
    c.currentMessageId = msgId;
  }
}

export function startEditingUtil(c: PrivateMessagesComponent, msg: any): void {
  msg.isEditing = true;
  c.originalMessage = JSON.parse(JSON.stringify(msg));
  c.showEditOptions = false;
}

export function toggleEditMessageUtil(
  c: PrivateMessagesComponent,
  msg: any
): void {
  msg.isEditing = true;
  c.originalMessage = { ...msg };
}

export function cancelEditingUtil(c: PrivateMessagesComponent, msg: any): void {
  if (c.originalMessage) {
    msg.content.text = c.originalMessage.content.text;
    c.originalMessage = null;
  }
  msg.isEditing = false;
  c.showEditOptions = false;
}
