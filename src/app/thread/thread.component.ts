import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  SimpleChanges,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { OverlayModule } from '@angular/cdk/overlay';
import { ChangeDetectorRef } from '@angular/core';
import { MessageService } from '../message.service';
import { UserService } from '../user.service';
import { Message } from '../message.models';
import { ChannelService } from '../channel.service';
import {
  sendThreadMessageComp,
  loadThreadMessagesLiveComp,
  initializeThreadComp,
  listenForThreadEmojiUpdatesComp,
  highlightThreadMessageComp,
  addEmojiToMessageComp,
  removeEmojiFromMessageComp,
  updateLastUsedEmojisComp,
  openLargeImageComp,
  closeLargeImageComp,
  toggleEmojiPickerComp,
  openImageModalComp,
  closeImageModalComp,
  toggleDropdownComp,
  resetDropdownComp,
  onTextareaInputComp,
  addUserSymbolComp,
  selectChannelComp,
  toggleEditOptionsComp,
  startEditingComp,
  cancelEditingComp,
  scrollToBottomComp,
  showTooltipComp,
  hideTooltipComp,
  safeConvertTimestampComp,
  getYesterdayDateComp,
  isSameDayComp,
  getFormattedDateComp,
  formatParentTimestampComp,
  onInitThreadComp,
  onChangesThreadComp,
  checkDesktopWidthComp,
  onDestroyThreadComp,
  openThreadEventComp,
  listenForReplyCountUpdatesComp,
  setupThreadLiveUpdatesComp,
  subscribeReplyCountsComp,
  loadAllUsersComp,
  fetchRecipientNameComp,
  onImageSelectedComp,
  adjustTextareaHeightComp,
  resetTextareaHeightComp,
  closeProfileCardComp,
  setupParentMsgFromOriginalComp,
  handleKeyDownComp,
} from './thread-export.utility';

import { ThreadMessagesBase } from './thread-messages-base';

@Component({
  selector: 'app-thread',
  standalone: true,
  imports: [CommonModule, FormsModule, PickerModule, OverlayModule],
  templateUrl: './thread.component.html',
  styleUrls: ['./thread.component.scss'],
})
export class ThreadComponent extends ThreadMessagesBase implements OnInit {
  @Input() recipientName: string = '';
  @Output() closeThread = new EventEmitter<void>();
  @ViewChild('messageList') messageList!: ElementRef;
  @Output() openThread = new EventEmitter<any>();
  @Input() parentMessage: Message | null = null;
  @ViewChild('textArea', { static: false })
  textAreaRef!: ElementRef<HTMLTextAreaElement>;

  constructor(
    public messageService: MessageService,
    public userService: UserService,
    private cdr: ChangeDetectorRef,
    public channelService: ChannelService
  ) {
    super();
  }

  async ngOnInit(): Promise<void> {
    await onInitThreadComp(this);
  }

  ngOnChanges(changes: SimpleChanges): void {
    onChangesThreadComp(this, changes);
  }

  public isCurrentUserValid(): boolean {
    if (!this.currentUser?.uid) {
      this.closeThread.emit();
      return false;
    }
    return true;
  }

