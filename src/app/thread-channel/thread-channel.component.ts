/**
 * The ThreadChannelComponent manages a thread of messages belonging to a parent message in a channel.
 * Users can reply with text or images, view real-time updates to messages and the reply count,
 * edit messages, and add emojis. It also includes an inline mention feature and the ability
 * to display attached images in larger size modals. No logic or styling has been changed –
 * only these English JSDoc comments have been added.
 */

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

/**
 * Manages a thread channel within a specific parent message and channel ID.
 */
@Component({
  selector: 'app-thread-channel',
  standalone: true,
  imports: [CommonModule, FormsModule, PickerModule, OverlayModule],
  templateUrl: './thread-channel.component.html',
  styleUrls: ['./thread-channel.component.scss'],
})
export class ThreadChannelComponent implements OnInit, OnChanges, OnDestroy {
  /**
   * The parent message used to identify the thread.
   */
  @Input() parentMessage: Message | null = null;

  /**
   * The recipient's name for display (optional).
   */
  @Input() recipientName: string = '';

  /**
   * Emits an event to close the thread view.
   */
  @Output() closeThread = new EventEmitter<void>();

  /**
   * Emits an event when a thread is opened from within this thread (rare usage).
   */
  @Output() openThread = new EventEmitter<any>();

  /**
   * A reference to the DOM element for the message list, used for scrolling.
   */
  @ViewChild('messageList') messageList!: ElementRef;

  /**
   * The channel's display name, if needed for references.
   */
  @Input() channelName: string = '';

  /**
   * The ID of the channel this thread is associated with.
   */
  @Input() channelId!: string;

  /**
   * A flag indicating whether the textarea for message input has been expanded.
   */
  isTextareaExpanded: boolean = false;

  /**
   * Optionally stores details about the current channel (id, name, members).
   */
  selectedChannel: {
    id: string;
    name: string;
    members: any[];
    description?: string;
    createdBy?: string;
  } | null = null;

  /**
   * The text typed by the user when composing a reply in this thread channel.
   */
  channelMessage: string = '';

  /**
   * The current user object, containing user data loaded from Firestore/Auth.
   */
  currentUser: any;

  /**
   * Holds a base64 or data URL image selected by the user for attaching to a new message.
   */
  imageUrl: string | null = null;

  /**
   * Indicates if the global emoji picker is open for new message composition.
   */
  isEmojiPickerVisible: boolean = false;

  /**
   * Indicates if an image modal is open to display a larger preview.
   */
  isImageModalOpen: boolean = false;

  /**
   * Whether an emoji hover tooltip is visible.
   */
  tooltipVisible: boolean = false;

  /**
   * The (x, y) position for the emoji hover tooltip.
   */
  tooltipPosition = { x: 0, y: 0 };

  /**
   * Stores the hovered emoji's actual character for display in the tooltip.
   */
  tooltipEmoji: string = '';

  /**
   * Stores the name of the user who sent the hovered emoji, for the tooltip.
   */
  tooltipSenderName: string = '';

  /**
   * Manages the arrays of last-used emojis for "sent" vs. "received" messages.
   */
  lastUsedEmojisSent: string[] = [];
  lastUsedEmojisReceived: string[] = [];

  /**
   * Toggles visibility of the edit options (like edit/delete) for a selected message.
   */
  showEditOptions: boolean = false;

  /**
   * The ID of the currently selected message for which edit options are shown.
   */
  currentMessageId: string | null = null;

  /**
   * Backs up the original message before editing, allowing revert on cancel.
   */
  originalMessage: any = null;

  /**
   * The local array for message list. This component manages these messages (the child replies).
   */
  messages: any[] = [];

  /**
   * The local reference for the current date/time, used to compare "today."
   */
  currentDate: Date = new Date();

  /**
   * The local reference for "yesterday's" date, used to label "Gestern."
   */
  yesterdayDate: Date = this.getYesterdayDate();

  /**
   * Possibly stores details about the original parent message for reference if needed.
   */
  originalParentMessage: any = null;

  /**
   * The array of child messages (replies) in this thread.
   */
  threadMessages: Message[] = [];

  /**
   * If an attached image is to be displayed in a larger overlay, track that here.
   */
  showLargeImage = false;

