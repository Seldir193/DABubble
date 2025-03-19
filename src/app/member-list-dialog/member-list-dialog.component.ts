/*******************************************************
 * The MemberListDialogComponent handles viewing and 
 * managing members within a channel. It can operate as 
 * either a Material Dialog (mobile) or a cdk Overlay 
 * (desktop). Users can remove members, start private chats, 
 * open profiles, or add new members depending on the 
 * environment. No logic or style has been changed here, 
 * only these JSDoc comments have been added in English.
 *******************************************************/

import { Component, Input, Output, EventEmitter, Optional, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ChannelService } from '../channel.service';
import { MessageService } from '../message.service';


/**
 * Optional interface if Material Dialog is used and data is passed.
 */
export interface MemberListDialogData {
  channelId?: string;
  members?: any[];
}

@Component({
  selector: 'app-member-list-dialog',
  standalone: true,
  imports: [CommonModule, OverlayModule],
  templateUrl: './member-list-dialog.component.html',
  styleUrls: ['./member-list-dialog.component.scss']
})
export class MemberListDialogComponent implements OnInit {

  /**
   * The channel ID if used in an overlay context. If data is passed
   * via Material Dialog, it may also come from MAT_DIALOG_DATA.
   */
  @Input() channelId!: string;

  /**
   * An array of member objects belonging to the channel.
   */
  @Input() members: any[] = [];

  /**
   * Emitted when closing the overlay (in cdk Overlay context).
   */
  @Output() close = new EventEmitter<void>();

  /**
   * Emitted when requesting the addition of new members (desktop overlay).
   */
  @Output() openAddMembersOverlay = new EventEmitter<void>();

  /**
   * Emitted when starting a private chat with a specific member (in cdk overlay).
   */
  @Output() openPrivateChat = new EventEmitter<{ id: string; name: string }>();

  /**
   * Emitted when opening a profile is requested (desktop overlay).
   */
  @Output() openProfileRequested = new EventEmitter<any>();
  private unsubscribeAllUsers?: () => void;


  /**
   * Constructor injecting services and optional references for Material Dialog usage.
   *
   * @param {ChannelService} channelService - Service for channel-related operations.
   * @param {MatDialogRef<MemberListDialogComponent>} dialogRef - Reference to the Material Dialog, if used.
   * @param {MemberListDialogData} data - Optional data passed in via MAT_DIALOG_DATA, if used.
   */
  constructor(
    private channelService: ChannelService,
    private messageService: MessageService,  
    @Optional() public dialogRef?: MatDialogRef<MemberListDialogComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data?: MemberListDialogData
  ) {}

  /**
   * Lifecycle hook that runs after component initialization.
   * Loads channel ID and members from the injected dialog data if provided.
   */
  ngOnInit(): void {
    if (this.data) {
      if (this.data.channelId) {
        this.channelId = this.data.channelId;
      }
      if (this.data.members) {
        this.members = this.data.members;
      }
    }

    this.unsubscribeAllUsers = this.messageService.onAllUsersChanged(
      (allUsers) => {
        // Filtere allUsers auf diejenigen, die in this.members enthalten sind
        // (falls dein Ziel ist: "members" = Channel-Mitglieder + deren Live-Status)
        this.members = allUsers.filter((user) =>
          this.members.some((m) => m.uid === user.uid)
        );
      }
    );
  }

  /**
   * Removes a member from the channel, then updates Firestore via ChannelService.
   *
   * @param {any} member - The member object to remove.
   */
  removeMember(member: any): void {
    this.members = this.members.filter(m => m !== member);
    this.updateChannelMembers();
  }

  /**
   * Updates the channel's member list in Firestore through the ChannelService.
   */
  updateChannelMembers(): void {
    if (!this.channelId) return;
    this.channelService.setMembers(this.channelId, this.members)
      .then(() => {
       
      })
      .catch(() => {
       
      });
  }

  /**
   * Closes either the Material Dialog or emits a close event for cdk Overlay.
   */
  onCancel(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    } else {
      this.close.emit();
    }
  }

  /**
   * Begins a private chat with the selected member. In a Material Dialog,
   * it closes with data, and in an overlay context, it emits an event.
   *
   * @param {any} member - The member object to start a chat with.
   */
  startPrivateChat(member: any) {
    const payload = { id: member.uid, name: member.name };
    if (this.dialogRef) {
      this.dialogRef.close({ openChatWith: payload });
    } else {
      this.openPrivateChat.emit(payload);
      this.close.emit();
    }
  }

  /**
   * Opens a profile dialog for the given member. For Material Dialog, closes
   * with member data; for an overlay, emits an event.
   *
   * @param {any} member - The member object for profile display.
   */
  openProfileDialog(member: any) {
    if (this.dialogRef) {
      this.dialogRef.close({ openProfile: member });
    } else {
      this.openProfileRequested.emit(member);
      this.close.emit();
    }
  }

  /**
   * Requests opening an "Add Members" overlay or dialog,
   * depending on whether we're in a Material Dialog context or an overlay.
   */
  openAddMembersOverlayMethod() {
    if (this.dialogRef) {
      this.dialogRef.close({ addMembers: true });
    } else {
      this.openAddMembersOverlay.emit();
    }
  }

  ngOnDestroy(): void {
    if (this.unsubscribeAllUsers) {
      this.unsubscribeAllUsers();
    }
  }
}











