/**
 * The ThreadComponent manages a "thread" view for replies to a parent message
 * (e.g., in a chat application). It handles live-loading of thread messages,
 * adding and editing replies, emojis, and more. No logic or styling has been
 * changed – only these English JSDoc comments have been added.
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
  HostListener,
} from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { OverlayModule } from '@angular/cdk/overlay';
import { ChangeDetectorRef } from '@angular/core';
import { MessageService } from '../message.service';
import { UserService } from '../user.service';
import { serverTimestamp } from '@angular/fire/firestore';
import { Message } from '../message.models';
import { ChannelService } from '../channel.service';

/**
 * The ThreadComponent handles a child "thread" chat, where users reply to
 * a `parentMessage`. It supports loading, editing, and sending new replies,
 * as well as loading emojis and tracking live reply counts.
 */
@Component({
  selector: 'app-thread',
  standalone: true,
  imports: [CommonModule, FormsModule, PickerModule, OverlayModule],
  templateUrl: './thread.component.html',
  styleUrls: ['./thread.component.scss'],
})
export class ThreadComponent implements OnInit {
  /**
   * The name of the thread recipient (optional usage).
   */
  @Input() recipientName: string = '';

  /**
   * An `EventEmitter` to signal closing the entire thread view.
   */
  @Output() closeThread = new EventEmitter<void>();

  /**
   * A reference to the DOM element containing the message list, used for scrolling.
   */
  @ViewChild('messageList') messageList!: ElementRef;

  /**
   * An `EventEmitter` used to optionally open another thread from within this thread.
   */
  @Output() openThread = new EventEmitter<any>();

  /**
   * The main message input's state, e.g., for expanded text area with images.
   */
  isTextareaExpanded: boolean = false;

  /**
   * The user's typed message when composing a new thread reply.
   */
  privateMessage: string = '';

  /**
   * The current logged-in user data.
   */
  currentUser: any;

  /**
   * Holds the selected image data URL if the user attaches an image to their reply.
   */
  imageUrl: string | null = null;

  /**
   * Whether the global emoji picker for the new message input is visible.
   */
  isEmojiPickerVisible: boolean = false;

  /**
   * Toggles a modal for viewing an attached image at full size.
   */
  isImageModalOpen: boolean = false;

  /**
   * Whether an emoji tooltip is visible on hover.
   */
  tooltipVisible: boolean = false;

  /**
   * The x,y position for an emoji tooltip.
   */
  tooltipPosition = { x: 0, y: 0 };

  /**
   * The hovered emoji character in the tooltip.
   */
  tooltipEmoji: string = '';

  /**
   * The name of the sender for the hovered emoji in the tooltip.
   */
  tooltipSenderName: string = '';

  /**
   * Arrays for storing recently used emojis in thread replies (sent or received).
   */
  lastUsedEmojisSent: string[] = [];
  lastUsedEmojisReceived: string[] = [];

  /**
   * Controls visibility of edit options for a specific message.
   */
  showEditOptions: boolean = false;

  /**
   * Tracks which message is currently selected for editing.
   */
  currentMessageId: string | null = null;

  /**
   * Stores the original message before editing, to restore on cancel.
   */
  originalMessage: any = null;

  /**
   * Used for date comparisons (e.g., show "Gestern" if the date matches).
   */
  yesterdayDate: Date = this.getYesterdayDate();

  /**
   * Used for date comparisons (e.g., show "Heute" if the date matches).
   */
  currentDate: Date = new Date();

  /**
   * A preformatted date string if the parent message has a timestamp.
   */
  formattedParentMessageDate: string = '';

  /**
   * A preformatted time if the parent message has a timestamp.
   */
  formattedMessageTime: string = '';

  /**
   * The thread's unique ID, typically matching the parent message's ID.
   */
  threadId!: string;

  /**
   * Tracks the total number of replies in this thread.
   */
  replyCount: number = 0;

  /**
   * The main "parentMessage" that started the thread.
   * Contains its content, ID, etc.
   */
  @Input() parentMessage: Message | null = null;

  /**
   * Stores the array of thread messages (each a `Message`).
   */
  threadMessages: Message[] = [];

  /**
   * Toggles a full-image modal.
   */
  showLargeImage = false;

  /**
   * The data URL of a large image currently open in the modal (if any).
   */
  largeImageUrl: string | null = null;

  /**
   * Indicates whether the view is a "desktop" layout (>= 1278px).
   */
  isDesktop = false;

