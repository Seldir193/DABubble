/**
 * The EntwicklerteamComponent is responsible for handling team (channel) functionalities,
 * displaying messages, loading and sending channel data, and managing user interactions
 * such as editing messages, adding emojis, and opening threads or private chats.
 *
 * No original logic or style is changed – only unreferenced code is removed, console outputs
 * are eliminated, and methods are shortened to meet Clean Code constraints.
 */
import {
  Component,
  OnInit,
  OnDestroy,
  CUSTOM_ELEMENTS_SCHEMA,
  ViewChild,
  ElementRef,
  Input,
  EventEmitter,
  Output,
  SimpleChanges,
  OnChanges,
  HostListener,
} from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import {
  OverlayModule,
  CdkConnectedOverlay,
  ConnectionPositionPair,
} from '@angular/cdk/overlay';
import { ChannelService } from '../channel.service';
import { MemberListDialogComponent } from '../member-list-dialog/member-list-dialog.component';
import { AddMembersDialogComponent } from '../add-members-dialog/add-members-dialog.component';
import { EditChannelDialogComponent } from '../edit-channel-dialog/edit-channel-dialog.component';
import { UserService } from '../user.service';
import { MemberSectionDialogComponent } from '../member-section-dialog/member-section-dialog.component';
import { MessageService } from '../message.service';
import { ProfilDialogComponent } from '../profil-dialog/profil-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { AfterViewInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ChannelMessageData, BroadcastMessageData } from '../message.models';
import { combineLatest } from 'rxjs';

/** Defines the structure of the content in a message (text, image, emojis). */
export interface MessageContent {
  text?: string;
  image?: string | ArrayBuffer | null;
  emojis?: any[];
}

/** Describes the structure for a parent document in a thread-channel context. */
interface ThreadChannelParentDoc {
  senderId?: string;
  content?: { text?: string; emojis?: any[] };
  timestamp?: any;
  replyCount?: number;
  channelName?: string;
  channelId?: string;
}