  public async loadInitialThreadData(
    threadId: string
  ): Promise<[Message[], string[], string[]]> {
    return await Promise.all([
      this.messageService.getMessagesOnce('thread', threadId),
      this.messageService.getLastUsedThreadEmojis(threadId, 'sent'),
      this.messageService.getLastUsedThreadEmojis(threadId, 'received'),
    ]);
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

  async getCurrentUserData(): Promise<any> {
    return await this.userService.getCurrentUserData();
  }

  private async loadLastUsedEmojisLiveInternal(
    threadId: string
  ): Promise<void> {
    this.messageService.listenForEmojiUpdates(
      threadId,
      (sentEmojis, receivedEmojis) => {
        this.lastUsedEmojisSent = sentEmojis;
        this.lastUsedEmojisReceived = receivedEmojis;
      }
    );
  }

  public async loadLastUsedEmojisLive(threadId: string): Promise<void> {
    await this.loadLastUsedEmojisLiveInternal(threadId);
  }

  async saveMessage(msg: any): Promise<void> {
    if (!this.parentMessage?.id || !msg.id) {
      return;
    }
    try {
      await this.messageService.updateMessage(msg.id, {
        content: {
          text: msg.content.text,
          ...(msg.content.image && { image: msg.content.image }),
          ...(msg.content.emojis && { emojis: msg.content.emojis }),
        },
        edited: true,
      });
      msg.isEditing = false;
    } catch (error) {}
  }

  public async loadOriginalPrivateMessage(threadId: string): Promise<void> {
    try {
      const originalMessage = await this.messageService.getMessage(
        'private',
        threadId
      );
      if (originalMessage) {
        this.setupParentMessageFromOriginal(originalMessage);
      } else {
      }
    } catch (error) {}
  }

  public async loadLastUsedThreadEmojis(): Promise<void> {
    if (!this.parentMessage?.id) {
      return;
    }
    try {
      const [lastSent, lastReceived] = await Promise.all([
        this.messageService.getLastUsedThreadEmojis(
          this.parentMessage.id,
          'sent'
        ),
        this.messageService.getLastUsedThreadEmojis(
          this.parentMessage.id,
          'received'
        ),
      ]);
      this.lastUsedEmojisSent = lastSent || [];
      this.lastUsedEmojisReceived = lastReceived || [];
      this.listenForThreadEmojiUpdates();
    } catch (error) {}
  }

  addEmoji(event: any): void {
    if (event?.emoji?.native) {
      this.privateMessage += event.emoji.native;
    }
  }

  onEmojiPickerClick(e: MouseEvent): void {
    e.stopPropagation();
  }

  toggleEmojiPickerForMessage(msg: any): void {
    const isCurrentlyVisible = msg.isEmojiPickerVisible;
    this.threadMessages.forEach((m) => (m.isEmojiPickerVisible = false));
    msg.isEmojiPickerVisible = !isCurrentlyVisible;
  }

  get filteredChannels(): any[] {
    if (!this.currentUser?.uid || !this.allChannels) {
      return [];
    }

    return this.allChannels.filter((ch) =>
      ch.members?.some((m: any) => m.uid === this.currentUser.uid)
    );
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

  async sendThreadMessage(
    msgContent: string | null,
    imgUrl: string | null,
    textArea: HTMLTextAreaElement
  ) {
    await sendThreadMessageComp(this, msgContent, imgUrl, textArea);
  }

  public updateLastUsedEmojis(
    emojiArray: string[],
    newEmoji: string
  ): string[] {
    return updateLastUsedEmojisComp(emojiArray, newEmoji);
  }

  public async addEmojiToMessage(event: any, msg: any): Promise<void> {
    await addEmojiToMessageComp(this, event, msg);
  }

  removeEmojiFromMessage(message: any, emojiToRemove: string): void {
    removeEmojiFromMessageComp(this, message, emojiToRemove);
  }

  highlightThreadMessage(msgId: string, retries = 5): void {
    highlightThreadMessageComp(this, msgId, retries);
  }

  showTooltip(event: MouseEvent, emoji: string, senderName: string): void {
    showTooltipComp(this, event, emoji, senderName);
  }

  isSameDay(t1: Date | string, t2: Date | string): boolean {
    return isSameDayComp(t1, t2);
  }

  getFormattedDate(dateVal: string | Date | undefined): string {
    return getFormattedDateComp(this, dateVal);
  }

  openLargeImage(imageData: string | ArrayBuffer) {
    openLargeImageComp(this, imageData);
  }

  onEmojiPlusInPopup(msg: any) {
    console.log('Clicked plus in popup, message=', msg);
  }

  listenForThreadEmojiUpdates = () => listenForThreadEmojiUpdatesComp(this);

  closeLargeImage = () => closeLargeImageComp(this);

  toggleEmojiPicker = (event: MouseEvent) => toggleEmojiPickerComp(this, event);

  openImageModal = () => openImageModalComp(this);

  closeImageModal = () => closeImageModalComp(this);

  toggleDropdown = (event: MouseEvent) => toggleDropdownComp(this, event);

  resetDropdown = () => resetDropdownComp(this);

  onTextareaInput = (event: Event) => onTextareaInputComp(this, event);

  addUserSymbol = (member: any) => addUserSymbolComp(this, member);

  selectChannel = (channel: any) => selectChannelComp(this, channel);

  toggleEditOptions = (msgId: string) => toggleEditOptionsComp(this, msgId);

  startEditing = (msg: any) => startEditingComp(this, msg);

  cancelEditing = (msg: any) => cancelEditingComp(this, msg);

  scrollToBottom = () => scrollToBottomComp(this);

  hideTooltip = () => hideTooltipComp(this);

  safeConvertTimestamp = (ts: any) => safeConvertTimestampComp(ts);

  formatParentTimestamp = (pm: Message) => formatParentTimestampComp(this, pm);

  getYesterdayDate = () => getYesterdayDateComp();

  fetchRecipientName = async (recipientId: string) =>
    await fetchRecipientNameComp(this, recipientId);

  loadAllUsers = () => loadAllUsersComp(this);

  openThreadEvent = (msg: Message) => openThreadEventComp(this, msg);

  listenForReplyCountUpdates = () => listenForReplyCountUpdatesComp(this);

  setupThreadLiveUpdates = async (threadId: string) =>
    await setupThreadLiveUpdatesComp(this, threadId);

  subscribeReplyCounts = (pm: Message) => subscribeReplyCountsComp(this, pm);

  onImageSelected = (event: Event, textArea?: HTMLTextAreaElement) =>
    onImageSelectedComp(this, event, textArea);

  adjustTextareaHeight = (textArea: HTMLTextAreaElement) =>
    adjustTextareaHeightComp(this, textArea);

  resetTextareaHeight = (textArea: HTMLTextAreaElement) =>
    resetTextareaHeightComp(textArea);

  closeProfileCard = (textArea: HTMLTextAreaElement) =>
    closeProfileCardComp(this, textArea);

  ngOnDestroy = () => onDestroyThreadComp(this);

  setupParentMessageFromOriginal = (originalMessage: any) =>
    setupParentMsgFromOriginalComp(this, originalMessage);

  handleKeyDown = (e: KeyboardEvent, ta: HTMLTextAreaElement) =>
    handleKeyDownComp(this, e, ta);

  onClose = () => this.closeThread.emit();

  onSelfClick = (event: MouseEvent) => event.stopPropagation();

  checkDesktopWidth = () => checkDesktopWidthComp(this);

  loadThreadMessagesLive = () => loadThreadMessagesLiveComp(this);

  initializeThread = async () => await initializeThreadComp(this);
}
