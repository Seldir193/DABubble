// channel-emoji.service.ts

import { Injectable } from '@angular/core';
import { Firestore, doc, getDoc, updateDoc } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root',
})
export class ChannelEmojiService {
  constructor(private firestore: Firestore) {}

  async saveLastUsedEmojis(
    channelId: string,
    lastUsedEmojis: string[],
    type: 'sent' | 'received'
  ): Promise<void> {
    if (!channelId) return;

    const channelDocRef = doc(this.firestore, 'channels', channelId);
    try {
      if (type === 'sent') {
        await updateDoc(channelDocRef, { lastUsedEmojisSent: lastUsedEmojis });
      } else {
        await updateDoc(channelDocRef, {
          lastUsedEmojisReceived: lastUsedEmojis,
        });
      }
    } catch (error) {}
  }

  async getLastUsedEmojis(
    channelId: string,
    type: 'sent' | 'received'
  ): Promise<string[] | undefined> {
    if (!channelId) return;

    const channelDocRef = doc(this.firestore, 'channels', channelId);
    const channelDoc = await getDoc(channelDocRef);

    if (channelDoc.exists()) {
      const data = channelDoc.data();
      return type === 'sent'
        ? data['lastUsedEmojisSent'] || []
        : data['lastUsedEmojisReceived'] || [];
    } else {
      return [];
    }
  }
}
