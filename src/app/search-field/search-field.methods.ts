// In deiner neuen Datei: search-field.methods.ts
import { SearchFieldComponent } from './search-field.component';
import { Message } from '../message.models';
import {
  initializeDirectConversation,
  loadLastUsedEmojis,
} from './search-field.imports';

export function initializeDirectConversationComp(
  cmp: SearchFieldComponent
): void {
  cmp.conversationId = initializeDirectConversation(
    cmp.currentUser,
    cmp.recipientId,
    cmp.messageService,
    (msgs: Message[]) => (cmp.privateMessages = msgs),
    () => cmp.scrollToBottom(),
    loadLastUsedEmojis,
    () => cmp.getEmojiContext()
  );
}

export function onResizeComp(cmp: SearchFieldComponent, event: any): void {
  cmp.isDesktop = window.innerWidth >= 1278;
  cmp.placeholderText =
    event.target.innerWidth > 1278
      ? 'An: #channel, oder @jemand oder E-Mail Adresse'
      : 'An: #channel, oder @jemand';
}

export function checkDesktopWidthComp(cmp: SearchFieldComponent): void {
  cmp.isDesktop = window.innerWidth >= 1278;
}

export function updatePlaceholderTextComp(
  cmp: SearchFieldComponent,
  width: number
): void {
  cmp.placeholderText =
    width > 1278
      ? 'An: #channel, oder @jemand oder E-Mail Adresse'
      : 'An: #channel, oder @jemand';
}
