import { formatDate } from '@angular/common';
import { ThreadComponent } from './thread.component';

export function setupParentMsgFromOriginalComp(
  comp: ThreadComponent,
  originalMessage: any
): void {
  comp.parentMessage = {
    ...originalMessage,
    content: {
      text: originalMessage.content?.text || '⚠️ Kein Text gefunden!',
      image: originalMessage.content?.image || null,
      emojis: originalMessage.content?.emojis || [],
    },
  };

  if (comp.parentMessage && comp.parentMessage.timestamp) {
    const parentTimestamp = comp.safeConvertTimestamp(
      comp.parentMessage.timestamp
    );
    comp.formattedParentMessageDate = comp.getFormattedDate(parentTimestamp);
    comp.formattedMessageTime = formatDate(parentTimestamp, 'HH:mm', 'de');
  }
}
