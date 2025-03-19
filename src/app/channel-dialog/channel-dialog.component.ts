import {
  Component,
  OnInit,
  Inject
} from '@angular/core';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialog
} from '@angular/material/dialog';
import {
  MatFormFieldModule
} from '@angular/material/form-field';
import {
  MatInputModule
} from '@angular/material/input';
import {
  MatButtonModule
} from '@angular/material/button';
import {
  FormsModule
} from '@angular/forms';
import {
  MatDialogModule
} from '@angular/material/dialog';
import {
  CommonModule
} from '@angular/common';

import { MembersDialogComponent } from '../members-dialog/members-dialog.component';
import { ChannelService } from '../channel.service';

/**
 * Dialog component for creating a new channel. Users can specify a channel
 * name and optionally a description. If valid, the channel is added via
 * ChannelService, and members can be chosen from another dialog.
 */
@Component({
  selector: 'app-channel-dialog',
  templateUrl: './channel-dialog.component.html',
  styleUrls: ['./channel-dialog.component.scss'],
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    FormsModule,
    MatDialogModule,
    CommonModule
  ]
})
export class ChannelDialogComponent implements OnInit {
  /**
   * The new channel's name input by the user.
   */
  channelName = '';

  /**
   * Indicates whether a channel with the same name already exists.
   */
  channelNameExists = false;

  /**
   * True if the channel name is considered valid (>=3 chars).
   */
  isChannelNameValid = false;

  /**
   * Optional description for the new channel.
   */
  description = '';

  /**
   * @param dialogRef Reference to this dialog instance
   * @param data      Data passed in from the caller
   * @param dialog    The Angular Material dialog service
   * @param channelService Service for channel operations
   */
  constructor(
    public dialogRef: MatDialogRef<ChannelDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialog: MatDialog,
    private channelService: ChannelService
  ) {}

  /**
   * Lifecycle hook that runs after component initialization.
   * No additional logic here.
   */
  ngOnInit(): void {}

  /**
   * Checks whether the new channel name has >=3 trimmed characters.
   * @param value The user's input for channel name
   */
  onChannelNameChange(value: string): void {
    this.isChannelNameValid = value.trim().length >= 3;
  }

  /**
   * Creates a new channel if valid and not already taken.
   * Opens a member-selection dialog (MembersDialogComponent) if
   * the name is valid and unique, then adds the channel.
   */
  onCreate(): void {
    if (!this.isChannelNameValid) return;
    const allChannels = this.channelService.getChannels();
    const nameExists = allChannels.some(
      c => c.name.toLowerCase() === this.channelName.toLowerCase()
    );
    if (nameExists) {
      this.channelNameExists = true;
      return;
    }
    this.channelNameExists = false;
    const membersDialog = this.dialog.open(MembersDialogComponent, {
      data: { channelName: this.channelName }
    });
    membersDialog.afterClosed().subscribe(result => {
      if (!result?.selectedMembers) return;
      this.channelService.addChannel({
        name: this.channelName,
        members: result.selectedMembers,
        description: this.description
      });
    });
    this.dialogRef.close();
  }

  /**
   * Closes the current dialog without creating/updating a channel.
   */
  closeDialog(): void {
    this.dialogRef.close();
  }
}