  /**
   * Holds the entire list of known users (for mention or selection).
   */
  allUsers: any[] = [];

  /**
   * Whether a user dropdown overlay is open (e.g. for mentioning).
   */
  allChannels: any[] = [];
  dropdownState: 'hidden' | 'user' | 'channel' = 'hidden';
  private cycleStep = 1;
  lastOpenedChar = '';

  userMap: {
    [key: string]:
      | {
          name: string;
          avatarUrl: string;
        }
      | undefined;
  } = {};

  /**
   * A cache mapping user IDs to their names for quick re-lookup.
   */
  private recipientCache: Map<string, string> = new Map();

  /**
   * Subscriptions for real-time Firestore listeners (thread messages, emojis, reply counts).
   */
  private unsubscribeFromThreadMessages: (() => void) | null = null;
  private unsubscribeEmojiListener?: () => void;
  private unsubscribeReplyCount: (() => void) | null = null;
  private unsubscribeChannels: (() => void) | null = null;
  private unsubscribeUsers: (() => void) | null = null;

  /**
   * Constructor injecting services for messages, user data, and change detection.
   */
  constructor(
    private messageService: MessageService,
    private userService: UserService,
    private cdr: ChangeDetectorRef,
    private channelService: ChannelService
  ) {}

  /**
   * OnInit verifies that a valid `parentMessage` was provided, loads the current user,
   * fetches or initializes thread data, and activates live updates for reply counts and emojis.
   */
  async ngOnInit(): Promise<void> {
    this.checkDesktopWidth();
    if (!this.verifyParentMessage()) return;

    await this.loadCurrentUser();
    if (!this.isCurrentUserValid()) return;

    try {
      await this.initializeThreadData(this.parentMessage!);
    } catch (error) {
      this.closeThread.emit();
    }
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
   * Checks if parentMessage exists and has an id; if not, closes the thread.
   */
  private verifyParentMessage(): boolean {
    if (!this.parentMessage?.id) {
      this.closeThread.emit();
      return false;
    }
    return true;
  }

  /**
   * Ensures the current user is loaded; if invalid or missing uid, close the thread.
   */
  private isCurrentUserValid(): boolean {
    if (!this.currentUser?.uid) {
      this.closeThread.emit();
      return false;
    }
    return true;
  }

  /**
   * Parallel loads messages and emojis for this thread, sets up live updates,
   * and formats timestamps if available.
   */
  private async initializeThreadData(pm: Message): Promise<void> {
    const threadId = pm.id!;

    // 1) Load data in parallel
    const [existingMessages, lastSentEmojis, lastReceivedEmojis] =
      await this.loadInitialThreadData(threadId);

    // 2) Store loaded emojis and start last-used logic
    this.lastUsedEmojisSent = lastSentEmojis;
    this.lastUsedEmojisReceived = lastReceivedEmojis;
    this.loadLastUsedThreadEmojis();

    // 3) Optionally handle existingMessages.length === 0 ...

    // 4) Live updates for reply count, emojis, etc.
    this.setupThreadLiveUpdates(threadId);

    // 5) Format the parent's timestamp if present
    this.formatParentTimestamp(pm);

    // 6) Subscribe to replyCounts for this parentMessage
    this.subscribeReplyCounts(pm);
  }

  /**
   * Loads initial thread messages and last-used emojis in parallel.
   */
  private async loadInitialThreadData(
    threadId: string
  ): Promise<[Message[], string[], string[]]> {
    return await Promise.all([
      this.messageService.getMessagesOnce('thread', threadId),
      this.messageService.getLastUsedThreadEmojis(threadId, 'sent'),
      this.messageService.getLastUsedThreadEmojis(threadId, 'received'),
    ]);
  }

  /**
   * Sets up the live updates for reply counts, thread emojis, and listens for last-used emojis.
   */
  private async setupThreadLiveUpdates(threadId: string): Promise<void> {
    this.listenForReplyCountUpdates();
    this.listenForThreadEmojiUpdates();
    await this.loadLastUsedEmojisLive(threadId);
    this.loadThreadMessagesLive();
  }

  /**
   * Formats the parent's timestamp if available, updating formattedParentMessageDate/time.
   */
  private formatParentTimestamp(pm: Message): void {
    if (!pm.timestamp) return;
    const parentTimestamp = this.safeConvertTimestamp(pm.timestamp);
    this.formattedParentMessageDate = this.getFormattedDate(parentTimestamp);
    this.formattedMessageTime = formatDate(parentTimestamp, 'HH:mm', 'de');
  }

  /**
   * Subscribes to reply counts for this parentMessage and updates pm.replyCount accordingly.
   */
  private subscribeReplyCounts(pm: Message): void {
    this.unsubscribeReplyCount = this.messageService.loadReplyCountsLive(
      [pm.id!],
      'thread',
      (updatedCounts) => {
        pm.replyCount = updatedCounts[pm.id!]?.count || 0;
      }
    );
  }

  /**
   * Detects window resize events to dynamically toggle isDesktop mode.
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

  /**
   * Sets `isDesktop` to true if the window width is >= 1278px.
   */
  checkDesktopWidth() {
    this.isDesktop = window.innerWidth >= 1278;
  }

  /**
   * Composes and sends a new reply in this thread to Firestore,
   * optionally including an image. Resets the input fields afterward.
   */
  async sendThreadMessage(
    messageContent: string | null,
    imageUrl: string | null,
    textArea: HTMLTextAreaElement
  ): Promise<void> {
    if (!this.validateThreadSubmission(messageContent, imageUrl)) {
      return;
    }

    if (!this.parentMessage?.id) {
      return;
    }

    // 2) Falls threadId fehlt, setze sie auf parentMessage.id
    if (!this.parentMessage.threadId) {
      this.parentMessage!.threadId = this.parentMessage!.id!;
    }
    const threadMessage = this.createThreadMessage(messageContent, imageUrl);
    if (!threadMessage) return;

    try {
      await this.commitThreadMessage(threadMessage);
      this.privateMessage = '';
      this.imageUrl = null;
      if (textArea) {
        this.resetTextareaHeight(textArea);
      }
    } catch (err) {
      // you could handle errors here if needed
    }
  }

  /**
   * Checks if there's any reason to skip sending the thread message
   * (e.g., empty content, user not loaded, or missing parentMessage).
   */
  private validateThreadSubmission(
    messageContent: string | null,
    imageUrl: string | null
  ): boolean {
    if (!messageContent?.trim() && !imageUrl) {
      return false;
    }
    if (!this.currentUser) {
      return false;
    }
    if (!this.currentUser?.uid) {
      return false;
    }
    if (!this.parentMessage?.id) {
      return false;
    }
    return true;
  }

  /**
   * Persists the new thread message in Firestore, updates lastResponseTime/replyCount,
   * and refreshes the last used emojis from Firestore.
   */
  private async commitThreadMessage(threadMessage: any): Promise<void> {
    const messageId = await this.messageService.sendMessage(threadMessage);

    await this.messageService.updateMessage(this.parentMessage!.id!, {
      lastResponseTime: serverTimestamp(),
    });
    await this.messageService.updateReplyCount(
      this.parentMessage!.id!,
      'thread'
    );

    [this.lastUsedEmojisSent, this.lastUsedEmojisReceived] = await Promise.all([
      this.messageService.getLastUsedThreadEmojis(
        this.parentMessage!.id!,
        'sent'
      ),
      this.messageService.getLastUsedThreadEmojis(
        this.parentMessage!.id!,
        'received'
      ),
    ]);

    this.listenForThreadEmojiUpdates();
  }

  /**
   * Creates a thread message payload for Firestore from the given text or image.
   */
  private createThreadMessage(
    messageContent: string | null,
    imageUrl: string | null
  ): any {
    if (!this.currentUser?.uid) {
      return null;
    }
    if (!this.parentMessage?.id) {
      return null;
    }
    return {
      type: 'thread',
      threadId: this.parentMessage.id,
      parentId: this.parentMessage.id,
      content: {
        text: messageContent || '',
        image: imageUrl ?? '',
        emojis: [],
      },
      senderId: this.currentUser.uid,
      senderName: this.currentUser.name ?? 'Unbekannt',
      senderAvatar: this.currentUser.avatarUrl || 'assets/default-avatar.png',
      recipientId: this.parentMessage.senderId || null,
      timestamp: serverTimestamp(),
      isReply: true,
      lastReplyTime: serverTimestamp(),
    };
  }

  /**
   * openThreadEvent can be triggered to replace the existing parent message
   * with a new one in the same thread context, loading its messages.
   */
  openThreadEvent(msg: Message): void {
    if (!msg?.id) {
      return;
    }
    this.parentMessage = { ...msg };
    const pm = this.parentMessage;

    if (!pm.id) {
      return;
    }

    this.threadId = pm.id;
    if (pm.timestamp) {
      const parentTimestamp = this.safeConvertTimestamp(pm.timestamp);
      this.formattedParentMessageDate = this.getFormattedDate(parentTimestamp);
      this.formattedMessageTime = formatDate(parentTimestamp, 'HH:mm', 'de');
    }

    this.openThread.emit({
      ...pm,
      threadId: pm.id,
      parentId: pm.parentId ?? pm.id,
      timestamp: pm.timestamp,
    });

    this.loadThreadMessagesLive();
  }

  /**
   * Subscribes to a live Firestore listener for thread messages under `parentMessage.id`,
   * updating `threadMessages` in real time.
   */
  private loadThreadMessagesLive(): void {
    if (!this.parentMessage?.id) {
      return;
    }

    if (this.unsubscribeFromThreadMessages) {
      this.unsubscribeFromThreadMessages();
    }

    this.unsubscribeFromThreadMessages = this.messageService.listenMessages(
      'thread',
      this.parentMessage.id,
      (messages) => {
        if (messages.length === 0) {
        }
        this.threadMessages = messages.map((msg) => this.formatMessage(msg));
        this.scrollToBottom();
      }
    );
  }

  /**
   * Reacts to changes in `parentMessage`; if a new parent is set, it ensures
   * the thread ID is valid, reloads the original private message (if needed),
   * listens for reply count updates, and starts live thread updates.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['parentMessage']?.currentValue) {
      return;
    }
    const parentMessage = changes['parentMessage'].currentValue;
    this.ensureThreadIdExists(parentMessage);
    this.setupParentMessage(parentMessage);
    this.setupRecipientName(parentMessage);
    this.updateThreadTimestamp();
    this.initThreadData();
  }

  /**
   * If `parentMessage.threadId` is missing, sets it to `parentMessage.id`.
   */
  private ensureThreadIdExists(parentMessage: any): void {
    if (!parentMessage.threadId) {
      parentMessage.threadId = parentMessage.id;
    }
  }

  /**
   * Copies the data from `parentMessage` into this.parentMessage,
   * ensuring content objects (text, image, emojis) exist.
   */
  private setupParentMessage(parentMessage: any): void {
    this.parentMessage = {
      ...parentMessage,
      content: {
        text:
          parentMessage.content?.text ||
          parentMessage.text ||
          '⚠️ Kein Text gefunden!',
        image: parentMessage.content?.image || null,
        emojis: parentMessage.content?.emojis || [],
      },
    };
  }

  /**
   * Sets `recipientName` if needed, and optionally fetches if it's still 'Lade...'.
   */
  private setupRecipientName(parentMessage: any): void {
    if (!this.recipientName) {
      this.recipientName = parentMessage.recipientName || 'Lade...';
      if (
        this.recipientName === 'Lade...' &&
        typeof parentMessage.recipientId === 'string'
      ) {
        this.fetchRecipientName(parentMessage.recipientId);
      }
    }
    this.threadId = this.parentMessage?.id || '';
  }

  /**
   * Formats the parentMessage timestamp (if present) and stores the result
   * in `formattedParentMessageDate` / `formattedMessageTime`.
   */
  private updateThreadTimestamp(): void {
    if (!this.parentMessage?.timestamp) return;
    const parentTimestamp = this.safeConvertTimestamp(
      this.parentMessage.timestamp
    );
    this.formattedParentMessageDate = this.getFormattedDate(parentTimestamp);
    this.formattedMessageTime = formatDate(parentTimestamp, 'HH:mm', 'de');
  }

  /**
   * Loads the original private message (if this is a child of a private chat),
   * then starts all the live listeners for reply count, thread messages, emojis, etc.
   */
  private initThreadData(): void {
    const pm = this.parentMessage;
    if (!pm || !pm.id) {
      return;
    }
    this.loadOriginalPrivateMessage(pm.id);
    this.listenForReplyCountUpdates();
    this.loadThreadMessagesLive();
    this.loadLastUsedThreadEmojis();
    this.listenForThreadEmojiUpdates();
  }

  /**
   * Listens in real time for reply count updates (e.g., new messages in this thread)
   * and updates `replyCount` accordingly.
   */
  private listenForReplyCountUpdates(): void {
    const pm = this.parentMessage;
    if (!pm) {
      return;
    }
    if (!pm.id) {
      return;
    }

    this.unsubscribeReplyCount = this.messageService.loadReplyCountsLive(
      [pm.id!],
      'thread',
      (updatedCounts) => {
        if (!updatedCounts[pm.id!]) {
          return;
        }
        this.replyCount = updatedCounts[pm.id!].count || 0;
        pm.replyCount = this.replyCount;
      }
    );
  }

  /**
   * Safely converts potential Firestore timestamps (or strings) into a JavaScript Date.
   */
  private safeConvertTimestamp(timestamp: any): Date {
    if (!timestamp) return new Date();
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp === 'object' && 'seconds' in timestamp) {
      return new Date(timestamp.seconds * 1000);
    }
    if (typeof timestamp === 'string') {
      const parsedDate = new Date(timestamp);
      if (!isNaN(parsedDate.getTime())) return parsedDate;
    }
    return new Date();
  }

