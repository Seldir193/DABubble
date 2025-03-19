import { Component, OnInit, Inject, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { UserService } from '../user.service';
import { ChannelService } from '../channel.service';
import { OverlayModule } from '@angular/cdk/overlay';
import { MatDialog } from '@angular/material/dialog';

/**
 * Optional data interface if used with MatBottomSheet.
 */
export interface AddMembersMobileData {
  channelId: string;
  members: any[];
  filteredMembers: any[];
}

/**
 * A bottom sheet dialog for adding members in a mobile-friendly layout.
 */
@Component({
  selector: 'app-add-members-dialog-mobile',
  standalone: true,
  imports: [CommonModule, FormsModule, OverlayModule],
  templateUrl: './add-members-dialog-mobile.component.html',
  styleUrls: ['./add-members-dialog-mobile.component.scss']
})
export class AddMembersDialogMobileComponent implements OnInit {

  /** The channel ID required to update members. */
  channelId = '';
  /** The existing members of the channel. */
  members: any[] = [];
  /** An optional pre-filtered set of members. */
  filteredMembers: any[] = [];

  /** User's search input. */
  specificMemberName = '';
  /** Newly selected members for adding. */
  selectedMembers: any[] = [];
  /** A local copy of all known users. */
  allUsers: any[] = [];
  /** Controls the visibility of the members list overlay. */
  isMembersListVisible = false;

  /**
   * Constructor for the bottom sheet usage, optionally receiving data.
   */
  constructor(
    private userService: UserService,
    private channelService: ChannelService,
    private dialog: MatDialog,
    @Optional() public bottomSheetRef?: MatBottomSheetRef<AddMembersDialogMobileComponent>,
    @Optional() @Inject(MAT_BOTTOM_SHEET_DATA) public data?: AddMembersMobileData
  ) {}

  /**
   * Reads optional input data and loads all users if no filtered list was provided.
   */
  ngOnInit(): void {
    if (this.data) {
      this.channelId = this.data.channelId;
      this.members = [...(this.data.members || [])];
      this.filteredMembers = [...(this.data.filteredMembers || [])];
    }
    if (this.filteredMembers.length === 0) {
      this.loadAllUsers();
    }
  }

  /**
   * Loads all users, excluding those already in 'members' if needed.
   */
  loadAllUsers(): void {
    this.userService.getAllUsers()
      .then(users => {
        this.allUsers = users;
        if (this.filteredMembers.length === 0) {
          this.filteredMembers = this.allUsers.filter(
            u => !this.members.some(m => m.uid === u.uid)
          );
        }
      })
      .catch(() => {});
  }

  /**
   * Filters the user list by the current search term, excluding existing or selected members.
   */
  onSearchMembers(): void {
    const term = this.specificMemberName.toLowerCase();
    this.filteredMembers = this.allUsers.filter(u =>
      u.name.toLowerCase().includes(term) &&
      !this.members.some(m => m.uid === u.uid) &&
      !this.selectedMembers.some(sel => sel.uid === u.uid)
    );
  }

  /**
   * Shows the members list overlay, excluding those already in 'members' or 'selectedMembers'.
   */
  showAllMembers(): void {
    this.isMembersListVisible = true;
    if (!this.allUsers || this.allUsers.length === 0) return;
    this.filteredMembers = this.allUsers.filter(u =>
      !this.members.some(m => m.uid === u.uid) &&
      !this.selectedMembers.some(s => s.uid === u.uid)
    );
  }

  /**
   * Hides the members list with a brief delay to allow UI interactions.
   */
  hideMembersList(): void {
    setTimeout(() => {
      this.isMembersListVisible = false;
    }, 200);
  }

  /**
   * Selects a member, removing them from 'filteredMembers' and resetting input state.
   */
  selectMember(user: any): void {
    if (!this.selectedMembers.some(m => m.uid === user.uid)) {
      this.selectedMembers.push(user);
    }
    this.specificMemberName = '';
    this.isMembersListVisible = false;
    this.filteredMembers = this.filteredMembers.filter(u => u.uid !== user.uid);
  }

  /**
   * Removes a previously selected member.
   */
  removeMember(user: any): void {
    this.selectedMembers = this.selectedMembers.filter(m => m.uid !== user.uid);
  }

  /**
   * Merges new members into the channel, saves, then closes the bottom sheet.
   */
  onCreate(): void {
    const unique = this.selectedMembers.filter(
      sel => !this.members.some(m => m.uid === sel.uid)
    );
    if (unique.length < 1) return this.bottomSheetRef?.dismiss();

    const updated = [...this.members, ...unique];
    this.channelService.setMembers(this.channelId, updated)
      .then(() => {
        this.bottomSheetRef?.dismiss(updated);
      })
      .catch(() => {});
  }

  /**
   * Cancels the dialog without adding members.
   */
  onCancel(): void {
    this.bottomSheetRef?.dismiss();
  }
}
