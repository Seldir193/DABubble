// channel-membership.service.ts

import { Injectable } from '@angular/core';
import {
  Firestore,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
} from '@angular/fire/firestore';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root',
})
export class ChannelMembershipService {
  constructor(private firestore: Firestore, private userService: UserService) {}

  async ensureCreatorInChannel(channel: {
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

  async leaveChannel(
    channelId: string,
    userId: string,
    removeChannelLocally: (channelId: string) => void
  ): Promise<void> {
    try {
      const channelDocRef = doc(this.firestore, 'channels', channelId);
      const docSnap = await getDoc(channelDocRef);
      if (!docSnap.exists()) return;

      await this.handleChannelLeaving(
        docSnap.data(),
        channelDocRef,
        channelId,
        userId,
        removeChannelLocally
      );
    } catch (error) {
      throw error;
    }
  }

  private async handleChannelLeaving(
    channelData: any,
    channelDocRef: any,
    channelId: string,
    userId: string,
    removeChannelLocally: (channelId: string) => void
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

    removeChannelLocally(channelId);
  }

  private filterOutLeavingUser(
    channelData: any,
    userId: string
  ): { updatedMembers: any[]; updatedMembersUid: string[] } {
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
}
