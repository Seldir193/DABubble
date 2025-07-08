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
import { CommonModule } from '@angular/common';
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
import { UserService } from '../user.service';
import { MessageService } from '../message.service';
import { MatDialog } from '@angular/material/dialog';
import { AfterViewInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { addEmojiToMessage } from './entwicklerteam-message-logic';
import {
  focusTextArea,
  onImageSelected,
  closeProfileCard,
} from './entwicklerteam-textarea-logic';
import { subscribeToCurrentChannel } from './entwicklerteam-subscription-logic';
import {
  toggleDropdown,
  closeDropdown,
  onTextareaInput,
} from './entwicklerteam-dropdown-logic';
import { POSITIONS, POSITIONS_ADD_MEMBERS } from './positions-const';
import {
  openMemberListDialogMobile,
} from './entwicklerteam-members-logic';
import {
  showTooltip as utilsShowTooltip,
  hideTooltip as utilsHideTooltip,
  onOpenThreadEvent as utilsOnOpenThreadEvent,
} from './tooltip-thread-utils';
import {
  unsubscribeFromBoth,
  initChannel,
  connectReplyCountsToMessages,
  removeEmojiFromMessage,
  MyState,
} from './entwicklerteam-private-methods';
import { getFormattedDate, getFormattedTime } from './date-format-utils';
import {
  addUserSymbol,
  selectChannel as chatSelectChannel,
  onMessageInput,
  onLeaveChannel as chatOnLeaveChannel,
  closeLargeImage as chatCloseLargeImage,
  openLargeImage as chatOpenLargeImage,
} from './entwicklerteam-chat-utils';
import {
  scrollToBottom,
  handleKeyDown,
  onSendMessage,
  toggleEditMessage,
  cancelEditing,
  saveMessage,
  toggleEditOptions,
  startEditing,
  onHighlightMessage,
  onClosePopup,
  onToggleEmojiPopup,
} from './message-utils';
import { BaseChatComponent } from './base-chat.component';
import {
  openEditChannelDialog as utilsOpenEditChannelDialog,
  onOpenProfile as utilsOnOpenProfile,
} from './dialog-utils';
import {
  onSelfClickUtil,
  checkDesktopWidthUtil,
  loadCurrentUserUtil,
  toggleOverlayUtil,
  closeOverlayUtil,
  toggleAddMembersOverlayUtil,
  closeAddMembersOverlayUtil,
  onOpenPrivateChatUtil,
  addEmojiUtil,
  toggleEmojiPickerUtil,
  onEmojiPickerClickUtil,
  toggleEmojiPickerForMessageUtil,
  openChannelUtil,
  receiveNewTeamUtil,
  openImageModalUtil,
  closeImageModalUtil,
  sendPrivateMessageUtil,
  closeThreadChannelUtil,
  changeChannelUtil,
  trackByMsgIdUtil,
} from './entwicklerteam-ui-utils';

import { initChannelAndUserSubscriptionsUtil } from './entwicklerteam-subscription-logic'

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
  extends BaseChatComponent
  implements OnInit, OnChanges, OnDestroy, AfterViewInit
{
  @ViewChild('membersOverlay') membersOverlay?: CdkConnectedOverlay;
  @ViewChild('addMembersOverlay') addMembersOverlay?: CdkConnectedOverlay;
  @ViewChild('messageList') messageList!: ElementRef;
  @ViewChild('textArea') textAreaRef!: ElementRef<HTMLTextAreaElement>;
  @Output() memberSelected = new EventEmitter<{ uid: string; name: string }>();
  @Input() selectedChannel: {
    id: string;
    name: string;
    members: any[];
    description?: string;
    createdBy?: string;
  } | null = null;
  @Input() recipientName: string = '';
  @Input() recipientId: string = '';
  @Input() showSearchField: boolean = false;
  @Output() openThread = new EventEmitter<any>();
  @Input() threadData: any = null;
  @Input() isEditingChannel: boolean = false;
  @Output() channelSelected = new EventEmitter<void>();
  @Output() channelLeft = new EventEmitter<void>();
  @Output() openPrivateChatInChat = new EventEmitter<{
    id: string;
    name: string;
  }>();
  @Output() openPrivateChatFromEntwicklerteam = new EventEmitter<{
    id: string;
    name: string;
  }>();

  private channelSubscription?: Subscription;

  constructor(
    public channelService: ChannelService,
    public dialog: MatDialog,
    public userService: UserService,
    public messageService: MessageService
  ) {
    super();
  }

  positions: ConnectionPositionPair[] = POSITIONS;
  positionsAddMembers: ConnectionPositionPair[] = POSITIONS_ADD_MEMBERS;

  ngOnInit(): void {
    this.loadCurrentUser();
    this.checkDesktopWidth();
    subscribeToCurrentChannel(this);
    this.unsubscribeChannels = this.channelService.getAllChannels(
      (channels) => {
        this.allChannels = channels;
        this.allChannelsOriginal = [...channels];
      }
    );
    this.unsubscribeUsers = this.userService.getAllUsersLive((users) => {
      this.allUsers = users;
      this.allUsersOriginal = [...users];
      users.forEach((u) => {
        this.userMap[u.id] = {
          name: u.name || 'Unbekannt',
          avatarUrl: u.avatarUrl || 'assets/img/avatar.png',
        };
      });
    });
    this.initializeDateAndTime();
  }

  initializeDateAndTime(): void {
    this.currentDateString = new Date().toISOString();
    this.formattedDate = getFormattedDate(this.currentDateString);
    const currentTime = new Date().toLocaleTimeString();
    this.formattedTime = getFormattedTime(currentTime);
  }

  get filteredChannels(): any[] {
    if (!this.currentUser?.uid || !this.allChannels) {
      return [];
    }

    return this.allChannels.filter((ch) =>
      ch.members?.some((m: any) => m.uid === this.currentUser.uid)
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['selectedChannel'] &&
      !changes['selectedChannel'].isFirstChange()
    ) {
    }
    if (changes['threadData'] && changes['threadData'].currentValue) {
    }
  }

  ngOnDestroy(): void {
    unsubscribeFromBoth(this as MyState);
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

  @HostListener('window:resize')
  onResize(): void {
    const wasDesktop = this.isDesktop;
    this.checkDesktopWidth();
    if (wasDesktop && !this.isDesktop) {
      this.closeOverlay();
      this.closeAddMembersOverlay();
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapePress(_: KeyboardEvent): void {
    this.closeImageModal();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      if (!this.dialog.openDialogs.length) {
        focusTextArea(this);
      }
    }, 1000);
  }

  onSelfClick = (event: MouseEvent) => onSelfClickUtil(this, event);
  
  checkDesktopWidth = () => checkDesktopWidthUtil(this);
 
  loadCurrentUser = () => loadCurrentUserUtil(this);
  
  toggleOverlay = () => toggleOverlayUtil(this);
  
  closeOverlay = () => closeOverlayUtil(this);
  
  toggleAddMembersOverlay = () => toggleAddMembersOverlayUtil(this);
  
  closeAddMembersOverlay = () => closeAddMembersOverlayUtil(this);
 
  onOpenPrivateChat = (payload: { id: string; name: string }) =>
    onOpenPrivateChatUtil(this, payload);
  
  addEmoji = (ev: any) => addEmojiUtil(this, ev);
 
  toggleEmojiPicker = (event: MouseEvent) => toggleEmojiPickerUtil(this, event);
 
  onEmojiPickerClick = (e: MouseEvent) => onEmojiPickerClickUtil(this, e);
  
  toggleEmojiPickerForMessage = (msg: any) =>
    toggleEmojiPickerForMessageUtil(this, msg);
 
  openChannel = (ch: any) => openChannelUtil(this, ch);
  receiveNewTeam = (name: string, members: any[]) =>
    receiveNewTeamUtil(this, name, members);
  
  openImageModal = () => openImageModalUtil(this);
 
  closeImageModal = () => closeImageModalUtil(this);
 
  sendPrivateMessage = () => sendPrivateMessageUtil(this);
 
  closeThreadChannel = () => closeThreadChannelUtil(this);
 
  changeChannel = (_newChannel: any) => changeChannelUtil(this, _newChannel);
  
  trackByMsgId = (_index: number, msg: any) =>
    trackByMsgIdUtil(this, _index, msg);

  setHasInitialScrollDone = (value: boolean) =>
    (this.hasInitialScrollDone = value);
  getHasInitialScrollDone = (): boolean => this.hasInitialScrollDone;
  
  setUnsubscribeTopLevel = (s: Subscription) => (this.unsubscribeTopLevel = s);

  onToggleEmojiPopup = (msg: any) => onToggleEmojiPopup(this, msg);

  openEditChannelDialog = (ch: {
    id: string;
    name: string;
    members: any[];
    description?: string;
    createdBy?: string;
  }) => utilsOpenEditChannelDialog(this, ch);

  onOpenProfile = (member: any) => utilsOnOpenProfile(this, member);

  callInitChannel = (channel: any) => initChannel(this as MyState, channel);

  callConnectReplyCountsToMessages = (msgs: any[]) =>
    connectReplyCountsToMessages(this as MyState, msgs);

  removeEmojiFromMessage = (m: any, e: string) =>
    removeEmojiFromMessage(this as MyState, m, e);

  callUnsubscribeFromBoth = () => unsubscribeFromBoth(this as MyState);

  onFocusTextArea = () => focusTextArea(this);

  onImageSelectedClick = (e: Event, txtArea: HTMLTextAreaElement) =>
    onImageSelected(this, e, txtArea);

  onCloseProfileCard = (txtArea: HTMLTextAreaElement) =>
    closeProfileCard(this, txtArea);

  onAddEmojiToMessage = (ev: any, msg: any) => addEmojiToMessage(this, ev, msg);

  onToggleDropdown = (event: MouseEvent) => toggleDropdown(this, event);

  onCloseDropdown = () => closeDropdown(this);

  onTextareaInputChange = (event: Event) => onTextareaInput(this, event);

  addUserSymbol = (member: any) => addUserSymbol(this, member);

  onLeaveChannel = (channel: any) => chatOnLeaveChannel(this, channel);

  selectChannel = (channel: any) => chatSelectChannel(this, channel);

  closeLargeImage = () => chatCloseLargeImage(this);

  openLargeImage = (imageData: string | ArrayBuffer) =>
    chatOpenLargeImage(this, imageData);

  onMessageInput = (e: Event) => onMessageInput(this, e);

  showTooltip = (event: MouseEvent, emoji: string, senderName: string) =>
    utilsShowTooltip(this, event, emoji, senderName);

  hideTooltip = () => utilsHideTooltip(this);

  onOpenThreadEvent = (msg: any) => utilsOnOpenThreadEvent(this, msg);

  scrollToBottom = () => scrollToBottom(this);

  handleKeyDown = (e: KeyboardEvent, txtArea: HTMLTextAreaElement) =>
    handleKeyDown(this, e, txtArea);

  onSendMessage = (txtArea: HTMLTextAreaElement) =>
    onSendMessage(this, txtArea);

  toggleEditMessage = (msg: any) => toggleEditMessage(this, msg);

  cancelEditing = (msg: any) => cancelEditing(this, msg);

  saveMessage = (msg: any) => saveMessage(this, msg);

  toggleEditOptions = (msgId: string) => toggleEditOptions(this, msgId);

  startEditing = (msg: any) => startEditing(this, msg);

  onHighlightMessage = (id: string) => onHighlightMessage(this, id);

  onClosePopup = (msg: any) => onClosePopup(this, msg);

  onOpenMemberListDialogMobileClick = () => openMemberListDialogMobile(this);
}
