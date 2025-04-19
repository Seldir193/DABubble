import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  orderBy,
  getDoc,
  onSnapshot,
  setDoc,
} from '@angular/fire/firestore';
import { serverTimestamp } from 'firebase/firestore';
import { Message } from './message.models';
import { MessageContent, ReplyCountsMap } from './message.models';
import { Observable } from 'rxjs';
import { ChannelMessageData } from './message.models';
import { ChannelService } from './channel.service';
import { MessageCrudService } from './message-crud.service';
import { MessageQueriesService } from './message-queries.service';
import { ReplyCountService } from './reply-count.service';
import { ThreadService } from './thread.service';

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  constructor(
    private firestore: Firestore,
    private channelService: ChannelService,
    private crudService: MessageCrudService,
    private queriesService: MessageQueriesService,
    private replyCountService: ReplyCountService,
    private threadService: ThreadService
  ) {}

  generateConversationId(userId1: string, userId2: string): string {
    return [userId1, userId2].sort().join('_');
  }

  getPrivateMessagesLive(
    conversationId: string,
    callback: (messages: any[]) => void
  ): () => void {
    const queryRef = this.buildPrivateMessagesQuery(conversationId);
    const unsubscribe = onSnapshot(queryRef, (snap) => {
      callback(this.mapPrivateMessages(snap));
    });
    return unsubscribe;
  }

  private buildPrivateMessagesQuery(conversationId: string) {
    return query(
      collection(this.firestore, 'messages'),
      where('type', '==', 'private'),
      where('conversationId', '==', conversationId),
      orderBy('timestamp', 'asc')
    );
  }

  private mapPrivateMessages(snapshot: any): any[] {
    return snapshot.docs.map((docSnap: any) => {
      const data = docSnap.data();
      return {
        ...data,
        id: docSnap.id,
        time: this.convertToTime(data['timestamp']),
      };
    });
  }

  convertToTime(timestamp: any): string {
    if (!timestamp) return '';
    const date = timestamp?.seconds
      ? new Date(timestamp.seconds * 1000)
      : new Date(timestamp);
    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  public convertToDate(timestamp: any): Date | null {
    if (!timestamp) return null;
    if (timestamp.toDate) {
      return timestamp.toDate();
    }
    if (timestamp instanceof Date) {
      return timestamp;
    }
    const parsed = new Date(timestamp);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  public async updateMessage(
    messageId: string,
    updatedData: Partial<any>
  ): Promise<void> {
    const msgRef = doc(this.firestore, 'messages', messageId);
    await updateDoc(msgRef, updatedData);
  }

  listenForEmojiUpdates(
    conversationId: string,
    callback: (sent: string[], received: string[]) => void
  ): () => void {
    if (!conversationId) return () => {};

    const docRef = doc(this.firestore, 'messages', conversationId);
    return onSnapshot(docRef, (snapshot) => {
      if (!snapshot.exists()) {
        callback([], []);
        return;
      }
      const data = snapshot.data() || {};
      const sentEmojis = data['lastUsedEmojisSent']?.slice(0, 2) || [];
      const receivedEmojis = data['lastUsedEmojisReceived']?.slice(0, 2) || [];
      callback(sentEmojis, receivedEmojis);
    });
  }

  async getLastUsedEmojis(
    conversationId: string,
    type: 'sent' | 'received'
  ): Promise<string[]> {
    if (!conversationId) return [];

    const docRef = doc(this.firestore, 'messages', conversationId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return [];
    }
    const data = docSnap.data() || {};
    const fieldName =
      type === 'sent' ? 'lastUsedEmojisSent' : 'lastUsedEmojisReceived';
    const emojis = data[fieldName] || [];
    return emojis.slice(0, 2);
  }

  async saveLastUsedEmojis(
    conversationId: string,
    newEmojis: string[],
    type: 'sent' | 'received'
  ): Promise<void> {
    if (!conversationId) return;
    const docRef = doc(this.firestore, 'messages', conversationId);
    const fieldName =
      type === 'sent' ? 'lastUsedEmojisSent' : 'lastUsedEmojisReceived';
    const docSnap = await getDoc(docRef);
    let existing: string[] = [];
    if (docSnap.exists()) {
      existing = docSnap.data()?.[fieldName] || [];
    }
    const merged = [...new Set([...newEmojis, ...existing])].slice(0, 2);
    await setDoc(docRef, { [fieldName]: merged }, { merge: true });
  }

  async getChannelMessagesOnce(): Promise<ChannelMessageData[]> {
    const userChannels = await this.channelService.getAllChannelsOnce();
    const userChannelIds = new Set(userChannels.map((ch) => ch.id));
    const messagesRef = collection(this.firestore, 'messages');
    const q = query(
      messagesRef,
      where('channelId', '!=', null),
      orderBy('timestamp', 'asc')
    );
    const snapshot = await getDocs(q);

    const allChannelMessages: ChannelMessageData[] = snapshot.docs.map(
      (doc) => {
        return {
          id: doc.id,
          ...(doc.data() as ChannelMessageData),
        };
      }
    );

    return allChannelMessages.filter(
      (msg) => msg.channelId && userChannelIds.has(msg.channelId)
    );
  }

  public onRecipientStatusChanged(
    recipientId: string,
    callback: (data: {
      isOnline: boolean;
      avatarUrl: string;
      name: string;
      email: string;
    }) => void
  ): () => void {
    if (!recipientId) return () => {};
    const docRef = doc(this.firestore, 'users', recipientId);
    const unsubscribe = onSnapshot(
      docRef,
      (snap) => this.handleRecipientSnapshot(snap, callback),
      () => {}
    );
    return unsubscribe;
  }

  private handleRecipientSnapshot(
    docSnap: any,
    callback: (data: {
      isOnline: boolean;
      avatarUrl: string;
      name: string;
      email: string;
    }) => void
  ): void {
    if (!docSnap.exists()) {
      callback({
        isOnline: false,
        avatarUrl: 'assets/img/avatar.png',
        name: 'Unbekannt',
        email: '',
      });
      return;
    }
    const userData = docSnap.data() as any;
    const avatarUrl = userData.avatarUrl || 'assets/img/avatar.png';
    const name = userData.name || 'Unbekannt';
    const isOnline = !!userData.isOnline;
    const email = userData.email || '';

    callback({ isOnline, avatarUrl, name, email });
  }

  public onAllUsersChanged(callback: (allUsers: any[]) => void): () => void {
    const collRef = collection(this.firestore, 'users');
    const unsubscribe = onSnapshot(collRef, (snapshot) => {
      const users = snapshot.docs.map((docSnap) => {
        const userData = docSnap.data() as any;
        return {
          ...userData,
          isOnline: !!userData.isOnline,
          avatarUrl: userData.avatarUrl || 'assets/img/avatar.png',
          name: userData.name || 'Unbekannt',
          email: userData.email || '',
          id: docSnap.id,
        };
      });
      callback(users);
    });
    return unsubscribe;
  }

  public async setUserOnlineStatus(
    userId: string,
    isOnline: boolean
  ): Promise<void> {
    const userDocRef = doc(this.firestore, 'users', userId);
    await updateDoc(userDocRef, { isOnline });
  }

  public async sendChannelMessage(data: ChannelMessageData): Promise<string> {
    if (!data.channelId) {
      throw new Error('Missing "channelId" in sendChannelMessage.');
    }
    const finalTimestamp = data.timestamp || serverTimestamp();
    const messageRef = collection(this.firestore, 'messages');
    const messageObj = {
      ...data,
      timestamp: finalTimestamp,
      type: 'channel',
    };
    const docRef = await addDoc(messageRef, messageObj);
    return docRef.id;
  }

  public async findChannelIdIfMissing(msg: any): Promise<string | null> {
    if (msg['channelId']) {
      return msg['channelId'];
    }
    const parentId = msg['threadChannelId'] ?? msg['parentId'];
    if (!parentId) {
      return null;
    }
    const parentRef = doc(this.firestore, 'messages', parentId);
    const parentSnap = await getDoc(parentRef);
    if (!parentSnap.exists()) {
      return null;
    }
    return parentSnap.data()?.['channelId'] || null;
  }

  async sendMessage(data: {
    type: 'thread' | 'private' | 'thread-channel';
    conversationId?: string;
    content?: MessageContent;
    senderId?: string;
    recipientId?: string;
  }): Promise<string> {
    return this.crudService.sendMessage(data);
  }

  async getMessage(
    type: 'private' | 'channel' | 'thread' | 'thread-channel',
    messageId: string
  ): Promise<Message | null> {
    return this.crudService.getMessage(type, messageId);
  }

  getMessages(channelId: string, threadChannelId?: string): Observable<any[]> {
    return this.queriesService.getMessages(channelId, threadChannelId);
  }

  async getMessagesOnce(
    type: 'private' | 'thread' | 'thread-channel',
    id?: string
  ): Promise<any[]> {
    return this.queriesService.getMessagesOnce(type, id);
  }

  listenMessages(
    type: 'private' | 'thread' | 'thread-channel',
    id: string,
    callback: (msgs: any[]) => void
  ): () => void {
    return this.queriesService.listenMessages(type, id, callback);
  }

  listenForMessages(
    type: 'private' | 'thread' | 'thread-channel',
    parentId: string,
    callback: (msgs: any[]) => void
  ): () => void {
    return this.queriesService.listenForMessages(type, parentId, callback);
  }

  async updateReplyCount(
    parentMessageId: string,
    type: 'private' | 'thread' | 'thread-channel'
  ) {
    return this.replyCountService.updateReplyCount(parentMessageId, type);
  }

  async getReplyCountsForMessages(
    messageIds: string[],
    type: 'private' | 'thread' | 'thread-channel'
  ): Promise<ReplyCountsMap> {
    return this.replyCountService.getReplyCountsForMessages(messageIds, type);
  }

  loadReplyCountsLive(
    messageIds: string[],
    type: 'private' | 'thread' | 'thread-channel',
    callback: (replyCounts: ReplyCountsMap) => void
  ): () => void {
    return this.replyCountService.loadReplyCountsLive(
      messageIds,
      type,
      callback
    );
  }

  listenForThreadDetails(
    threadId: string,
    cb: (data: any) => void
  ): () => void {
    return this.threadService.listenForThreadDetails(threadId, cb);
  }

  getThreadMessagesLive(
    threadId: string,
    callback: (msgs: any[]) => void
  ): () => void {
    return this.threadService.getThreadMessagesLive(threadId, callback);
  }

  getLastUsedThreadEmojis(
    threadId: string,
    type: 'sent' | 'received'
  ): Promise<string[]> {
    return this.threadService.getLastUsedThreadEmojis(threadId, type);
  }

  saveLastUsedThreadEmojis(
    threadId: string,
    newEmojis: string[],
    type: 'sent' | 'received'
  ): Promise<void> {
    return this.threadService.saveLastUsedThreadEmojis(
      threadId,
      newEmojis,
      type
    );
  }

  listenForThreadEmojiUpdates(
    threadId: string,
    callback: (sentEmojis: string[], receivedEmojis: string[]) => void
  ): () => void {
    return this.threadService.listenForThreadEmojiUpdates(threadId, callback);
  }
}