@Component({
  selector: 'app-entwicklerteam',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PickerModule,
    OverlayModule,
    MemberListDialogComponent,
    AddMembersDialogComponent,
  ],
  templateUrl: './entwicklerteam.component.html',
  styleUrls: ['./entwicklerteam.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class EntwicklerteamComponent
  implements OnInit, OnChanges, OnDestroy, AfterViewInit
{
  @ViewChild('membersOverlay') membersOverlay?: CdkConnectedOverlay;
  @ViewChild('addMembersOverlay') addMembersOverlay?: CdkConnectedOverlay;
  @ViewChild('messageList') messageList!: ElementRef;
  @ViewChild('textArea') textAreaRef!: ElementRef<HTMLTextAreaElement>;

  /** Emits an event when a member is selected, carrying the member's ID and name. */
  @Output() memberSelected = new EventEmitter<{ uid: string; name: string }>();

  /** The currently selected channel (object with id, name, members, etc.). */
  @Input() selectedChannel: {
    id: string;
    name: string;
    members: any[];
    description?: string;
    createdBy?: string;
  } | null = null;

  /** If a recipient name is provided (for direct messages). */
  @Input() recipientName: string = '';

  /** The recipient's unique ID if sending direct messages. */
  @Input() recipientId: string = '';

  /** Controls the visibility of the search field in the template. */
  @Input() showSearchField: boolean = false;

  /** Emits an event whenever a thread is opened, passing along thread data. */
  @Output() openThread = new EventEmitter<any>();

  /** If the component is working with thread data, stored here. */
  @Input() threadData: any = null;

  /** Toggles channel editing mode if set from outside. */
  @Input() isEditingChannel: boolean = false;

  /** Emits an event when a channel is selected. */
  @Output() channelSelected = new EventEmitter<void>();

  /** Emits an event when a user leaves a channel. */
  @Output() channelLeft = new EventEmitter<void>();

  /** Event emitter if a private chat is opened from the chat context. */
  @Output() openPrivateChatInChat = new EventEmitter<{
    id: string;
    name: string;
  }>();

  /** Event emitter if a private chat is opened specifically from Entwicklerteam context. */
  @Output() openPrivateChatFromEntwicklerteam = new EventEmitter<{
    id: string;
    name: string;
  }>();

  /** Tracks whether the layout is desktop (>= 1278px). */
  isDesktop = false;

  /** The text of the current message being typed by the user in the input. */
  message: string = '';

  /** If the emoji picker is visible for new messages. */
  isEmojiPickerVisible = false;

  /** Holds an image (base64/ArrayBuffer) if user uploads one. */
  imageUrl: string | ArrayBuffer | null | undefined = null;

  /** Tracks if the textarea is expanded due to an attached image. */
  isTextareaExpanded = false;

  /** If an image modal is open for a larger preview. */
  isImageModalOpen = false;

  allChannels: any[] = [];
  dropdownState: 'hidden' | 'user' | 'channel' = 'hidden';
  private cycleStep = 1;
  lastOpenedChar = '';

  private channelSubscription?: Subscription;
  broadcastMessages: any[] = [];

  /** Array of channels. Typically, only one is “selected.” */
  channels: {
    id: string;
    name: string;
    members: any[];
    description?: string;
    createdBy?: string;
  }[] = [];

  /** The list of messages for the selected channel. */
  messages: Array<{
    id: string;
    type: string;
    content: MessageContent;
    senderId: string;
    time: string;
    date: string;
    timestamp?: Date;
    replyCount?: number;
    isEditing?: boolean;
    showAllEmojisList?: boolean;
    expanded?: boolean;
    threadId?: string;
    parentId?: string;
    lastReplyTime?: string | Date;
    threadLastResponseTime?: string | Date | null;
    isTimeFixed?: boolean;
    isHighlighted?: boolean;
    isEmojiPickerVisible?: boolean;
  }> = [];

  /** Stores the current user's data, including name and avatar. */
  currentUser: any;

  /** Current date in `dd.MM.yyyy` format. */
  currentDate: string = formatDate(new Date(), 'dd.MM.yyyy', 'en');

  /** Date for “yesterday,” used for date comparisons. */
  yesterDayDate: Date = this.getYesterdayDate();

  /** A backup of the original message if a user is editing a message. */
  originalMessage: any = null;

  /** Toggles visibility of edit options for a message. */
  showEditOptions = false;

  /** The ID of the message currently showing edit options. */
  currentMessageId: string | null = null;

  /** A new message text if you want to store it while editing. */
  newMessage: string = '';

  /** If user is sending a private message, the selected member. */
  selectedMember: any = null;

  /** The text of a private message being typed. */
  privateMessage: string = '';

  /** Array of members if needed for mention or selection. */
  members: any[] = [];

  /** Last used emojis (sent) for the current channel. */
  lastUsedEmojisSent: string[] = [];

  /** Last used emojis (received) for the current channel. */
  lastUsedEmojisReceived: string[] = [];

  /** Whether a welcome screen is visible (if no channel is selected). */
  showWelcomeContainer = false;

  /** Tooltip for emoji, if visible. */
  tooltipVisible = false;

  /** The tooltip’s (x, y) position for emojis. */
  tooltipPosition = { x: 0, y: 0 };

  /** The emoji displayed in a tooltip. */
  tooltipEmoji = '';

  /** The sender’s name displayed in a tooltip. */
  tooltipSenderName = '';

  /** An array of all users if needed for mention. */
  allUsers: any[] = [];

  /** If a large image is displayed in a modal overlay. */
  showLargeImage = false;

  /** The URL of a large image for the overlay. */
  largeImageUrl: string | null = null;

  /** Ensures scrolling to bottom only happens once initially. */
  private hasInitialScrollDone = false;

  /** Tracks the overlay state (cdk overlay in desktop mode). */
  isOverlayOpen = false;

  /** Tracks whether the Add Members overlay is open (desktop). */
  isAddMembersOverlayOpen = false;

  userMap: {
    [uid: string]:
      | {
          name: string;
          avatarUrl: string;
        }
      | undefined;
  } = {};

  /** Subscriptions for thread messages, reply counts, etc. */
  private unsubscribeFromThreadMessages: (() => void) | null = null;
  private unsubscribeLiveReplyCounts: (() => void) | null = null;
  private unsubscribeFromThreadDetails: (() => void) | null = null;
  private replyCountsUnsubscribe: (() => void) | null = null;
  private unsubscribeChannels: (() => void) | null = null;
  private unsubscribeUsers: (() => void) | null = null;
  private unsubscribeTopLevel?: Subscription;
  private unsubscribeSubCollection?: Subscription;

  positions: ConnectionPositionPair[] = [
    {
      originX: 'start',
      originY: 'bottom',
      overlayX: 'start',
      overlayY: 'top',
      offsetX: 0,
      offsetY: 0,
    },
    {
      originX: 'end',
      originY: 'bottom',
      overlayX: 'end',
      overlayY: 'top',
      offsetX: 0,
      offsetY: 0,
    },
  ];

  positionsAddMembers: ConnectionPositionPair[] = [
    {
      originX: 'start',
      originY: 'bottom',
      overlayX: 'start',
      overlayY: 'top',
      offsetX: 0,
      offsetY: 0,
    },
    {
      originX: 'end',
      originY: 'bottom',
      overlayX: 'end',
      overlayY: 'top',
      offsetX: 0,
      offsetY: 0,
    },
  ];

  constructor(
    private channelService: ChannelService,
    private dialog: MatDialog,
    private userService: UserService,
    private messageService: MessageService
  ) {}

  /** Runs once on init: loads current user, checks layout, subscribes to channel. */
  ngOnInit(): void {
    this.loadCurrentUser();
    this.checkDesktopWidth();
    this.subscribeToCurrentChannel();

    this.unsubscribeChannels = this.channelService.getAllChannels(
      (channels) => {
        this.allChannels = channels;
      }
    );
    this.unsubscribeUsers = this.userService.getAllUsersLive((users) => {
      this.allUsers = users;
      users.forEach((u) => {
        this.userMap[u.id] = {
          name: u.name || 'Unbekannt',
          avatarUrl: u.avatarUrl || 'assets/img/avatar.png',
        };
      });
    });
  }

  /**
   * Returns only the channels in which the current user is a member.
   *
   * 1. Checks if the current user (with a valid `uid`) and the `allChannels` list exist.
   * 2. Filters `allChannels` by verifying if each channel's `members` array
   *    contains an object whose `uid` matches the `currentUser.uid`.
   * 3. If either the user or channel list is unavailable, returns an empty array.
   *
   * @returns {any[]} An array of channels where the current user is a member.
   */
  get filteredChannels(): any[] {
    if (!this.currentUser?.uid || !this.allChannels) {
      return [];
    }

    return this.allChannels.filter((ch) =>
      ch.members?.some((m: any) => m.uid === this.currentUser.uid)
    );
  }

  /** Called when @Input() properties change. */
  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['selectedChannel'] &&
      !changes['selectedChannel'].isFirstChange()
    ) {
      // No double loading because we rely on currentChannel subscription
    }
    if (changes['threadData'] && changes['threadData'].currentValue) {
      // ...
    }
  }

  private focusTextArea(): void {
    if (!this.textAreaRef) return;
    this.textAreaRef.nativeElement.focus();
  }

  /** Cleans up on destroy, unsubscribing from any listeners. */
  ngOnDestroy(): void {
    this.unsubscribeFromBoth();
    if (this.unsubscribeLiveReplyCounts) this.unsubscribeLiveReplyCounts();
    if (this.unsubscribeFromThreadDetails) this.unsubscribeFromThreadDetails();
    if (this.unsubscribeFromThreadMessages)
      this.unsubscribeFromThreadMessages();
    if (this.unsubscribeChannels) {
      this.unsubscribeChannels();
    }
    if (this.unsubscribeUsers) {
      this.unsubscribeUsers();
    }

    if (this.channelSubscription) {
      this.channelSubscription.unsubscribe();
    }
  }

  private unsubscribeFromBoth(): void {
    if (this.unsubscribeTopLevel) {
      this.unsubscribeTopLevel.unsubscribe();
      this.unsubscribeTopLevel = undefined;
    }
    if (this.unsubscribeSubCollection) {
      this.unsubscribeSubCollection.unsubscribe();
      this.unsubscribeSubCollection = undefined;
    }
  }

  /**
   * Closes the dropdown when a click occurs outside its container.
   * @param {MouseEvent} event - The global document click event.
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.dropdownState !== 'hidden') {
      this.dropdownState = 'hidden';
      this.cycleStep = 1;
    }
    if (this.isEmojiPickerVisible) {
      this.isEmojiPickerVisible = false;
    }
  }

  /**
   * Prevents the dropdown from closing if clicked inside its container.
   * @param {MouseEvent} event - The local container click event.
   */
  onSelfClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  private subscribeToCurrentChannel(): void {
    this.channelService.currentChannel.subscribe((channel) => {
      if (!channel || !channel.id) return;
      this.unsubscribeFromBoth();
      this.hasInitialScrollDone = false;
      this.initChannel(channel);

      this.messages = [];

      const topLevelMsgs$ = this.channelService.getMessages(channel.id);
      const subCollMsgs$ = this.channelService.getChannelMessagesLive(
        channel.id
      );
      const broadcastMsgs$ = this.messageService.getBroadcastMessages(
        channel.id
      );

      this.unsubscribeTopLevel = combineLatest([
        topLevelMsgs$,
        subCollMsgs$,
        broadcastMsgs$,
      ]).subscribe(([topMsgs, subMsgs, broadcastMsgs]) => {
        const combined = [...topMsgs, ...subMsgs, ...broadcastMsgs];
        this.mergeMessages(combined);
      });
    });
  }

  /**
   * Integrates newly arrived messages into an existing list,
   * ensuring no duplicates by message ID. Sorts by timestamp.
   * @param currentMessages - The existing message array
   * @param newMsgs - Newly arrived messages to merge
   * @returns A sorted array containing old and new messages
   */
  private mergeArraysById(currentMessages: any[], newMsgs: any[]): any[] {
    const map = this.buildMapFromMessages(currentMessages);
    for (const n of newMsgs) {
      map.set(n.id, {
        ...n,
        content: { ...n.content, emojis: n.content?.emojis || [] },
        replyCount: n.replyCount || 0,
        threadId: n.threadId || null,
        parentId: n.parentId || null,
      });
    }
    return this.sortByTimestamp(Array.from(map.values()));
  }

  /**
   * Creates a Map keyed by the message ID from the given array.
   * @param messages - An array of message objects
   * @returns A Map<string, any> storing messages by their 'id'
   */
  private buildMapFromMessages(messages: any[]): Map<string, any> {
    const map = new Map<string, any>();
    for (const m of messages) {
      map.set(m.id, m);
    }
    return map;
  }

  /**
   * Sorts an array of messages by their timestamp (seconds or Date).
   * @param msgs - The unsorted array of messages
   * @returns A sorted array of messages
   */
  private sortByTimestamp(msgs: any[]): any[] {
    return msgs.sort((a, b) => {
      const ta = a.timestamp?.seconds || +new Date(a.timestamp || 0);
      const tb = b.timestamp?.seconds || +new Date(b.timestamp || 0);
      return ta - tb;
    });
  }

  /**
   * Merges new messages into the main list, updates reply counts,
   * and handles auto-scrolling if needed.
   * @param newMsgs - The incoming messages from any data source
   */
  private mergeMessages(newMsgs: any[]): void {
    const merged = this.mergeArraysById(this.messages, newMsgs);
    this.messages = merged;
    this.connectReplyCountsToMessages(this.messages);

    if (!this.hasInitialScrollDone) {
      this.scrollToBottom();
      this.hasInitialScrollDone = true;
    } else {
      const newIds = new Set(newMsgs.map((m: any) => m.id));
      const oldIds = new Set(this.messages.map((m: any) => m.id));
      const hasReallyNew = Array.from(newIds).some((id) => !oldIds.has(id));
      if (hasReallyNew) this.scrollToBottom();
    }
  }

  ngAfterViewInit() {
    setTimeout(() => this.focusTextArea(), 1000);
  }

  /** Initializes local channel data, loads last-used emojis for the new channel. */
  private initChannel(channel: any): void {
    this.channels = [
      {
        id: channel.id,
        name: channel.name,
        members: channel.members,
        description: channel.description,
        createdBy: channel.createdBy || '',
      },
    ];
    this.channels = this.channels.map((c) =>
      c.id === channel.id
        ? { ...c, members: channel.members, name: channel.name }
        : c
    );
    this.selectedChannel = channel;
    this.loadLastUsedEmojis(channel.id);

    setTimeout(() => {
      this.focusTextArea();
    }, 0);
  }

  /** Fetches last-used emojis for “sent” and “received” from Firestore. */
  private loadLastUsedEmojis(channelId: string): void {
    this.channelService.getLastUsedEmojis(channelId, 'sent').then((sent) => {
      this.lastUsedEmojisSent = sent || [];
    });
    this.channelService
      .getLastUsedEmojis(channelId, 'received')
      .then((recv) => {
        this.lastUsedEmojisReceived = recv || [];
      });
  }

  /** Associates each message with live reply counts from Firestore. */
  private connectReplyCountsToMessages(msgs: any[]): void {
    msgs.forEach((msg) => {
      const tId = msg.threadId || msg.parentId || msg.id;
      if (!tId) return;
      this.messageService.loadReplyCountsLive([tId], 'thread-channel', (rc) => {
        const { count, lastResponseTime } = rc[tId] || {
          count: 0,
          lastResponseTime: null,
        };
        msg.replyCount = count;
        msg.threadLastResponseTime =
          lastResponseTime || msg.threadLastResponseTime;
        if (msg.threadLastResponseTime)
          msg.lastReplyTime = new Date(msg.threadLastResponseTime);
      });
    });
  }

  /** Checks the screen width to determine if the layout is desktop (>=1278px). */
  @HostListener('window:resize')
  onResize(): void {
    const wasDesktop = this.isDesktop;
    this.checkDesktopWidth();
    if (wasDesktop && !this.isDesktop) {
      this.closeOverlay();
      this.closeAddMembersOverlay();
    }
  }

  /** Detects if the layout is desktop sized. */
  checkDesktopWidth(): void {
    this.isDesktop = window.innerWidth >= 1278;
  }

  /** Loads the current user from Firestore into `currentUser`. */
  private loadCurrentUser(): void {
    this.userService.getCurrentUserData().then((user) => {
      this.currentUser = user;
    });
  }

  /** Returns a Date object for 'yesterday', used for date comparisons. */
  private getYesterdayDate(): Date {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return y;
  }

  /** Toggles the cdk overlay for the desktop view. */
  toggleOverlay(): void {
    this.isOverlayOpen = !this.isOverlayOpen;
  }

  /** Closes the cdk overlay if open. */
  closeOverlay(): void {
    this.isOverlayOpen = false;
  }

  /** Toggles the Add Members overlay (desktop), closing the member list overlay first. */
  toggleAddMembersOverlay(): void {
    this.isOverlayOpen = false;
    this.isAddMembersOverlayOpen = true;
  }

  /** Closes the Add Members overlay (desktop). */
  closeAddMembersOverlay(): void {
    this.isAddMembersOverlayOpen = false;
  }

  /** Opens the Add Members overlay or dialog, depending on desktop or mobile. */
  onOpenAddMembersOverlay(): void {
    if (this.isDesktop) this.toggleAddMembersOverlay();
    else this.openAddMembersDialogMobile();
  }

  /** Opens the AddMembersDialog in mobile view. */
  openAddMembersDialogMobile(): void {
    if (!this.selectedChannel) return;
    this.dialog.open(AddMembersDialogComponent, {
      data: {
        channelId: this.selectedChannel.id,
        members: this.selectedChannel.members,
      },
    });
  }

  /** Opens the member list dialog in mobile view. */
  openMemberListDialogMobile(): void {
    if (!this.selectedChannel) return;
    const ref = this.dialog.open(MemberListDialogComponent, {
      data: {
        channelId: this.selectedChannel.id,
        members: this.selectedChannel.members,
      },
    });
    ref.afterClosed().subscribe((r) => this.handleMobileMemberListResult(r));
  }

  /** Handles the result from MemberListDialog on mobile. */
  private handleMobileMemberListResult(r: any): void {
    if (!r) return;
    if (r.addMembers) this.openAddMembersDialogMobile();
    else if (r.openProfile) this.onOpenProfile(r.openProfile);
    else if (r.openChatWith) {
      const name = r.openProfile?.name || 'Unbekannt';
      this.onOpenPrivateChat({ id: r.openChatWith, name });
    }
  }

  /** Opens a dialog to view a member's profile (desktop/mobile). */
  onOpenProfile(member: any): void {
    const ref = this.dialog.open(ProfilDialogComponent, {
      width: '400px',
      data: {
        userId: member.id,
        userName: member.name,
        userAvatarUrl: member.avatarUrl,
        userStatus: member.isOnline ? 'Aktiv' : 'Abwesend',
        userEmail: member.email,
      },
    });
    ref.afterClosed().subscribe((result) => {
      if (result?.openChatWith) {
        const name = member.name || 'Unbekannt';
        this.onOpenPrivateChat({ id: result.openChatWith, name });
      }
    });
  }

  /** Emits an event to open a private chat with a given id/name payload. */
  onOpenPrivateChat(payload: { id: string; name: string }): void {
    this.openPrivateChatFromEntwicklerteam.emit(payload);
  }

  /** Formats a date string as “Heute,” “Gestern,” or a local date if older. */
  getFormattedDate(ds: string): string {
    if (!ds) return 'Ungültiges Datum';
    const d = this.parseDate(ds);
    if (!d) return 'Ungültiges Datum';
    if (this.isSameDay(d, new Date())) return 'Heute';
    if (this.isSameDay(d, this.yesterDayDate)) return 'Gestern';
    const opt: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    };
    return d.toLocaleDateString('de-DE', opt);
  }

  /** Converts a string to a Date object (dd.MM.yyyy or ISO), or returns null if invalid. */
  private parseDate(ds: string): Date | null {
    const parts = ds.split('.');
    let date: Date;
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      date = new Date(year, month, day);
    } else date = new Date(ds);
    return isNaN(date.getTime()) ? null : date;
  }

  /** Checks if two Date objects refer to the same day. */
  private isSameDay(a: Date, b: Date): boolean {
    return (
      a.getDate() === b.getDate() &&
      a.getMonth() === b.getMonth() &&
      a.getFullYear() === b.getFullYear()
    );
  }

  /** Triggered when the user selects an image file. Adjusts textarea if needed. */
  onImageSelected(e: Event, txtArea: HTMLTextAreaElement): void {
    const input = e.target as HTMLInputElement;
    if (!input?.files?.[0]) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (r) => {
      this.imageUrl = r?.target?.result;
      this.adjustTextareaHeight(txtArea);
      this.isTextareaExpanded = true;
    };
    reader.readAsDataURL(file);
  }

  /** Closes the “profile card” (image preview) and resets the textarea. */
  closeProfileCard(txtArea: HTMLTextAreaElement): void {
    this.imageUrl = null;
    this.isTextareaExpanded = false;
    this.resetTextareaHeight(txtArea);
  }

  /** Adds bottom padding if an image is present in the textarea. */
  adjustTextareaHeight(txtArea: HTMLTextAreaElement): void {
    if (this.imageUrl) txtArea.style.paddingBottom = '160px';
  }

  /** Resets the textarea bottom padding to default. */
  resetTextareaHeight(txtArea: HTMLTextAreaElement): void {
    txtArea.style.paddingBottom = '20px';
  }

  /** Toggles the global emoji picker for the main message input. */
  toggleEmojiPicker(event: MouseEvent) {
    event.stopPropagation();
    this.isEmojiPickerVisible = !this.isEmojiPickerVisible;
  }

  /** Adds a selected emoji (from global picker) to the current typed message. */
  addEmoji(ev: any): void {
    if (ev?.emoji?.native) this.message += ev.emoji.native;
  }

  onEmojiPickerClick(e: MouseEvent): void {
    e.stopPropagation();
  }

  /** Toggles an emoji picker for a specific message. */
  toggleEmojiPickerForMessage(msg: any): void {
    const visible = msg.isEmojiPickerVisible;
    this.messages.forEach((m) => (m.isEmojiPickerVisible = false));
    msg.isEmojiPickerVisible = !visible;
  }

  /** Adds an emoji to a specific message's content, updates Firestore, updates last-used. */
  addEmojiToMessage(ev: any, msg: any): void {
    if (!ev?.emoji?.native || !msg.content?.emojis) return;
    const e = ev.emoji.native;
    const existing = msg.content.emojis.find((x: any) => x.emoji === e);
    if (existing) existing.count = 1;
    else if (msg.content.emojis.length < 20)
      msg.content.emojis.push({ emoji: e, count: 1 });
    this.updateLastUsedForMessage(e, msg.senderName);
    msg.isEmojiPickerVisible = false;
    this.updateMsgInFirestore(msg);
  }

  /** Updates local array for last-used emojis and writes them to Firestore. */
  private updateLastUsedForMessage(e: string, sender: string): void {
    const me = this.currentUser?.name || '';
    const isSent = sender === me;
    const arr = isSent ? this.lastUsedEmojisSent : this.lastUsedEmojisReceived;
    const updated = arr.filter((x) => x !== e).slice(0, 2);
    if (!this.selectedChannel?.id) return;
    const type = isSent ? 'sent' : 'received';
    this.channelService.saveLastUsedEmojis(
      this.selectedChannel.id,
      updated,
      type
    );
    if (isSent) this.lastUsedEmojisSent = updated;
    else this.lastUsedEmojisReceived = updated;
  }

  /** Writes updated content to Firestore for a specific message. */
  private updateMsgInFirestore(msg: any): void {
    if (!this.selectedChannel?.id) return;
    this.channelService
      .updateMessage(this.selectedChannel.id, msg.id, msg.content)
      .then(() => {});
  }

  /** Sends a new message (text or image). Resets input and scrolls. */
  sendMessage(txtArea: HTMLTextAreaElement): void {
    if (!this.message.trim() && !this.imageUrl) return;
    const newMsg = this.buildNewMessage();
    this.addMessage(newMsg);
    this.message = '';
    this.imageUrl = null;
    this.resetTextareaHeight(txtArea);
    this.scrollToBottom();
  }

  /** Builds the new message object from current state. */
  private buildNewMessage(): any {
    const hasText = !!this.message.trim();
    const hasImg = !!this.imageUrl;

    return {
      messageFormat:
        hasImg && hasText ? 'text_and_image' : hasImg ? 'image' : 'text',

      content: {
        text: hasText ? this.message.trim() : null,
        image: hasImg ? this.imageUrl : null,
        emojis: [],
      },
      date: formatDate(new Date(), 'dd.MM.yyyy', 'en'),
      timestamp: new Date(),
      time: new Date().toLocaleTimeString(),
      senderId: this.currentUser?.id,
      isEmojiPickerVisible: false,
    };
  }

  addMessage(m: any): void {
    if (!this.selectedChannel) return;

    const messageData: ChannelMessageData = {
      channelId: this.selectedChannel.id,
      date: m.date,
      time: m.time,
      timestamp: m.timestamp,
      senderId: m.senderId,
      senderName: this.currentUser?.name,
      senderAvatar: this.currentUser?.avatarUrl,
      content: m.content,
      messageFormat: m.messageFormat,
    };

    this.messageService.sendChannelMessage(messageData).then(() => {
      this.scrollToBottom();
    });
  }

  addBroadcastMessage(data: BroadcastMessageData): void {
    if (!data.broadcastChannels || data.broadcastChannels.length === 0) {
      return;
    }

    this.messageService
      .sendBroadcastMessage({
        ...data,
      })
      .then(() => {
        this.scrollToBottom();
      });
  }

  /** Formats a time string (hh:mm:ss) to just hh:mm or returns '—' if empty. */
  getFormattedTime(timeString: string): string {
    if (!timeString) return '—';
    return timeString.split(':').slice(0, 2).join(':');
  }

  /** Opens a channel by calling channelService.changeChannel. */
  openChannel(ch: any): void {
    this.channelService.changeChannel(ch);
  }

  /** Scrolls the message list to bottom, with small timeouts for rendering. */
  scrollToBottom(): void {
    setTimeout(() => {
      if (this.messageList?.nativeElement) {
        this.messageList.nativeElement.scrollTop =
          this.messageList.nativeElement.scrollHeight;
      }
      setTimeout(() => {
        if (this.messageList?.nativeElement) {
          this.messageList.nativeElement.scrollTop =
            this.messageList.nativeElement.scrollHeight;
        }
      }, 200);
    }, 100);
  }

  /** Called on keydown in the message textarea, sends the message if Enter pressed without shift. */
  handleKeyDown(e: KeyboardEvent, txtArea: HTMLTextAreaElement): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.sendMessage(txtArea);
    }
  }

  /** Creates a new channel in local state if needed. */
  receiveNewTeam(name: string, members: any[]): void {
    const newId = Math.random().toString(36).substring(2, 15);
    const createdBy = this.currentUser?.name || '';
    this.channels = [{ id: newId, name, members, createdBy }];
  }

  /** Opens the EditChannelDialog for editing a channel or leaving it. */
  openEditChannelDialog(ch: {
    id: string;
    name: string;
    members: any[];
    description?: string;
    createdBy?: string;
  }): void {
    const ref = this.dialog.open(EditChannelDialogComponent, {
      data: {
        id: ch.id,
        name: ch.name,
        members: ch.members,
        description: ch.description || '',
        createdBy: ch.createdBy || '',
      },
    });
    ref.componentInstance.channelLeft.subscribe(() => {
      this.onLeaveChannel(ch);
    });
    ref.afterClosed().subscribe((result) => {
      if (!result) return;
      this.channelService.updateChannel(
        ch.id,
        result.name,
        result.description || ''
      );
      this.channelService.setMembers(ch.id, result.members);
    });
  }

  /** Opens a modal to display an enlarged image (already stored in largeImageUrl). */
  openImageModal(): void {
    this.isImageModalOpen = true;
  }

  /** Closes the image modal if open. */
  closeImageModal(): void {
    this.isImageModalOpen = false;
  }

  /** Closes the image modal on Escape key. */
  @HostListener('document:keydown.escape', ['$event'])
  onEscapePress(_: KeyboardEvent): void {
    this.closeImageModal();
  }

  /** Toggles a message into editing mode, storing a backup in originalMessage. */
  toggleEditMessage(msg: any): void {
    msg.isEditing = true;
    this.originalMessage = { ...msg };
  }

  /** Cancels editing, restoring original content if backup exists. */
  cancelEditing(msg: any): void {
    msg.isEditing = false;
    if (this.originalMessage) {
      msg.content = { ...this.originalMessage.content };
      this.originalMessage = null;
    }
    this.showEditOptions = false;
  }

  /** Saves changes to a message in Firestore if editing was active. */
  saveMessage(msg: any): void {
    if (msg?.isEditing === undefined || !msg.id || !this.selectedChannel)
      return;
    msg.isEditing = false;
    this.channelService
      .updateMessage(this.selectedChannel.id, msg.id, msg.content)
      .then(() => {
        this.messages = this.messages.map((m) =>
          m.id === msg.id ? { ...msg, isEditing: false } : m
        );
      });
  }

  /** Toggles edit options for a single message, hiding them for others. */
  toggleEditOptions(msgId: string): void {
    if (this.currentMessageId === msgId && this.showEditOptions) {
      this.showEditOptions = false;
      this.currentMessageId = null;
    } else {
      this.showEditOptions = true;
      this.currentMessageId = msgId;
    }
  }

  /** Puts a message into editing mode, storing a deep copy as backup. */
  startEditing(msg: any): void {
    msg.isEditing = true;
    this.originalMessage = JSON.parse(JSON.stringify(msg));
    this.showEditOptions = false;
  }

  /**
   * Toggles the dropdown in a 4-step cycle:
   * 1) hidden -> user
   * 2) user -> channel
   * 3) channel -> user
   * 4) user -> hidden
   * @param {MouseEvent} event - The button click event.
   */
  toggleDropdown(event: MouseEvent): void {
    event.stopPropagation();
    if (this.cycleStep === 1) {
      this.dropdownState = 'user';
      this.cycleStep = 2;
    } else if (this.cycleStep === 2) {
      this.dropdownState = 'channel';
      this.cycleStep = 3;
    } else if (this.cycleStep === 3) {
      this.dropdownState = 'user';
      this.cycleStep = 4;
    } else {
      this.dropdownState = 'hidden';
      this.cycleStep = 1;
    }
  }
  /**
   * Closes the dropdown, resetting its state to hidden.
   */
  closeDropdown(): void {
    this.dropdownState = 'hidden';
    this.cycleStep = 1;
  }

  /** Resets the dropdown to its default hidden state. */
  private resetDropdown(): void {
    this.dropdownState = 'hidden';
    this.cycleStep = 1;
    this.lastOpenedChar = '';
  }

  /**
   * Evaluates user/channel mention state or hides it based on input events.
   * @param {Event} event - The input event from the textarea.
   */
  onTextareaInput(event: Event): void {
    const i = event as InputEvent,
      t = (event.target as HTMLTextAreaElement).value;
    if (
      ['deleteContentBackward', 'deleteContentForward'].includes(i.inputType)
    ) {
      if (!t.includes('@') && this.dropdownState === 'user')
        this.resetDropdown();
      this.lastOpenedChar = '';
      if (!t.includes('#') && this.dropdownState === 'channel')
        this.resetDropdown();
      this.lastOpenedChar = '';
      return;
    }
    if (t.endsWith('@') && this.lastOpenedChar !== '@') {
      this.dropdownState = 'user';
      this.lastOpenedChar = '@';
    } else if (t.endsWith('#') && this.lastOpenedChar !== '#') {
      this.dropdownState = 'channel';
      this.lastOpenedChar = '#';
    } else this.lastOpenedChar = '';
  }

  /** Loads all users from Firestore, storing them in allUsers. */
  loadAllUsers(): void {
    this.userService.getAllUsers().then((users) => {
      this.allUsers = users.map((u) => ({
        id: u.id,
        name: u.name,
        avatarUrl: u.avatarUrl || 'assets/img/avatar.png',
        isOnline: u.isOnline ?? false,
      }));
    });
  }

  /** Inserts an '@username' mention in the typed message. */
  addUserSymbol(member: any): void {
    if (this.message.endsWith('@')) {
      this.message = this.privateMessage.slice(0, -1);
    }
    this.message += ` @${member.name} `;
    this.closeDropdown();
  }

  /**
   * Inserts a channel mention into the message text, removing any trailing '#',
   * then closes the dropdown.
   * @param {any} channel - The channel object to mention.
   */
  selectChannel(channel: any): void {
    if (this.message.endsWith('#')) {
      this.message = this.message.slice(0, -1);
    }
    this.message += `#${channel.name} `;
    this.closeDropdown();
  }

  /** If a private message is typed, clears it after “sending.” */
  sendPrivateMessage(): void {
    if (!this.privateMessage.trim() || !this.selectedMember) return;
    this.privateMessage = '';
  }

  /** Called on each key typed in the message input. If it’s a letter, triggers a filter. */
  onMessageInput(e: Event): void {
    const val = (e.target as HTMLInputElement).value;
    if (!val) return;
    const lastChar = val.charAt(val.length - 1);
    if (/[a-zA-Z]/.test(lastChar)) {
      this.filterMembersByLetter(lastChar);
    }
  }

  /** Filters members by letter, opens a selection dialog if results found. */
  private filterMembersByLetter(letter: string): void {
    this.userService.getUsersByFirstLetter(letter).then((res) => {
      this.members = res;
      if (this.members.length > 0) this.openMemberSelectionDialog();
    });
  }

  /** Opens a dialog listing filtered members (MemberSectionDialogComponent). */
  openMemberSelectionDialog(): void {
    const ref = this.dialog.open(MemberSectionDialogComponent, {
      width: '400px',
      data: { members: this.members },
    });
    ref.componentInstance.memberSelected.subscribe((sel) =>
      this.handleMemberSelected(sel)
    );
  }

  /** Sets the selectedMember once chosen in the selection dialog. */
  handleMemberSelected(sel: { uid: string; name: string }): void {
    this.selectedMember = sel;
  }

  /** Fires a `memberSelected` event with uid/name. */
  selectMember(member: any): void {
    if (member?.uid && member?.name) {
      this.memberSelected.emit({ uid: member.uid, name: member.name });
    }
  }

  /** Allows current user to leave a channel, removing them from membership in Firestore. */
  onLeaveChannel(channel: any): void {
    this.userService.getCurrentUserData().then((ud) => {
      if (!ud?.uid || !channel.id) return;
      this.channelService.leaveChannel(channel.id, ud.uid).then(() => {
        channel.members = channel.members.filter((m: any) => m.uid !== ud.uid);
        this.channels = this.channels.map((c) =>
          c.id === channel.id ? { ...c, members: channel.members } : c
        );
        this.selectedChannel = null;
        this.showWelcomeContainer = true;
        this.channelLeft.emit();
      });
    });
  }

  /**
   * Displays the tooltip for a hovered emoji at a position slightly above its horizontal center.
   *
   * 1. Sets the tooltip visibility, the hovered emoji, and the sender name.
   * 2. Retrieves the bounding rectangle of the hovered element to calculate its center.
   * 3. Positions the tooltip horizontally at the midpoint, and slightly above the element (using a small offset).
   *
   * @param {MouseEvent} event - The mouse event triggered by hovering over the emoji.
   * @param {string} emoji - The emoji character being hovered.
   * @param {string} senderName - The name of the user who used the emoji.
   * @returns {void}
   */
  showTooltip(event: MouseEvent, emoji: string, senderName: string): void {
    this.tooltipVisible = true;
    this.tooltipEmoji = emoji;
    this.tooltipSenderName = senderName;

    const targetElem = event.target as HTMLElement;
    const rect = targetElem.getBoundingClientRect();

    const offset = 5;
    this.tooltipPosition = {
      x: rect.left + rect.width / 2 + window.scrollX, // horizontal midpoint
      y: rect.top + window.scrollY - offset, // slightly above the element
    };
  }

  /** Hides the emoji tooltip. */
  hideTooltip(): void {
    this.tooltipVisible = false;
  }

  /** Opens a thread channel for a message, loads parent docs, child messages, sets up watchers, then emits data. */
  async openThreadEvent(msg: any): Promise<void> {
    if (!msg?.id) return;
    if (this.unsubscribeFromThreadMessages)
      this.unsubscribeFromThreadMessages();
    if (this.unsubscribeFromThreadDetails) this.unsubscribeFromThreadDetails();
    const tid = msg.threadChannelId || msg.parentId || msg.id;
    const parentDoc = (await this.messageService.getMessage(
      'thread-channel',
      tid
    )) as ThreadChannelParentDoc | null;
    const cName = await this.resolveThreadChannelName(parentDoc, msg);
    const kids = await this.messageService.getMessagesOnce(
      'thread-channel',
      tid
    );
    const dataObj = this.buildThreadDataObj(msg, parentDoc, cName, kids);
    this.listenThreadMessages(tid);
    this.listenThreadReplyCounts(tid, dataObj.parentMessage);
    if (this.messageService.listenForThreadDetails) {
      this.unsubscribeFromThreadDetails =
        this.messageService.listenForThreadDetails(tid, () => {});
    }
    setTimeout(() => this.positionOverlays(), 300);
    this.openThread.emit(dataObj);
  }

  /** Resolves the channel name for a thread, if not already on parentDoc. */
  private async resolveThreadChannelName(
    pd: ThreadChannelParentDoc | null,
    msg: any
  ): Promise<string> {
    if (pd?.channelName) return pd.channelName;
    if (!pd?.channelId) return 'Unbekannt';
    const ch = await this.channelService.getChannelById(pd.channelId);
    return ch?.name || 'Unbekannt';
  }

  /** Builds a combined thread data object from parent + child messages. */
  private buildThreadDataObj(
    msg: any,
    parentDoc: ThreadChannelParentDoc | null,
    channelName: string,
    children: any[]
  ): any {
    const p = parentDoc || {};
    const tid = msg.threadChannelId || msg.parentId || msg.id;
    const parentMessage = {
      id: tid,
      text: (p.content?.text ?? msg.text) || 'Kein Text',
      senderId: p.senderId || msg.senderId || 'unknown',
      timestamp: p.timestamp || msg.timestamp || new Date(),
      replyCount: p.replyCount || msg.replyCount || 0,
      channelName,
      channelId: p.channelId || null,
      content: p.content ?? msg.content ?? { text: 'Kein Text', emojis: [] },
    };
    const fm = (children || []).map((c) => ({
      ...c,
      content: c.content ?? { text: 'Kein Text', emojis: [] },
      timestamp: c.timestamp || new Date(),
    }));
    if (msg.id !== tid) {
      fm.push({
        ...msg,
        content: msg.content || { text: 'Kein Text', emojis: [] },
        timestamp: msg.timestamp || new Date(),
      });
    }
    return { parentMessage, messages: fm };
  }

  /** Sets up a listener for thread messages (no processing here). */
  private listenThreadMessages(threadId: string): void {
    this.unsubscribeFromThreadMessages = this.messageService.listenForMessages(
      'thread-channel',
      threadId,
      () => {}
    );
  }

  /** Sets up a live listener for reply counts on the open thread. */
  private listenThreadReplyCounts(tid: string, parentMsg: any): void {
    this.messageService.loadReplyCountsLive([tid], 'thread-channel', (rc) => {
      const d = rc[tid] || { count: 0, lastResponseTime: null };
      parentMsg.replyCount = d.count;
      parentMsg.timestamp = d.lastResponseTime || parentMsg.timestamp;
    });
  }

  /** Adjusts overlay positions (MemberList, AddMembers) after thread open. */
  private positionOverlays(): void {
    this.positions.forEach((p) => (p.offsetX = -250));
    this.membersOverlay?.overlayRef?.updatePosition();
    this.positionsAddMembers.forEach((p) => (p.offsetX = -500));
    this.addMembersOverlay?.overlayRef?.updatePosition();
  }

  /** Closes the currently open thread-channel view by clearing `selectedThreadChannel`. */
  closeThreadChannel(): void {}

  /** Changes the active channel to a new one, resetting the thread if any. */
  changeChannel(_newChannel: any): void {}

  /** A trackBy function for message arrays in ngFor, returning the message ID for optimization. */
  trackByMsgId(_: number, msg: any): any {
    return msg.id;
  }

  /** Highlights a specified message by scrolling to it and applying a highlight style temporarily. */
  highlightMessage(id: string): void {
    const el = document.getElementById(`message-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    this.messages = this.messages.map((m) => ({
      ...m,
      isHighlighted: m.id === id,
    }));
    setTimeout(() => {
      this.messages = this.messages.map((m) => ({
        ...m,
        isHighlighted: false,
      }));
    }, 2000);
  }

  /** Closes the emoji popup for a particular message. */
  closePopup(msg: any): void {
    if (msg.showAllEmojisList) {
      msg.showAllEmojisList = false;
      msg.expanded = false;
    }
  }

  /** Toggles a popup listing all emojis in a message. */
  toggleEmojiPopup(msg: any): void {
    if (msg.showAllEmojisList === undefined) msg.showAllEmojisList = false;
    msg.showAllEmojisList = !msg.showAllEmojisList;
    if (!msg.showAllEmojisList) msg.expanded = false;
    else if (msg.expanded === undefined) msg.expanded = false;
  }

  /** Opens a large image overlay if imageData is a string. */
  openLargeImage(imageData: string | ArrayBuffer): void {
    if (typeof imageData !== 'string') return;
    this.largeImageUrl = imageData;
    this.showLargeImage = true;
  }

  /** Closes the large image overlay. */
  closeLargeImage(): void {
    this.showLargeImage = false;
    this.largeImageUrl = null;
  }

  /** Converts a Firestore Timestamp or a Date to a JS Date (optional). */
  convertFirestoreTimestampToDate(ts: any): Date | null {
    if (!ts) return null;
    if (ts.toDate) return ts.toDate();
    if (ts instanceof Date) return ts;
    return null;
  }

  /** Returns a formatted last response time for a thread message object or '—'. */
  getFormattedThreadLastResponseTime(msg: any): string {
    let r = msg.lastReplyTime ?? msg.timestamp;
    if (r?.seconds) r = new Date(r.seconds * 1000);
    return r ? r.toLocaleTimeString() : '—';
  }

  /**
   * Finds the index of a given emoji within a message's emoji list.
   * @param {any} message - The message object containing a content.emojis array.
   * @param {string} emojiToRemove - The emoji to look for.
   * @returns {number} The index of the emoji or -1 if not found.
   */
  private findEmojiIndex(message: any, emojiToRemove: string): number {
    if (!message?.content?.emojis) return -1;
    return message.content.emojis.findIndex(
      (emojiObj: any) => emojiObj.emoji === emojiToRemove
    );
  }

  /**
   * Removes the emoji at the specified index from the message's content.
   * @param {any} message - The message object with a content.emojis array.
   * @param {number} index - The position of the emoji to remove.
   */
  private removeEmojiAtIndex(message: any, index: number): void {
    message.content.emojis.splice(index, 1);
  }

  /**
   * Updates the message document in Firestore, hiding the tooltip in every scenario.
   * @param {any} message - The message object containing the ID and updated content.
   */
  private updateMessageInFirestore(message: any): void {
    if (!message.id) {
      this.hideTooltip();
      return;
    }
    this.messageService
      .updateMessage(message.id, { content: message.content })
      .then(() => this.hideTooltip())
      // Bei Fehlern ebenfalls Tooltip schließen:
      .catch(() => this.hideTooltip());
  }

  /**
   * Removes a specific emoji from the message content and triggers Firestore update.
   * @param {any} message - The message object (requires content.emojis and an ID).
   * @param {string} emojiToRemove - The emoji to remove from the message.
   */
  public removeEmojiFromMessage(message: any, emojiToRemove: string): void {
    const index = this.findEmojiIndex(message, emojiToRemove);
    if (index === -1) return;
    this.removeEmojiAtIndex(message, index);
    this.updateMessageInFirestore(message);
  }
}