  /**
   * Stores the data URL for the large image display.
   */
  largeImageUrl: string | null = null;

  /**
   * Tracks if the user is on a "desktop" layout (width >= 1278).
   */
  isDesktop = false;

  /**
   * A list of all users, used if mention or user dropdown features are used.
   */
  allUsers: any[] = [];

  /**
   * If a user mention dropdown is open or not.
   */
  allChannels: any[] = [];
  dropdownState: 'hidden' | 'user' | 'channel' = 'hidden';
  private cycleStep = 1;
  lastOpenedChar = '';

  /**
   * Optionally receives an entire selected thread channel object, if needed from external contexts.
   */
  @Input() selectedThreadChannel: any;

  /**
   * A function reference to unsubscribe from real-time message updates.
   */
  private unsubscribeFromThreadMessages?: () => void;

  /**
   * A function reference to unsubscribe from real-time reply count updates.
   */
  private unsubscribeFromReplyCount?: () => void;
  private unsubscribeChannels: (() => void) | null = null;
  private unsubscribeUsers: (() => void) | null = null;

  /**
   * Constructs the component, injecting services and change detector.
   */
  constructor(
    private userService: UserService,
    private channelService: ChannelService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {}

  /**
   * OnInit checks for minimal requirements (channelId, parentMessage), loads the user,
   * initializes the thread, loads reply counts, and starts live subscriptions.
   */
  async ngOnInit(): Promise<void> {
    this.checkDesktopWidth();
    // 1) Check minimal requirements
    if (!this.channelId || !this.parentMessage?.id) {
      return;
    }
    const parentId = this.parentMessage.id;
    // 2) Load user
    await this.loadCurrentUser();
    // 3) Initialize the thread subscription + emojis
    await this.initializeThread(parentId);
    // 4) Load reply counts once
    this.loadReplyCounts();

    // 5) Start live subscription for reply counts
    this.unsubscribeFromReplyCount = this.messageService.loadReplyCountsLive(
      [this.parentMessage.id],
      'thread-channel',
      (replyCounts) => {
        const data = replyCounts[parentId];
        if (!data) return;
        this.parentMessage!.replyCount = data.count;
        this.parentMessage!.lastReplyTime =
          data.lastResponseTime || this.parentMessage!.lastReplyTime;
        this.cdr.detectChanges();
      }
    );
    this.unsubscribeChannels = this.channelService.getAllChannels(
      (channels) => {
        this.allChannels = channels;
      }
    );
    this.unsubscribeUsers = this.userService.getAllUsersLive((users) => {
      this.allUsers = users;
    });
  }

  /**
   * HostListener that updates `isDesktop` if window width >= 1278.
   */
  @HostListener('window:resize')
  onResize() {
    this.checkDesktopWidth();
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
  }

  /**
   * Prevents the dropdown from closing if clicked inside its container.
   * @param {MouseEvent} event - The local container click event.
   */
  onSelfClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  /**
   * Sets isDesktop to true if the window's width is >= 1278, false otherwise.
   */
  checkDesktopWidth() {
    this.isDesktop = window.innerWidth >= 1278;
  }

  /**
   * Loads emojis and sets up a real-time subscription for thread-channel messages.
   *
   * @param {string} threadChannelId - The ID for this thread in Firestore.
   */
  private async initializeThread(threadChannelId: string): Promise<void> {
    try {
      const [emojisSent, emojisReceived] = await Promise.all([
        this.messageService.getLastUsedEmojis(threadChannelId, 'sent'),
        this.messageService.getLastUsedEmojis(threadChannelId, 'received'),
      ]);
      this.lastUsedEmojisSent = emojisSent || [];
      this.lastUsedEmojisReceived = emojisReceived || [];
    } catch (error) {}

    this.setupThreadSubscription(threadChannelId);
  }

  /**
   * Sets up a live subscription for messages in the "thread-channel" for this thread ID,
   * filtering out the parent message if present and storing all child replies in threadMessages.
   */
  private async setupThreadSubscription(threadId: string): Promise<void> {
    // Clean up any old subscription
    if (this.unsubscribeFromThreadMessages) {
      this.unsubscribeFromThreadMessages();
      this.unsubscribeFromThreadMessages = undefined;
    }

    // Listen for new messages in 'thread-channel'
    this.unsubscribeFromThreadMessages = this.messageService.listenForMessages(
      'thread-channel',
      threadId,
      async (messages: any[]) => {
        // Da die Callback-Logik asynchron ist, callen wir eine Hilfsfunktion:
        await this.handleIncomingMessages(messages, threadId);
      }
    );
  }

  /**
   * Handles the incoming messages for a specific thread channel.
   * If the parentMessage is mismatched or missing, tries to reload it.
   * Then populates 'threadMessages' (excluding the parent).
   */
  private async handleIncomingMessages(
    messages: any[],
    threadId: string
  ): Promise<void> {
    if (!messages?.length) {
      this.threadMessages = [];
      return;
    }

    await this.reloadParentIfMismatch(messages, threadId);
    this.setThreadMessagesExcludingParent(messages);

    this.cdr.detectChanges();
    setTimeout(() => this.scrollToBottom(), 300);
  }

  /**
   * If parentMessage is null or a different ID than threadId, tries to find or fetch
   * the parent message from the given messages or Firestore.
   */
  private async reloadParentIfMismatch(
    messages: any[],
    threadId: string
  ): Promise<void> {
    if (!this.parentMessage || this.parentMessage.id !== threadId) {
      const parentInMessages = messages.find((msg) => msg.id === threadId);

      if (parentInMessages) {
        this.parentMessage = this.formatMessage({
          ...parentInMessages,
          content: parentInMessages.content ?? {
            text: '🔍 No text found',
            emojis: [],
          },
        });
      } else {
        // If not in local messages, fetch from Firestore
        const parentDoc = await this.messageService.getMessage(
          'thread-channel',
          threadId
        );
        if (parentDoc) {
          this.parentMessage = this.formatMessage({
            id: threadId,
            text: parentDoc.content?.text ?? '🔍 No text found',
            senderName: parentDoc.senderName || 'Unknown',
            senderAvatar:
              parentDoc.senderAvatar || 'assets/img/default-avatar.png',
            timestamp: parentDoc.timestamp ?? new Date(),
            replyCount: parentDoc.replyCount || 0,
            channelName: parentDoc.channelName || 'Unknown',
            channelId: parentDoc.channelId || null,
          });
        }
        // leerer else-Block wurde entfernt
      }
    }
  }

  /**
   * Filters out the parent message from 'messages' and updates 'threadMessages'
   * with the remaining child messages, each formatted as needed.
   */
  private setThreadMessagesExcludingParent(messages: any[]): void {
    this.threadMessages = messages
      .filter((msg) => msg.id !== this.parentMessage?.id)
      .map((msg) =>
        this.formatMessage({
          ...msg,
          content: msg.content ?? { text: '🔍 No text found', emojis: [] },
        })
      );
  }

  /**
   * Reacts to changes in parentMessage, re-initializes if needed, unsubscribes from old listeners,
   * and listens for replyCount updates.
   */
  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (this.parentMessageChangeDetected(changes)) {
      this.cleanUpOldListeners();
      this.mergeOrPushNewMessage(changes['parentMessage'].currentValue);

      const pMsg = this.parentMessage;
      if (!this.isParentValid(pMsg)) {
        this.cdr.detectChanges();
        return;
      }

      await this.onValidParentChange(pMsg);
      this.cdr.detectChanges();
    }
  }

