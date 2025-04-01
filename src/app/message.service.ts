/**
 * The MessageService is responsible for creating, retrieving, and updating
 * various types of messages (private, thread, thread-channel) within the
 * Firestore database. It also handles reply counts, live listeners for
 * messages/emoji updates, and last-used emoji storage.
 *
 * No logic or styling has been changed – only these English JSDoc comments have been added.
 */

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
  collectionData,
} from '@angular/fire/firestore';
import { serverTimestamp } from 'firebase/firestore';
import { FirestoreMessageData } from './message.models';
import { Message } from './message.models';
import { MessageContent } from './message.models';
import { getAuth } from 'firebase/auth';
import { Observable } from 'rxjs';
import { BroadcastMessageData } from './message.models';
import { ChannelMessageData } from './message.models';

import { ChannelService } from './channel.service';
/**
 * ReplyCountsMap is used to store reply counts (plus the latest response time)
 * for multiple parent message IDs, used primarily for live updates.
 */
type ReplyCountsMap = Record<
  string,
  { count: number; lastResponseTime: Date | null }
>;

/**
 * MessageType enumerates the recognized message categories like private, thread, or thread-channel.
 */
type MessageType = 'text' | 'private' | 'thread' | 'thread-channel';

/**
 * MessageService handles sending, querying, and updating messages of
 * different types in Firestore. It also supports reply counting and
 * real-time updates of emojis and thread data.
 */
@Injectable({
  providedIn: 'root',
})
export class MessageService {
  constructor(
    private firestore: Firestore,
    private channelService: ChannelService
  ) {}

  /**
   * generateConversationId sorts two user IDs alphabetically, then joins them with an underscore
   * to produce a stable, unique conversation ID for private messages.
   *
   * @param userId1 - The first user ID.
   * @param userId2 - The second user ID.
   * @returns A string conversation ID for Firestore queries.
   */
  generateConversationId(userId1: string, userId2: string): string {
    return [userId1, userId2].sort().join('_');
  }

  /**
   * Demonstration of splitting a larger method (sendMessage) into helper functions.
   * No logic is changed – it's just spread across smaller functions for clarity.
   */
  async sendMessage(data: {
    type: 'thread' | 'private' | 'thread-channel';
    threadChannelId?: string;
    conversationId?: string;
    channelId?: string;
    content: MessageContent;
    senderId: string;
    parentId?: string;
    senderName?: string;
    senderAvatar?: string;
    recipientId?: string;
  }): Promise<string> {
    this.validateThreadChannel(data);
    const messagePayload = this.buildMessagePayload(data);
    return await this.commitMessage(messagePayload);
  }

  /**
   * Throws an error if `type` is 'thread-channel' but `threadChannelId` is missing.
   * This keeps the validation logic separate and more readable.
   */
  private validateThreadChannel(data: any): void {
    if (data.type === 'thread-channel' && !data.threadChannelId) {
      throw new Error('Missing `threadChannelId` for thread-channel message');
    }
  }

  /**
   * Creates the final message object that will be stored in Firestore.
   * By separating this out, your main method stays concise.
   */
  private buildMessagePayload(data: any): any {
    return {
      ...data,
      timestamp: serverTimestamp(),
      channelId: data.channelId ?? null,
      threadChannelId: data.threadChannelId ?? null,
    };
  }

  /**
   * Adds the message document to Firestore and returns its doc ID.
   * Extracting this step clarifies exactly where the database write happens.
   */
  private async commitMessage(payload: any): Promise<string> {
    const messagesRef = collection(this.firestore, 'messages');
    const docRef = await addDoc(messagesRef, payload);
    return docRef.id;
  }