  /**
   * Optional method to fully initialize the thread if it hasn't been set up yet.
   */
  async initializeThread(): Promise<void> {
    if (!this.threadId) {
      return;
    }
    try {
      await this.loadThreadDataAndEmojis();
      this.listenForThreadEmojiUpdates();
      this.loadThreadMessagesLive();
    } catch (error) {
      // no changes to error handling
    }
  }

  /**
   * Loads emojis (sent/received) and thread messages in parallel,
   * then merges them into 'this.threadMessages' with their emojis array.
   */
  private async loadThreadDataAndEmojis(): Promise<void> {
    const [lastSentEmojis, lastReceivedEmojis, threadMessages] =
      await Promise.all([
        this.messageService.getLastUsedThreadEmojis(this.threadId!, 'sent'),
        this.messageService.getLastUsedThreadEmojis(this.threadId!, 'received'),
        this.messageService.getMessagesOnce('thread', this.threadId!),
      ]);

    this.lastUsedEmojisSent = lastSentEmojis || [];
    this.lastUsedEmojisReceived = lastReceivedEmojis || [];

    this.threadMessages = threadMessages.map((msg) => ({
      ...msg,
      content: { ...msg.content, emojis: msg.content?.emojis || [] },
    }));
  }

  /**
   * Listens for real-time thread emoji updates, e.g., new or changed emojis on messages.
   */
  private listenForThreadEmojiUpdates(): void {
    if (!this.parentMessage?.id) return;
    if (this.unsubscribeEmojiListener) {
      this.unsubscribeEmojiListener();
    }

    this.unsubscribeEmojiListener =
      this.messageService.listenForThreadEmojiUpdates(
        this.parentMessage.id,
        (updatedEmojisSent, updatedEmojisReceived) => {
          this.lastUsedEmojisSent = updatedEmojisSent.slice(-2);
          this.lastUsedEmojisReceived = updatedEmojisReceived.slice(-2);
        }
      );
  }