  /** ---------------  Hilfsfunktionen  --------------- **/

  private parentMessageChangeDetected(changes: SimpleChanges): boolean {
    return !!(
      changes['parentMessage'] && changes['parentMessage'].currentValue
    );
  }

  /** Ends old subscriptions for thread messages and reply counts. */
  private cleanUpOldListeners(): void {
    if (this.unsubscribeFromThreadMessages) {
      this.unsubscribeFromThreadMessages();
      this.unsubscribeFromThreadMessages = undefined;
    }
    if (this.unsubscribeFromReplyCount) {
      this.unsubscribeFromReplyCount();
      this.unsubscribeFromReplyCount = undefined;
    }
  }

  /** Either merges the updated parentMessage or pushes it onto threadMessages. */
  private mergeOrPushNewMessage(newMessage: any): void {
    if (newMessage.id === this.parentMessage?.id) {
      this.parentMessage = { ...this.parentMessage, ...newMessage };
    } else {
      this.threadMessages.push(newMessage);
    }
  }

  /**
   * Type Guard: liefert true, wenn pMsg garantiert vom Typ Message ist;
   * sonst false, wenn pMsg null oder unbrauchbar wäre.
   */
  private isParentValid(pMsg: Message | null): pMsg is Message {
    return !!(pMsg && pMsg.id && this.channelId);
  }

