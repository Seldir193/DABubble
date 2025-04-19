import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  SimpleChanges,
  OnChanges,
  HostListener,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { UserService } from '../user.service';
import { ChannelService } from '../channel.service';
import { MessageService } from '../message.service';
import { ChangeDetectorRef } from '@angular/core';
import { Message } from '../message.models';
import { OverlayModule } from '@angular/cdk/overlay';
import { ThreadChannelBase } from './thread-channel-base';
import {
  initializeThreadChannelComp,
  parentMessageChangeDetected,
  cleanUpOldListeners,
  mergeOrPushNewMessage,
  isParentValid,
  onValidParentChange,
  loadReplyCountsHelper,
  ensureEmojiArrayHelper,
  addOrIncrementEmojiHelper,
  updateLocalEmojiCacheHelper,
  updateMessageInFirestoreHelper,
  removeEmojiFromMessageHelper,
  buildThreadChannelMessageHelper,
  highlightMessageHelper,
  checkDesktopWidthHelper,
  convertTimestampHelper,
  scrollToBottomHelper,
  adjustTextareaHeightHelper,
  resetTextareaHeightHelper,
  onImageSelectedHelper,
  closeProfileCardHelper,
  toggleDropdownHelper,
  closeDropdownHelper,
  resetDropdownHelper,
  openLargeImageHelper,
  closeLargeImageHelper,
  formatMessageHelper,
  getFormattedTimeHelper,
  getFormattedDateHelper,
  toDateHelper,
  isSameDayHelper,
  getYesterdayDateHelper,
  sendThreadMessageHelper,
  isReadyToSendHelper,
  ensureCurrentUserHelper,
  hasValidParentHelper,
  handleKeyDownHelper,
  sendMessageHelper,
  saveMessageHelper,
  cancelEditingHelper,
  startEditingHelper,
  getFilteredChannelsHelper,
  onTextareaInputHelper,
  ngOnInitHelper,
  addUserSymbolThread,
  selectChannelThread
} from './thread-channel-export';


