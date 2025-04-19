import {
  Component,
  Output,
  EventEmitter,
  HostListener,
  ViewChild,
  ElementRef,
  Input,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { OverlayModule } from '@angular/cdk/overlay';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { UserService } from '../user.service';
import { ChannelService } from '../channel.service';
import { MessageService } from '../message.service';
import * as SearchHelpers from './search-helpers';
import { SearchFieldBase } from './search-field-base';
import {
  getFormattedDate as getFormattedDateHelper,
  getYesterdayDate as getYesterdayDateHelper,
  isSameDay as isSameDayHelper,
  addEmojiToMessage,
  closeEmojiPicker,
  EmojiContext,
  onImageSelected,
  resetTextareaHeight,
  scrollToBottom,
  adjustTextareaHeight,
  closeProfileCard,
  selectMemberWrapper,
  addRecipientWrapper,
  removeRecipientWrapper,
  addSystemMessageWrapper,
  loadAllUsersWrapper,
  addAtSymbolForWrapper,
  loadPrivateMessagesHelper,
  initializeConversationHelper,
  loadLastUsedEmojisForConversationHelper,
  loadPrivateMessagesForConversationHelper,
  saveMessageHelper,
  generateConversationId,
  loadCurrentUserHelper,
  loadRecipientDataHelper,
  loadAllChannelsWrapper,
  toggleAtDropdownWrapper,
} from './search-field.imports';
import {
  toggleEditOptionsComp,
  startEditingComp,
  toggleEditMessageComp,
  cancelEditingComp,
} from './edit-message.helpers';

import { initializeDirectConversationComp } from './search-field.methods';
import {
  onResizeComp,
  checkDesktopWidthComp,
  updatePlaceholderTextComp,
} from './search-field.methods';
import { onSelfClickWrapper, onDocumentClickWrapper } from './dropdown.helpers';
import {
  toggleEmojiPickerComp,
  addEmojiComp,
  openImageModalComp,
  closeImageModalComp,
} from './ui.helpers';
import { showTooltipComp, hideTooltipComp } from './tooltip.helpers';
import { onInitComp } from './lifecycle.helpers';
import {
  handleKeyDownComp,
  addAtSymbolAndOpenDialogComp,
  toggleEmojiPickerForMessageComp,
  sendMessageToAllComp,
} from './broadcast.helpers';

@Component({
  selector: 'app-search-field',
  standalone: true,
  imports: [CommonModule, FormsModule, PickerModule, OverlayModule],
  templateUrl: './search-field.component.html',
  styleUrls: ['./search-field.component.scss'],
})
export class SearchFieldComponent extends SearchFieldBase {
  @Output() close = new EventEmitter<void>();
  @Output() memberSelected = new EventEmitter<any>();
  @ViewChild('messageList') messageList!: ElementRef;
  @Input() recipientName = '';
  @Input() recipientId = '';
  @Input() showSearchField = false;

  constructor(
    private route: ActivatedRoute,
    public userService: UserService,
    private channelService: ChannelService,
    private dialog: MatDialog,
    public messageService: MessageService,
    private router: Router
  ) {
    super();
  }

  async ngOnInit(): Promise<void> {
    await onInitComp(this);
  }

  public generateConversationId(userId1: string, userId2: string): string {
    return generateConversationId(userId1, userId2);
  }

  onSelfClick = (event: MouseEvent) => onSelfClickWrapper(event);



  @HostListener('document:click')
  public onDocumentClick(): void {
    onDocumentClickWrapper(
      this.dropdownState,
      (val) => (this.dropdownState = val)
    );

    if (this.isEmojiPickerVisible) {
      this.isEmojiPickerVisible = false;
    }
  }

  public getEmojiContext(): EmojiContext {
    return {
      currentUser: this.currentUser,
      lastUsedEmojisSent: this.lastUsedEmojisSent,
      lastUsedEmojisReceived: this.lastUsedEmojisReceived,
    };
  }

  private handleAddEmoji(event: any, msg: any): void {
    addEmojiToMessage(this.getEmojiContext(), event, msg);
  }

  public onAddEmoji(event: any, msg: any): void {
    this.handleAddEmoji(event, msg);
  }

  public async onCloseEmojiPicker(msg: any): Promise<void> {
    await closeEmojiPicker(msg, (id, data) =>
      this.messageService.updateMessage(id, data)
    );
  }

  addEmojiToMessage = (e: any, m: any) => this.handleAddEmoji(e, m);

  getFormattedDate = (dateString: string) => getFormattedDateHelper(dateString);

  override getYesterdayDate(): Date {
    return getYesterdayDateHelper();
  }

  isSameDay = (d1: Date, d2: Date) => isSameDayHelper(d1, d2);

  async loadCurrentUser(): Promise<void> {
    await loadCurrentUserHelper(
      this.userService,
      (user) => (this.currentUser = user)
    );
  }

  loadRecipientData(): void {
    loadRecipientDataHelper(
      this.recipientId,
      this.userService,
      (status) => (this.recipientStatus = status),
      (avatarUrl) => (this.recipientAvatarUrl = avatarUrl)
    );
  }

  initializeDirectConversation = () => initializeDirectConversationComp(this);

  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    onResizeComp(this, event);
  }
  updatePlaceholderText = (width: number) =>
    updatePlaceholderTextComp(this, width);

  public onImageSelected(event: Event, textArea?: HTMLTextAreaElement): void {
    onImageSelected(
      event,
      textArea,
      (result) => (this.imageUrl = result),
      adjustTextareaHeight,
      (value) => (this.isTextareaExpanded = value)
    );
  }

  public closeProfileCard(textArea: HTMLTextAreaElement): void {
    closeProfileCard(
      (result) => (this.imageUrl = result),
      textArea,
      (ta) => adjustTextareaHeight(ta, this.imageUrl)
    );
  }

  public showTooltip(
    event: MouseEvent,
    emoji: string,
    senderName: string
  ): void {
    showTooltipComp(this, event, emoji, senderName);
  }

  checkDesktopWidth = () => {
    checkDesktopWidthComp(this);
  };

  hideTooltip = () => {
    hideTooltipComp(this);
  };
  removeRecipient = (member: any) => {
    removeRecipientWrapper(member, this.selectedRecipients);
  };
  addSystemMessage = (text: string) => {
    addSystemMessageWrapper(text, this.privateMessages);
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['recipientId'] && !changes['recipientId'].isFirstChange()) {
      this.loadRecipientData();
      this.loadPrivateMessages();
    }
  }

  loadPrivateMessages(): void {
    const senderId = this.userService.getCurrentUserId();
    if (!senderId || !this.recipientId) return;
    loadPrivateMessagesHelper(
      senderId,
      this.recipientId,
      this.messageService,
      (msgs) => (this.privateMessages = msgs),
      () => this.scrollToBottom()
    );
  }

  async initializeConversation(): Promise<void> {
    await initializeConversationHelper(
      this.currentUser,
      this.recipientId,
      this.messageService,
      (convId) =>
        loadLastUsedEmojisForConversationHelper(
          convId,
          this.messageService,
          () => this.getEmojiContext(),
          (ctx, messages) => {},
          (ctx) => {},
          () => {}
        ),
      (convId) => this.loadPrivateMessagesForConversation(convId)
    );
  }

  private loadPrivateMessagesForConversation(conversationId: string): void {
    loadPrivateMessagesForConversationHelper(
      conversationId,
      this.messageService,
      (msgs) => (this.privateMessages = msgs),
      () => this.scrollToBottom(),
      () => {}
    );
  }

  async saveMessage(msg: any): Promise<void> {
    await saveMessageHelper(
      msg,
      this.messageService,
      (updater) => (this.privateMessages = updater(this.privateMessages))
    );
  }

  closeSearch = () => {
    this.close.emit();
  };
  scrollToBottomWrapper = () => {
    scrollToBottom(this.messageList);
  };
  toggleEmojiPicker = (event: MouseEvent) => {
    toggleEmojiPickerComp(this, event );
  };
  addEmoji = (event: any) => {
    addEmojiComp(this, event);
  };
  openImageModal = () => {
    openImageModalComp(this);
  };
  closeImageModal = () => {
    closeImageModalComp(this);
  };

  toggleEditOptions = (msgId: string) => {
    toggleEditOptionsComp(this, msgId);
  };
  startEditing = (msg: any) => {
    startEditingComp(this, msg);
  };
  toggleEditMessage = (msg: any) => {
    toggleEditMessageComp(this, msg);
  };
  cancelEditing = (msg: any) => {
    cancelEditingComp(this, msg);
  };

  onSelectResult(item: any): void {
    if (item.type === 'user' || item.type === 'channel')
      this.addRecipient(item);
    this.clearSearchData();
  }

  private clearSearchData(): void {
    this.searchQuery = '';
    this.filteredResults = [];
    this.noResultsFound = false;
  }

  selectMember(member: any): void {
    selectMemberWrapper(
      member,
      (m) => this.memberSelected.emit(m),
      () => this.closeSearch()
    );
  }

  addRecipient(member: any): void {
    addRecipientWrapper(
      member,
      this.selectedRecipients,
      (q) => (this.searchQuery = q),
      (members) => (this.filteredMembers = members)
    );
  }

  addAtSymbolFor(member: any): void {
    addAtSymbolForWrapper(
      member,
      this.messageToAll,
      (msg) => (this.messageToAll = msg),
      (value) => (this.showAtDropdown = value)
    );
  }

  loadAllUsers = () =>
    loadAllUsersWrapper(
      this.userService,
      (members) => (this.allUsers = members)
    );

  loadAllChannels = () =>
    loadAllChannelsWrapper(
      this.channelService,
      (ch) => (this.allChannels = ch)
    );

 


  public toggleAtDropdown(): void {
    toggleAtDropdownWrapper(
      this.dropdownState,
      (newState) => {
        this.dropdownState = newState;
        if (newState !== 'hidden') {
          this.isEmojiPickerVisible = false;
        }
      },
      () => this.loadAllUsers(),
      () => this.loadAllChannels()
    );
  }
  



  handleKeyDown(event: KeyboardEvent, textArea: HTMLTextAreaElement): void {
    handleKeyDownComp(this, event, textArea);
  }

  addAtSymbolAndOpenDialog = () => {
    addAtSymbolAndOpenDialogComp(this);
  };

  toggleEmojiPickerForMessage = (msg: any) => {
    toggleEmojiPickerForMessageComp(this, msg);
  };

  scrollToBottom = () => {
    scrollToBottom(this.messageList);
  };

  public async sendMessageToAll(textArea: HTMLTextAreaElement): Promise<void> {
    await sendMessageToAllComp(this, textArea);
  }

  public resetTextareaHeight(textArea: HTMLTextAreaElement): void {
    resetTextareaHeight(textArea);
  }

  onSearchInput = () =>
    SearchHelpers.executeSearchInput(
      this.searchQuery,
      this.filteredResults,
      this.noResultsFound,
      this.userService,
      this.currentUser,
      this.channelService
    );
}
