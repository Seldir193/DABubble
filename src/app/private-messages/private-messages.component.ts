/**
 * The PrivateMessagesComponent manages direct (private) chats between the current user
 * and a specified recipient. It handles sending text or image-based messages, displaying
 * date separators, loading and maintaining last-used emojis, live-updating messages
 * via Firestore listeners, and more. No logic or styling has been changed –
 * only these English JSDoc comments have been added.
 */

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
import { CommonModule, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { ChannelService } from '../channel.service';
import { UserService } from '../user.service';
import { MatDialog } from '@angular/material/dialog';
import { MessageService } from '../message.service';
import { ActivatedRoute } from '@angular/router';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { OverlayModule } from '@angular/cdk/overlay';
import { Message } from '../message.models';

/**
 * Defines the structure of a message's content, which may include text,
 * an optional image, and an array of emojis with usage counts.
 */
export interface MessageContent {
  text?: string;
  image?: string | ArrayBuffer | null;
  emojis: Array<{ emoji: string; count: number }>;
}

@Component({
  selector: 'app-private-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, PickerModule, OverlayModule],
  templateUrl: './private-messages.component.html',
  styleUrls: ['./private-messages.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class PrivateMessagesComponent implements OnInit, OnChanges {
  @ViewChild('messageList') messageList!: ElementRef;

  @Input() recipientName: string = '';
  @Input() recipientId: string = '';
  @Output() memberSelected = new EventEmitter<any>();
  @Input() showSearchField: boolean = false;
  @Output() openThread = new EventEmitter<any>();
  @Input() threadData: any = null;
  @ViewChild('textArea') textAreaRef!: ElementRef<HTMLTextAreaElement>;

  parentMessage: any = null;
  imageUrl: string | ArrayBuffer | null = null;
  privateMessage: string = '';
  currentUser: any;
  conversationId: string | undefined;
  recipientStatus: string = '';
  recipientAvatarUrl: string = '';
  isEmojiPickerVisible: boolean = false;
  isImageModalOpen = false;
  currentDate: Date = new Date();
  yesterdayDate: Date = this.getYesterdayDate();
  isTextareaExpanded: boolean = false;
  message: string = '';
  lastUsedEmojisReceived: string[] = [];
  lastUsedEmojisSent: string[] = [];
  showEditOptions: boolean = false;
  currentMessageId: string | null = null;
  originalMessage: any = null;
  tooltipVisible = false;
  tooltipPosition = { x: 0, y: 0 };
  tooltipEmoji = '';
  tooltipSenderName = '';
  selectedThread: any = null;
  latestTimestamp: Date | null = null;
  selectedMember: any = null;
  allUsers: any[] = [];
  showUserDropdown: boolean = false;
  privateMessages: Message[] = [];
  showLargeImage = false;
  largeImageUrl: string | null = null;
  private hasScrolledOnChange: boolean = false;
  private isChatChanging: boolean = false;
  isDesktop = false;

  allChannels: any[] = [];
  dropdownState: 'hidden' | 'user' | 'channel' = 'hidden';
  private cycleStep = 1;
  lastOpenedChar = '';

  userMap: {
    [uid: string]: { name: string; avatarUrl: string } | undefined;
  } = {};

  private replyCache: Map<string, any[]> = new Map();
  private unsubscribeFromThreadMessages: (() => void) | null = null;
  private unsubscribeLiveReplyCounts: (() => void) | null = null;
  private unsubscribeFromThreadDetails: (() => void) | null = null;
  private unsubscribeEmojiListener?: () => void;
  private unsubscribeFromPrivateMessages: (() => void) | null = null;
  private unsubscribeRecipient?: () => void;
  private unsubscribeChannels: (() => void) | null = null;
  private unsubscribeUsers: (() => void) | null = null;

  /**
   * Constructor injecting services for route info, user data, channel logic, dialogs, and messages.
   */
  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private channelService: ChannelService,
    private dialog: MatDialog,
    private messageService: MessageService
  ) {}

  /**
   * Lifecycle hook: loads the current user, sets up the conversation if recipient is known,
   * and starts real-time updates (messages, emojis, reply counts, date refresh).
   */
  async ngOnInit(): Promise<void> {
    await this.loadCurrentUser();
    this.loadRecipientData();
    this.checkDesktopWidth();
    this.setupRecipientListener();
    this.initPrivateConversation();
    this.initChannelAndUserSubscriptions();

    setTimeout(() => this.focusTextArea(), 0);
  }

  /**
   * Initializes the private conversation if currentUser and recipientId are defined,
   * then sets up listeners for messages, emojis, reply counts, and date updates.
   */
  private initPrivateConversation(): void {
    if (!this.currentUser?.id || !this.recipientId) return;
    this.conversationId = this.messageService.generateConversationId(
      this.currentUser.id,
      this.recipientId
    );
    this.setupMessageListener();
    this.listenForEmojiUpdates();
    this.loadLastUsedEmojis();
    this.startLiveReplyCountUpdates();
    this.startDateUpdater();
  }

  /**
   * Subscribes to channel and user updates, storing the unsubscribe functions.
   */
  private initChannelAndUserSubscriptions(): void {
    this.unsubscribeChannels = this.channelService.getAllChannels((ch) => {
      this.allChannels = ch;
    });

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
   * HostListener to detect window resize events and update desktop mode.
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
   * Checks if screen width >= 1278 to mark as desktop mode.
   */
  checkDesktopWidth() {
    this.isDesktop = window.innerWidth >= 1278;
  }

  /**
   * Sets an interval to update message dates periodically (e.g. "Heute" => "Gestern").
   */
  private startDateUpdater(): void {
    setInterval(() => {
      this.updateMessageDates();
    }, 60000);
  }

  /**
   * Recomputes formattedDate for each message to reflect daily changes.
   */
  private updateMessageDates(): void {
    const updatedMessages = this.privateMessages.map((msg) => ({
      ...msg,
      formattedDate: this.getFormattedDate(msg.timestamp),
    }));
    this.privateMessages = [...updatedMessages];
  }

  private setupRecipientListener() {
    // Hier rufen wir nun die neue Service-Methode auf
    this.unsubscribeRecipient = this.messageService.onRecipientStatusChanged(
      this.recipientId,
      (data) => {
        // data: { isOnline: boolean; avatarUrl: string; name: string }
        this.recipientStatus = data.isOnline ? 'Aktiv' : 'Abwesend';
        this.recipientAvatarUrl = data.avatarUrl;
        this.recipientName = data.name;
      }
    );
  }

  /**
   * Sets up a live listener for new private messages, auto-scrolling if user near bottom or if new messages arrive.
   */
  private setupMessageListener(): void {
    if (this.unsubscribeFromThreadMessages) {
      this.unsubscribeFromThreadMessages();
    }

    this.hasScrolledOnChange = false;
    let oldCount = this.privateMessages.length;

    this.unsubscribeFromThreadMessages = this.messageService.listenMessages(
      'private',
      this.conversationId!,
      (rawMessages) => {
        this.processIncomingMessages(rawMessages);

        const wasNearBottom = this.isNearBottom(150);
        const newCount = rawMessages.length;
        if (newCount > oldCount || wasNearBottom) {
          this.scrollToBottom();
        }
        oldCount = newCount;
      }
    );
  }

  /**
   * Checks if the user is near the bottom of the message list within a threshold.
   */
  private isNearBottom(threshold = 100): boolean {
    const el = this.messageList?.nativeElement;
    if (!el) return false;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distanceToBottom <= threshold;
  }

  /**
   * Scrolls to bottom if user is near the bottom or if switching chats immediately.
   */
  private scrollToBottom(): void {
    if (this.isChatChanging) {
      const lastMessage = this.messageList?.nativeElement.lastElementChild;
      if (lastMessage) {
        setTimeout(() => {
          lastMessage.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 100);
      }
      return;
    }

    if (this.isNearBottom()) {
      setTimeout(() => {
        if (this.messageList) {
          this.messageList.nativeElement.scrollTop =
            this.messageList.nativeElement.scrollHeight;
        }
      }, 100);
    }
  }

  /**
   * Called whenever @Input properties change. Dispatches to helper methods for
   * recipient changes or thread data updates.
   */
  ngOnChanges(changes: SimpleChanges): void {
    this.handleRecipientChanges(changes);
    this.handleThreadDataChanges(changes);
  }

  /**
   * Handles logic when recipientId changes: clears old listeners, reloads data,
   * scrolls to bottom, and restarts live reply counts.
   */
  private handleRecipientChanges(ch: SimpleChanges): void {
    const rc = ch['recipientId'];
    if (!rc || rc.isFirstChange()) return;

    this.hasScrolledOnChange = true;
    this.isChatChanging = true;
    this.cleanupListeners();
    this.loadRecipientData();
    this.loadPrivateMessages();
    if (this.unsubscribeRecipient) this.unsubscribeRecipient();
    this.setupRecipientListener();
    setTimeout(() => {
      this.scrollToBottom();
      this.isChatChanging = false;
      this.focusTextArea();
    }, 200);
    this.startLiveReplyCountUpdates();
  }

  /**
   * Focuses the textarea so the user can immediately start typing.
   */
  private focusTextArea(): void {
    if (this.textAreaRef) {
      this.textAreaRef.nativeElement.focus();
    }
  }

  /**
   * Handles logic when threadData changes, updating timestamp if present.
   */
  private handleThreadDataChanges(ch: SimpleChanges): void {
    const td = ch['threadData']?.currentValue;
    if (!td?.timestamp) return;

    this.getFormattedDate(td.timestamp);
    formatDate(td.timestamp, 'HH:mm', 'de');
  }

  /**
   * Loads private messages for the current conversation from Firestore
   * and sets up a live listener for updates.
   */
  async loadPrivateMessages(): Promise<void> {
    if (!this.currentUser?.id || !this.recipientId) return;
    const cId = this.messageService.generateConversationId(
      this.currentUser.id,
      this.recipientId
    );
    if (this.unsubscribeFromPrivateMessages)
      this.unsubscribeFromPrivateMessages();
    this.unsubscribeFromPrivateMessages =
      this.messageService.getPrivateMessagesLive(cId, (msgs) =>
        this.handlePrivateMessagesLive(msgs)
      );
  }

  /**
   * Transforms incoming messages by converting timestamps and
   * updating local references, then scrolls down after a short delay.
   */
  private handlePrivateMessagesLive(messages: any[]): void {
    this.privateMessages = messages.map((msg) => {
      const ts = this.safeConvertTimestamp(msg.timestamp);
      const lr = msg.lastResponseTime
        ? this.safeConvertTimestamp(msg.lastResponseTime)
        : ts;
      return {
        ...msg,
        timestamp: ts,
        lastResponseTime: lr,
        formattedDate: this.getFormattedDate(ts),
        content: { ...msg.content, emojis: msg.content?.emojis || [] },
      };
    });
    setTimeout(() => this.scrollToBottom(), 200);
  }

  /**
   * Removes all active listeners for messages, replies, and emojis, typically before switching chat or on destroy.
   */
  private cleanupListeners(): void {
    if (this.unsubscribeLiveReplyCounts) {
      this.unsubscribeLiveReplyCounts();
      this.unsubscribeLiveReplyCounts = null;
    }
    if (this.unsubscribeFromThreadMessages) {
      this.unsubscribeFromThreadMessages();
      this.unsubscribeFromThreadMessages = null;
    }
  }

  /**
   * Called when component destroyed, unsubscribes from all live queries, clears caches.
   */
  ngOnDestroy(): void {
    if (this.unsubscribeFromThreadMessages) {
      this.unsubscribeFromThreadMessages();
      this.unsubscribeFromThreadMessages = null;
    }
    if (this.unsubscribeFromThreadDetails) {
      this.unsubscribeFromThreadDetails();
      this.unsubscribeFromThreadDetails = null;
    }
    if (this.unsubscribeEmojiListener) {
      this.unsubscribeEmojiListener();
    }
    if (this.unsubscribeLiveReplyCounts) {
      this.unsubscribeLiveReplyCounts();
      this.unsubscribeLiveReplyCounts = null;
    }
    this.replyCache.clear();
  }

  ngOnHelpDestroy(): void {
    if (this.unsubscribeFromPrivateMessages) {
      this.unsubscribeFromPrivateMessages();
    }
    if (this.unsubscribeRecipient) {
      this.unsubscribeRecipient();
    }
    if (this.unsubscribeChannels) {
      this.unsubscribeChannels();
    }
    if (this.unsubscribeUsers) {
      this.unsubscribeUsers();
    }
  }

  /**
   * Processes raw messages from Firestore by converting timestamps,
   * setting daily separators, and then updates live reply counts.
   *
   * @param {Message[]} rawMessages - The array of incoming Firestore messages.
   */
  private processIncomingMessages(rawMessages: Message[]): void {
    rawMessages.forEach((msg) => {
      if (msg.senderId && !this.userMap[msg.senderId]) {
        this.loadUserIntoMap(msg.senderId);
      }
    });

    let prevDate: Date | null = null;

    const updated = rawMessages.map((msg, i) => {
      const ts = this.safeConvertTimestamp(msg.timestamp);
      const showSep = i === 0 || !this.isSameDay(prevDate, ts);
      prevDate = ts;
      return this.transformIncomingMessage(msg, ts, showSep);
    });

    this.privateMessages = [...updated];
    this.updateLiveReplyCounts(updated);
  }

  private loadUserIntoMap(userId: string): void {
    this.userService
      .getUserById(userId)
      .then((userData) => {
        if (userData) {
          this.userMap[userId] = {
            name: userData.name || 'Unbekannt',
            avatarUrl: userData.avatarUrl || 'assets/img/avatar.png',
          };
        }
      })
      .catch((err) => {});
  }

  /**
   * Builds a message object with correct timestamps, optional date separator,
   * and an intersection cast for showDateSeparator.
   */
  private transformIncomingMessage(
    msg: Message,
    ts: Date,
    showDateSeparator: boolean
  ): Message & { showDateSeparator: boolean } {
    const lr = msg.lastResponseTime
      ? this.safeConvertTimestamp(msg.lastResponseTime)
      : ts;
    return {
      ...msg,
      timestamp: ts,
      lastResponseTime: lr,
      formattedDate: this.getFormattedDate(ts),
      showDateSeparator,
      time: formatDate(ts, 'HH:mm', 'de'),
      content: {
        ...msg.content,
        emojis: msg.content?.emojis?.slice() || [],
      },
      replyCount: msg.replyCount ?? 0,
    } as Message & { showDateSeparator: boolean };
  }

  /**
   * Updates live reply counts for each message by subscribing to partialCounts
   * from Firestore. Then applies those counts to local messages.
   */
  private updateLiveReplyCounts(messages: Message[]): void {
    const ids = messages
      .map((m) => m.id)
      .filter((id): id is string => id !== undefined);
    if (!ids.length) return;

    this.unsubscribeLiveReplyCounts = this.messageService.loadReplyCountsLive(
      ids,
      'private',
      (pc) => this.applyPartialCounts(pc)
    );
  }

  /**
   * Applies partial reply counts to local messages. Casts the partialCounts
   * to a known structure so 'data' is no longer 'unknown'.
   */
  private applyPartialCounts(
    partialCounts: Record<string, { count: number; lastResponseTime?: any }>
  ): void {
    for (const [msgId, data] of Object.entries(partialCounts)) {
      const idx = this.privateMessages.findIndex((m) => m.id === msgId);
      if (idx === -1) continue;

      this.privateMessages[idx] = {
        ...this.privateMessages[idx],
        replyCount: data.count,
        timestamp: this.privateMessages[idx].timestamp,
        time: this.privateMessages[idx].time,
        // If you need lastResponseTime, you can also set it here
      };
    }
  }

  /**
   * Opens a thread (reply view) for the given message. If cached, uses cache; else fetches from Firestore.
   *
   * @param {any} msg - The message containing the thread reference.
   */
  openThreadEvent(msg: any): void {
    this.parentMessage = msg;
    const threadId = msg.threadId || msg.id;

    if (this.unsubscribeFromThreadMessages) {
      this.unsubscribeFromThreadMessages();
      this.unsubscribeFromThreadMessages = null;
    }

    if (this.replyCache.has(threadId)) {
      msg.replies = this.replyCache.get(threadId) || [];
      this.openThread.emit(msg);
      return;
    }
    this.loadThread(threadId, msg);
  }

  /**
   * Loads thread messages from Firestore for the given threadId
   * and updates the local privateMessages. Then emits openThread.
   */
  private loadThread(threadId: string, originalMsg: any): void {
    if (this.unsubscribeFromThreadMessages)
      this.unsubscribeFromThreadMessages();

    this.unsubscribeFromThreadMessages = this.messageService.listenMessages(
      'thread',
      threadId,
      (messages) => this.handleThreadMessages(messages, originalMsg)
    );
  }

  /**
   * Merges newly received thread messages into privateMessages,
   * updates replyCount/lastResponseTime, then emits openThread.
   */
  private handleThreadMessages(incoming: any[], originMsg: any): void {
    const lastResp = incoming.length
      ? this.safeConvertTimestamp(incoming[incoming.length - 1].timestamp)
      : null;

    this.privateMessages = this.privateMessages.map((m) => {
      if (m.id !== originMsg.id) return m;
      return {
        ...m,
        replies: [...incoming],
        replyCount: incoming.length,
        lastResponseTime: lastResp,
      };
    });
    this.openThread.emit(originMsg);
  }

  /**
   * Starts a listener to track live reply counts for the current privateMessages.
   * Unsubscribes any previous listener, then updates local state when changes occur.
   */
  startLiveReplyCountUpdates(): void {
    if (this.unsubscribeLiveReplyCounts) this.unsubscribeLiveReplyCounts();

    const ids = this.privateMessages.map((m) => m.id || '').filter((x) => x);
    if (!ids.length) return;

    this.unsubscribeLiveReplyCounts = this.messageService.loadReplyCountsLive(
      ids,
      'private',
      (pc) => {
        this.applyReplyCounts(pc);
      }
    );
  }

  /**
   * Applies partial reply counts from Firestore to each message, updating replyCount
   * and lastResponseTime. If no data entry matches, the message remains unchanged.
   */
  private applyReplyCounts(partialCounts: any): void {
    this.privateMessages = this.privateMessages.map((msg) => {
      const data = partialCounts[msg.id || ''];
      if (!data) return msg;
      return {
        ...msg,
        replyCount: data.count,
        lastResponseTime: data.lastResponseTime
          ? this.safeConvertTimestamp(data.lastResponseTime)
          : null,
      };
    });
  }

  /**
   * Loads the recipient's data from the user service if a valid recipientId is set (e.g. name, avatar, status).
   */
  loadRecipientData(): void {
    if (!this.recipientId) {
      return;
    }

    this.userService
      .getUserById(this.recipientId)
      .then((userData) => {
        if (userData) {
          this.recipientName = userData.name;
          this.recipientAvatarUrl = userData.avatarUrl || '';
          this.recipientStatus = userData.isOnline ? 'Aktiv' : 'Abwesend';
        } else {
          // No recipient found
        }
      })
      .catch(() => {
        // Error fetching user
      });
  }

  /**
   * Adds an emoji to a specific message, updates Firestore, and modifies arrays
   * of last-used emojis (sent or received) depending on who authored the message.
   *
   * @param {any} event - The emoji selection event from the picker.
   * @param {any} msg - The message object being updated.
   */
  async addEmojiToMessage(event: any, msg: any): Promise<void> {
    if (!msg.content.emojis) msg.content.emojis = [];
    if (!event?.emoji?.native) return;

    const newEmoji = event.emoji.native;
    this.processEmojiIncrement(msg, newEmoji);
    this.handleLastUsedEmojis(msg, newEmoji);
    await this.saveEmojiUsageInFirestore(newEmoji);
    await this.updateEmojiInFirestore(msg);

    if (!this.hasScrolledOnChange && this.isNearBottom()) {
      this.scrollToBottom();
    }
  }

  /**
   * Handles incrementing or inserting the new emoji in the message content.
   */
  private processEmojiIncrement(msg: any, newEmoji: string): void {
    const existing = msg.content.emojis.find((e: any) => e.emoji === newEmoji);
    if (existing) {
      existing.count = 1;
      //existing.count++;
    } else if (msg.content.emojis.length < 20) {
      msg.content.emojis.push({ emoji: newEmoji, count: 1 });
    } else {
      // Limit reached (no logic changed)
    }
  }

  /**
   * Determines if the emoji was sent by the current user or received,
   * then updates the correct last-used array.
   */
  private handleLastUsedEmojis(msg: any, newEmoji: string): void {
    const isSentByMe = msg.senderId === this.currentUser?.id;
    const emojiType = isSentByMe ? 'sent' : 'received';
    if (isSentByMe) {
      this.lastUsedEmojisSent = this.updateLastUsedEmojis(
        this.lastUsedEmojisSent,
        newEmoji
      );
    } else {
      this.lastUsedEmojisReceived = this.updateLastUsedEmojis(
        this.lastUsedEmojisReceived,
        newEmoji
      );
    }
    if (this.conversationId) {
      this.messageService
        .saveLastUsedEmojis(this.conversationId, [newEmoji], emojiType)
        .catch(() => {});
    }
  }

  /**
   * Updates the message in Firestore with new emoji array,
   * then reflects the changes in this.privateMessages.
   */
  private async updateEmojiInFirestore(msg: any): Promise<void> {
    try {
      await this.messageService.updateMessage(msg.id, {
        'content.emojis': msg.content.emojis,
      });
      this.privateMessages = this.privateMessages.map((m) =>
        m.id === msg.id
          ? { ...m, content: { ...m.content, emojis: msg.content.emojis } }
          : m
      );
    } catch {
      // Could not update message (no logic changed)
    }
  }

  /**
   * Saves the new emoji usage in Firestore only if we have a conversationId,
   * ignoring any error without changing logic.
   */
  private async saveEmojiUsageInFirestore(newEmoji: string): Promise<void> {
    if (!this.conversationId) return;
    // No conversation ID => do nothing
    // (keeping original comment logic)
  }

  /**
   * Maintains an array of last-used emojis by removing duplicates and limiting the array to 2 items.
   *
   * @param {string[]} emojiArray - The array of emojis in memory.
   * @param {string} newEmoji - The new emoji to insert.
   * @returns {string[]} An updated array of emojis.
   */
  private updateLastUsedEmojis(
    emojiArray: string[],
    newEmoji: string
  ): string[] {
    emojiArray = emojiArray.filter((e) => e !== newEmoji);
    return emojiArray.slice(0, 2);
  }

  /**
   * Listens for real-time emoji usage updates from Firestore, applying them to the
   * local arrays of last used emojis for 'sent' and 'received'.
   */
  private listenForEmojiUpdates(): void {
    if (!this.conversationId) return;

    this.unsubscribeEmojiListener = this.messageService.listenForEmojiUpdates(
      this.conversationId,
      (sentEmojis, receivedEmojis) => {
        this.lastUsedEmojisSent = sentEmojis;
        this.lastUsedEmojisReceived = receivedEmojis;
      }
    );
  }

  /**
   * Loads the last used emojis for this conversation in both 'sent' and 'received' categories,
   * then starts the real-time emoji usage listener.
   */
  private async loadLastUsedEmojis(): Promise<void> {
    if (!this.currentUser || !this.recipientId) {
      return;
    }

    try {
      const conversationId = this.messageService.generateConversationId(
        this.currentUser.id,
        this.recipientId
      );

      const [lastSent, lastReceived] = await Promise.all([
        this.messageService.getLastUsedEmojis(conversationId, 'sent'),
        this.messageService.getLastUsedEmojis(conversationId, 'received'),
      ]);

      this.lastUsedEmojisSent = lastSent || [];
      this.lastUsedEmojisReceived = lastReceived || [];

      this.listenForEmojiUpdates();
    } catch (error) {
      // Error loading emojis
    }
  }

  /**
   * Sends a private message (with optional image), updates the UI immediately,
   * replaces temp message with a real Firestore ID, and refreshes emojis/time.
   *
   * @param {HTMLTextAreaElement} textArea - The input area to reset after sending.
   */
  async sendPrivateMessage(textArea: HTMLTextAreaElement): Promise<void> {
    const sid = this.userService.getCurrentUserId();
    if (!sid || !this.recipientId) return;

    const cid = this.messageService.generateConversationId(
      sid,
      this.recipientId
    );
    let [senderName, senderAvatar] = await this.ensureSenderInfo(sid);

    const { timestamp, showDateSeparator, formattedDate } =
      this.prepareTimestampInfo();
    const tempMsgId = this.createTempMessage(
      cid,
      sid,
      senderName,
      senderAvatar,
      timestamp,
      formattedDate,
      showDateSeparator
    );
    this.scrollToBottom();

    try {
      await this.finalizeMessageInFirestore(cid, sid, tempMsgId);
    } catch {
      /* Error sending message – no logic changed */
    }

    this.postSendCleanup(textArea);
  }

  /**
   * Ensures the sender name/avatar are loaded if missing. Returns [name, avatar].
   */
  private async ensureSenderInfo(senderId: string): Promise<[string, string]> {
    let name = this.currentUser?.name || 'Unknown';
    let avatar = this.currentUser?.avatarUrl || 'assets/img/avatar.png';
    if (!name) {
      try {
        const ud = await this.userService.getUserById(senderId);
        name = ud?.name || 'Unknown';
        avatar = ud?.avatarUrl || 'assets/default-avatar.png';
      } catch {
        /* Error loading user */
      }
    }
    return [name, avatar];
  }

  /**
   * Prepares the current timestamp/date info and determines if a date separator is needed.
   */
  private prepareTimestampInfo(): {
    timestamp: Date;
    showDateSeparator: boolean;
    formattedDate: string;
  } {
    const timestamp = new Date();
    const formattedDate = this.getFormattedDate(timestamp);
    let showDateSeparator = false;

    if (this.privateMessages.length) {
      const lastMsg = this.privateMessages[this.privateMessages.length - 1];
      showDateSeparator = !this.isSameDay(lastMsg.timestamp, timestamp);
    } else {
      showDateSeparator = true;
    }
    return { timestamp, showDateSeparator, formattedDate };
  }

  /**
   * Builds and appends a temporary message into privateMessages, returning the tempMsgId.
   */
  private createTempMessage(
    convId: string,
    senderId: string,
    sName: string,
    sAvatar: string,
    ts: Date,
    fmtDate: string,
    showSep: boolean
  ): string {
    const tempMsgId = `temp-${Math.random().toString(36).substr(2, 9)}`;
    const tempData = {
      id: tempMsgId,
      content: {
        text: this.privateMessage || '',
        image: typeof this.imageUrl === 'string' ? this.imageUrl : '',
        emojis: [],
      },
      timestamp: ts,
      formattedDate: fmtDate,
      showDateSeparator: showSep,
      time: formatDate(ts, 'HH:mm', 'de'),
      senderId,
      senderName: sName,
      senderAvatar: sAvatar,
      conversationId: convId,
    };
    this.privateMessages = [...this.privateMessages, tempData];
    return tempMsgId;
  }

  /**
   * Sends the final message to Firestore, updates local messages with the real ID
   * and refreshes last-used emojis if found.
   */
  private async finalizeMessageInFirestore(
    cId: string,
    sId: string,
    tempId: string
  ): Promise<void> {
    const fsId = await this.messageService.sendMessage({
      type: 'private',
      conversationId: cId,
      content: {
        text: this.privateMessage || '',
        image: typeof this.imageUrl === 'string' ? this.imageUrl : '',
        emojis: [],
      },
      senderId: sId,
      recipientId: this.recipientId,
    });

    this.privateMessages = this.privateMessages.map((m) =>
      m.id === tempId ? { ...m, id: fsId } : m
    );
    const saved = await this.messageService.getMessage('private', fsId);
    if (cId && saved?.content?.emojis?.length) {
      const eArr = saved.content.emojis.map((x: { emoji: string }) => x.emoji);
      await this.messageService.saveLastUsedEmojis(cId, eArr, 'sent');
    }
    await this.loadLastUsedEmojis();
    this.listenForEmojiUpdates();
  }

  /**
   * Clears the current message & image, resets textarea height, updates date logic.
   */
  private postSendCleanup(txtArea: HTMLTextAreaElement): void {
    this.privateMessage = '';
    this.imageUrl = null;
    if (txtArea) this.resetTextareaHeight(txtArea);
    this.updateMessageDates();
  }

  /**
   * Saves modifications to an edited message in Firestore, then updates the local message array.
   * Typically called by the template when the user clicks a "save" button.
   *
   * @param {any} msg - The message object with updated content.
   */
  async saveMessage(msg: any): Promise<void> {
    if (msg?.isEditing !== undefined) {
      msg.isEditing = false; // End editing mode
      const messageId = msg.id;

      if (messageId) {
        try {
          await this.messageService.updateMessage(messageId, {
            content: msg.content,
          });

          // Update the local list of messages
          this.privateMessages = this.privateMessages.map((m) =>
            m.id === messageId ? { ...msg, isEditing: false } : m
          );
        } catch (err) {
          // Error updating message
        }
      } else {
        // No message ID
      }
    }
  }

  /**
   * Formats a date as 'Heute', 'Gestern', or a localized string (e.g. "Samstag, 21. Dezember").
   * @param {Date | string | null} inputDate - The date or timestamp to format.
   * @returns {string} A user-friendly date string in German.
   */
  getFormattedDate(inputDate: Date | string | null): string {
    if (!inputDate) return '';
    const d = inputDate instanceof Date ? inputDate : new Date(inputDate);
    if (isNaN(d.getTime())) return 'Ungültiges Datum';

    const now = new Date(),
      today = new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      yest = new Date(today);
    yest.setDate(today.getDate() - 1);

    const cmp = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (cmp.getTime() === today.getTime()) return 'Heute';
    if (cmp.getTime() === yest.getTime()) return 'Gestern';
    return d.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      timeZone: 'Europe/Berlin',
    });
  }

  /**
   * Safely converts a given timestamp from Firestore or other types (Date, string, etc.)
   * into a standard JavaScript Date.
   *
   * @param {unknown} timestamp - The timestamp to convert.
   * @returns {Date} A valid Date object, or the current date if conversion fails.
   */
  private safeConvertTimestamp(timestamp: unknown): Date {
    if (!timestamp) return new Date();

    if (typeof (timestamp as any).toDate === 'function') {
      return (timestamp as firebase.firestore.Timestamp).toDate();
    }
    if (timestamp instanceof Date) {
      return timestamp;
    }
    if (typeof timestamp === 'object' && 'seconds' in (timestamp as object)) {
      const ts = timestamp as { seconds: number; nanoseconds: number };
      return new Date(ts.seconds * 1000 + ts.nanoseconds / 1e6);
    }

    const parsedDate = new Date(timestamp as string | number);
    return isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  }

  /**
   * Gets the date object representing "yesterday" for date comparisons if needed.
   */
  private getYesterdayDate(): Date {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  }

  /**
   * Loads the current user's data from Firestore and stores it in `currentUser`.
   */
  async loadCurrentUser(): Promise<void> {
    return this.userService
      .getCurrentUserData()
      .then((user) => {
        this.currentUser = user;
      })
      .catch(() => {
        // Error getting current user
      });
  }

  /**
   * Called when user selects an image. Reads as data URL, sets imageUrl, optionally adjusts textarea height.
   */
  onImageSelected(event: Event, textArea?: HTMLTextAreaElement): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imageUrl = e.target?.result || null;
        if (textArea) {
          this.adjustTextareaHeight(textArea);
        }
        this.isTextareaExpanded = true;
      };
      reader.readAsDataURL(file);
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
   * Adds a globally selected emoji to the current message in the input field.
   */
  addEmoji(event: any): void {
    if (event && event.emoji && event.emoji.native) {
      this.privateMessage += event.emoji.native;
    }
  }

  onEmojiPickerClick(e: MouseEvent): void {
    e.stopPropagation(); // Verhindert, dass der Klick als Außenklick gilt.
  }

  /**
   * Opens the image modal if there's a selected image to preview.
   */
  openImageModal(): void {
    this.isImageModalOpen = true;
  }

  /**
   * Closes the image modal.
   */
  closeImageModal(): void {
    this.isImageModalOpen = false;
  }

  /**
   * Closes the image preview/profile card, clearing imageUrl and resetting textarea height.
   */
  closeProfileCard(textArea: HTMLTextAreaElement): void {
    this.imageUrl = null;
    this.resetTextareaHeight(textArea);
  }

  /**
   * Expands the textarea bottom padding if an image is present.
   */
  adjustTextareaHeight(textArea: HTMLTextAreaElement): void {
    if (this.imageUrl) {
      textArea.style.paddingBottom = '160px';
    }
  }

  /**
   * Resets the textarea's bottom padding to a default value.
   */
  resetTextareaHeight(textArea: HTMLTextAreaElement): void {
    textArea.style.paddingBottom = '20px';
  }

  /**
   * Handles Enter key in the message input. Sends message if Shift not pressed, otherwise newline.
   */
  handleKeyDown(event: KeyboardEvent, textArea: HTMLTextAreaElement): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendPrivateMessage(textArea);
    }
  }

  /**
   * Loads all users for the mention system or user overlay.
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
      .catch((err) => console.error('Fehler beim Laden der Nutzer:', err));
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
   * Adds an "@username" mention to the `privateMessage` input and closes the dropdown.
   */
  addUserSymbol(member: any) {
    if (this.privateMessage.endsWith('@')) {
      this.privateMessage = this.privateMessage.slice(0, -1);
    }
    this.privateMessage += ` @${member.name} `;
    this.closeDropdown();
  }

  /**
   * Highlights a message by ID, scrolling it into view and applying a CSS highlight class briefly.
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
   * Toggles an inline emoji picker for a specific message. Ensures only one is visible at a time.
   */
  toggleEmojiPickerForMessage(msg: any): void {
    const isCurrentlyVisible = msg.isEmojiPickerVisible;
    this.privateMessages.forEach((m) => (m.isEmojiPickerVisible = false));
    msg.isEmojiPickerVisible = !isCurrentlyVisible;
  }

  /**
   * Generates a unique conversation ID by sorting two user IDs alphabetically and joining them.
   */
  generateConversationId(userId1: string, userId2: string): string {
    return [userId1, userId2].sort().join('_');
  }

  /**
   * Toggles edit options for a given message, identified by its ID.
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
   * Marks a message as "isEditing = true," storing its original content.
   */
  startEditing(msg: any): void {
    msg.isEditing = true;
    this.originalMessage = JSON.parse(JSON.stringify(msg));
    this.showEditOptions = false;
  }

  /**
   * Toggles a message to editing mode, also storing the original for potential revert on cancel.
   */
  toggleEditMessage(msg: any): void {
    msg.isEditing = true;
    this.originalMessage = { ...msg };
  }

  /**
   * Cancels editing a message, reverting any text changes to the original content.
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
   * Closes any expanded popup that displays all emojis in a given message.
   */
  closePopup(msg: any) {
    if (msg.showAllEmojisList) {
      msg.showAllEmojisList = false;
      msg.expanded = false;
    }
  }

  /**
   * Toggles a popup listing all emojis in a particular message.
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
   * (Log entfernt) Logs "plus" icon clicks in the emoji popup, if your UI uses it to add a new emoji or open a picker.
   */
  onEmojiPlusInPopup(msg: any) {
    // console.log('Plus clicked in emoji popup, msg=', msg);  // REMOVED
  }

  /**
   * Opens a large view of the given image if it is a string (URL or dataURL).
   */
  openLargeImage(imageData: string | ArrayBuffer) {
    if (typeof imageData !== 'string') {
      return;
    }
    this.largeImageUrl = imageData;
    this.showLargeImage = true;
  }

  /**
   * Closes the currently displayed large image.
   */
  closeLargeImage() {
    this.showLargeImage = false;
    this.largeImageUrl = null;
  }

  /**
   * Checks if two Date objects are on the same day, ignoring times.
   */
  private isSameDay(date1: Date | null, date2: Date | null): boolean {
    if (!date1 || !date2) return false;
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
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