  /**
   * getMessages can be used to fetch messages for a channel or a specific threadChannelId.
   * It returns a live Observable of message arrays.
   *
   * @param channelId - The ID of the channel.
   * @param threadChannelId - If provided, only messages for that thread-channel are fetched.
   * @returns An Observable of message arrays.
   */
  getMessages(channelId: string, threadChannelId?: string): Observable<any[]> {
    const messagesCollection = collection(this.firestore, 'messages');
    let q;

    if (threadChannelId) {
      // Only thread-channel messages
      q = query(
        messagesCollection,
        where('threadChannelId', '==', threadChannelId),
        orderBy('timestamp', 'asc')
      );
    } else {
      // Normal channel messages (no threadChannelId)
      q = query(
        messagesCollection,
        where('channelId', '==', channelId),
        where('threadChannelId', '==', null),
        orderBy('timestamp', 'asc')
      );
    }

    return collectionData(q, { idField: 'id' }) as Observable<any[]>;
  }
  /**
   * getMessagesOnce performs a one-time Firestore query for messages of a specific type
   * (private, thread, or thread-channel) and optionally filters by a conversation or thread ID.
   *
   * @param type - The message category: 'private' | 'thread' | 'thread-channel'.
   * @param id - The optional ID to filter by (e.g., conversationId or threadChannelId).
   * @returns A promise that resolves to an array of messages.
   */
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

  /** Builds a Firestore query for a given type + ID (conversation or thread). */
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

  /** Builds a Firestore query if no ID is given, just filtering by type. */
  private buildQueryByType(type: 'private' | 'thread' | 'thread-channel') {
    const messagesRef = collection(this.firestore, 'messages');
    return query(
      messagesRef,
      where('type', '==', type),
      orderBy('timestamp', 'asc')
    );
  }

