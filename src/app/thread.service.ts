// thread.service.ts
import { Injectable } from '@angular/core';
import {
  Firestore,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  collection,
} from '@angular/fire/firestore';
import { query, where, orderBy, onSnapshot } from '@angular/fire/firestore';
import { serverTimestamp } from 'firebase/firestore';
import { FirestoreMessageData } from './message.models';
import { getAuth } from 'firebase/auth';

@Injectable({
  providedIn: 'root',
})
export class ThreadService {
  constructor(private firestore: Firestore) {}

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

  async updateThreadLastResponseTime(threadId: string): Promise<void> {
    const messageRef = doc(this.firestore, 'messages', threadId);
    await updateDoc(messageRef, {
      lastResponseTime: serverTimestamp(),
    });
  }

  async addEmojiToThreadMessage(
    threadId: string,
    emoji: string,
    senderId: string
  ): Promise<void> {
    const emojis = await this.fetchThreadEmojis(threadId);
    this.incrementOrAddEmoji(emojis, emoji);
    await this.updateThreadEmojisInDoc(threadId, emojis);

    const type = senderId === getAuth().currentUser?.uid ? 'sent' : 'received';
    await this.saveLastUsedThreadEmojis(threadId, [emoji], type);
  }

  private async fetchThreadEmojis(
    threadId: string
  ): Promise<{ emoji: string; count: number }[]> {
    const ref = doc(this.firestore, 'messages', threadId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return [];
    const data = snap.data() as FirestoreMessageData;
    return data.content?.emojis || [];
  }

  private incrementOrAddEmoji(
    emojis: { emoji: string; count: number }[],
    newEmoji: string
  ): void {
    const existing = emojis.find((e) => e.emoji === newEmoji);
    existing
      ? (existing.count += 1)
      : emojis.push({ emoji: newEmoji, count: 1 });
  }

  private async updateThreadEmojisInDoc(
    threadId: string,
    emojis: { emoji: string; count: number }[]
  ): Promise<void> {
    const ref = doc(this.firestore, 'messages', threadId);
    await updateDoc(ref, { 'content.emojis': emojis });
  }

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

  private buildThreadMessagesQuery(threadId: string) {
    const ref = collection(this.firestore, 'messages');
    return query(
      ref,
      where('type', '==', 'thread'),
      where('threadId', '==', threadId),
      orderBy('timestamp', 'asc')
    );
  }

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

  private resolveFieldName(type: 'sent' | 'received'): string {
    return type === 'sent' ? 'lastUsedEmojisSent' : 'lastUsedEmojisReceived';
  }

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

  private mergeNewAndExistingEmojis(
    newEmojis: string[],
    existing: string[]
  ): string[] {
    return [...new Set([...newEmojis, ...existing])].slice(0, 2);
  }

  private async storeThreadEmojis(
    threadId: string,
    field: string,
    emojis: string[]
  ): Promise<void> {
    const ref = doc(this.firestore, 'messages', threadId);
    await setDoc(ref, { [field]: emojis }, { merge: true });
  }

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

  private extractThreadEmojis(data: any, type: 'sent' | 'received'): string[] {
    const field =
      type === 'sent' ? 'lastUsedEmojisSent' : 'lastUsedEmojisReceived';
    const emojis = data[field] || [];
    return emojis.slice(0, 2);
  }

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
}
