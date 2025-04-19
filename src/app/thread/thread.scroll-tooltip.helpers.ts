// thread.scroll-tooltip.helpers.ts
import { ThreadComponent } from './thread.component';

export function scrollToBottomComp(comp: ThreadComponent): void {
  setTimeout(() => {
    if (comp.messageList) {
      comp.messageList.nativeElement.scrollTop =
        comp.messageList.nativeElement.scrollHeight;
    }
  }, 100);
}

export function showTooltipComp(
  comp: ThreadComponent,
  event: MouseEvent,
  emoji: string,
  senderName: string
): void {
  comp.tooltipVisible = true;
  comp.tooltipEmoji = emoji;
  comp.tooltipSenderName = senderName;
  const targetElem = event.target as HTMLElement;
  const rect = targetElem.getBoundingClientRect();
  const offset = 5;
  comp.tooltipPosition = {
    x: rect.left + rect.width / 2 + window.scrollX,
    y: rect.top + window.scrollY - offset,
  };
}

export function hideTooltipComp(comp: ThreadComponent): void {
  comp.tooltipVisible = false;
}