  /**
   * Loads the current user from UserService and stores it in `this.currentUser`.
   */
  private async loadCurrentUser(): Promise<void> {
    try {
      this.currentUser = await this.userService.getCurrentUserData();
      if (!this.currentUser?.uid) {
        throw new Error('User data invalid or missing uid.');
      }
    } catch (err) {
      this.currentUser = null;
    }
  }

  /**
   * A helper method, if needed, to get user data from the service.
   */
  async getCurrentUserData(): Promise<any> {
    return await this.userService.getCurrentUserData();
  }

  /**
   * Listens for emoji updates on this thread ID, storing them in `lastUsedEmojisSent`/`Received`.
   */
  private async loadLastUsedEmojisLive(threadId: string): Promise<void> {
    this.messageService.listenForEmojiUpdates(
      threadId,
      (sentEmojis, receivedEmojis) => {
        this.lastUsedEmojisSent = sentEmojis;
        this.lastUsedEmojisReceived = receivedEmojis;
      }
    );
  }

  /**
   * Adds an emoji to a specific thread message, updating Firestore and local arrays of last used emojis.
   */
  public async addEmojiToMessage(event: any, msg: any): Promise<void> {
    if (!event?.emoji?.native) return;
    this.ensureEmojiArrayExists(msg);

    const newEmoji = event.emoji.native;
    this.incrementEmojiCount(msg, newEmoji);

    const isSent = msg.senderId === this.currentUser?.id;
    await this.handleLocalAndFirestoreEmojis(msg, newEmoji, isSent);

    msg.isEmojiPickerVisible = false;
    await this.updateMessageInFirestore(msg);
  }

