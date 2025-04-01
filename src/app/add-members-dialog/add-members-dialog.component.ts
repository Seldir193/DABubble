import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  Optional,
  Inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OverlayModule } from '@angular/cdk/overlay';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';

import { UserService } from '../user.service';
import { ChannelService } from '../channel.service';
import { SelectedMembersDialogComponent } from '../selected-members-dialog/selected-members-dialog.component';
import { MessageService } from '../message.service';

/**
 * Data interface if used in a Material Dialog context.
 */
export interface AddMembersDialogData {
  channelId?: string;
  channelName?: string;
  members?: any[];
  filteredMembers?: any[];
}

/**
 * A dialog/overlay for adding new members to a channel.
 * Supports Material Dialog, BottomSheet, or cdkOverlay usage.
 */
@Component({
  selector: 'app-add-members-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, OverlayModule],
  templateUrl: './add-members-dialog.component.html',
  styleUrls: ['./add-members-dialog.component.scss']
})
export class AddMembersDialogComponent implements OnInit {

  /** cdkOverlay input: the channel ID. */
  @Input() channelId!: string;
  /** cdkOverlay input: the channel name. */
  @Input() channelName = '';
  /** cdkOverlay input: existing channel members. */
  @Input() members: any[] = [];

  /** Emitted when closing in cdkOverlay mode. */
  @Output() close = new EventEmitter<void>();
  /** Emitted if new members were added in cdkOverlay mode. */
  @Output() membersAdded = new EventEmitter<any[]>();

  /** Internal search input. */
  specificMemberName = '';
  /** Filtered user list while typing. */
  filteredMembers: any[] = [];
  /** New members selected for adding. */
  selectedMembers: any[] = [];
  /** Controls dropdown visibility. */
  isMembersListVisible = false;
  /** All users loaded from the service. */
  allUsers: any[] = [];

  private unsubscribeAllUsers?: () => void;

  /**
   * Constructor for multi-context usage (Dialog, BottomSheet, cdkOverlay).
   */
  constructor(
    private userService: UserService,
    private channelService: ChannelService,
    private dialog: MatDialog,
    private messageService: MessageService,
    @Optional() public dialogRef?: MatDialogRef<AddMembersDialogComponent>,
    @Optional() public bottomSheetRef?: MatBottomSheetRef<AddMembersDialogComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data?: AddMembersDialogData
  ) {}

  /**
   * Merges passed-in data and loads users if no filter is provided.
   */
  ngOnInit(): void {
    if (this.data) {
      if (this.data.channelId) this.channelId = this.data.channelId;
      if (this.data.channelName) this.channelName = this.data.channelName;
      if (this.data.members) this.members = [...this.data.members];
      if (this.data.filteredMembers) {
        this.filteredMembers = [...this.data.filteredMembers];
      } else {
        this.filteredMembers = [];
      }
    }
    if (this.filteredMembers.length === 0) this.loadAllUsers();

    this.unsubscribeAllUsers = this.messageService.onAllUsersChanged(
      (freshUsers) => {
        // 'freshUsers' enthält jetzt ALLE User.
        // => Setze in 'this.allUsers' ab und filtere wie bisher:
        this.allUsers = freshUsers;
        this.excludeExistingAndSelected();
        if (!this.data?.filteredMembers || this.filteredMembers.length === 0) {
          this.filteredMembers = this.allUsers.filter((u) =>
            !this.members.some((ex) => ex.uid === u.uid)
          );
        }
      }
    );
  }

  /**
   * Loads all users, excluding those already in the channel or selected.
   */
  loadAllUsers(): void {
    this.userService.getAllUsers()
      .then(users => {
        this.allUsers = users;
        this.excludeExistingAndSelected();
        if (!this.data?.filteredMembers || this.filteredMembers.length === 0) {
          this.filteredMembers = this.allUsers.filter(u =>
            !this.members.some(ex => ex.uid === u.uid)
          );
        }
      })
      .catch(() => {});
  }

  /**
   * Excludes users already in 'members' or 'selectedMembers'.
   */
  excludeExistingAndSelected(): void {
    this.filteredMembers = this.allUsers.filter(m =>
      !this.members.some(ex => ex.name === m.name) &&
      !this.selectedMembers.some(sel => sel.name === m.name)
    );
  }

  /**
   * Shows the dropdown list, filtering out existing or selected.
   */
  showAllMembers(): void {
    this.isMembersListVisible = true;
    this.excludeExistingAndSelected();
  }

  /**
   * Hides the list shortly after focus is lost.
   */
  hideMembersList(): void {
    setTimeout(() => {
      this.isMembersListVisible = false;
    }, 200);
  }

  /**
   * Filters members by search input, excluding existing or selected.
   */
  onSearchMembers(): void {
    const term = this.specificMemberName.toLowerCase();
    this.filteredMembers = this.allUsers.filter(m =>
      m.name.toLowerCase().includes(term) &&
      !this.members.some(ex => ex.name === m.name) &&
      !this.selectedMembers.some(se => se.name === m.name)
    );
  }

  /**
   * Adds a new member to 'selectedMembers' if not already present.
   */
  selectMember(member: any): void {
    if (!this.selectedMembers.some(m => m.name === member.name)) {
      this.selectedMembers.push(member);
    }
    this.specificMemberName = '';
    this.isMembersListVisible = false;
    this.excludeExistingAndSelected();
  }

  /**
   * Removes a single member from 'selectedMembers'.
   */
  removeMember(member: any): void {
    this.selectedMembers = this.selectedMembers.filter(m => m !== member);
    this.excludeExistingAndSelected();
  }

  /**
   * Saves newly selected members to Firestore or closes if none are selected.
   */
  onCreate(): void {
    const unique = this.selectedMembers.filter(
      sel => !this.members.some(m => m.name === sel.name)
    );
    if (unique.length > 0) {
      const updated = [...this.members, ...unique];
      this.channelService.setMembers(this.channelId, updated)
        .then(() => this.handleMembersSaved(updated))
        .catch(() => {});
    } else {
      this.closeDialogOrSheet();
    }
  }

  /**
   * Opens a nested dialog to manage the full list of selected members.
   */
  openMembersDialog(): void {
    const ref = this.dialog.open(SelectedMembersDialogComponent, {
      data: { members: this.selectedMembers }
    });
    ref.afterClosed().subscribe(result => {
      if (result) this.selectedMembers = result;
    });
  }

  /**
   * Cancels the action without saving.
   */
  onCancel(): void {
    if (this.dialogRef) this.dialogRef.close();
    else this.close.emit();
  }

  /** Handles successful saving of members. */
  private handleMembersSaved(updated: any[]): void {
    if (this.dialogRef) {
      this.dialogRef.close(updated);
    } else if (this.bottomSheetRef) {
      this.bottomSheetRef.dismiss(updated);
    } else {
      this.membersAdded.emit(updated);
      this.close.emit();
    }
  }

  /** Closes the dialog or sheet if no new members. */
  private closeDialogOrSheet(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    } else if (this.bottomSheetRef) {
      this.bottomSheetRef.dismiss();
    } else {
      this.close.emit();
    }
  }

  ngOnDestroy(): void {
    if (this.unsubscribeAllUsers) {
      this.unsubscribeAllUsers();
    }
  }
}
