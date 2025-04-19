// private-messages-subscriptions.ts

import { PrivateMessagesComponent } from './private-messages.component';

/**
 * USERS
 */
export function setUsersUnsubscribeUtil(
  c: PrivateMessagesComponent,
  fn: (() => void) | null
) {
  c.unsubscribeUsers = fn;
}

export function clearUsersUnsubscribeUtil(c: PrivateMessagesComponent) {
  if (c.unsubscribeUsers) {
    c.unsubscribeUsers();
    c.unsubscribeUsers = null;
  }
}

/**
 * CHANNELS
 */
export function setChannelsUnsubscribeUtil(
  c: PrivateMessagesComponent,
  fn: (() => void) | null
) {
  c.unsubscribeChannels = fn;
}

export function clearChannelsUnsubscribeUtil(c: PrivateMessagesComponent) {
  if (c.unsubscribeChannels) {
    c.unsubscribeChannels();
    c.unsubscribeChannels = null;
  }
}

/**
 * PRIVATE MESSAGES
 */
export function setPrivateMessagesUnsubscribeUtil(
  c: PrivateMessagesComponent,
  fn: (() => void) | null
) {
  c.unsubscribeFromPrivateMessages = fn;
}

export function getPrivateMessagesUnsubscribeUtil(
  c: PrivateMessagesComponent
): (() => void) | null {
  return c.unsubscribeFromPrivateMessages;
}

export function clearPrivateMessagesUnsubscribeUtil(
  c: PrivateMessagesComponent
) {
  if (c.unsubscribeFromPrivateMessages) {
    c.unsubscribeFromPrivateMessages();
    c.unsubscribeFromPrivateMessages = null;
  }
}

/**
 * LIVE REPLY COUNTS
 */
export function setLiveReplyCountsUnsubscribeUtil(
  c: PrivateMessagesComponent,
  fn: (() => void) | null
) {
  c.unsubscribeLiveReplyCounts = fn;
}

export function hasLiveReplyCountsUnsubscribeUtil(
  c: PrivateMessagesComponent
): boolean {
  return !!c.unsubscribeLiveReplyCounts;
}

export function clearLiveReplyCountsUnsubscribeUtil(
  c: PrivateMessagesComponent
) {
  if (c.unsubscribeLiveReplyCounts) {
    c.unsubscribeLiveReplyCounts();
    c.unsubscribeLiveReplyCounts = null;
  }
}

/**
 * EMOJI LISTENER
 */
export function setUnsubscribeEmojiListenerUtil(
  c: PrivateMessagesComponent,
  fn: () => void
) {
  c.unsubscribeEmojiListener = fn;
}

export function getUnsubscribeEmojiListenerUtil(
  c: PrivateMessagesComponent
): (() => void) | undefined {
  return c.unsubscribeEmojiListener;
}