  /**
   * Ensures 'msg.content.emojis' is defined as an array.
   */
  private ensureEmojiArrayExists(msg: any): void {
    if (!msg.content.emojis) {
      msg.content.emojis = [];
    }
  }

  /**
   * Increments the emoji count if it exists or pushes a new emoji object,
   * capped at 13 total emojis in this array.
   */
  private incrementEmojiCount(msg: any, newEmoji: string): void {
    const existingEmoji = msg.content.emojis.find(
      (e: any) => e.emoji === newEmoji
    );
    if (existingEmoji) {
      existingEmoji.count = 1;
    } else if (msg.content.emojis.length < 13) {
      msg.content.emojis.push({ emoji: newEmoji, count: 1 });
    }
  }

  /**
   * Updates the local lastUsedEmojis (sent/received) and saves them in Firestore if parentMessage.id exists.
   */
  private async handleLocalAndFirestoreEmojis(
    msg: any,
    newEmoji: string,
    isSent: boolean
  ): Promise<void> {
    const type = isSent ? 'sent' : 'received';
    if (type === 'sent') {
      this.lastUsedEmojisSent = this.updateLastUsedEmojis(
        this.lastUsedEmojisSent,
        newEmoji
      );
      await this.saveThreadEmojisIfPossible(this.lastUsedEmojisSent, 'sent');
    } else {
      this.lastUsedEmojisReceived = this.updateLastUsedEmojis(
        this.lastUsedEmojisReceived,
        newEmoji
      );
      await this.saveThreadEmojisIfPossible(
        this.lastUsedEmojisReceived,
        'received'
      );
    }
  }

