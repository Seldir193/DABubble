// broadcast.helpers.ts
import { SearchFieldComponent } from './search-field.component';
import {
  sendMessageToAllCompletely,
  BroadcastContext,
  scrollToBottom,
} from './search-field.imports';

export function handleKeyDownComp(
  comp: SearchFieldComponent,
  event: KeyboardEvent,
  textArea: HTMLTextAreaElement
): void {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessageToAllComp(comp, textArea);
  }
}

export function addAtSymbolAndOpenDialogComp(comp: SearchFieldComponent): void {
  comp.messageToAll += '@';
}

export function toggleEmojiPickerForMessageComp(
  comp: SearchFieldComponent,
  msg: any
): void {
  const isVisible = msg.isEmojiPickerVisible;
  comp.privateMessages.forEach((m) => (m.isEmojiPickerVisible = false));
  msg.isEmojiPickerVisible = !isVisible;
}

export function shouldCancelBroadcastComp(comp: SearchFieldComponent): boolean {
  return (!comp.messageToAll.trim() && !comp.imageUrl) || !comp.currentUser?.id;
}

export function getBroadcastContextComp(
  comp: SearchFieldComponent
): BroadcastContext {
  return {
    currentUser: comp.currentUser,
    messageToAll: comp.messageToAll,
    imageUrl: typeof comp.imageUrl === 'string' ? comp.imageUrl : null,
    isEmojiPickerVisible: comp.isEmojiPickerVisible,
    resetTextareaHeightFn: (ta) => comp.resetTextareaHeight(ta),
    scrollToBottomFn: () => scrollToBottom(comp.messageList),
    messageService: comp.messageService,
  };
}

export async function sendMessageToAllComp(
  comp: SearchFieldComponent,
  textArea: HTMLTextAreaElement
): Promise<void> {
  await sendMessageToAllCompletely(
    getBroadcastContextComp(comp),
    textArea,
    comp.selectedRecipients,
    () => shouldCancelBroadcastComp(comp)
  );
  comp.messageToAll = '';
  comp.imageUrl = null;
  comp.isEmojiPickerVisible = false;
}