  /** Called when the new parent is valid. Loads user, re-initializes thread, loads reply counts, and sets up replyCount listener. */
  private async onValidParentChange(pMsg: Message): Promise<void> {
    await this.loadCurrentUser();
    if (!pMsg.id) {
      return;
    }
    await this.initializeThread(pMsg.id);
    this.loadReplyCounts();

    this.unsubscribeFromReplyCount = this.messageService.loadReplyCountsLive(
      [pMsg.id],
      'thread-channel',
      (replyCounts) => {
        const data = replyCounts[pMsg.id || ''];
        if (!data) return;
        pMsg.replyCount = data.count;
        pMsg.lastReplyTime = data.lastResponseTime || pMsg.lastReplyTime;
        this.cdr.detectChanges();
      }
    );
  }

  /**
   * OnDestroy unsubscribes from live Firestore listeners if present.
   */
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
  }

  /** Retrieves the reply counts once for the parentMessage ID and updates parentMessage.replyCount. */
  loadReplyCounts(): void {
    const pMsg = this.parentMessage;
    if (!pMsg || !pMsg.id) return;

    this.messageService
      .getReplyCountsForMessages([pMsg.id], 'thread-channel')
      .then((replyCounts) => this.updateReplyCounts(replyCounts, pMsg))
      .catch(() => {});
  }

  private updateReplyCounts(replyCounts: any, pMsg: Message): void {
    const replyCountData = replyCounts[pMsg.id!];
    if (!replyCountData) return;
    pMsg.replyCount = replyCountData.count;
    pMsg.lastReplyTime = replyCountData.lastResponseTime || pMsg.lastReplyTime;
    this.cdr.detectChanges();
  }

  /**
   * Safely formats a message, converting timestamps to Date objects if needed.
   */
  private formatMessage(msg: any): any {
    const formattedMsg = { ...msg };
    if (formattedMsg.timestamp) {
      formattedMsg.timestamp = this.messageService.convertToDate(
        formattedMsg.timestamp
      );
    } else {
      formattedMsg.timestamp = new Date();
    }
    return formattedMsg;
  }

  /**
   * Loads the current user data if not already done, storing it in currentUser.
   */
  private async loadCurrentUser(): Promise<void> {
    try {
      this.currentUser = await this.userService.getCurrentUserData();
      if (!this.currentUser) {
        throw new Error('Could not load user from Firestore.');
      }
    } catch (error) {
      this.currentUser = null;
    }
  }

  /**
   * Sends a new reply message in this thread channel if there's text or an attached image.
   * Resets the input afterward and scrolls the list to bottom.
   */
  async sendThreadMessage(textArea: HTMLTextAreaElement): Promise<void> {
    if (!this.isReadyToSend()) return; // 1
    await this.ensureCurrentUser(); // 2
    if (!this.currentUser || !this.hasValidParent()) return; // 3

    const message = this.buildThreadChannelMessage(); // 4
    try {
      // 5
      await this.messageService.sendMessage(message); // 6
      this.channelMessage = ''; // 7
      this.imageUrl = null; // 8
      if (textArea) this.resetTextareaHeight(textArea); // 9
      this.scrollToBottom(); // 10
    } catch {} // 11
  }

  /** 1) Prüft, ob ein Text oder Bild vorhanden ist */
  private isReadyToSend(): boolean {
    return Boolean(this.channelMessage.trim() || this.imageUrl);
  }

  /** 2) Lädt den Current User, falls nicht geladen */
  private async ensureCurrentUser(): Promise<void> {
    if (!this.currentUser) {
      await this.loadCurrentUser();
    }
  }

  /** 3) Prüft, ob eine gültige parentMessage (mit ID) existiert */
  private hasValidParent(): boolean {
    return Boolean(this.parentMessage?.id);
  }

  /** 4) Erzeugt das 'thread-channel'-Message-Objekt */
  private buildThreadChannelMessage() {
    return {
      type: 'thread-channel' as const,
      content: {
        text: this.channelMessage,
        image: this.imageUrl || null,
        emojis: [],
      },
      senderId: this.currentUser!.id,
      senderName: this.currentUser!.name,
      senderAvatar: this.currentUser!.avatarUrl,
      threadChannelId: this.parentMessage!.id,
      parentId: this.parentMessage!.id,
    };
  }

  /**
   * Helper function to wait for a message ID to be rendered, then scroll to it and highlight it.
   * Retries a finite number of times if the message is not found yet.
   */
  private waitForMessageToRender(messageId: string, retries = 5): void {
    if (retries === 0) {
      return;
    }

    setTimeout(() => {
      const messageElement = document.getElementById(`message-${messageId}`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        messageElement.classList.add('highlight');
        setTimeout(() => messageElement.classList.remove('highlight'), 2000);
      } else {
        this.waitForMessageToRender(messageId, retries - 1);
      }
    }, 300);
  }

  /**
   * Highlights a given message by ID, scrolling to it. Retries if not found immediately.
   */
  highlightMessage(messageId: string, retries = 5): void {
    setTimeout(() => {
      const messageElement = document.getElementById(`message-${messageId}`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        messageElement.classList.add('highlight');
        setTimeout(() => messageElement.classList.remove('highlight'), 2000);
      } else if (retries > 0) {
        this.highlightMessage(messageId, retries - 1);
      }
    }, 500);
  }

  /**
   * Toggles an inline emoji picker for a specific message, ensuring only one is open at a time.
   */
  toggleEmojiPickerForMessage(msg: any): void {
    const isCurrentlyVisible = msg.isEmojiPickerVisible;
    this.threadMessages.forEach((m) => (m.isEmojiPickerVisible = false));
    msg.isEmojiPickerVisible = !isCurrentlyVisible;
  }

  /**
   * Converts various timestamp formats to a JavaScript Date (supports Firestore Timestamps).
   */
  convertTimestamp(timestamp: any): Date {
    if (!timestamp) return new Date();
    if (timestamp.toDate) return timestamp.toDate();
    if (timestamp instanceof Date) return timestamp;
    return new Date(timestamp);
  }

  /**
   * Adds or increments an emoji in a message's content.emojis array,
   * then updates Firestore and local lastUsedEmojis accordingly.
   */
  addEmojiToMessage(event: any, msg: any): void {
    this.ensureEmojiArray(msg);
    if (!event?.emoji?.native) return;

    const newEmoji = event.emoji.native;
    this.addOrIncrementEmoji(msg, newEmoji);
    this.updateLocalEmojiCache(msg, newEmoji);
    msg.isEmojiPickerVisible = false;
    this.updateMessageInFirestore(msg);
  }

  /* ---------- Hilfsfunktionen ---------- */

  /** Falls msg.content.emojis nicht existiert, lege ein Array an. */
  private ensureEmojiArray(msg: any) {
    if (!msg.content.emojis) msg.content.emojis = [];
  }

  /** Finde oder incrementiere das Emoji, max 13. */
  private addOrIncrementEmoji(msg: any, newEmoji: string): void {
    const existing = msg.content.emojis.find((e: any) => e.emoji === newEmoji);
    if (existing) {
      existing.count += 1;
    } else if (msg.content.emojis.length < 13) {
      msg.content.emojis.push({ emoji: newEmoji, count: 1 });
    }
  }

  /** Aktualisiert lastUsedEmojis bei sent/received und speichert sie im channelService. */
  private updateLocalEmojiCache(msg: any, newEmoji: string): void {
    const isSent = msg.senderName === this.currentUser?.name;
    const localArray = isSent
      ? this.lastUsedEmojisSent
      : this.lastUsedEmojisReceived;
    const updated = this.updateLastUsedEmojis(localArray, newEmoji);

    if (isSent) {
      this.lastUsedEmojisSent = updated;
      if (this.selectedChannel?.id) {
        this.channelService.saveLastUsedEmojis(
          this.selectedChannel.id,
          updated,
          'sent'
        );
      }
    } else {
      this.lastUsedEmojisReceived = updated;
      if (this.selectedChannel?.id) {
        this.channelService.saveLastUsedEmojis(
          this.selectedChannel.id,
          updated,
          'received'
        );
      }
    }
  }

  /** Schickt das Update an Firestore. */
  private updateMessageInFirestore(msg: any): void {
    this.messageService
      .updateMessage(msg.id, { content: { ...msg.content } })
      .then(() => {})
      .catch(() => {});
  }

  /**
   * Maintains a small array of last-used emojis, removing duplicates and limiting to 2.
   */
  private updateLastUsedEmojis(
    emojiArray: string[],
    newEmoji: string
  ): string[] {
    emojiArray = emojiArray.filter((e) => e !== newEmoji);
    return emojiArray.slice(0, 2);
  }

  /**
   * Toggles the main emoji picker for the new message input field.
   */
  toggleEmojiPicker(): void {
    this.isEmojiPickerVisible = !this.isEmojiPickerVisible;
  }

  /**
   * Adds the selected emoji to the `channelMessage` string.
   */
  addEmoji(event: any): void {
    if (event?.emoji?.native) {
      this.channelMessage += event.emoji.native;
    }
    this.isEmojiPickerVisible = false;
  }

  /**
   * Scrolls the thread's message list to the bottom. Called after sending/receiving messages.
   */
  scrollToBottom(): void {
    try {
      setTimeout(() => {
        if (this.messageList?.nativeElement) {
          this.messageList.nativeElement.scrollTop =
            this.messageList.nativeElement.scrollHeight;
        }
      }, 500);
    } catch (err) {}
  }

  /**
   * Emitted when the user wants to close the thread (e.g., back button).
   */
  onClose(): void {
    this.closeThread.emit();
  }

  /**
   * Formats a given timestamp to only show hours and minutes (HH:mm).
   */
  getFormattedTime(timestamp: any): string {
    let date: Date = this.convertTimestamp(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Formats a given timestamp to display either "Heute," "Gestern," or a date like "4. Februar 2025."
   */
  getFormattedDate(timestamp: any): string {
    if (!timestamp) return 'Kein Datum';
    const date = this.toDate(timestamp);
    if (isNaN(date.getTime())) return 'Ungültiges Datum';
    if (this.isSameDay(date, new Date())) return 'Heute';
    if (this.isSameDay(date, this.getYesterdayDate())) return 'Gestern';
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  /** ---------- Hilfsfunktionen ---------- */

  private toDate(timestamp: any): Date {
    if (typeof timestamp === 'object' && 'seconds' in timestamp) {
      return new Date(timestamp.seconds * 1000);
    }
    if (timestamp instanceof Date) {
      return timestamp;
    }
    return new Date(timestamp);
  }

  /**
   * Checks if two Date objects (or date-like) refer to the same calendar day.
   */
  public isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  }

  /**
   * Retrieves yesterday's date, used in getFormattedDate comparisons.
   */
  private getYesterdayDate(): Date {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  }

  /**
   * Keydown handler for sending a message on Enter (without shift).
   * Resets text area height after sending if no shift key was pressed.
   */
  handleKeyDown(event: KeyboardEvent, textArea: HTMLTextAreaElement): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (this.channelMessage.trim() || this.imageUrl) {
        this.sendThreadMessage(textArea);
      } else {
      }
      if (textArea) {
        this.resetTextareaHeight(textArea);
      }
    }
  }

  /**
   * Closes an attached image or expansion in the text area.
   */
  closeProfileCard(textArea: HTMLTextAreaElement): void {
    this.imageUrl = null;
    this.resetTextareaHeight(textArea);
  }

  /**
   * If an image is attached, sets the bottom padding so the preview doesn't overlap the text area.
   */
  adjustTextareaHeight(textArea: HTMLTextAreaElement): void {
    if (this.imageUrl) {
      textArea.style.paddingBottom = '160px';
    }
  }

  /**
   * Resets the text area bottom padding to default.
   */
  resetTextareaHeight(textArea: HTMLTextAreaElement): void {
    textArea.style.paddingBottom = '20px';
  }

  /**
   * Triggered when the user selects an image file to attach to a message.
   * Loads it as a data URL and expands the text area for preview.
   */
  onImageSelected(event: Event, textArea: HTMLTextAreaElement): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imageUrl = e.target?.result as string;
        if (textArea) {
          this.adjustTextareaHeight(textArea);
        }
        this.isTextareaExpanded = true;
      };
      reader.readAsDataURL(file);
    }
  }

  /**
   * Placeholder if you want to log a normal channel message send (not used here).
   */
  sendMessage(): void {
    this.channelMessage = '';
  }

  /**
   * Saves the edits to a message. Commits changes (text/image/emojis) to Firestore, then ends editing mode.
   */
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
      });
      msg.isEditing = false;
    } catch (error) {}
  }

  /**
   * Cancels editing, reverting the message content to what it was before editing started.
   */
  cancelEditing(msg: any): void {
    msg.isEditing = false;
    if (this.originalMessage) {
      msg.content = { ...this.originalMessage.content };
      this.originalMessage = null;
    }
    this.showEditOptions = false;
  }

  /**
   * Shows a tooltip for an emoji on hover, containing the sender's name.
   */
  showTooltip(event: MouseEvent, emoji: string, senderName: string): void {
    this.tooltipVisible = true;
    this.tooltipEmoji = emoji;
    this.tooltipSenderName = senderName;
    this.tooltipPosition = { x: event.clientX, y: event.clientY - 40 };
  }

  /**
   * Hides the tooltip for emojis.
   */
  hideTooltip(): void {
    this.tooltipVisible = false;
  }

  /**
   * Toggles the edit options (like a small menu) for a message with a given msgId.
   */
  toggleEditOptions(msgId: string): void {
    if (this.currentMessageId === msgId && this.showEditOptions) {
      this.showEditOptions = false;
      this.currentMessageId = null;
    } else {
      this.showEditOptions = true;
      this.currentMessageId = msgId;
    }
  }

  /**
   * Activates editing mode for a given message, storing its original content to revert if canceled.
   */
  startEditing(msg: any): void {
    msg.isEditing = true;
    this.originalMessage = JSON.parse(JSON.stringify(msg));
  }

  /**
   * Opens a modal or overlay to display an attached image at full size.
   */
  openImageModal(): void {
    this.isImageModalOpen = true;
  }

  /**
   * Closes the currently open image modal or overlay.
   */
  closeImageModal(): void {
    this.isImageModalOpen = false;
  }

  /**
   * Loads all users, typically for mention or user selection in the thread.
   */
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

  /**
   * Adds an '@username' reference into the channelMessage text input, then hides the dropdown.
   */
  addUserSymbol(member: any) {
    if (this.channelMessage.endsWith('@')) {
      this.channelMessage = this.channelMessage.slice(0, -1);
    }
    this.channelMessage += ` @${member.name} `;
    this.closeDropdown();
  }

  /**
   * Inserts a channel mention into the message text, removing any trailing '#',
   * then closes the dropdown.
   * @param {any} channel - The channel object to mention.
   */
  selectChannel(channel: any): void {
    if (this.channelMessage.endsWith('#')) {
      this.channelMessage = this.channelMessage.slice(0, -1);
    }
    this.channelMessage += `#${channel.name} `;
    this.closeDropdown();
  }

  /**
   * Closes an open emoji popup for a specific message, toggled above.
   */
  closePopup(msg: any) {
    if (msg.showAllEmojisList) {
      msg.showAllEmojisList = false;
      msg.expanded = false;
    }
  }

  /**
   * Toggles a small popup listing all emojis for a message, or closes if already open.
   */
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

  /**
   * Called when clicking a "plus" icon in an emoji popup, e.g., to open a further emoji picker.
   */
  onEmojiPlusInPopup(msg: any) {
    console.log('Plus icon clicked in emoji popup, msg =', msg);
  }

  /**
   * Opens a large overlay to show a specific image attached to a message.
   */
  openLargeImage(imageData: string | ArrayBuffer) {
    if (typeof imageData !== 'string') {
      return;
    }
    this.largeImageUrl = imageData;
    this.showLargeImage = true;
  }

  /**
   * Closes the overlay displaying a large attached image.
   */
  closeLargeImage() {
    this.showLargeImage = false;
    this.largeImageUrl = null;
  }
}
