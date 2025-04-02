/**
 * The ChannelService is responsible for managing channels within the application:
 * creating, updating, deleting, and maintaining memberships, as well as tracking
 * channel-related data in Firestore. It also keeps an internal state of the
 * current channel selection and membership updates using BehaviorSubjects.
 *
 * No logic or styling has been changed – only these English JSDoc comments have been added.
 */

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
  getDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  serverTimestamp,
} from '@angular/fire/firestore';
import { UserService } from './user.service';

/**
 * ChannelService handles the creation, retrieval, and updates of channels
 * within the Firestore database. It also tracks membership changes and
 * local channel state via BehaviorSubjects.
 */
@Injectable({
  providedIn: 'root',
})
export class ChannelService {
  /**
   * A BehaviorSubject to store the current channel object (if selected by the user).
   */
  private channelSource = new BehaviorSubject<{
    id: string;
    name: string;
    members: any[];
    description?: string;
    createdBy?: string;
    membersUid?: string[];
  } | null>(null);

  /**
   * currentChannel is an observable derived from channelSource, allowing components to subscribe
   * to real-time changes in the currently selected channel.
   */
  currentChannel = this.channelSource.asObservable();

  /**
   * A BehaviorSubject to store a separately "selected" channel (can differ from currentChannel).
   */
  private selectedChannelSource = new BehaviorSubject<{
    id: string;
    name: string;
    members: any[];
    description?: string;
    createdBy?: string;
    membersUid?: string[];
  } | null>(null);

  /**
   * selectedChannel is an observable for the "selected" channel, which can be used to track
   * channel data separately from currentChannel if the application logic demands.
   */
  selectedChannel = this.selectedChannelSource.asObservable();

  /**
   * A BehaviorSubject to share membership data (an array of members) among interested components.
   */
  private membersSource = new BehaviorSubject<any[]>([]);
  currentMembers = this.membersSource.asObservable();

  /**
   * A BehaviorSubject tracking the list of all channels in Firestore, used as local cache/state.
   */
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

  /**
   * Constructs the ChannelService, injecting Firestore for DB access and UserService to fetch user info.
   * @param firestore - The Firestore instance for DB operations.
   * @param userService - The UserService providing user-related data and utilities.
   */
  constructor(private firestore: Firestore, private userService: UserService) {}

  /**
   * addChannel creates a new channel in Firestore, storing both 'members' and 'membersUid' (UID array).
   * After creation, it calls loadChannels to refresh local state and sets the newly created channel as current.
   *
   * @param channel - The channel object containing name, members, and optional description/createdBy fields.
   */
  async addChannel(channel: {
    name: string;
    members: any[];
    description?: string;
    createdBy?: string;
  }): Promise<void> {
    try {
      // 1) Ensure the creator (current user) is included in the members list
      await this.ensureCreatorInChannel(channel);

      // 2) Create the channel document in Firestore
      const docRef = await this.createChannelDoc(channel);

      // 3) Construct the local channel object, refresh channels, and set this new one as current
      const newChannel = this.buildNewChannelObj(channel, docRef.id);

      this.changeChannel(newChannel);
    } catch (error) {
      // Handle or log the error as needed
    }
  }

  /**
   * ensureCreatorInChannel checks if the current user (creator) is already in the channel's members list.
   * If not, it loads the user's data from Firestore and pushes that user object into channel.members.
   *
   * @private
   * @param channel - The partial channel object that might or might not contain the current user.
   */
  private async ensureCreatorInChannel(channel: {
    name: string;
    members: any[];
    description?: string;
    createdBy?: string;
  }): Promise<void> {
    const currentUid = this.userService.getCurrentUserId();
    if (!currentUid) return;

    const alreadyHasCreator = channel.members.some((m) => m.uid === currentUid);
    if (!alreadyHasCreator) {
      const userData = await this.userService.getUserById(currentUid);
      channel.members.push({ uid: currentUid, ...userData });
    }
  }

  /** Creates the channel document in Firestore and returns the DocumentReference. */
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

  /** Builds a local channel object with an 'id' property included. */
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

