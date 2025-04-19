// channel-logic-helpers.ts
import {
  Firestore,
  collection,
  doc,
  deleteDoc,
  getDoc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  DocumentReference,
} from '@angular/fire/firestore';

import { BehaviorSubject } from 'rxjs';

export async function getChannelById(
  firestore: Firestore,
  channelId: string
): Promise<any> {
  const channelDocRef = doc(firestore, 'channels', channelId);
  const channelDoc = await getDoc(channelDocRef);

  if (channelDoc.exists()) {
    return { id: channelDoc.id, ...channelDoc.data() };
  } else {
    throw new Error('Channel not found');
  }
}

export async function deleteChannel(
  firestore: Firestore,
  channelId: string,
  removeChannelLocally: (channelId: string) => void
): Promise<void> {
  try {
    const channelDocRef = doc(firestore, 'channels', channelId);
    await deleteDoc(channelDocRef);

    removeChannelLocally(channelId);
  } catch (error) {
    console.error('deleteChannel error:', error);
  }
}

export function getAllChannelsLive(
  firestore: Firestore,
  callback: (channels: any[]) => void
): () => void {
  const channelsCollection = collection(firestore, 'channels');
  const unsubscribe = onSnapshot(channelsCollection, (snapshot) => {
    const channels: any[] = [];
    snapshot.forEach((docSnap) => {
      channels.push({ id: docSnap.id, ...docSnap.data() });
    });
    callback(channels);
  });
  return unsubscribe;
}

export async function setMembers(
  firestore: Firestore,
  channelsSource: BehaviorSubject<any[]>,
  channelId: string,
  newMembers: any[],
  mergeAndSaveFn: (
    firestore: Firestore,
    channelsSource: BehaviorSubject<any[]>,
    channelId: string,
    newMembers: any[]
  ) => Promise<void>
): Promise<void> {
  try {
    const channels = channelsSource.getValue();
    const channelIndex = channels.findIndex((c) => c.id === channelId);
    if (channelIndex < 0) return;

    await mergeAndSaveFn(firestore, channelsSource, channelId, newMembers);
  } catch (error) {
    console.error('setMembers error:', error);
  }
}

export async function mergeAndSaveMembers(
  firestore: Firestore,
  channelsSource: BehaviorSubject<any[]>,
  channelId: string,
  newMembers: any[],
  combineOldAndNew: (oldMembers: any[], newMembers: any[]) => any[],
  updateCurrentChannelIfNeeded: (
    channelId: string,
    updatedMembers: any[]
  ) => void
): Promise<void> {
  const { channels, channelIndex, channelDocRef, channel } = getChannelData(
    firestore,
    channelsSource,
    channelId
  );
  if (channelIndex < 0 || !channel) return;

  const old = await fetchOldMembers(channelDocRef!);
  const updated = combineOldAndNew(old, newMembers);
  const membersUid = updated.map((m: any) => m.uid);

  await persistMembers(channelDocRef!, updated, membersUid);
  updateLocalChannels(
    channelsSource,
    channels,
    channelIndex,
    channel,
    updated,
    membersUid
  );
  updateCurrentChannelIfNeeded(channelId, updated);
}

function getChannelData(
  firestore: Firestore,
  channelsSource: BehaviorSubject<any[]>,
  channelId: string
) {
  const channels = channelsSource.getValue();
  const channelIndex = channels.findIndex((c) => c.id === channelId);
  if (channelIndex < 0)
    return { channels, channelIndex, channelDocRef: null, channel: null };

  const channel = channels[channelIndex];
  const channelDocRef = doc(firestore, 'channels', channel.id);
  return { channels, channelIndex, channelDocRef, channel };
}

async function fetchOldMembers(channelDocRef: DocumentReference<any>) {
  const channelDoc = await getDoc(channelDocRef);
  if (!channelDoc.exists()) return [];
  const data = channelDoc.data() as any;
  return data.members || [];
}

async function persistMembers(
  channelDocRef: DocumentReference<any>,
  updatedMembers: any[],
  membersUid: string[]
) {
  await updateDoc(channelDocRef, { members: updatedMembers, membersUid });
}

function updateLocalChannels(
  channelsSource: BehaviorSubject<any[]>,
  channels: any[],
  channelIndex: number,
  channel: any,
  updatedMembers: any[],
  membersUid: string[]
) {
  channels[channelIndex] = { ...channel, members: updatedMembers, membersUid };
  channelsSource.next([...channels]);
}

export async function updateMessage(
  firestore: Firestore,
  messageId: string,
  updatedContent: { text?: string; image?: string | null; emojis?: any[] },
  markEdited: boolean
): Promise<void> {
  try {
    const messageDocRef = doc(firestore, 'messages', messageId);
    const updateData: any = { content: updatedContent };

    if (markEdited) {
      updateData.edited = true;
      updateData.editedAt = serverTimestamp();
    }
    await updateDoc(messageDocRef, updateData);
  } catch (error) {
    console.error('updateMessage error:', error);
  }
}
