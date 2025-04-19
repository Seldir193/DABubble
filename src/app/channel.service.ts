import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  Firestore,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  collectionData,
  onSnapshot,
  orderBy,
} from '@angular/fire/firestore';
import { UserService } from './user.service';
import {
  getChannelById as getChannelByIdFn,
  deleteChannel as deleteChannelFn,
  getAllChannelsLive as getAllChannelsLiveFn,
  setMembers as setMembersFn,
  mergeAndSaveMembers as mergeAndSaveMembersFn,
  ChannelMembershipService,
  ChannelEmojiService,
  ChannelQueriesService,
  ChannelMsgService,
} from './channel-import';

@Injectable({
  providedIn: 'root',
})
export class ChannelService {
  private channelSource = new BehaviorSubject<{
    id: string;
    name: string;
    members: any[];
    description?: string;
    createdBy?: string;
    membersUid?: string[];
  } | null>(null);
  currentChannel = this.channelSource.asObservable();
  private selectedChannelSource = new BehaviorSubject<{
    id: string;
    name: string;
    members: any[];
    description?: string;
    createdBy?: string;
    membersUid?: string[];
  } | null>(null);

  selectedChannel = this.selectedChannelSource.asObservable();
  private membersSource = new BehaviorSubject<any[]>([]);
  currentMembers = this.membersSource.asObservable();
  private channelsSource = new BehaviorSubject<
    {
      id: string;
      name: string;
      members: any[];
      description?: string;
      createdBy?: string;
      membersUid?: string[];
    }[]
  >([]);
  currentChannels = this.channelsSource.asObservable();

  constructor(
    private firestore: Firestore,
    private userService: UserService,
    private membershipService: ChannelMembershipService,
    private emojiService: ChannelEmojiService,
    private queriesService: ChannelQueriesService,
    private msgService: ChannelMsgService
  ) {
    this.listenChannelsLive((channels) => {
      this.channelsSource.next(channels);
    });
  }

  async addChannel(channel: {
    name: string;
    members: any[];
    description?: string;
    createdBy?: string;
    createdByUid?: string;
  }): Promise<void> {
    try {
      const currentUid = this.userService.getCurrentUserId();
      if (!currentUid) return;
      const userData = await this.userService.getUserById(currentUid);
      channel.createdByUid = currentUid;
      channel.createdBy = userData?.name;
      await this.membershipService.ensureCreatorInChannel(channel);
      const docRef = await this.createChannelDoc(channel);
      const newChannel = this.buildNewChannelObj(channel, docRef.id);
      this.changeChannel(newChannel);
    } catch (error) {}
  }

  async leaveChannel(channelId: string, userId: string): Promise<void> {
    return this.membershipService.leaveChannel(
      channelId,
      userId,
      this.removeChannelLocally.bind(this)
    );
  }

  removeChannelLocally(channelId: string): void {
    const updatedChannels = this.channelsSource
      .getValue()
      .filter((channel) => channel.id !== channelId);
    this.channelsSource.next(updatedChannels);
  }

  private async createChannelDoc(channel: {
    name: string;
    members: any[];
    description?: string;
    createdBy?: string;
  }) {
    const channelsColl = collection(this.firestore, 'channels');
    const membersUid = channel.members.map((m) => m.uid);
    return await addDoc(channelsColl, { ...channel, membersUid });
  }

  private buildNewChannelObj(
    channel: {
      name: string;
      members: any[];
      description?: string;
      createdBy?: string;
    },
    id: string
  ) {
    const membersUid = channel.members.map((m) => m.uid);
    return { id, ...channel, membersUid };
  }

  async getChannelById(channelId: string): Promise<any> {
    return getChannelByIdFn(this.firestore, channelId);
  }

  async deleteChannel(channelId: string): Promise<void> {
    return deleteChannelFn(
      this.firestore,
      channelId,
      this.removeChannelLocally.bind(this)
    );
  }

  getAllChannelsLive(callback: (channels: any[]) => void): () => void {
    return getAllChannelsLiveFn(this.firestore, callback);
  }

  async setMembers(channelId: string, newMembers: any[]): Promise<void> {
    return setMembersFn(
      this.firestore,
      this.channelsSource,
      channelId,
      newMembers,
      this.mergeAndSaveMembers.bind(this)
    );
  }

  private async mergeAndSaveMembers(
    firestore: Firestore,
    channelsSource: BehaviorSubject<any[]>,
    channelId: string,
    newMembers: any[]
  ): Promise<void> {
    return mergeAndSaveMembersFn(
      firestore,
      channelsSource,
      channelId,
      newMembers,
      this.combineOldAndNew.bind(this),
      this.updateCurrentChannelIfNeeded.bind(this)
    );
  }

  private combineOldAndNew(oldMembers: any[], newMembers: any[]): any[] {
    return [
      ...oldMembers,
      ...newMembers.filter(
        (m) =>
          !oldMembers.some(
            (existing: { uid: string }) => existing.uid === m.uid
          )
      ),
    ];
  }

  private updateCurrentChannelIfNeeded(
    channelId: string,
    updatedMembers: any[]
  ): void {
    const currentChannel = this.channelSource.getValue();
    if (currentChannel && currentChannel.id === channelId) {
      currentChannel.members = updatedMembers;
      this.channelSource.next(currentChannel);
    }
  }

  updateLocalChannels(updatedChannels: any[]): void {
    this.channelsSource.next(updatedChannels);
  }

