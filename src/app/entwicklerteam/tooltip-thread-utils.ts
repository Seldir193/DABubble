// tooltip-thread-utils.ts
import { openThreadEvent } from './entwicklerteam-thread-logic';

export function showTooltip(component: any, event: MouseEvent, emoji: string, senderName: string): void {
  component.tooltipVisible = true;
  component.tooltipEmoji = emoji;
  component.tooltipSenderName = senderName;

  const targetElem = event.target as HTMLElement;
  const rect = targetElem.getBoundingClientRect();

  const offset = 5;
  component.tooltipPosition = {
    x: rect.left + rect.width / 2 + window.scrollX,
    y: rect.top + window.scrollY - offset,
  };
}

export function hideTooltip(component: any): void {
  component.tooltipVisible = false;
}

export function onOpenThreadEvent(component: any, msg: any): void {
  openThreadEvent(component, msg);
}
