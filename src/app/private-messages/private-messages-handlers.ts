import { PrivateMessagesComponent } from './private-messages.component';
import { SimpleChanges } from '@angular/core';

export function handleRecipientChangesUtil(
  c: PrivateMessagesComponent,
  ch: SimpleChanges
) {
  const rc = ch['recipientId'];
  if (!rc || rc.isFirstChange()) return;
  beforeRecipientSwitch(c);
  setTimeout(() => afterRecipientSwitch(c), 200);

  c.startLiveReplyCountUpdates();
}

function beforeRecipientSwitch(c: PrivateMessagesComponent) {
  c['hasScrolledOnChange'] = true;
  c['isChatChanging'] = true;
  c['callCleanupListeners']();
  c.loadRecipientData();
  c.loadPrivateMessages();
  if (c['unsubscribeRecipient']) c['unsubscribeRecipient']();
  c['setupRecipientListener']();
}

function afterRecipientSwitch(c: PrivateMessagesComponent) {
  c.scrollToBottom();
  c['isChatChanging'] = false;
  c['focusTextArea']();
}

export async function saveMessageUtil(
  c: PrivateMessagesComponent,
  msg: any
): Promise<void> {
  if (msg?.isEditing === undefined) return;
  msg.isEditing = false;
  const messageId = msg.id;
  if (!messageId) return;
  await updateEditedMessageUtil(c, messageId, msg);
}

async function updateEditedMessageUtil(
  c: PrivateMessagesComponent,
  id: string,
  msg: any
) {
  try {
    await c.messageService.updateMessage(id, {
      content: msg.content,
      edited: true,
    });
    c.privateMessages = c.privateMessages.map((m) =>
      m.id === id ? { ...msg, isEditing: false, edited: true } : m
    );
  } catch {}
}
