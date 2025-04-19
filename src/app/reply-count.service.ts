// reply-count.service.ts

import { Injectable } from '@angular/core';
import {
  Firestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  onSnapshot,
  updateDoc,
} from '@angular/fire/firestore';
import { ReplyCountsMap } from './message.models';

@Injectable({
  providedIn: 'root',
})
export class ReplyCountService {
  constructor(private firestore: Firestore) {}

  async updateReplyCount(
    parentMessageId: string,
    type: 'private' | 'thread' | 'thread-channel'
  ): Promise<void> {
    const parentRef = doc(this.firestore, 'messages', parentMessageId);
    try {
      const parentDoc = await this.getParentDocData(parentRef);
      if (!parentDoc) return;
      const oldReplyCount = parentDoc['replyCount'] || 0;
      const filterField = this.getFilterField(type);
      const newReplyCount = await this.countFilteredReplies(
        filterField,
        parentMessageId
      );
      await this.updateReplyCountInParent(parentRef, newReplyCount);
    } catch {}
  }

  private async getParentDocData(ref: any): Promise<any | null> {
    const snapshot = await getDoc(ref);
    return snapshot.exists() ? snapshot.data() : null;
  }

  private getFilterField(
    type: 'private' | 'thread' | 'thread-channel'
  ): string {
    return type === 'thread-channel' ? 'threadChannelId' : 'parentId';
  }

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

  private async updateReplyCountInParent(
    ref: any,
    replyCount: number
  ): Promise<void> {
    await updateDoc(ref, { replyCount });
  }

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

  private getFilterFieldForReplies(
    type: 'private' | 'thread' | 'thread-channel'
  ): string {
    return type === 'thread-channel' ? 'threadChannelId' : 'parentId';
  }

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

  loadReplyCountsLive(
    msgIds: string[],
    type: 'private' | 'thread' | 'thread-channel',
    cb: (counts: ReplyCountsMap) => void
  ): () => void {
    if (!msgIds.length) return () => {};
    const agg: ReplyCountsMap = {};
    const unsub = this.subscribeAllMessageIds(msgIds, type, agg, cb);
    return () => unsub.forEach((fn) => fn());
  }

  private subscribeAllMessageIds(
    msgIds: string[],
    type: 'private' | 'thread' | 'thread-channel',
    agg: ReplyCountsMap,
    cb: (counts: ReplyCountsMap) => void
  ): Array<() => void> {
    const unsubscribes: Array<() => void> = [];
    const filter = this.getReplyFilterField(type);
    msgIds.forEach((id) => {
      const q = query(
        collection(this.firestore, 'messages'),
        where(filter, '==', id),
        orderBy('timestamp', 'asc')
      );
      const unsub = onSnapshot(q, (snap) => {
        agg[id] = this.mapReplySnapshot(snap);
        cb({ ...agg });
      });
      unsubscribes.push(unsub);
    });
    return unsubscribes;
  }

  private getReplyFilterField(
    type: 'private' | 'thread' | 'thread-channel'
  ): string {
    return type === 'thread-channel' ? 'threadChannelId' : 'parentId';
  }

  private mapReplySnapshot(snapshot: any): {
    count: number;
    lastResponseTime: Date | null;
  } {
    const count = snapshot.size;
    let lastResponseTime: Date | null = null;
    if (count > 0) {
      const lastDoc = snapshot.docs[count - 1];
      const ts = lastDoc.data()?.['timestamp'];
      if (ts?.toDate) lastResponseTime = ts.toDate();
    }
    return { count, lastResponseTime };
  }
}
