import { PrivateMessagesComponent } from './private-messages.component';

export function showTooltipUtil(
  c: PrivateMessagesComponent,
  e: MouseEvent,
  emoji: string,
  senderName: string
) {
  c.tooltipVisible = true;
  c.tooltipEmoji = emoji;
  c.tooltipSenderName = senderName;

  const targetElem = e.target as HTMLElement;
  const rect = targetElem.getBoundingClientRect();
  const offset = 5;

  c.tooltipPosition = {
    x: rect.left + rect.width / 2 + window.scrollX,
    y: rect.top + window.scrollY - offset,
  };
}

export function hideTooltipUtil(c: PrivateMessagesComponent) {
  c.tooltipVisible = false;
}

export function closePopupUtil(c: PrivateMessagesComponent, msg: any) {
  if (msg.showAllEmojisList) {
    msg.showAllEmojisList = false;
    msg.expanded = false;
  }
}

export function toggleEmojiPopupUtil(c: PrivateMessagesComponent, msg: any) {
  if (msg.showAllEmojisList === undefined) msg.showAllEmojisList = false;
  msg.showAllEmojisList = !msg.showAllEmojisList;
  if (!msg.showAllEmojisList) {
    msg.expanded = false;
  } else if (msg.expanded === undefined) {
    msg.expanded = false;
  }
}

export function onEmojiPlusInPopupUtil(c: PrivateMessagesComponent, msg: any) {}
