import {
  Component,
  Inject,
  OnInit,
  EventEmitter,
  Output,
  HostListener,
} from '@angular/core';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialog,
} from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChannelService } from '../channel.service';
import { UserService } from '../user.service';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { AddMembersDialogMobileComponent } from '../add-members-dialog-mobile/add-members-dialog-mobile.component';

/**
 * Dialog component that allows editing channel details (name, description, members).
 */
@Component({
  selector: 'app-edit-channel-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-channel-dialog.component.html',
  styleUrls: ['./edit-channel-dialog.component.scss'],
})
export class EditChannelDialogComponent implements OnInit {
  /**
   * Emitted when the user leaves the channel (channel ID).
   */
  @Output() channelLeft = new EventEmitter<string>();

  /**
   * Channel name to be displayed/edited.
   */
  channelName: string = '';

  /**
   * Channel description to be displayed/edited.
   */
  description: string = '';

  /**
   * Indicates the channel creator's display name.
   */
  createdBy: string = '';

  /**
   * List of members currently in the channel.
   */
  members: any[] = [];

  /**
   * Whether the channel name is being edited.
   */
  isEditingName: boolean = false;

  /**
   * Whether the channel description is being edited.
   */
  isEditingDescription: boolean = false;

  /**
   * Temporary name while editing the channel name.
   */
  editedChannelName: string = '';

  /**
   * Temporary value while editing the channel description.
   */
  editedDescription: string = '';

  /**
   * True if the screen is considered desktop-sized (>= 1278px).
   */
  isDesktop = false;

  channelNameError: string = '';

  /**
   * Emitted if a members overlay is opened externally (optional usage).
   */
  @Output() openAddMembersOverlay = new EventEmitter<void>();

  /**
   * Creates the dialog for editing channel data, injecting related services and bottom sheets.
   * @param dialogRef Reference to this dialog.
   * @param data Channel data object containing ID, name, members, description, and creator info.
   * @param channelService Service handling channel data in Firestore.
   * @param userService Service handling user data in Firestore.
   * @param dialog Service to open additional dialogs (e.g., for adding members).
   * @param bottomSheet Service to open mobile-friendly bottom sheets.
   */
  constructor(
    public dialogRef: MatDialogRef<EditChannelDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      id: string;
      name: string;
      members: any[];
      description: string;
      createdBy: string;
      
    },
   
