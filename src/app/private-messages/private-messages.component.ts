import {
  Component,
  OnInit,
  CUSTOM_ELEMENTS_SCHEMA,
  ViewChild,
  ElementRef,
  Input,
  EventEmitter,
  Output,
  OnChanges,
  SimpleChanges,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { ChannelService } from '../channel.service';
import { UserService } from '../user.service';
import { MatDialog } from '@angular/material/dialog';
import { MessageService } from '../message.service';
import { ActivatedRoute } from '@angular/router';
import 'firebase/compat/firestore';
import { OverlayModule } from '@angular/cdk/overlay';
import { Message } from '../message.models';
import { PrivateMessagesBase } from './private-messages-base';
import {
  addEmojiToMessageUtil,
  listenForEmojiUpdatesUtil,
  loadLastUsedEmojisUtil,
  toggleDropdownUtil,
  closeDropdownUtil,
  resetDropdownUtil,
  onTextareaInputUtil,
  selectChannelUtil,
  addUserSymbolUtil,
  focusTextArea,
  closeProfileCard,
  adjustTextareaHeight,
  resetTextareaHeight,
  handleKeyDown,
  onImageSelected,
  toggleEmojiPicker,
  addEmoji,
  onEmojiPickerClick,
  openLargeImage,
  closeLargeImage,
  highlightMessage,
  loadThreadEvent,
  processIncomingMessagesUtil,
  updateLiveReplyCountsUtil,
  startLiveReplyCountUpdatesUtil,
  loadRecipientDataUtil,
  loadAllUsersUtil,
  loadPrivateMessagesUtil,
  isNearBottomUtil,
  scrollToBottomUtil,
  getFormattedDateUtil,
  safeConvertTimestampUtil,
  isSameDayUtil,
  handleRecipientChangesUtil,
  saveMessageUtil,
  handleThreadDataChangesUtil,
  handlePrivateMessagesLiveUtil,
  cleanupListenersUtil,
  toggleEmojiPickerForMessageUtil,
  toggleEditOptionsUtil,
  startEditingUtil,
  toggleEditMessageUtil,
  cancelEditingUtil,
  showTooltipUtil,
  hideTooltipUtil,
  closePopupUtil,
  toggleEmojiPopupUtil,
  onEmojiPlusInPopupUtil,
  ngOnInitUtil,
  initPrivateConversationUtil,
  initChannelAndUserSubscriptionsUtil,
  onResizeUtil,
  onDocumentClickUtil,
  onSelfClickUtil,
  checkDesktopWidthUtil,
  setUsersUnsubscribeUtil,
  clearUsersUnsubscribeUtil,
  setChannelsUnsubscribeUtil,
  clearChannelsUnsubscribeUtil,
  setPrivateMessagesUnsubscribeUtil,
  getPrivateMessagesUnsubscribeUtil,
  clearPrivateMessagesUnsubscribeUtil,
  setLiveReplyCountsUnsubscribeUtil,
  hasLiveReplyCountsUnsubscribeUtil,
  clearLiveReplyCountsUnsubscribeUtil,
  updateMessageDatesUtil,
  setupRecipientListenerUtil,
  setupMessageListenerUtil,
  ngOnDestroyUtil,
  ngOnHelpDestroyUtil,
  openImageModalUtil,
  closeImageModalUtil,
  sendPrivateMessageWrapper,
  getYesterdayDateUtil,
  loadCurrentUserUtil,
  filteredChannelsUtil,
  generateConversationIdUtil,
  findEmojiIndexUtil,
  removeEmojiAtIndexUtil,
  updateMessageInFirestoreUtil,
} from './private-messages-utilities';

@Component({
  selector: 'app-private-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, PickerModule, OverlayModule],
  templateUrl: './private-messages.component.html',
  styleUrls: ['./private-messages.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class PrivateMessagesComponent
  extends PrivateMessagesBase
  implements OnInit, OnChanges
{
  @ViewChild('messageList') messageList!: ElementRef;
  @Input() recipientName: string = '';
  @Input() recipientId: string = '';
  @Output() memberSelected = new EventEmitter<any>();
  @Input() showSearchField: boolean = false;
  @Output() openThread = new EventEmitter<any>();
  @Input() threadData: any = null;
  @ViewChild('textArea') textAreaRef!: ElementRef<HTMLTextAreaElement>;

  constructor(
    private route: ActivatedRoute,
    public userService: UserService,
    public channelService: ChannelService,
    private dialog: MatDialog,
    public messageService: MessageService
  ) {
    super();
  }

  async ngOnInit(): Promise<void> {
    this.yesterdayDate = this.getYesterdayDate();
    return ngOnInitUtil(this);
  }

  @HostListener('window:resize')
  onResize() {
    onResizeUtil(this);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    onDocumentClickUtil(this, e);
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.handleRecipientChanges(changes);
    this.handleThreadDataChanges(changes);
  }

  async loadPrivateMessages() {
    await loadPrivateMessagesUtil(this);
  }

  async sendPrivateMessage(textArea: HTMLTextAreaElement): Promise<void> {
    return sendPrivateMessageWrapper(this, textArea);
  }

  public saveMessage = async (msg: any): Promise<void> =>
    saveMessageUtil(this, msg);

  public isChatChangingWrapper = (): boolean => this.isChatChanging;

  public isNearBottom = (threshold = 100): boolean =>
    isNearBottomUtil(this, threshold);

  public getFormattedDate = (inputDate: Date | string | null): string =>
    getFormattedDateUtil(inputDate);

  public safeConvertTimestamp = (timestamp: unknown): Date =>
    safeConvertTimestampUtil(timestamp);

  public isSameDay = (d1: Date | null, d2: Date | null): boolean =>
    isSameDayUtil(d1, d2);

  private getYesterdayDate(): Date {
    return getYesterdayDateUtil();
  }

  async loadCurrentUser(): Promise<void> {
    return loadCurrentUserUtil(this);
  }

  get filteredChannels(): any[] {
    return filteredChannelsUtil(this);
  }

  generateConversationId(userId1: string, userId2: string): string {
    return generateConversationIdUtil(userId1, userId2);
  }

  onSelfClick = (e: MouseEvent) => onSelfClickUtil(e);

  openImageModal = () => openImageModalUtil(this);

  closeImageModal = () => closeImageModalUtil(this);

  checkDesktopWidth = () => checkDesktopWidthUtil(this);

  private initPrivateConversation = () => initPrivateConversationUtil(this);

  private initChannelAndUserSubscriptions = () =>
    initChannelAndUserSubscriptionsUtil(this);

  private findEmojiIndex(message: any, emojiToRemove: string): number {
    return findEmojiIndexUtil(this, message, emojiToRemove);
  }

  private removeEmojiAtIndex(message: any, index: number): void {
    removeEmojiAtIndexUtil(this, message, index);
  }

  private updateMessageInFirestore(message: any): void {
    updateMessageInFirestoreUtil(this, message);
  }

  toggleEmojiPicker = (event: MouseEvent) => toggleEmojiPicker(this, event);

  addEmoji = (event: any) => addEmoji(this, event);

  onEmojiPickerClick = (e: MouseEvent) => onEmojiPickerClick(e);

  highlightMessage = (messageId: string) => highlightMessage(this, messageId);

  public getChannelService = () => this.channelService;

  public getUserService = () => this.userService;

  public callUpdateMessageInFirestore(message: any): void {
    this.updateMessageInFirestore(message);
  }

  public removeEmojiFromMessage(message: any, emojiToRemove: string): void {
    const index = this.findEmojiIndex(message, emojiToRemove);
    if (index === -1) return;
    this.removeEmojiAtIndex(message, index);
    this.updateMessageInFirestore(message);
  }

  processIncomingMessages = (rawMessages: Message[]) =>
    processIncomingMessagesUtil(this, rawMessages);

  public convertTimestampWrapper(timestamp: unknown): Date {
    return this.safeConvertTimestamp(timestamp);
  }

  toggleEmojiPickerForMessage = (msg: any) =>
    toggleEmojiPickerForMessageUtil(this, msg);

  toggleEditOptions = (msgId: string) => toggleEditOptionsUtil(this, msgId);

  startEditing = (msg: any) => startEditingUtil(this, msg);

  toggleEditMessage = (msg: any) => toggleEditMessageUtil(this, msg);

  toggleEmojiPopup = (msg: any) => toggleEmojiPopupUtil(this, msg);

  onEmojiPlusInPopup = (msg: any) => onEmojiPlusInPopupUtil(this, msg);

  private handleRecipientChanges = (ch: SimpleChanges) =>
    handleRecipientChangesUtil(this, ch);

  public handleMessagesLiveWrapper = (msgs: any[]) =>
    this.handlePrivateMessagesLive(msgs);

  private handleThreadDataChanges = (ch: SimpleChanges) =>
    handleThreadDataChangesUtil(this, ch);

  private handlePrivateMessagesLive = (messages: any[]) =>
    handlePrivateMessagesLiveUtil(this, messages);

  updateLiveReplyCounts = (messages: Message[]) =>
    updateLiveReplyCountsUtil(this, messages);

  cancelEditing = (msg: any) => cancelEditingUtil(this, msg);

  showTooltip(event: MouseEvent, emoji: string, senderName: string): void {
    showTooltipUtil(this, event, emoji, senderName);
  }

  clearLiveReplyCountsUnsubscribe = () =>
    clearLiveReplyCountsUnsubscribeUtil(this);
  loadThread = (msg: any) => loadThreadEvent(this, msg);

  private updateMessageDates = () => updateMessageDatesUtil(this);

  private setupRecipientListener = () => setupRecipientListenerUtil(this);

  private setupMessageListener = () => setupMessageListenerUtil(this);

  ngOnDestroy = () => ngOnDestroyUtil(this);

  ngOnHelpDestroy = () => ngOnHelpDestroyUtil(this);

  loadRecipientData = () => loadRecipientDataUtil(this);

  loadAllUsers = () => loadAllUsersUtil(this);

  scrollToBottom = () => scrollToBottomUtil(this);

  startLiveReplyCountUpdates = () => startLiveReplyCountUpdatesUtil(this);

  callCleanupListeners = () => cleanupListenersUtil(this);

  hideTooltip = () => hideTooltipUtil(this);

  closePopup = (msg: any) => closePopupUtil(this, msg);

  scrollToBottomWrapper = () => this.scrollToBottom();

  isSameDayWrapper = (d1: Date | null, d2: Date | null) =>
    this.isSameDay(d1, d2);

  closeLargeImage = () => closeLargeImage(this);

  private focusTextArea = () => focusTextArea(this);

  clearChannelsUnsubscribe = () => clearChannelsUnsubscribeUtil(this);

  clearUsersUnsubscribe = () => clearUsersUnsubscribeUtil(this);

  clearPrivateMessagesUnsubscribe = () =>
    clearPrivateMessagesUnsubscribeUtil(this);

  callUpdateMessageDates = () => this.updateMessageDates();

  addEmojiToMessage = async (event: any, msg: any) =>
    addEmojiToMessageUtil(this, event, msg);

  listenForEmojiUpdatesUtilWrapper = () => listenForEmojiUpdatesUtil(this);

  loadLastUsedEmojisWrapper = async () => loadLastUsedEmojisUtil(this);

  isNearBottomWrapper = () => this.isNearBottom();

  getHasScrolledOnChange = () => this.hasScrolledOnChange;

  toggleDropdown = (event: MouseEvent) => toggleDropdownUtil(this, event);

  closeDropdown = () => closeDropdownUtil(this);

  resetDropdownWrapper = () => resetDropdownUtil(this);

  onTextareaInput = (event: Event) => onTextareaInputUtil(this, event);

  selectChannel = (channel: any) => selectChannelUtil(this, channel);

  addUserSymbol = (member: any) => addUserSymbolUtil(this, member);

  closeProfileCard = (t: HTMLTextAreaElement) => closeProfileCard(this, t);

  adjustTextareaHeight = (t: HTMLTextAreaElement) =>
    adjustTextareaHeight(this, t);

  resetTextareaHeight = (t: HTMLTextAreaElement) =>
    resetTextareaHeight(this, t);

  handleKeyDown = (e: KeyboardEvent, t: HTMLTextAreaElement) =>
    handleKeyDown(this, e, t);

  onImageSelected = (e: Event, t?: HTMLTextAreaElement) =>
    onImageSelected(this, e, t);

  openLargeImage = (imgData: string | ArrayBuffer) =>
    openLargeImage(this, imgData);

  public setUsersUnsubscribe = (fn: (() => void) | null) =>
    setUsersUnsubscribeUtil(this, fn);

  public setChannelsUnsubscribe = (fn: (() => void) | null) =>
    setChannelsUnsubscribeUtil(this, fn);

  public setPrivateMessagesUnsubscribe = (fn: (() => void) | null) =>
    setPrivateMessagesUnsubscribeUtil(this, fn);

  public getPrivateMessagesUnsubscribe = (): (() => void) | null =>
    getPrivateMessagesUnsubscribeUtil(this);

  public setLiveReplyCountsUnsubscribe = (fn: (() => void) | null) =>
    setLiveReplyCountsUnsubscribeUtil(this, fn);

  public hasLiveReplyCountsUnsubscribe = (): boolean =>
    hasLiveReplyCountsUnsubscribeUtil(this);

  public setUnsubscribeEmojiListener = (fn: () => void) => {
    this.unsubscribeEmojiListener = fn;
  };

  public getUnsubscribeEmojiListener = (): (() => void) | undefined =>
    this.unsubscribeEmojiListener;
}