@Component({
  selector: 'app-thread-channel',
  standalone: true,
  imports: [CommonModule, FormsModule, PickerModule, OverlayModule],
  templateUrl: './thread-channel.component.html',
  styleUrls: ['./thread-channel.component.scss'],
})
export class ThreadChannelComponent
  extends ThreadChannelBase
  implements OnInit, OnChanges, OnDestroy
{
  @Input() parentMessage: Message | null = null;
  @Input() recipientName: string = '';
  @Output() closeThread = new EventEmitter<void>();
  @Output() openThread = new EventEmitter<any>();
  @ViewChild('messageList') messageList!: ElementRef;
  @Input() channelName: string = '';
  @Input() channelId!: string;
  @Input() selectedThreadChannel: any;
  @ViewChild('textArea') textAreaRef!: ElementRef<HTMLTextAreaElement>;

  constructor(
    public userService: UserService,
    public channelService: ChannelService,
    public messageService: MessageService,
    public cdr: ChangeDetectorRef
  ) {
    super();
  }

  async ngOnInit(): Promise<void> {
    return ngOnInitHelper(this);
  }

  @HostListener('window:resize')
  onResize() {
    this.checkDesktopWidth();
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

  onSelfClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  ngOnDestroy(): void {
    if (this.unsubscribeFromThreadMessages) {
      this.unsubscribeFromThreadMessages();
    }
    if (this.unsubscribeFromReplyCount) {
      this.unsubscribeFromReplyCount();
    }
    if (this.unsubscribeChannels) {
      this.unsubscribeChannels();
    }
    if (this.unsubscribeUsers) {
      this.unsubscribeUsers();
    }
    if (this.unsubscribeParent) {
      this.unsubscribeParent();
    }
  }

  public async loadCurrentUser(): Promise<void> {
    try {
      this.currentUser = await this.userService.getCurrentUserData();
      if (!this.currentUser) {
        throw new Error('Could not load user from Firestore.');
      }
    } catch (error) {
      this.currentUser = null;
    }
  }

  toggleEmojiPickerForMessage(msg: any): void {
    const isCurrentlyVisible = msg.isEmojiPickerVisible;
    this.threadMessages.forEach((m) => (m.isEmojiPickerVisible = false));
    msg.isEmojiPickerVisible = !isCurrentlyVisible;
  }

  addEmojiToMessage(event: any, msg: any): void {
    ensureEmojiArrayHelper(msg);
    if (!event?.emoji?.native) return;

    const newEmoji = event.emoji.native;
    addOrIncrementEmojiHelper(msg, newEmoji);
    updateLocalEmojiCacheHelper(this, msg, newEmoji);

    msg.isEmojiPickerVisible = false;
    updateMessageInFirestoreHelper(this, msg);
  }

  toggleEmojiPicker(event: MouseEvent) {
    event.stopPropagation();
    if (!this.isEmojiPickerVisible) {
      this.dropdownState = 'hidden';
      this.cycleStep = 1;
    }
    this.isEmojiPickerVisible = !this.isEmojiPickerVisible;
  }

  addEmoji(event: any): void {
    if (event?.emoji?.native) {
      this.channelMessage += event.emoji.native;
    }
  }

  onEmojiPickerClick(e: MouseEvent): void {
    e.stopPropagation();
  }

  onClose(): void {
    this.closeThread.emit();
  }

  showTooltip(event: MouseEvent, emoji: string, senderName: string): void {
    this.tooltipVisible = true;
    this.tooltipEmoji = emoji;
    this.tooltipSenderName = senderName;

    const targetElem = event.target as HTMLElement;
    const rect = targetElem.getBoundingClientRect();

    const offset = 5;
    this.tooltipPosition = {
      x: rect.left + rect.width / 2 + window.scrollX,
      y: rect.top + window.scrollY - offset,
    };
  }

  hideTooltip(): void {
    this.tooltipVisible = false;
  }

  toggleEditOptions(msgId: string): void {
    if (this.currentMessageId === msgId && this.showEditOptions) {
      this.showEditOptions = false;
      this.currentMessageId = null;
    } else {
      this.showEditOptions = true;
      this.currentMessageId = msgId;
    }
  }

  loadAllUsers(): void {
    this.userService
      .getAllUsers()
      .then((users) => {
        this.allUsers = users.map((u) => ({
          id: u.id,
          name: u.name,
          avatarUrl: u.avatarUrl || 'assets/img/avatar.png',
          isOnline: u.isOnline ?? false,
        }));
      })
      .catch((err) => console.error('Error loading users:', err));
  }

  closePopup(msg: any) {
    if (msg.showAllEmojisList) {
      msg.showAllEmojisList = false;
      msg.expanded = false;
    }
  }

  toggleEmojiPopup(msg: any) {
    if (msg.showAllEmojisList === undefined) {
      msg.showAllEmojisList = false;
    }
    msg.showAllEmojisList = !msg.showAllEmojisList;

    if (!msg.showAllEmojisList) {
      msg.expanded = false;
    } else if (msg.expanded === undefined) {
      msg.expanded = false;
    }
  }

  onEmojiPlusInPopup(msg: any) {
    console.log('Plus icon clicked in emoji popup, msg =', msg);
  }

  public async initializeThread(threadChannelId: string): Promise<void> {
    return initializeThreadChannelComp(this, threadChannelId);
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (parentMessageChangeDetected(changes)) {
      cleanUpOldListeners(this);
      mergeOrPushNewMessage(this, changes['parentMessage'].currentValue);

      const pMsg = this.parentMessage;
      if (!isParentValid(this, pMsg)) {
        this.cdr.detectChanges();
        return;
      }
      await onValidParentChange(this, pMsg);
      this.cdr.detectChanges();
    }
  }

  openImageModal = () => (this.isImageModalOpen = true);

  closeImageModal = () => (this.isImageModalOpen = false);

  loadReplyCounts = () => loadReplyCountsHelper(this);

  removeEmojiFromMessage = (message: any, emojiToRemove: string) =>
    removeEmojiFromMessageHelper(this, message, emojiToRemove);

  buildThreadChannelMessage = () => buildThreadChannelMessageHelper(this);

  highlightMessage = (messageId: string, retries = 5) =>
    highlightMessageHelper(this, messageId, retries);

  checkDesktopWidth = () => checkDesktopWidthHelper(this);

  convertTimestamp = (timestamp: any) => convertTimestampHelper(timestamp);

  scrollToBottom = () => scrollToBottomHelper(this);

  adjustTextareaHeight = (textArea: HTMLTextAreaElement) =>
    adjustTextareaHeightHelper(this, textArea);

  resetTextareaHeight = (textArea: HTMLTextAreaElement) =>
    resetTextareaHeightHelper(textArea);

  onImageSelected = (event: Event, textArea: HTMLTextAreaElement) =>
    onImageSelectedHelper(this, event, textArea);

  closeProfileCard = (textArea: HTMLTextAreaElement) =>
    closeProfileCardHelper(this, textArea);

  toggleDropdown = (event: MouseEvent) => toggleDropdownHelper(this, event);

  closeDropdown = () => closeDropdownHelper(this);

  resetDropdown = () => resetDropdownHelper(this);

  openLargeImage = (imageData: string | ArrayBuffer) =>
    openLargeImageHelper(this, imageData);

  closeLargeImage = () => closeLargeImageHelper(this);

  formatMessage = (msg: any) => formatMessageHelper(this, msg);

  getFormattedTime = (timestamp: any) =>
    getFormattedTimeHelper(this, timestamp);

  getFormattedDate = (timestamp: any) =>
    getFormattedDateHelper(this, timestamp);

  toDate = (timestamp: any) => toDateHelper(timestamp);

  isSameDay = (date1: Date, date2: Date) => isSameDayHelper(date1, date2);

  getYesterdayDate(): Date {
    return getYesterdayDateHelper();
  }

  sendThreadMessage = async (textArea: HTMLTextAreaElement) =>
    sendThreadMessageHelper(this, textArea);

  isReadyToSend = () => isReadyToSendHelper(this);

  ensureCurrentUser = async () => ensureCurrentUserHelper(this);

  hasValidParent = () => hasValidParentHelper(this);

  handleKeyDown = (event: KeyboardEvent, textArea: HTMLTextAreaElement) =>
    handleKeyDownHelper(this, event, textArea);

  sendMessage = () => sendMessageHelper(this);

  saveMessage = async (msg: any) => saveMessageHelper(this, msg);

  cancelEditing = (msg: any) => cancelEditingHelper(this, msg);

  startEditing = (msg: any) => startEditingHelper(this, msg);

  get filteredChannels(): any[] {
    return getFilteredChannelsHelper(this);
  }

  onTextareaInput = (event: Event) => onTextareaInputHelper(this, event);

  selectChannel = (ch: any) => selectChannelThread(this, ch);

  addUserSymbol = (member: any) => addUserSymbolThread(this, member);
}
