// message-crud.service.ts

import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  orderBy,
  getDoc,
} from '@angular/fire/firestore';
import { serverTimestamp } from 'firebase/firestore';
import { Observable } from 'rxjs';
import { collectionData } from '@angular/fire/firestore';
import { MessageContent, Message } from './message.models';

@Injectable({
  providedIn: 'root',
})
export class MessageCrudService {
  constructor(private firestore: Firestore) {}

  async sendMessage(data: {
    type: 'thread' | 'private' | 'thread-channel';
    threadChannelId?: string;
    conversationId?: string;
    channelId?: string;
    content?: MessageContent;
    senderId?: string;
    parentId?: string;
    senderName?: string;
    senderAvatar?: string;
    recipientId?: string;
  }): Promise<string> {
    this.validateThreadChannel(data);
    const messagePayload = this.buildMessagePayload(data);
    return await this.commitMessage(messagePayload);
  }

  getMessages(channelId: string, threadChannelId?: string): Observable<any[]> {
    const messagesCollection = collection(this.firestore, 'messages');
    let qRef;
    if (threadChannelId) {
      qRef = query(
        messagesCollection,
        where('threadChannelId', '==', threadChannelId),
        orderBy('timestamp', 'asc')
      );
    } else {
      qRef = query(
        messagesCollection,
        where('channelId', '==', channelId),
        where('threadChannelId', '==', null),
        orderBy('timestamp', 'asc')
      );
    }
    return collectionData(qRef, { idField: 'id' }) as Observable<any[]>;
  }

  async getMessagesOnce(
    type: 'private' | 'thread' | 'thread-channel',
    id?: string
  ): Promise<any[]> {
    const queryRef = id
      ? this.buildQueryForId(type, id)
      : this.buildQueryByType(type);
    const snapshot = await getDocs(queryRef);
    return this.mapMessagesOnce(snapshot);
  }

  private async commitMessage(payload: any): Promise<string> {
    const messagesRef = collection(this.firestore, 'messages');
    const docRef = await addDoc(messagesRef, payload);
    return docRef.id;
  }

  async getMessage(
    type: 'private' | 'channel' | 'thread' | 'thread-channel',
    messageId: string
  ): Promise<Message | null> {
    try {
      const docRef = doc(this.firestore, 'messages', messageId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          ...data,
          id: docSnap.id,
          timestamp: data['timestamp']?.toDate(),
        } as Message;
      }
      return null;
    } catch {
      return null;
    }
  }

  private validateThreadChannel(data: any): void {
    if (data.type === 'thread-channel' && !data.threadChannelId) {
      throw new Error('Missing `threadChannelId` for thread-channel message');
    }
  }

  private buildMessagePayload(data: any): any {
    return {
      ...data,
      timestamp: serverTimestamp(),
      channelId: data.channelId ?? null,
      threadChannelId: data.threadChannelId ?? null,
    };
  }

  private buildQueryForId(
    type: 'private' | 'thread' | 'thread-channel',
    id: string
  ) {
    const messagesRef = collection(this.firestore, 'messages');
    let filterField = '';
    if (type === 'private') filterField = 'conversationId';
    else if (type === 'thread-channel') filterField = 'threadChannelId';
    else filterField = 'threadId';

    return query(
      messagesRef,
      where('type', '==', type),
      where(filterField, '==', id),
      orderBy('timestamp', 'asc')
    );
  }

  private buildQueryByType(type: 'private' | 'thread' | 'thread-channel') {
    const messagesRef = collection(this.firestore, 'messages');
    return query(
      messagesRef,
      where('type', '==', type),
      orderBy('timestamp', 'asc')
    );
  }

  private mapMessagesOnce(snapshot: any): any[] {
    return snapshot.docs.map((docSnap: any) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        time: data['timestamp']?.toDate?.() ?? null,
      };
    });
  }
}
