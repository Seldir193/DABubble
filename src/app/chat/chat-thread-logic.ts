// chat-thread-logic.ts

import { ChatComponent } from './chat.component';

/**
 * Replaces the original openThread(...) in ChatComponent.
 * @param {ChatComponent} component - The instance of the ChatComponent.
 * @param {any} message - The message object to open as a thread.
 */
export function openThreadLogic(component: ChatComponent, message: any): void {
  resetThreadState(component);
  if (isThreadAlreadyOpen(component, message)) return;

  setupSelectedThread(component, message);
  highlightThreadMessageAsync(component, message);

  if (window.innerWidth < 1278) {
    component.currentMobileView = 'thread';
  }
}

/** Matches old `resetThreadState(...)` */
function resetThreadState(component: ChatComponent): void {
  component.selectedThreadChannel = null;
  component.isThreadFromSearch = false;
}

/** Matches old `isThreadAlreadyOpen(...)` */
function isThreadAlreadyOpen(component: ChatComponent, message: any): boolean {
  return component.selectedThread?.id === message.id;
}

/** Matches old `setupSelectedThread(...)` */
function setupSelectedThread(component: ChatComponent, message: any): void {
  component.selectedThread = null;
  component.selectedThread = {
    ...message,
    recipientName:
      message.recipientName || message.senderName || 'Unbekannt',
  };
}

/** Matches old `highlightThreadMessageAsync(...)` */
function highlightThreadMessageAsync(component: ChatComponent, message: any): void {
  setTimeout(() => {
    component.selectedThread = message;
    setTimeout(() => {
      const threadComponent = document.querySelector('app-thread') as any;
      if (threadComponent?.highlightThreadMessage) {
        threadComponent.highlightThreadMessage(message.id);
      }
    }, 300);
  }, 50);
}
