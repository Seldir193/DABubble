import { EntwicklerteamComponent } from './entwicklerteam.component';
import { ChannelMessageData } from '../message.models';
import { formatDate } from '@angular/common';
import { resetTextareaHeight, adjustTextareaHeight } from './entwicklerteam-textarea-logic';

export function addEmojiToMessage(self: EntwicklerteamComponent, ev: any, msg: any) {
  if (!ev?.emoji?.native || !msg.content?.emojis) return;
  const e = ev.emoji.native;
  const existing = msg.content.emojis.find((x: any) => x.emoji === e);
  if (existing) {
    existing.count = 1;
  } else if (msg.content.emojis.length < 20) {
    msg.content.emojis.push({ emoji: e, count: 1 });
  }
  updateLastUsedForMessage(self, e, msg.senderName);
  msg.isEmojiPickerVisible = false;
  updateMsgInFirestore(self, msg, false);
}

function updateLastUsedForMessage(self: EntwicklerteamComponent, e: string, sender: string) {
  const me = self.currentUser?.name || '';
  const isSent = sender === me;
  const arr = isSent ? self.lastUsedEmojisSent : self.lastUsedEmojisReceived;
  const updated = arr.filter((x) => x !== e).slice(0, 2);
  if (!self.selectedChannel?.id) return;
  const type = isSent ? 'sent' : 'received';
  self.channelService.saveLastUsedEmojis(self.selectedChannel.id, updated, type);
  if (isSent) self.lastUsedEmojisSent = updated;
  else self.lastUsedEmojisReceived = updated;
}

function updateMsgInFirestore(
    self: EntwicklerteamComponent,
    msg: any,
    markEdited: boolean 
  ) {
    if (!self.selectedChannel?.id) return;
    self.channelService
      .updateMessage(self.selectedChannel.id, msg.id, msg.content, markEdited)
      .then(() => {});
  }
  
export function sendMessage(self: EntwicklerteamComponent, txtArea: HTMLTextAreaElement) {
  if (!self.message.trim() && !self.imageUrl) return;
  const newMsg = buildNewMessage(self);
  addMessage(self, newMsg);
  self.message = '';
  self.imageUrl = null;
  resetTextareaHeight(self,txtArea);
  adjustTextareaHeight(self, txtArea);
  self.scrollToBottom();
}

function buildNewMessage(self: EntwicklerteamComponent) {
  const hasText = !!self.message.trim();
  const hasImg = !!self.imageUrl;
  return {
    messageFormat: hasImg && hasText ? 'text_and_image' : hasImg ? 'image' : 'text',
    content: {
      text: hasText ? self.message.trim() : null,
      image: hasImg ? self.imageUrl : null,
      emojis: [],
    },
    date: formatDate(new Date(), 'dd.MM.yyyy', 'en'),
    timestamp: new Date(),
    time: new Date().toLocaleTimeString(),
    senderId: self.currentUser?.id,
    isEmojiPickerVisible: false,
  };
}

function addMessage(self: EntwicklerteamComponent, m: any) {
  if (!self.selectedChannel) return;
  const messageData: ChannelMessageData = {
    channelId: self.selectedChannel.id,
    date: m.date,
    time: m.time,
    timestamp: m.timestamp,
    senderId: m.senderId,
    senderName: self.currentUser?.name,
    senderAvatar: self.currentUser?.avatarUrl || 'assets/img/avatar.png',
    content: m.content,
    messageFormat: m.messageFormat,
  };
  self.messageService.sendChannelMessage(messageData).then(() => {
    self.scrollToBottom();
  });
}
