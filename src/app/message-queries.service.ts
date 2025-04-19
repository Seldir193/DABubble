// message-queries.service.ts
import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from '@angular/fire/firestore';
import { getDocs } from '@angular/fire/firestore';
import { collectionData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MessageQueriesService {
  constructor(private firestore: Firestore) {}

  private buildListenForMessagesQuery(
    type: 'private' | 'thread' | 'thread-channel',
    parentId: string
  ) {
    const ref = collection(this.firestore, 'messages');
    let baseQ = query(ref, where('type', '==', type));
    if (type === 'thread-channel') {
      baseQ = query(baseQ, where('threadChannelId', '==', parentId));
    } else {
      baseQ = query(baseQ, where('parentId', '==', parentId));
    }
    return query(baseQ, orderBy('timestamp', 'asc'));
  }

  public getMessages(
    channelId: string,
    threadChannelId?: string
  ): Observable<any[]> {
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

  public async getMessagesOnce(
    type: 'private' | 'thread' | 'thread-channel',
    id?: string
  ): Promise<any[]> {
    const queryRef = id
      ? this.buildQueryForId(type, id)
      : this.buildQueryByType(type);
    const snapshot = await getDocs(queryRef);
    return this.mapMessagesOnce(snapshot);
  }

  public listenMessages(
    type: 'private' | 'thread' | 'thread-channel',
    id: string,
    callback: (messages: any[]) => void
  ): () => void {
    const queryRef = this.buildListenMessagesQuery(type, id);
    if (!queryRef) return () => {};
    const unsubscribe = onSnapshot(
      queryRef,
      (snapshot) => callback(this.mapMessagesDocs(snapshot)),
      () => {}
    );
    return unsubscribe;
  }

  private buildListenMessagesQuery(
    type: 'private' | 'thread' | 'thread-channel',
    id: string
  ) {
    const messagesRef = collection(this.firestore, 'messages');

    if (type === 'private') {
      return this.buildPrivateQuery(messagesRef, id);
    } else if (type === 'thread') {
      return this.buildThreadQuery(messagesRef, id);
    } else if (type === 'thread-channel') {
      return this.buildThreadChannelQuery(messagesRef, id);
    }
    return null;
  }

  private buildPrivateQuery(messagesRef: any, id: string) {
    return query(
      messagesRef,
      where('type', '==', 'private'),
      where('conversationId', '==', id),
      orderBy('timestamp', 'asc')
    );
  }

  private buildThreadQuery(messagesRef: any, id: string) {
    return query(
      messagesRef,
      where('type', '==', 'thread'),
      where('threadId', '==', id),
      orderBy('timestamp', 'asc')
    );
  }

  private buildThreadChannelQuery(messagesRef: any, id: string) {
    return query(
      messagesRef,
      where('type', '==', 'thread-channel'),
      where('threadChannelId', '==', id),
      orderBy('timestamp', 'asc')
    );
  }

  private mapMessagesDocs(snapshot: any): any[] {
    return snapshot.docs.map((docSnap: any) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
  }

  public listenForMessages(
    type: 'private' | 'thread' | 'thread-channel',
    parentId: string,
    callback: (messages: any[]) => void
  ): () => void {
    const queryRef = this.buildListenForMessagesQuery(type, parentId);
    const unsubscribe = onSnapshot(queryRef, (snap) =>
      callback(this.mapSnapshotDocs(snap))
    );
    return unsubscribe;
  }

  private mapSnapshotDocs(snapshot: any): any[] {
    return snapshot.docs.map((docSnap: any) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
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
    return snapshot.docs.map((docSnap: any) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
  }
}
