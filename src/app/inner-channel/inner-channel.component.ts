/**
 * The InnerChannelComponent handles the creation and selection of channels (teams),
 * subscribing to channel updates, and providing UI actions such as leaving a channel.
 * All logic and styling remain unchanged – only Clean Code adjustments have been made.
 */
import {
  Component,
  ViewChild,
  Output,
  EventEmitter,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { ChannelDialogComponent } from '../channel-dialog/channel-dialog.component';
import { EntwicklerteamComponent } from '../entwicklerteam/entwicklerteam.component';
import { ChannelService } from '../channel.service';
import { UserService } from '../user.service';

@Component({
  selector: 'app-inner-channel',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './inner-channel.component.html',
  styleUrls: ['./inner-channel.component.scss'],
})
export class InnerChannelComponent {
  /**
   * A ViewChild reference to the EntwicklerteamComponent for interacting with its instance.
   */
  @ViewChild(EntwicklerteamComponent)
  entwicklerteamComponent!: EntwicklerteamComponent;

  /**
   * Event emitted when a new channel is selected, passing that channel data.
   */
  @Output() channelSelected = new EventEmitter<any>();

  /** Whether the channel list is visible or collapsed. */
  isChannelsVisible = true;

  /** Array of channels (teams) that the current user is a member of. */
  entwicklerTeams: {
    id: string;
    name: string;
    members: any[];
    description?: string;
    createdBy?: string;
  }[] = [];

  /** Flag indicating if a channel name already exists. */
  channelNameExists = false;

  /** Whether the welcome screen is shown if no channel is selected. */
  showWelcomeContainer = false;

  /** Stores the currently selected channel. */
  selectedChannel: any = null;

  /**
   * Constructor injecting services for dialogs, channel data, user data,
   * and change detection if needed.
   */
  constructor(
    public dialog: MatDialog,
    private channelService: ChannelService,
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {}

  /**
   * Loads channels on init, then subscribes to currentChannels
   * to filter those that include the current user.
   */
  ngOnInit(): void {
    this.channelService.loadChannels();
    this.channelService.currentChannels.subscribe((channels) => {
      const userId = this.userService.getCurrentUserId();
      this.entwicklerTeams = channels.filter((ch) =>
        ch.members.some((m: any) => m.uid === userId)
      );
    });
  }

  /**
   * Creates a new channel with the given name and members.
   * Checks for duplicates, ensures current user is included,
   * and saves the channel in Firestore.
   */
  async createChannel(name: string, members: any[]): Promise<void> {
    const userData = await this.userService.getCurrentUserData();
    if (!userData) return;
    if (this.doesChannelNameExist(name)) {
      this.channelNameExists = true;
      return;
    }
    this.channelNameExists = false;
    members = this.ensureCurrentUserIncluded(members, userData);
    const newChannel = this.buildNewChannel(name, members, userData.name);
    this.entwicklerTeams.push(newChannel);
    await this.channelService.addChannel(newChannel);
    this.channelService.changeChannel(newChannel);
  }

  /**
   * Checks if a channel name already exists in the current array.
   */
  private doesChannelNameExist(name: string): boolean {
    return this.entwicklerTeams.some(
      (ch) => ch.name.toLowerCase() === name.toLowerCase()
    );
  }

  /**
   * Ensures the current user is in the members array; returns the updated array.
   */
  private ensureCurrentUserIncluded(
    members: any[],
    userData: { uid: string; name?: string }
  ): any[] {
    const { uid, name = 'Unbekannt' } = userData;
    const isAlreadyIncluded = members.some((m: any) => m.uid === uid);
    if (!isAlreadyIncluded) {
      members.push({ uid, name });
    }
    return members;
  }

  /**
   * Builds a new channel object with a random ID.
   */
  private buildNewChannel(
    name: string,
    members: any[],
    creatorName: string
  ): any {
    return {
      id: Math.random().toString(36).substring(2, 15),
      name,
      members,
      createdBy: creatorName || 'Unbekannt',
    };
  }

  /**
   * Selects the specified channel, informs the ChannelService,
   * and emits an event to notify other components.
   */
  selectChannel(channel: any): void {
    this.channelService.changeChannel(channel);
    this.channelSelected.emit(channel);
  }

  /**
   * Opens a dialog for channel creation (ChannelDialogComponent),
   * then calls createChannel upon successful dialog close.
   */
  openDialog(): void {
    const dialogRef = this.dialog.open(ChannelDialogComponent);
    dialogRef.afterClosed().subscribe((result) => {
      if (result)
        this.createChannel(result.channelName, result.selectedMembers);
    });
  }

  /**
   * Toggles visibility of the channel list UI.
   */
  toggleChannels(): void {
    this.isChannelsVisible = !this.isChannelsVisible;
  }

  /**
   * Allows the user to leave a channel, removing them from Firestore,
   * updating local state, and emitting null as the current channel.
   */
  async leaveChannel(channelId: string): Promise<void> {
    const userId = this.userService.getCurrentUserId();
    if (!userId) return;
    try {
      await this.channelService.leaveChannel(channelId, userId);
      this.entwicklerTeams = this.entwicklerTeams.filter(
        (ch) => ch.id !== channelId
      );
      this.channelSelected.emit(null);
    } catch (_error) {}
  }
}