  /** Maps query snapshot docs to an array of messages with converted timestamps. */
  private mapMessagesOnce(snapshot: any): any[] {
    return snapshot.docs.map((docSnap: any) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        time: this.convertToTime(data['timestamp']),
      };
    });
  }

  /**
   * listenMessages sets up a snapshot listener for live updates on messages
   * matching the specified type (private, thread, or thread-channel) and ID.
   *
   * @param type - The message type category.
   * @param id - The conversation or thread ID to filter by.
   * @param callback - A function invoked whenever new snapshot data arrives.
   * @returns A function to unsubscribe from the snapshot listener.
   */
  listenMessages(
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

  /** Builds the Firestore query based on message type and ID. */
  private buildListenMessagesQuery(
    type: 'private' | 'thread' | 'thread-channel',
    id: string
  ) {
    const messagesRef = collection(this.firestore, 'messages');
    if (type === 'private') {
      return query(
        messagesRef,
        where('type', '==', 'private'),
        where('conversationId', '==', id),
        orderBy('timestamp', 'asc')
      );
    } else if (type === 'thread') {
      return query(
        messagesRef,
        where('type', '==', 'thread'),
        where('threadId', '==', id),
        orderBy('timestamp', 'asc')
      );
    } else if (type === 'thread-channel') {
      return query(
        messagesRef,
        where('type', '==', 'thread-channel'),
        where('threadChannelId', '==', id),
        orderBy('timestamp', 'asc')
      );
    }
    return null;
  }

  /** Maps the snapshot docs to a messages array with IDs and data. */
  private mapMessagesDocs(snapshot: any): any[] {
    return snapshot.docs.map((docSnap: any) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
  }

  /**
   * listenForMessages sets up a Firestore query for messages with a specified type
   * (private, thread, or thread-channel) and a parentId or threadChannelId.
   *
   * @param type - One of the recognized message types.
   * @param parentId - The relevant parent ID (conversation, thread, or channel).
   * @param callback - Fired on every change, receiving the updated messages array.
   * @returns A function to unsubscribe from live updates.
   */
  listenForMessages(
    type: 'private' | 'thread' | 'thread-channel',
    parentId: string,
    callback: (messages: any[]) => void
  ): () => void {
    const queryRef = this.buildListenForMessagesQuery(type, parentId);
    return onSnapshot(queryRef, (snap) => callback(this.mapSnapshotDocs(snap)));
  }

  /** Constructs the Firestore query based on type and parentId, ordering by timestamp. */
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

  /** Maps snapshot docs into a messages array with id and data merged. */
  private mapSnapshotDocs(snapshot: any): any[] {
    return snapshot.docs.map((docSnap: any) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
  }

  /**
   * updateReplyCount recalculates how many replies exist for a given parentMessageId,
   * by counting the messages in Firestore that reference it. The updated count is stored
   * in the 'replyCount' field on the parent document.
   *
   * @param parentMessageId - The ID of the parent message in Firestore.
   * @param type - The message type: private, thread, or thread-channel.
   */
  async updateReplyCount(
    parentMessageId: string,
    type: 'private' | 'thread' | 'thread-channel'
  ): Promise<void> {
    const parentRef = doc(this.firestore, 'messages', parentMessageId);
    try {
      const parentDoc = await this.getParentDocData(parentRef);
      if (!parentDoc) return; // Parent doc doesn't exist
      // Read the current replyCount (kept to preserve original logic)
      const oldReplyCount = parentDoc['replyCount'] || 0;
      const filterField = this.getFilterField(type);
      const newReplyCount = await this.countFilteredReplies(
        filterField,
        parentMessageId
      );
      await this.updateReplyCountInParent(parentRef, newReplyCount);
    } catch (error) {
      // Intentionally empty to match original logic
    }
  }

  /** Fetches parent doc data from Firestore, or null if it doesn't exist. */
  private async getParentDocData(ref: any): Promise<any | null> {
    const snapshot = await getDoc(ref);
    return snapshot.exists() ? snapshot.data() : null;
  }

  /** Determines which field to filter by, based on message type. */
  private getFilterField(
    type: 'private' | 'thread' | 'thread-channel'
  ): string {
    return type === 'thread-channel' ? 'threadChannelId' : 'parentId';
  }

  /** Counts how many reply documents exist that match the given field and parent ID. */
  private async countFilteredReplies(
    field: string,
    parentId: string
  ): Promise<number> {
    const q = query(
      collection(this.firestore, 'messages'),
      where(field, '==', parentId),
      orderBy('timestamp', 'asc')
    );
    const snap = await getDocs(q);
    return snap.size;
  }

  /** Updates the parent document's 'replyCount' field in Firestore. */
  private async updateReplyCountInParent(
    ref: any,
    replyCount: number
  ): Promise<void> {
    await updateDoc(ref, { replyCount });
  }

  /**
   * getReplyCountsForMessages loops over an array of message IDs and calculates how many
   * replies each has, returning an object keyed by messageId. Optionally updates the last
   * response time if a reply is found.
   *
   * @param messageIds - An array of Firestore doc IDs for parent messages.
   * @param type - The type used to identify the correct filter field in Firestore.
   * @returns A map of message IDs to reply counts and lastResponseTime.
   */
  async getReplyCountsForMessages(
    messageIds: string[],
    type: 'private' | 'thread' | 'thread-channel'
  ): Promise<ReplyCountsMap> {
    const replyCounts: ReplyCountsMap = {};
    const filterField = this.getFilterFieldForReplies(type);
    for (const msgId of messageIds) {
      const { count, lastResponseTime } = await this.fetchReplyCountAndTime(
        filterField,
        msgId
      );
      replyCounts[msgId] = { count, lastResponseTime };
    }
    return replyCounts;
  }

  /** Returns the correct Firestore field for message replies based on the given type. */
  private getFilterFieldForReplies(
    type: 'private' | 'thread' | 'thread-channel'
  ): string {
    return type === 'thread-channel' ? 'threadChannelId' : 'parentId';
  }

  /** Fetches the reply count and the latest response time for a given messageId. */
  private async fetchReplyCountAndTime(
    field: string,
    messageId: string
  ): Promise<{ count: number; lastResponseTime: Date | null }> {
    const q = query(
      collection(this.firestore, 'messages'),
      where(field, '==', messageId),
      orderBy('timestamp', 'asc')
    );
    const snapshot = await getDocs(q);
    const count = snapshot.size;
    let lastResponseTime: Date | null = null;
    if (count > 0) {
      const lastDoc = snapshot.docs[count - 1];
      const ts = lastDoc.data()?.['timestamp'];
      if (ts?.toDate) lastResponseTime = ts.toDate();
    }
    return { count, lastResponseTime };
  }

  /**
   * loadReplyCountsLive sets up individual snapshot listeners for each parent messageId,
   * aggregating reply counts and last response times in a central object that's passed to
   * the provided callback. Returns a function to unsubscribe all.
   *
   * @param messageIds - The IDs of parent messages to track.
   * @param type - The message type: private, thread, or thread-channel.
   * @param callback - Receives an updated map of reply counts whenever changes occur.
   * @returns A function to unsubscribe from all snapshot listeners.
   */
  loadReplyCountsLive(
    messageIds: string[],
    type: 'private' | 'thread' | 'thread-channel',
    callback: (replyCounts: ReplyCountsMap) => void
  ): () => void {
    if (!messageIds.length) return () => {};
    const unsubscribes: Array<() => void> = [];
    const aggregator: ReplyCountsMap = {};
    const filterField = this.getReplyFilterField(type);

    messageIds.forEach((msgId) => {
      const q = query(
        collection(this.firestore, 'messages'),
        where(filterField, '==', msgId),
        orderBy('timestamp', 'asc')
      );
      const unsubscribe = onSnapshot(q, (snap) => {
        aggregator[msgId] = this.mapReplySnapshot(snap);
        callback({ ...aggregator });
      });
      unsubscribes.push(unsubscribe);
    });
    return () => unsubscribes.forEach((fn) => fn());
  }

  /** Returns the correct Firestore field (threadChannelId or parentId) for the given message type. */
  private getReplyFilterField(
    type: 'private' | 'thread' | 'thread-channel'
  ): string {
    return type === 'thread-channel' ? 'threadChannelId' : 'parentId';
  }

  /** Extracts the count and lastResponseTime from the given snapshot. */
  private mapReplySnapshot(snapshot: any): {
    count: number;
    lastResponseTime: Date | null;
  } {
    const count = snapshot.size;
    let lastResponseTime: Date | null = null;
    if (count > 0) {
      const lastDoc = snapshot.docs[count - 1];
      const ts = lastDoc.data().timestamp;
      if (ts?.toDate) lastResponseTime = ts.toDate();
    }
    return { count, lastResponseTime };
  }

  /**
   * listenForThreadDetails sets a snapshot listener on a single message doc in Firestore
   * (representing a thread), invoking the callback whenever the doc changes or is updated.
   *
   * @param threadId - The Firestore doc ID to watch.
   * @param callback - Called with the latest document data on changes.
   * @returns A function to unsubscribe from the snapshot.
   */
  listenForThreadDetails(
    threadId: string,
    callback: (data: any) => void
  ): () => void {
    const threadDocRef = doc(this.firestore, 'messages', threadId);

    return onSnapshot(
      threadDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          callback(docSnap.data());
        } else {
        }
      },
      (error) => {}
    );
  }

  /**
   * updateThreadLastResponseTime updates the lastResponseTime field of a "thread" document
   * to the serverTimestamp, typically when a new reply is added.
   *
   * @param threadId - The message doc ID representing the thread's parent message.
   */
  async updateThreadLastResponseTime(threadId: string): Promise<void> {
    const messageRef = doc(this.firestore, 'messages', threadId);
    await updateDoc(messageRef, {
      lastResponseTime: serverTimestamp(),
    });
  }

  /**
   * getMessage retrieves a single message document by ID from Firestore,
   * converting its Firestore timestamp to a JavaScript Date.
   *
   * @param type - The message type (unused in logic, can be for debugging/logging).
   * @param messageId - The Firestore doc ID of the message.
   * @returns A message object with an additional `timestamp` as a JS Date, or null if not found.
   */
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
    } catch (error) {
      return null;
    }
  }

  /**
   * getPrivateMessagesLive attaches a snapshot listener to private messages
   * within a conversationId, sorted ascending by timestamp.
   *
   * @param conversationId - The ID of the private conversation to track.
   * @param callback - Invoked whenever snapshot changes with updated messages array.
   * @returns An unsubscribe function.
   */
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

  /** Builds the Firestore query for private messages in a specific conversation. */
  private buildPrivateMessagesQuery(conversationId: string) {
    return query(
      collection(this.firestore, 'messages'),
      where('type', '==', 'private'),
      where('conversationId', '==', conversationId),
      orderBy('timestamp', 'asc')
    );
  }

  /** Maps snapshot docs to an array of message objects, converting the timestamp field. */
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

  /**
   * convertToTime takes a Firestore timestamp or numeric value and returns a
   * localized time string (HH:MM) in 'de-DE' format.
   *
   * @param timestamp - The Firestore timestamp or numeric timestamp in milliseconds.
   * @returns A string with hour:minute.
   */
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

  /**
   * convertToDate attempts to convert an unknown timestamp input to a JavaScript Date,
   * returning null if unable. Suitable for Firestore docs that store Timestamps or numbers.
   *
   * @param timestamp - Possibly a Firestore timestamp, a Date, or numeric.
   * @returns A Date object or null on failure.
   */
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

  /**
   * updateMessage modifies an existing message doc by ID, merging new data fields like edited content.
   *
   * @param messageId - The Firestore doc ID of the message to be updated.
   * @param updatedData - A partial object with the fields to be updated, e.g. { content: newContent }.
   */
  public async updateMessage(
    messageId: string,
    updatedData: Partial<any>
  ): Promise<void> {
    const msgRef = doc(this.firestore, 'messages', messageId);
    await updateDoc(msgRef, updatedData);
  }

  /**
   * listenForEmojiUpdates attaches a listener to a single messages document in Firestore,
   * typically used for saving last-used emojis for conversation references.
   *
   * @param conversationId - The Firestore doc ID for the conversation's "messages" doc.
   * @param callback - Invoked with two arrays: the last used 'sent' and 'received' emojis.
   * @returns A function to unsubscribe from snapshot updates.
   */
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

  /**
   * getLastUsedEmojis loads the last-used emojis array (either 'sent' or 'received') from
   * a conversation doc in Firestore.
   *
   * @param conversationId - The Firestore doc ID for the conversation.
   * @param type - 'sent' or 'received', specifying which field to read.
   * @returns An array of up to 2 emojis if they exist.
   */
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

  /**
   * saveLastUsedEmojis merges the given newEmojis with existing stored emojis
   * in a 'messages' doc for a specific conversation, limited to 2 items max.
   *
   * @param conversationId - The doc ID for the conversation in Firestore.
   * @param newEmojis - An array of new emoji strings to store.
   * @param type - Either 'sent' or 'received', specifying which field to update.
   */
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
    // Combine new + existing, remove duplicates, limit to 2
    const merged = [...new Set([...newEmojis, ...existing])].slice(0, 2);
    await setDoc(docRef, { [fieldName]: merged }, { merge: true });
  }

  /**
   * addEmojiToThreadMessage increments or adds an emoji (by 'emoji' string) within a thread's
   * content.emojis array. Then, it updates lastUsedEmojis in Firestore as 'sent' or 'received'.
   *
   * @param threadId - The doc ID representing this thread message in Firestore.
   * @param emoji - The new emoji to add or increment.
   * @param senderId - The ID of the user sending the emoji, used to decide 'sent' or 'received'.
   */
  async addEmojiToThreadMessage(
    threadId: string,
    emoji: string,
    senderId: string
  ): Promise<void> {
    const emojis = await this.fetchThreadEmojis(threadId);
    this.incrementOrAddEmoji(emojis, emoji);
    await this.updateThreadEmojisInDoc(threadId, emojis);
    const type = senderId === getAuth().currentUser?.uid ? 'sent' : 'received';
    await this.saveLastUsedEmojis(threadId, [emoji], type);
  }

  /**
   * Fetches the current list of emojis from the thread's Firestore document,
   * returning an array of { emoji, count } objects.
   */
  private async fetchThreadEmojis(
    threadId: string
  ): Promise<{ emoji: string; count: number }[]> {
    const ref = doc(this.firestore, 'messages', threadId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return [];
    const data = snap.data() as FirestoreMessageData; // Use your interface
    return data.content?.emojis || [];
  }

  /** Increments the count of an existing emoji or adds it if not found. */
  private incrementOrAddEmoji(
    emojis: { emoji: string; count: number }[],
    newEmoji: string
  ): void {
    const existing = emojis.find((e) => e.emoji === newEmoji);
    existing
      ? (existing.count += 1)
      : emojis.push({ emoji: newEmoji, count: 1 });
  }

  /** Updates the thread document in Firestore with the modified emojis array. */
  private async updateThreadEmojisInDoc(
    threadId: string,
    emojis: { emoji: string; count: number }[]
  ): Promise<void> {
    const ref = doc(this.firestore, 'messages', threadId);
    await updateDoc(ref, { 'content.emojis': emojis });
  }

  /**
   * getThreadMessagesLive attaches a snapshot listener for real-time updates
   * to a 'thread' type message set, filtered by threadId, sorted by ascending timestamp.
   *
   * @param threadId - The ID that identifies this thread in Firestore.
   * @param callback - Invoked with an array of messages every time there's a snapshot update.
   * @returns An unsubscribe function.
   */
  getThreadMessagesLive(
    threadId: string,
    callback: (messages: any[]) => void
  ): () => void {
    if (!threadId) return () => {};
    const queryRef = this.buildThreadMessagesQuery(threadId);
    const unsubscribe = onSnapshot(
      queryRef,
      (snap) => callback(this.mapThreadSnapshot(snap)),
      () => {}
    );
    return unsubscribe;
  }

  /** Builds the Firestore query to retrieve 'thread'-type messages sorted by timestamp. */
  private buildThreadMessagesQuery(threadId: string) {
    const ref = collection(this.firestore, 'messages');
    return query(
      ref,
      where('type', '==', 'thread'),
      where('threadId', '==', threadId),
      orderBy('timestamp', 'asc')
    );
  }

  /** Maps the snapshot docs to a messages array, adjusting the parentId when it equals the threadId. */
  private mapThreadSnapshot(snapshot: any): any[] {
    return snapshot.docs.map((docSnap: any) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        parentId:
          data['parentId'] !== data['threadId'] ? data['parentId'] : null,
      };
    });
  }

  /**
   * saveLastUsedThreadEmojis merges the given new emojis into lastUsedEmojisSent or
   * lastUsedEmojisReceived fields on a "messages" doc representing a thread's parent.
   *
   * @param threadId - The doc ID representing the parent thread message in Firestore.
   * @param newEmojis - The new emoji strings to store.
   * @param type - 'sent' or 'received' determines which field to update.
   */
  async saveLastUsedThreadEmojis(
    threadId: string,
    newEmojis: string[],
    type: 'sent' | 'received'
  ): Promise<void> {
    if (!threadId) return;
    const field = this.resolveFieldName(type);
    const existing = await this.getExistingThreadEmojis(threadId, field);
    const updated = this.mergeNewAndExistingEmojis(newEmojis, existing);
    await this.storeThreadEmojis(threadId, field, updated);
  }

  /** Returns 'lastUsedEmojisSent' or 'lastUsedEmojisReceived' based on the given type. */
  private resolveFieldName(type: 'sent' | 'received'): string {
    return type === 'sent' ? 'lastUsedEmojisSent' : 'lastUsedEmojisReceived';
  }

  /** Fetches the existing emojis array from the Firestore doc. If doc doesn't exist, returns []. */
  private async getExistingThreadEmojis(
    threadId: string,
    field: string
  ): Promise<string[]> {
    const ref = doc(this.firestore, 'messages', threadId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return [];
    const data = snap.data() || {};
    return data[field] || [];
  }

  /** Merges new emojis with existing ones, removes duplicates, and limits the result to 2 items. */
  private mergeNewAndExistingEmojis(
    newEmojis: string[],
    existing: string[]
  ): string[] {
    return [...new Set([...newEmojis, ...existing])].slice(0, 2);
  }

  /** Stores the merged emojis into the specified field of the Firestore doc. */
  private async storeThreadEmojis(
    threadId: string,
    field: string,
    emojis: string[]
  ): Promise<void> {
    const ref = doc(this.firestore, 'messages', threadId);
    await setDoc(ref, { [field]: emojis }, { merge: true });
  }

  /**
   * getLastUsedThreadEmojis fetches either the sent or received last-used emojis array
   * from a Firestore 'messages' doc that holds a thread's parent message. The doc must
   * store lastUsedEmojisSent or lastUsedEmojisReceived fields.
   *
   * @param threadId - The ID referencing the parent thread message doc.
   * @param type - 'sent' or 'received' deciding which field to read.
   * @returns Up to two emoji strings.
   */
  async getLastUsedThreadEmojis(
    threadId: string,
    type: 'sent' | 'received'
  ): Promise<string[]> {
    if (!threadId) return [];
    try {
      const ref = doc(this.firestore, 'messages', threadId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return [];
      return this.extractThreadEmojis(snap.data(), type);
    } catch (error) {
      return [];
    }
  }

  /** Extracts the relevant emoji array (sent or received) from the document data, limited to 2 items. */
  private extractThreadEmojis(data: any, type: 'sent' | 'received'): string[] {
    const field =
      type === 'sent' ? 'lastUsedEmojisSent' : 'lastUsedEmojisReceived';
    const emojis = data[field] || [];
    return emojis.slice(0, 2);
  }

  /**
   * listenForThreadEmojiUpdates attaches a real-time snapshot listener for a single
   * 'messages' doc that represents the parent message of a thread, updating the
   * lastUsedEmojisSent and lastUsedEmojisReceived fields as changes occur.
   *
   * @param threadId - The Firestore doc ID for the parent thread message.
   * @param callback - Fired with two arrays: updatedEmojisSent and updatedEmojisReceived.
   * @returns A function to unsubscribe from the snapshot.
   */
  listenForThreadEmojiUpdates(
    threadId: string,
    callback: (sentEmojis: string[], receivedEmojis: string[]) => void
  ): () => void {
    if (!threadId) return () => {};

    const docRef = doc(this.firestore, 'messages', threadId);

    return onSnapshot(docRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data() || {};
        const updatedEmojisSent = data['lastUsedEmojisSent']?.slice(0, 2) || [];
        const updatedEmojisReceived =
          data['lastUsedEmojisReceived']?.slice(0, 2) || [];

        callback(updatedEmojisSent, updatedEmojisReceived);
      }
    });
  }

  /**
   * Fetches all channel messages once, then filters out those
   * from channels where the current user isn't a member.
   */
  async getChannelMessagesOnce(): Promise<ChannelMessageData[]> {
    // 1) Load all channels where user is a member
    const userChannels = await this.channelService.getAllChannelsOnce();
    const userChannelIds = new Set(userChannels.map((ch) => ch.id));

    // 2) Retrieve all messages with channelId != null
    const messagesRef = collection(this.firestore, 'messages');
    const q = query(
      messagesRef,
      where('channelId', '!=', null),
      orderBy('timestamp', 'asc')
    );
    const snapshot = await getDocs(q);

    // 3) Map Firestore docs to ChannelMessage
    const allChannelMessages: ChannelMessageData[] = snapshot.docs.map(
      (doc) => {
        return {
          id: doc.id,
          ...(doc.data() as ChannelMessageData), // cast to ensure TS sees 'channelId'
        };
      }
    );

    // 4) Filter by membership
    return allChannelMessages.filter(
      (msg) => msg.channelId && userChannelIds.has(msg.channelId)
    );
  }

  /**
   * onRecipientStatusChanged listens for changes to the recipient's user doc
   * in Firestore and notifies the callback about their status, avatar, name, and email.
   *
   * @param recipientId - The Firestore user ID of the recipient.
   * @param callback - A function receiving the updated status data (online, avatar, name, email).
   * @returns A function to unsubscribe from the snapshot listener.
   */
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

  /** Processes the snapshot data and invokes the callback with the appropriate status info. */
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

  /**
   * Creates a message in Firestore with "channel" type.
   * @param data - The channel message data
   * @returns A promise resolving to the Firestore doc ID
   */
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

  /**
   * Saves a broadcast message in Firestore with "broadcast" type.
   * @param data - The broadcast message data
   * @returns A promise resolving to the Firestore doc ID
   */
  public async sendBroadcastMessage(
    data: BroadcastMessageData
  ): Promise<string> {
    if (!data.broadcastChannels?.length) {
      throw new Error('Missing "broadcastChannels" in sendBroadcastMessage.');
    }
    const docRef = await addDoc(collection(this.firestore, 'messages'), {
      ...data,
      timestamp: serverTimestamp(),
      type: 'broadcast',
    });
    return docRef.id;
  }

  /**
   * Retrieves all broadcast messages for the specified channel ID.
   * Messages are returned in ascending order by timestamp.
   * @param channelId - The channel ID used to filter broadcast messages
   * @returns An Observable emitting an array of broadcast messages
   */
  public getBroadcastMessages(channelId: string): Observable<any[]> {
    const messagesRef = collection(this.firestore, 'messages');
    const q = query(
      messagesRef,
      where('type', '==', 'broadcast'),
      where('broadcastChannels', 'array-contains', channelId),
      orderBy('timestamp', 'asc')
    );
    return collectionData(q, { idField: 'id' }) as Observable<any[]>;
  }



/**
 * Finds the main channelId for a thread-channel message by checking its
 * own channelId field or looking up the parent message if channelId is null.
 * @param msg - The message object (requires threadChannelId or parentId).
 * @returns A promise resolving to the channel ID or null if not found.
 */
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


}