  /**
   * leaveChannel allows the current user to remove themselves from a channel's membership list.
   * If no members remain, the channel is deleted. This also updates Firestore fields 'members'
   * and 'membersUid'.
   *
   * @param channelId - The unique ID of the channel in Firestore.
   * @param userId - The UID of the user leaving the channel.
   */
  async leaveChannel(channelId: string, userId: string): Promise<void> {
    try {
      const channelDocRef = doc(this.firestore, 'channels', channelId);
      const docSnap = await getDoc(channelDocRef);
      if (!docSnap.exists()) return;
      await this.handleChannelLeaving(
        docSnap.data(),
        channelDocRef,
        channelId,
        userId
      );
    } catch (error) {
      throw error;
    }
  }

  /** Processes the logic of leaving a channel or deleting it if empty. */
  private async handleChannelLeaving(
    channelData: any,
    channelDocRef: any,
    channelId: string,
    userId: string
  ): Promise<void> {
    const { updatedMembers, updatedMembersUid } = this.filterOutLeavingUser(
      channelData,
      userId
    );
    if (updatedMembers.length > 0) {
      await updateDoc(channelDocRef, {
        members: updatedMembers,
        membersUid: updatedMembersUid,
      });
    } else {
      await deleteDoc(channelDocRef);
    }
    this.removeChannelLocally(channelId);
  }

  /** Filters the leaving user out of the existing members and membersUid arrays. */
  private filterOutLeavingUser(
    channelData: any,
    userId: string
  ): {
    updatedMembers: any[];
    updatedMembersUid: string[];
  } {
    const members = channelData['members'] || [];
    const membersUid = channelData['membersUid'] || [];
    const updatedMembers = members.filter(
      (member: any) => member.uid !== userId
    );
    const updatedMembersUid = membersUid.filter(
      (uid: string) => uid !== userId
    );
    return { updatedMembers, updatedMembersUid };
  }

  /**
   * setMembers merges new members with the existing membership in Firestore, updating
   * both the 'members' array of objects and the 'membersUid' array of UIDs. The local
   * channels list is also updated to reflect these changes.
   * @param channelId - The ID of the channel in Firestore.
   * @param newMembers - An array of the new members to add to the channel.
   */
  async setMembers(channelId: string, newMembers: any[]): Promise<void> {
    try {
      const channels = this.channelsSource.getValue();
      const channelIndex = channels.findIndex((c) => c.id === channelId);
      if (channelIndex < 0) return;
      await this.mergeAndSaveMembers(
        channelId,
        newMembers,
        channels,
        channelIndex
      );
    } catch (error) {}
  }

  /** Merges old and new members, updates Firestore, and refreshes local state. */
  private async mergeAndSaveMembers(
    channelId: string,
    newMembers: any[],
    channels: any[],
    channelIndex: number
  ): Promise<void> {
    const channel = channels[channelIndex];
    const channelDocRef = doc(this.firestore, 'channels', channel.id);
    const channelDoc = await getDoc(channelDocRef);
    const oldMembers = channelDoc.exists()
      ? channelDoc.data()?.['members'] || []
      : [];
    const updatedMembers = this.combineOldAndNew(oldMembers, newMembers);
    const membersUid = updatedMembers.map((m: any) => m.uid);

    await updateDoc(channelDocRef, { members: updatedMembers, membersUid });
    channels[channelIndex] = {
      ...channel,
      members: updatedMembers,
      membersUid,
    };
    this.channelsSource.next([...channels]);
    this.updateCurrentChannelIfNeeded(channelId, updatedMembers);
  }

  /** Combines old and new members without duplicates, based on the 'uid' field. */
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

  /** If the current channel is the same as channelId, refresh its members locally. */
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

  /**
   * removeChannelLocally removes a channel from the local channelsSource by its ID,
   * useful after a channel has been deleted or the user has left it.
   * @param channelId - The ID of the channel to remove.
   */
  removeChannelLocally(channelId: string): void {
    const updatedChannels = this.channelsSource
      .getValue()
      .filter((channel) => channel.id !== channelId);
    this.channelsSource.next(updatedChannels);
  }

  /**
   * updateLocalChannels overwrites the local channels array with a given array of channels.
   * @param updatedChannels - The new array of channels to store in channelsSource.
   */
  updateLocalChannels(updatedChannels: any[]): void {
    this.channelsSource.next(updatedChannels);
  }