  /**
   * If parentMessage.id exists, saves the last used emojis (sent/received) in Firestore.
   */
  private async saveThreadEmojisIfPossible(
    emojis: string[],
    emojiType: 'sent' | 'received'
  ): Promise<void> {
    if (!this.parentMessage?.id) return;
    await this.messageService.saveLastUsedThreadEmojis(
      this.parentMessage.id,
      emojis,
      emojiType
    );
  }

  /**
   * Ensures that the local array of last used emojis remains limited to 2, removing duplicates first.
   */
  private updateLastUsedEmojis(
    emojiArray: string[],
    newEmoji: string
  ): string[] {
    emojiArray = emojiArray.filter((e) => e !== newEmoji);
    return emojiArray.slice(0, 2);
  }

  /**
   * Cleans up all subscriptions (thread messages, emoji updates, reply counts) on destroy.
   */
  ngOnDestroy(): void {
    if (this.unsubscribeFromThreadMessages) {
      this.unsubscribeFromThreadMessages();
    }
    if (this.unsubscribeEmojiListener) {
      this.unsubscribeEmojiListener();
    }
    if (this.unsubscribeReplyCount) {
      this.unsubscribeReplyCount();
    }
    if (this.unsubscribeChannels) {
      this.unsubscribeChannels();
    }
    if (this.unsubscribeUsers) {
      this.unsubscribeUsers();
    }
  }

