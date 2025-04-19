import { ThreadComponent } from './thread.component';

export function handleKeyDownComp(
  comp: ThreadComponent,
  event: KeyboardEvent,
  textArea: HTMLTextAreaElement
): void {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    comp.sendThreadMessage(comp.privateMessage, comp.imageUrl, textArea);
    comp.privateMessage = '';
    comp.imageUrl = null;
    comp.resetTextareaHeight(textArea);
  }
}