  /**
   * updateChannel modifies the name and description of a specific channel in Firestore,
   * also updating local state in channelsSource.
   * @param channelId - The Firestore doc ID for the channel.
   * @param newChannelName - The updated channel name.
   * @param description - The updated channel description.
   */
  async updateChannel(
    channelId: string,
    newChannelName: string,
    description: string
  ): Promise<void> {
    try {
      const channels = this.channelsSource.getValue();
      const index = channels.findIndex((ch) => ch.id === channelId);
      if (index === -1) return;

      this.applyChannelEdits(channels, index, newChannelName, description);
      await this.persistChannelEdits(channelId, newChannelName, description);
      this.channelsSource.next([...channels]);
    } catch (error) {
      throw error;
    }
  }

  /** Updates the in-memory channel object with the new name and description. */
  private applyChannelEdits(
    channels: any[],
    index: number,
    newName: string,
    desc: string
  ): void {
    channels[index].name = newName;
    channels[index].description = desc;
  }

  /** Persists the channel edits in Firestore using updateDoc. */
  private async persistChannelEdits(
    channelId: string,
    newName: string,
    desc: string
  ): Promise<void> {
    const channelDocRef = doc(this.firestore, 'channels', channelId);
    await updateDoc(channelDocRef, { name: newName, description: desc });
  }

  /**
   * changeSelectedChannel updates a separate BehaviorSubject for a "selected channel."
   */
  changeSelectedChannel(channel: {
    id: string;
    name: string;
    members: any[];
    description?: string;
    createdBy?: string;
  }) {
    this.selectedChannelSource.next(channel);
  }

  /**
   * changeChannel updates the channelSource, effectively indicating the user is working
   * with this channel as the "current" channel.
   */
  changeChannel(channel: {
    id: string;
    name: string;
    members: any[];
    description?: string;
    createdBy?: string;
  }) {
    this.channelSource.next(channel);
  }

  /**
   * getChannels returns the latest cached channel array from channelsSource synchronously.
   */
  getChannels(): {
    name: string;
    members: any[];
    description?: string;
    createdBy?: string;
  }[] {
    return this.channelsSource.getValue();
  }

  /**
   * getMembers returns the latest list of members from membersSource.
   */
  getMembers(): any[] {
    return this.membersSource.getValue();
  }

  /**
   * getMessages returns an observable that streams the messages for a given channel
   * ordered by ascending timestamp.
   * @param channelId - The Firestore channel ID to load messages from.
   */
  getMessages(channelId: string): Observable<any[]> {
    const messagesCollection = collection(this.firestore, 'messages');
    const q = query(
      messagesCollection,
      where('channelId', '==', channelId),
      orderBy('timestamp', 'asc')
    );
    return collectionData(q, { idField: 'id' }) as Observable<any[]>;
  }

  /**
   * updateMessage allows editing the 'content' of a message in Firestore for a specific channel.
   * The message doc is found by messageId, and updated content is stored alongside an edited timestamp.
   * @param channelId - The channel's ID (used for logs/validation).
   * @param messageId - The Firestore doc ID of the message to update.
   * @param updatedContent - The new text/image/emoji content to store.
   */
  async updateMessage(
    channelId: string,
    messageId: string,
    updatedContent: { text?: string; image?: string | null; emojis?: any[] }
  ): Promise<void> {
    try {
      const messageDocRef = doc(this.firestore, 'messages', messageId);
      await updateDoc(messageDocRef, {
        content: updatedContent,
        editedAt: serverTimestamp(),
      });
    } catch (error) {}
  }

  /**
   * saveLastUsedEmojis stores an array of last-used emojis in Firestore under either
   * 'lastUsedEmojisSent' or 'lastUsedEmojisReceived' for the given channel.
   * @param channelId - The Firestore doc ID of the channel.
   * @param lastUsedEmojis - An array of emoji strings (short or native).
   * @param type - Either 'sent' or 'received', indicating which field to update.
   */
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

  /**
   * getLastUsedEmojis retrieves either the 'sent' or 'received' last-used emojis array
   * from a given channel doc in Firestore.
   * @param channelId - The channel doc ID.
   * @param type - 'sent' or 'received' to select which field to read.
   */
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

  /**
   * deleteChannel removes a channel document from Firestore and updates local state,
   * typically used when a channel is no longer needed or an admin removes it.
   * @param channelId - The channel doc ID to delete.
   */
  async deleteChannel(channelId: string): Promise<void> {
    try {
      const channelDocRef = doc(this.firestore, 'channels', channelId);
      await deleteDoc(channelDocRef);
      // Remove it from local BehaviorSubject
      this.removeChannelLocally(channelId);
    } catch (error) {}
  }