  /**
   * Saves an edited thread message back to Firestore, preserving any existing fields like image or emojis.
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
   * Scrolls the message list to the bottom after a brief delay.
   */
  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messageList) {
        this.messageList.nativeElement.scrollTop =
          this.messageList.nativeElement.scrollHeight;
      }
    }, 100);
  }

  /**
   * Returns a user-friendly date string for the given date (e.g., "Heute", "Gestern", or a localized date).
   */
  getFormattedDate(dateString: string | Date | undefined): string {
    if (!dateString) {
      return '';
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return '';
    }
    if (this.isSameDay(date, this.currentDate)) {
      return 'Heute';
    }
    if (this.isSameDay(date, this.getYesterdayDate())) {
      return 'Gestern';
    }
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    });
  }

  /**
   * Formats or normalizes a single thread message from Firestore, including converting its timestamp.
   */
  private formatMessage(msg: any): any {
    return {
      ...msg,
      timestamp: msg.timestamp
        ? this.messageService.convertToDate(msg.timestamp)
        : new Date(),
    };
  }

  /**
   * Returns the date object for "yesterday," used in date labeling.
   */
  private getYesterdayDate(): Date {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  }

  /**
   * Checks if two timestamps occur on the same calendar day.
   */
  isSameDay(timestamp1: Date | string, timestamp2: Date | string): boolean {
    if (!timestamp1 || !timestamp2) {
      return false;
    }
    const date1 = new Date(timestamp1);
    const date2 = new Date(timestamp2);
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  /**
   * Attempts to highlight a specific thread message by ID, scrolling it into view and adding a highlight class.
   */
  highlightThreadMessage(messageId: string, retries = 5): void {
    setTimeout(() => {
      const messageElement = document.getElementById(`message-${messageId}`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        messageElement.classList.add('highlight');
        setTimeout(() => messageElement.classList.remove('highlight'), 2000);
      } else if (retries > 0) {
        this.highlightThreadMessage(messageId, retries - 1);
      }
    }, 500);
  }

  /**
   * Fetches a recipient's name from Firestore or returns a cached value to avoid repeated lookups.
   */
  private async fetchRecipientName(recipientId: string): Promise<void> {
    if (!recipientId) return;

    if (this.recipientCache.has(recipientId)) {
      this.recipientName = this.recipientCache.get(recipientId)!;
      return;
    }

    try {
      const user = await this.userService.getUserById(recipientId);
      this.recipientName = user?.name || 'Unbekannt';
      this.recipientCache.set(recipientId, this.recipientName);
    } catch (error) {
      this.recipientName = 'Unbekannt';
    }
  }

  /**
   * Loads the "original" private message if the thread originated from a direct message,
   * ensuring the main content is fully populated.
   */
  private async loadOriginalPrivateMessage(threadId: string): Promise<void> {
    try {
      const originalMessage = await this.messageService.getMessage(
        'private',
        threadId
      );
      if (originalMessage) {
        this.setupParentMessageFromOriginal(originalMessage);
      } else {
        // optional else-block if needed
      }
    } catch (error) {
      // handle error if necessary
    }
  }

  /**
   * Sets this.parentMessage from the fetched originalMessage,
   * then formats the timestamp (if any) for display.
   */
  private setupParentMessageFromOriginal(originalMessage: any): void {
    this.parentMessage = {
      ...originalMessage,
      content: {
        text: originalMessage.content?.text || '⚠️ Kein Text gefunden!',
        image: originalMessage.content?.image || null,
        emojis: originalMessage.content?.emojis || [],
      },
    };

    // Safely check if parentMessage and its timestamp exist
    if (this.parentMessage && this.parentMessage.timestamp) {
      const parentTimestamp = this.safeConvertTimestamp(
        this.parentMessage.timestamp
      );
      this.formattedParentMessageDate = this.getFormattedDate(parentTimestamp);
      this.formattedMessageTime = formatDate(parentTimestamp, 'HH:mm', 'de');
    }
  }

  /**
   * Loads the last used emojis for this thread from Firestore,
   * then starts a live thread emoji update listener.
   */
  private async loadLastUsedThreadEmojis(): Promise<void> {
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

  /**
   * Sends a new thread message on Enter (if Shift isn't pressed) and resets the inputs.
   */
  handleKeyDown(event: KeyboardEvent, textArea: HTMLTextAreaElement): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendThreadMessage(this.privateMessage, this.imageUrl, textArea);
      this.privateMessage = '';
      this.imageUrl = null;
      this.resetTextareaHeight(textArea);
    }
  }

  /**
   * Toggles the global emoji picker for sending a new message.
   */
  toggleEmojiPicker(event: MouseEvent) {
    event.stopPropagation();
    this.isEmojiPickerVisible = !this.isEmojiPickerVisible;
  }

  /**
   * Adds the selected emoji from the global picker into the `privateMessage` text.
   */
  addEmoji(event: any): void {
    if (event?.emoji?.native) {
      this.privateMessage += event.emoji.native;
    }
  }

  onEmojiPickerClick(e: MouseEvent): void {
    e.stopPropagation();
  }
  /**
   * Called when a user selects an image file for their reply,
   * reading it in as a data URL.
   */
  onImageSelected(event: Event, textArea?: HTMLTextAreaElement): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imageUrl = e.target?.result as string;
        if (textArea) {
          this.adjustTextareaHeight(textArea);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  /**
   * If an image is attached, increases the bottom padding of the textarea
   * to prevent overlapping.
   */
  adjustTextareaHeight(textArea: HTMLTextAreaElement): void {
    if (this.imageUrl) {
      textArea.style.paddingBottom = '160px';
    }
  }

  /**
   * Resets the bottom padding of the textarea to the default value.
   */
  resetTextareaHeight(textArea: HTMLTextAreaElement): void {
    textArea.style.paddingBottom = '20px';
  }

  /**
   * Toggles an inline emoji picker for a given thread message by ID, ensuring only one is visible at a time.
   */
  toggleEmojiPickerForMessage(msg: any): void {
    const isCurrentlyVisible = msg.isEmojiPickerVisible;
    this.threadMessages.forEach((m) => (m.isEmojiPickerVisible = false));
    msg.isEmojiPickerVisible = !isCurrentlyVisible;
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

  /**
   * Hides the emoji tooltip.
   */
  hideTooltip(): void {
    this.tooltipVisible = false;
  }

  /**
   * Closes any attached profile card or image references for the thread.
   * E.g., if the user discards an attached image.
   */
  closeProfileCard(textArea: HTMLTextAreaElement): void {
    this.imageUrl = null;
  }

  /**
   * Opens a modal to view the selected image at a larger size.
   */
  openImageModal(): void {
    this.isImageModalOpen = true;
  }

  /**
   * Closes the large image modal if currently open.
   */
  closeImageModal(): void {
    this.isImageModalOpen = false;
  }

  /**
   * Loads all users from Firestore, used for mention or user selection in the thread.
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
   * Inserts an '@username' mention in the reply text and closes the mention dropdown.
   */
  addUserSymbol(member: any) {
    if (this.privateMessage.endsWith('@')) {
      this.privateMessage = this.privateMessage.slice(0, -1);
    }
    this.privateMessage += ` @${member.name} `;
    this.closeDropdown();
  }

  /**
   * Inserts a channel mention into the message text, removing any trailing '#',
   * then closes the dropdown.
   * @param {any} channel - The channel object to mention.
   */
  selectChannel(channel: any): void {
    if (this.privateMessage.endsWith('#')) {
      this.privateMessage = this.privateMessage.slice(0, -1);
    }
    this.privateMessage += `#${channel.name} `;
    this.closeDropdown();
  }

  /**
   * Closes the entire thread view, typically by user request (e.g., "back" button).
   */
  onClose(): void {
    this.closeThread.emit();
  }

  /**
   * Toggles the visibility of edit options for a specific message in the thread by ID.
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
   * Sets a message to editing mode, storing its original text to restore if the user cancels.
   */
  startEditing(msg: any): void {
    msg.isEditing = true;
    this.originalMessage = JSON.parse(JSON.stringify(msg));
    this.showEditOptions = false;
  }

  /**
   * Cancels the editing of a message, reverting it to its original text if any changes were made.
   */
  cancelEditing(msg: any): void {
    if (this.originalMessage) {
      msg.content.text = this.originalMessage.content.text;
      this.originalMessage = null;
    }
    msg.isEditing = false;
    this.showEditOptions = false;
  }

  /**
   * Closes any emoji popup for a message (e.g., if the user clicks away).
   */
  closePopup(msg: any) {
    if (msg.showAllEmojisList) {
      msg.showAllEmojisList = false;
      msg.expanded = false;
    }
  }

  /**
   * Toggles a small popup showing all emojis in a message, or closes it.
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
   * Triggered if a user clicks a "plus" icon in the emoji popup,
   * e.g. to open another emoji picker or add a new emoji.
   */
  onEmojiPlusInPopup(msg: any) {
    console.log('Clicked plus in popup, message=', msg);
  }

  /**
   * Opens a large image modal for a message's image if it is a string.
   */
  openLargeImage(imageData: string | ArrayBuffer) {
    if (typeof imageData !== 'string') {
      return;
    }
    this.largeImageUrl = imageData;
    this.showLargeImage = true;
  }

  /**
   * Closes the large image modal if currently displayed.
   */
  closeLargeImage() {
    this.showLargeImage = false;
    this.largeImageUrl = null;
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
   * Updates the message document in Firestore, always hiding the tooltip afterward.
   * @param {any} msg - The message object containing the ID and updated content.
   */
  private async updateMessageInFirestore(msg: any): Promise<void> {
    if (!msg.id) {
      this.hideTooltip();
      return;
    }
    try {
      await this.messageService.updateMessage(msg.id, {
        content: { ...msg.content },
      });
    } catch (error) {
      
    } finally {
     
      this.hideTooltip();
    }
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
