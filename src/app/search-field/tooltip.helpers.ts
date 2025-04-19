// tooltip.helpers.ts
import { SearchFieldComponent } from './search-field.component';
import { showTooltip, hideTooltip } from './search-field.imports';

export function showTooltipComp(
  comp: SearchFieldComponent,
  event: MouseEvent,
  emoji: string,
  senderName: string
): void {
  showTooltip(
    event,
    (visible) => (comp.tooltipVisible = visible),
    (emojiValue) => (comp.tooltipEmoji = emojiValue),
    (name) => (comp.tooltipSenderName = name),
    (pos) => (comp.tooltipPosition = pos),
    emoji,
    senderName
  );
}

export function hideTooltipComp(comp: SearchFieldComponent): void {
  hideTooltip((visible) => (comp.tooltipVisible = visible));
}