  /**
   * getAllChannels sets up a live snapshot listener on the channels collection,
   * firing a callback whenever there's a change in Firestore's channels data.
   * Returns an unsubscribe function to end the snapshot subscription.
   * @param callback - The function to call with the updated array of channels.
   */
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

  /**
   * Sets up a realtime listener on the 'channels' collection in Firestore.
   * Whenever documents in this collection are created, updated, or deleted,
   * the provided callback function is invoked with the updated list of channels.
   *
   * @param {(channels: any[]) => void} callback - A function that receives the current channel array on each Firestore update.
   * @returns {() => void} - A function that, when called, unsubscribes from the Firestore listener.
   */

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

  /**
   * getChannelById retrieves one channel document by ID from Firestore.
   * Throws an error if the channel doesn't exist.
   * @param channelId - The Firestore doc ID of the channel.
   */
  async getChannelById(channelId: string): Promise<any> {
    const channelDocRef = doc(this.firestore, 'channels', channelId);
    const channelDoc = await getDoc(channelDocRef);

    if (channelDoc.exists()) {
      return { id: channelDoc.id, ...channelDoc.data() };
    } else {
      throw new Error('Channel not found');
    }
  }

  /**
   * getChannelsByName runs a Firestore query to find channels whose names start with
   * the given channelName, also ensuring that the current user is in the 'membersUid'.
   * @param channelName - The partial or full string of the channel name to search.
   */
  async getChannelsByName(channelName: string): Promise<any[]> {
    const currentUserId = this.userService.getCurrentUserId();
    if (!currentUserId) return [];
    const q = this.buildChannelsByNameQuery(channelName, currentUserId);
    return await this.executeChannelsByNameQuery(q);
  }

  /** Builds the Firestore query for channels matching the given channelName and containing the current user. */
  private buildChannelsByNameQuery(channelName: string, userId: string) {
    const coll = collection(this.firestore, 'channels');
    return query(
      coll,
      where('name', '>=', channelName),
      where('name', '<=', channelName + '\uf8ff'),
      where('membersUid', 'array-contains', userId)
    );
  }

  /** Executes the query and maps the results to an array of channel objects. */
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

  /**
   * getUsersByFirstLetter queries the 'users' collection in Firestore for user documents
   * whose names start with the provided letter, returning them as an array.
   * @param firstLetter - The character or string to filter by (e.g. 'A').
   */
  async getUsersByFirstLetter(firstLetter: string): Promise<any[]> {
    const usersCollection = collection(this.firestore, 'users');
    const q = query(
      usersCollection,
      where('name', '>=', firstLetter),
      where('name', '<=', firstLetter + '\uf8ff')
    );

    try {
      const querySnapshot = await getDocs(q);
      const users = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      return users;
    } catch (error) {
      return [];
    }
  }

  /**
   * getAllMessagesLive sets up a snapshot listener on the 'messages' collection,
   * ordered by ascending timestamp, calling the provided callback with updated messages.
   * Returns an unsubscribe function to end the snapshot.
   * @param callback - The function that receives the new array of messages upon updates.
   */
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

  /**
   * Retrieves all channels from Firestore in which the current user is a member,
   * returning an array of channel objects once (no realtime updates).
   */
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

  /**
   * Checks if a channel with the specified name already exists in Firestore.
   * Returns true if at least one document has this name.
   * @param name The channel name to check.
   */
  async channelNameExists(name: string): Promise<boolean> {
    const channelsColl = collection(this.firestore, 'channels');
    const qChannelName = query(channelsColl, where('name', '==', name));
    const snap = await getDocs(qChannelName);
    return !snap.empty;
  }

  /**
   * Returns a live observable of messages for the given channelId
   * from the top-level 'messages' collection, ordered by ascending timestamp.
   * @param channelId The ID of the channel to observe.
   */
  public getChannelMessagesLive(channelId: string): Observable<any[]> {
    const messagesRef = collection(this.firestore, 'messages');
    const q = query(
      messagesRef,
      where('channelId', '==', channelId),
      orderBy('timestamp', 'asc')
    );
    return collectionData(q, { idField: 'id' }) as Observable<any[]>;
  }
}