  async updateChannel(
    channelId: string,
    newChannelName: string,
    description: string
  ): Promise<void> {
    try {
      const [channels, index] = this.getChannelsAndIndex(channelId);
      if (index === -1) return;
      this.applyChannelEdits(channels, index, newChannelName, description);
      await this.persistChannelEdits(channelId, newChannelName, description);
      this.channelsSource.next([...channels]);
      this.updateCurrentChannel(channelId, newChannelName, description);
    } catch (error) {}
  }

  private getChannelsAndIndex(channelId: string): [any[], number] {
    const channels = this.channelsSource.getValue();
    const index = channels.findIndex((ch) => ch.id === channelId);
    return [channels, index];
  }

  private applyChannelEdits(
    channels: any[],
    index: number,
    newName: string,
    desc: string
  ): void {
    channels[index].name = newName;
    channels[index].description = desc;
  }

  private async persistChannelEdits(
    channelId: string,
    newName: string,
    desc: string
  ): Promise<void> {
    const ref = doc(this.firestore, 'channels', channelId);
    await updateDoc(ref, { name: newName, description: desc });
  }

  private updateCurrentChannel(
    channelId: string,
    newName: string,
    desc: string
  ): void {
    const current = this.channelSource.getValue();
    if (current?.id === channelId) {
      current.name = newName;
      current.description = desc;
      this.channelSource.next({ ...current });
    }
  }

  changeSelectedChannel(channel: {
    id: string;
    name: string;
    members: any[];
    description?: string;
    createdBy?: string;
  }) {
    this.selectedChannelSource.next(channel);
  }

  changeChannel(channel: {
    id: string;
    name: string;
    members: any[];
    description?: string;
    createdBy?: string;
  }) {
    this.channelSource.next(channel);
  }

  getMembers(): any[] {
    return this.membersSource.getValue();
  }

  getMessages(channelId: string): Observable<any[]> {
    const messagesCollection = collection(this.firestore, 'messages');
    const q = query(
      messagesCollection,
      where('channelId', '==', channelId),
      orderBy('timestamp', 'asc')
    );
    return collectionData(q, { idField: 'id' }) as Observable<any[]>;
  }

  async getChannelsByName(channelName: string): Promise<any[]> {
    return this.queriesService.getChannelsByName(channelName);
  }

  async getUsersByFirstLetter(firstLetter: string): Promise<any[]> {
    return this.queriesService.getUsersByFirstLetter(firstLetter);
  }

  async saveLastUsedEmojis(
    channelId: string,
    lastUsedEmojis: string[],
    type: 'sent' | 'received'
  ): Promise<void> {
    return this.emojiService.saveLastUsedEmojis(
      channelId,
      lastUsedEmojis,
      type
    );
  }

  async getLastUsedEmojis(
    channelId: string,
    type: 'sent' | 'received'
  ): Promise<string[] | undefined> {
    return this.emojiService.getLastUsedEmojis(channelId, type);
  }

  getAllChannels(callback: (channels: any[]) => void): () => void {
    const channelsCollection = collection(this.firestore, 'channels');
    const unsubscribe = onSnapshot(channelsCollection, (snapshot) => {
      const channels: any[] = [];
      snapshot.forEach((doc) => {
        channels.push({ id: doc.id, ...doc.data() });
      });
      callback(channels);
    });
    return unsubscribe;
  }

  public listenChannelsLive(callback: (channels: any[]) => void): () => void {
    const channelsColl = collection(this.firestore, 'channels');
    const unsubscribe = onSnapshot(channelsColl, (snapshot) => {
      const channels: any[] = [];
      snapshot.forEach((docSnap) => {
        channels.push({ id: docSnap.id, ...docSnap.data() });
      });
      callback(channels);
    });
    return unsubscribe;
  }

  getChannels(): {
    name: string;
    members: any[];
    description?: string;
    createdBy?: string;
  }[] {
    return this.channelsSource.getValue();
  }

  getAllMessagesLive(callback: (messages: any[]) => void): () => void {
    const messagesCollection = collection(this.firestore, 'messages');
    const q = query(messagesCollection, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages: any[] = [];
      snapshot.forEach((docSnap) => {
        messages.push({ id: docSnap.id, ...docSnap.data() });
      });
      callback(messages);
    });
    return unsubscribe;
  }

  async getAllChannelsOnce(): Promise<any[]> {
    const currentUserId = this.userService.getCurrentUserId();
    if (!currentUserId) return [];

    const coll = collection(this.firestore, 'channels');
    const qRef = query(
      coll,
      where('membersUid', 'array-contains', currentUserId)
    );
    const snap = await getDocs(qRef);
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async channelNameExists(name: string): Promise<boolean> {
    const channelsColl = collection(this.firestore, 'channels');
    const qChannelName = query(channelsColl, where('name', '==', name));
    const snap = await getDocs(qChannelName);
    return !snap.empty;
  }

  public getChannelMessagesLive(channelId: string): Observable<any[]> {
    return this.msgService.getChannelMessagesLive(channelId);
  }

  public updateMessage(
    channelId: string,
    messageId: string,
    updatedContent: { text?: string; image?: string | null; emojis?: any[] },
    markEdited: boolean
  ): Promise<void> {
    return this.msgService.updateMessage(
      channelId,
      messageId,
      updatedContent,
      markEdited
    );
  }
}