    private channelService: ChannelService,
    private userService: UserService,
    private dialog: MatDialog,
    private bottomSheet: MatBottomSheet
  ) {
    this.channelName = data.name;
    this.members = data.members;
    this.description = data.description;
    this.createdBy = data.createdBy || 'Unknown';
  }

  /**
   * Lifecycle hook: initializes desktop check and subscribes to channel updates.
   */
  ngOnInit(): void {
    this.checkIfDesktop();
    this.subscribeToChannelUpdates();
  }

  private subscribeToChannelUpdates(): void {
    this.channelService.currentChannels.subscribe((channels) => {
      const current = channels.find((c) => c.id === this.data.id);
      if (current) {
        this.channelName = current.name;
        this.description = current.description || '';
        this.members = current.members || [];
        this.createdBy = current.createdBy || '';
      }
    });
  }

  /**
   * Checks if window width is >= 1278, setting isDesktop accordingly.
   */
  checkIfDesktop(): void {
    this.isDesktop = window.innerWidth >= 1278;
  }

  /**
   * HostListener for window resize: re-checks if the screen is in desktop mode.
   */
  @HostListener('window:resize')
  onResize(): void {
    this.checkIfDesktop();
  }

  /**
   * Saves channel edits (name/description), updates Firestore, then closes this dialog.
   */
  onSave(): void {
    const updatedChannel = {
      name: this.editedChannelName.trim()
        ? this.editedChannelName
        : this.channelName,
      members: this.members,
      description: this.editedDescription.trim()
        ? this.editedDescription
        : this.description,
      createdBy: this.createdBy,
    };
    this.channelService.updateChannel(
      this.data.id,
      updatedChannel.name,
      updatedChannel.description
    );
    this.dialogRef.close(updatedChannel);
  }

  /** Validates the edited channel name. @private @returns {Promise<boolean>} */
  private async validateEditedChannelName(): Promise<boolean> {
    this.channelNameError = '';
    const nm = this.editedChannelName.trim();
    if (!nm) {
      this.channelNameError = 'Bitte einen Kanalnamen eingeben.';
      return false;
    }
    if (
      nm !== this.channelName &&
      (await this.channelService.channelNameExists(nm))
    ) {
      this.channelNameError = 'Kanalname existiert schon!';
      return false;
    }
    return true;
  }
  /** Saves the name if valid. @returns {Promise<boolean>} */
  async saveChannelName(): Promise<boolean> {
    if (!(await this.validateEditedChannelName())) return false;
    const nm = this.editedChannelName.trim();
    if (nm !== this.channelName) {
      await this.channelService.updateChannel(
        this.data.id,
        nm,
        this.description
      );
      this.channelName = nm;
    }
    return true;
  }

  /**
   * Persists the new channel description if one was entered, then ends editing mode.
   */
  saveDescription(): void {
    if (this.editedDescription.trim()) {
      this.channelService.updateChannel(
        this.data.id,
        this.channelName,
        this.editedDescription
      );
      this.description = this.editedDescription;
    }
    this.isEditingDescription = false;
  }

  /**
   * Toggles editing for the channel name. If turning off, triggers saveChannelName().
   */
  async toggleEditingName(): Promise<void> {
    if (!this.isEditingName) {
      this.isEditingName = true;

      if (!this.editedChannelName.trim()) {
        this.channelNameError = 'Bitte einen Kanalnamen eingeben.';
      } else {
        this.channelNameError = '';
      }
      return;
    }


    const success = await this.saveChannelName();
    if (!success) {
      return;
    }

    this.isEditingName = false;
  }

  /**
   * Handles user input in the channel name field.
   * If the trimmed input is empty, sets an error message; otherwise clears it.
   */
  onChannelNameInput(): void {
    const nameTrim = this.editedChannelName.trim();
    if (!nameTrim) {
      this.channelNameError = 'Bitte einen Kanalnamen eingeben.';
    } else {
      this.channelNameError = '';
    }
  }

  /**
   * Toggles editing for the channel description. If turning off, triggers saveDescription().
   */
  toggleEditingDescription(): void {
    this.isEditingDescription = !this.isEditingDescription;
    if (!this.isEditingDescription) {
      this.saveDescription();
    }
  }

  /**
   * Closes the dialog, discarding any unsaved edits.
   */
  onCancel(): void {
    this.dialogRef.close();
  }

  /**
   * Lets the user leave the channel, removing them from its member list in Firestore.
   * Closes the dialog afterward and emits channelLeft.
   */
  onLeaveChannel(): void {
    this.userService.getCurrentUserData().then((userData) => {
      if (userData && userData.uid) {
        this.channelService
          .leaveChannel(this.data.id, userData.uid)
          .then(() => {
            this.channelLeft.emit();
            this.dialogRef.close();
          });
      }
    });
  }

  /**
   * Opens a bottom sheet for adding members on mobile. Once dismissed,
   * merges the newly selected members and updates Firestore.
   */
  async openAddMembersMobile(): Promise<void> {
    try {
      const filtered = await this.fetchAndFilterUsers();
      if (!this.data || !this.data.id || !filtered) return;
      this.openMembersSheet(filtered);
    } catch {}
  }

  /**
   * Fetches all users from Firestore and filters out those already in this.members.
   * @returns The filtered user array or null if fetching fails.
   */
  private async fetchAndFilterUsers(): Promise<any[] | null> {
    const allUsers = await this.userService.getAllUsers();
    return allUsers.filter(
      (u: any) => !this.members.some((m: any) => m.uid === u.uid)
    );
  }

  /**
   * Opens the mobile bottom sheet with the filtered user list, then handles the result.
   * @param filteredUsers The array of users not in this.members.
   */
  private openMembersSheet(filteredUsers: any[]): void {
    const bottomSheetData = {
      channelId: this.data.id,
      members: [...this.members],
      filteredMembers: filteredUsers,
    };
    const sheetRef = this.bottomSheet.open(AddMembersDialogMobileComponent, {
      panelClass: 'my-custom-panel',
      data: bottomSheetData,
    });
    sheetRef
      .afterDismissed()
      .subscribe((result) => this.handleSheetResult(result));
  }

  /**
   * Merges newly selected members into the existing list and updates Firestore.
   * @param result The array of newly added members (if any).
   */
  private handleSheetResult(result: any): void {
    if (!Array.isArray(result)) return;
    this.members = [
      ...this.members,
      ...result.filter(
        (m: any) => !this.members.some((ex: any) => ex.uid === m.uid)
      ),
    ];
    this.channelService.setMembers(this.data.id, this.members);
  }
}
