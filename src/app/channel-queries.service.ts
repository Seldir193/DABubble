// channel-queries.service.ts

import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  getDocs,
  query,
  where,
} from '@angular/fire/firestore';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root',
})
export class ChannelQueriesService {
  constructor(private firestore: Firestore, private userService: UserService) {}

  async getChannelsByName(channelName: string): Promise<any[]> {
    const currentUserId = this.userService.getCurrentUserId();
    if (!currentUserId) return [];

    const qRef = this.buildChannelsByNameQuery(channelName, currentUserId);
    return await this.executeChannelsByNameQuery(qRef);
  }

  async getUsersByFirstLetter(firstLetter: string): Promise<any[]> {
    const usersCollection = collection(this.firestore, 'users');
    const qRef = query(
      usersCollection,
      where('name', '>=', firstLetter),
      where('name', '<=', firstLetter + '\uf8ff')
    );

    try {
      const querySnapshot = await getDocs(qRef);
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      return [];
    }
  }

  private buildChannelsByNameQuery(channelName: string, userId: string) {
    const coll = collection(this.firestore, 'channels');
    return query(
      coll,
      where('name', '>=', channelName),
      where('name', '<=', channelName + '\uf8ff'),
      where('membersUid', 'array-contains', userId)
    );
  }

  private async executeChannelsByNameQuery(q: any): Promise<any[]> {
    try {
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap: any) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
    } catch (error) {
      return [];
    }
  }
}
