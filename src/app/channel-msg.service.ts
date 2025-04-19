// channel-messages.service.ts

import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  updateDoc,
  serverTimestamp,
} from '@angular/fire/firestore';
import { query, where, orderBy, collectionData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ChannelMsgService {
  constructor(private firestore: Firestore) {}

  public getChannelMessagesLive(channelId: string): Observable<any[]> {
    const messagesRef = collection(this.firestore, 'messages');
    const q = query(
      messagesRef,
      where('channelId', '==', channelId),
      orderBy('timestamp', 'asc')
    );
    return collectionData(q, { idField: 'id' }) as Observable<any[]>;
  }

  public async updateMessage(
    channelId: string,
    messageId: string,
    updatedContent: { text?: string; image?: string | null; emojis?: any[] },
    markEdited: boolean
  ): Promise<void> {
    const messageDocRef = doc(this.firestore, 'messages', messageId);
    const updateData: any = { content: updatedContent };

    if (markEdited) {
      updateData.edited = true;
      updateData.editedAt = serverTimestamp();
    }
    await updateDoc(messageDocRef, updateData);
  }
}
