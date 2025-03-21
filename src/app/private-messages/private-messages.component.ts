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
   * and starts live updates (messages, emojis, reply counts, date refresh).
   */
  async ngOnInit(): Promise<void> {
    await this.loadCurrentUser();
    this.loadRecipientData();
    this.checkDesktopWidth();
    this.setupRecipientListener();

    if (this.currentUser?.id && this.recipientId) {
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
   * OnChanges hook: if recipientId changes, cleans up old listeners, reloads data, re-scrolls.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['recipientId'] && !changes['recipientId'].isFirstChange()) {
      this.hasScrolledOnChange = true;
      this.isChatChanging = true;
      this.cleanupListeners();
      this.loadRecipientData();
      this.loadPrivateMessages();

      if (this.unsubscribeRecipient) {
        this.unsubscribeRecipient();
      }

      this.setupRecipientListener();

      setTimeout(() => {
        this.scrollToBottom();
        this.isChatChanging = false;
      }, 200);

      this.startLiveReplyCountUpdates();
    }

    if (changes['threadData']?.currentValue) {
      const newThreadData = changes['threadData'].currentValue;

      if (newThreadData.timestamp) {
        this.getFormattedDate(newThreadData.timestamp),
          formatDate(newThreadData.timestamp, 'HH:mm', 'de');
      }
    }
  }

  /**
   * Loads the private messages for this conversation from Firestore, sets up a live listener.
   */
  async loadPrivateMessages(): Promise<void> {
    if (!this.currentUser?.id || !this.recipientId) return;

    const conversationId = this.messageService.generateConversationId(
      this.currentUser.id,
      this.recipientId
    );

    if (this.unsubscribeFromPrivateMessages) {
      this.unsubscribeFromPrivateMessages();
    }

    this.unsubscribeFromPrivateMessages =
      this.messageService.getPrivateMessagesLive(conversationId, (messages) => {
        this.privateMessages = messages.map((msg) => {
          const timestampDate = this.safeConvertTimestamp(msg.timestamp);
          const lastResponseTime = msg.lastResponseTime
            ? this.safeConvertTimestamp(msg.lastResponseTime)
            : timestampDate;

          return {
            ...msg,
            timestamp: timestampDate,
            lastResponseTime,
            formattedDate: this.getFormattedDate(timestampDate),
            content: {
              ...msg.content,
              emojis: msg.content?.emojis || [],
            },
          };
        });
        setTimeout(() => {
          this.scrollToBottom();
        }, 200);
      });
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
    this.replyCache.clear();
  }

  /**
   * Processes raw messages from Firestore, ensuring timestamps are valid Dates,
   * setting date separators, and updating local state.
   *
   * @param {Message[]} rawMessages - The array of messages from Firestore.
   */
  private processIncomingMessages(rawMessages: Message[]): void {
    let prevDate: Date | null = null;

    const updatedMessages = rawMessages.map((msg, index) => {
      const timestampDate = this.safeConvertTimestamp(msg.timestamp);
      const showDateSeparator =
        index === 0 || !this.isSameDay(prevDate, timestampDate);
      prevDate = timestampDate;

      return {
        ...msg,
        timestamp: timestampDate,
        lastResponseTime: msg.lastResponseTime
          ? this.safeConvertTimestamp(msg.lastResponseTime)
          : timestampDate,
        formattedDate: this.getFormattedDate(timestampDate),
        showDateSeparator,
        time: formatDate(timestampDate, 'HH:mm', 'de'),
        content: {
          ...msg.content,
          emojis: msg.content?.emojis?.slice() || [],
        },
        replyCount: msg.replyCount ?? 0,
      };
    });

    this.privateMessages = [...updatedMessages];
    this.updateLiveReplyCounts(updatedMessages);
  }

  /**
   * Updates live reply counts for each message by listening to partialCounts from Firestore.
   */
  private updateLiveReplyCounts(messages: Message[]): void {
    const messageIds = messages
      .map((m) => m.id)
      .filter((id): id is string => id !== undefined);

    if (messageIds.length === 0) return;

    this.unsubscribeLiveReplyCounts = this.messageService.loadReplyCountsLive(
      messageIds,
      'private',
      (partialCounts) => {
        for (const [msgId, data] of Object.entries(partialCounts)) {
          const msgIndex = this.privateMessages.findIndex(
            (m) => m.id === msgId
          );
          if (msgIndex !== -1) {
            this.privateMessages[msgIndex] = {
              ...this.privateMessages[msgIndex],
              replyCount: data.count,
              timestamp: this.privateMessages[msgIndex].timestamp,
              time: this.privateMessages[msgIndex].time,
            };
          }
        }
      }
    );
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
   * Loads the thread messages from Firestore for a given threadId,
   * updating the local privateMessages array when new data arrives.
   */
  private loadThread(threadId: string, msg: any): void {
    if (this.unsubscribeFromThreadMessages) {
      this.unsubscribeFromThreadMessages();
    }

    this.unsubscribeFromThreadMessages = this.messageService.listenMessages(
      'thread',
      threadId,
      (messages) => {
        // console.log(`📩 Thread live update for ${threadId}:`, messages);  // REMOVED
        const lastResponseTime =
          messages.length > 0
            ? this.safeConvertTimestamp(messages[messages.length - 1].timestamp)
            : null;

        this.privateMessages = this.privateMessages.map((message) => {
          if (message.id === msg.id) {
            return {
              ...message,
              replies: [...messages],
              replyCount: messages.length,
              lastResponseTime,
            };
          }
          return message;
        });
        this.openThread.emit(msg);
      }
    );
  }

  /**
   * Starts a listener to track live reply counts for the current privateMessages.
   */
  startLiveReplyCountUpdates(): void {
    if (this.unsubscribeLiveReplyCounts) {
      this.unsubscribeLiveReplyCounts();
    }

    const messageIds = this.privateMessages.map((m) => m.id || '');
    if (messageIds.length === 0) return;

    this.unsubscribeLiveReplyCounts = this.messageService.loadReplyCountsLive(
      messageIds,
      'private',
      (partialCounts) => {
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
    );
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
    if (!msg.content.emojis) {
      msg.content.emojis = [];
    }

    if (event?.emoji?.native) {
      const newEmoji = event.emoji.native;
      const existingEmoji = msg.content.emojis.find(
        (e: any) => e.emoji === newEmoji
      );

      if (existingEmoji) {
        existingEmoji.count += 1;
      } else {
        if (msg.content.emojis.length < 20) {
          msg.content.emojis.push({ emoji: newEmoji, count: 1 });
        } else {
          // Limit reached
        }
      }

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
          .catch((error) =>
            console.error('Failed to save emoji usage:', error)
          );
      } else {
        // No conversation ID
      }

      try {
        await this.messageService.updateMessage(msg.id, {
          'content.emojis': msg.content.emojis,
        });

        this.privateMessages = this.privateMessages.map((m) =>
          m.id === msg.id
            ? { ...m, content: { ...m.content, emojis: msg.content.emojis } }
            : m
        );

        if (!this.hasScrolledOnChange && this.isNearBottom()) {
          this.scrollToBottom();
        }
      } catch (error) {
        // Could not update message
      }
    }
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
   * Sends a private message, optionally with an attached image. It updates the UI immediately
   * with a temp message, then replaces it with the actual Firestore ID once saved.
   * Finally, it refreshes last used emojis and date/time logic.
   *
   * @param {HTMLTextAreaElement} textArea - The input area to reset after sending.
   */
  async sendPrivateMessage(textArea: HTMLTextAreaElement): Promise<void> {
    const senderId = this.userService.getCurrentUserId();
    if (!senderId || !this.recipientId) {
      return;
    }

    const conversationId = this.messageService.generateConversationId(
      senderId,
      this.recipientId
    );
    let senderName = this.currentUser?.name || 'Unknown';
    let senderAvatar = this.currentUser?.avatarUrl || 'assets/img/avatar.png';

    if (!senderName) {
      try {
        const userData = await this.userService.getUserById(senderId);
        senderName = userData?.name || 'Unknown';
        senderAvatar = userData?.avatarUrl || 'assets/default-avatar.png';
      } catch (error) {
        // Error loading user
      }
    }

    const timestamp = new Date();
    const formattedDate = this.getFormattedDate(timestamp);
    let showDateSeparator = false;

    if (this.privateMessages.length > 0) {
      const lastMessage = this.privateMessages[this.privateMessages.length - 1];
      showDateSeparator = !this.isSameDay(lastMessage.timestamp, timestamp);
    } else {
      showDateSeparator = true;
    }

    const tempMessageId = `temp-${Math.random().toString(36).substr(2, 9)}`;
    const tempMessageData = {
      id: tempMessageId,
      content: {
        text: this.privateMessage || '',
        image: typeof this.imageUrl === 'string' ? this.imageUrl : '',
        emojis: [],
      },
      timestamp,
      formattedDate,
      showDateSeparator,
      time: formatDate(timestamp, 'HH:mm', 'de'),
      senderId,
      senderName,
      senderAvatar,
      conversationId,
    };

    this.privateMessages = [...this.privateMessages, tempMessageData];
    this.scrollToBottom();

    try {
      const firestoreId = await this.messageService.sendMessage({
        type: 'private',
        conversationId,
        content: {
          text: this.privateMessage || '',
          image: typeof this.imageUrl === 'string' ? this.imageUrl : '',
          emojis: [],
        },
        senderId,
        senderName,
        senderAvatar,
        recipientId: this.recipientId,
      });

      this.privateMessages = this.privateMessages.map((msg) =>
        msg.id === tempMessageId ? { ...msg, id: firestoreId } : msg
      );

      const savedMessage = await this.messageService.getMessage(
        'private',
        firestoreId
      );
      if (conversationId && savedMessage?.content?.emojis?.length) {
        const emojisInMessage = savedMessage.content.emojis.map(
          (e: { emoji: string }) => e.emoji
        );
        await this.messageService.saveLastUsedEmojis(
          conversationId,
          emojisInMessage,
          'sent'
        );
      }

      await this.loadLastUsedEmojis();
      this.listenForEmojiUpdates();
    } catch (error) {
      // Error sending message
    }

    this.privateMessage = '';
    this.imageUrl = null;
    if (textArea) this.resetTextareaHeight(textArea);

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
   * Formats a date as 'Heute', 'Gestern', or a localized string (e.g., "Samstag, 21. Dezember").
   *
   * @param {Date | string | null} inputDate - The date or timestamp to format.
   * @returns {string} A user-friendly date string in German.
   */
  getFormattedDate(inputDate: Date | string | null): string {
    if (!inputDate) return '';

    const date = inputDate instanceof Date ? inputDate : new Date(inputDate);
    if (isNaN(date.getTime())) return 'Ungültiges Datum';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const compareDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    if (compareDate.getTime() === today.getTime()) {
      return 'Heute';
    } else if (compareDate.getTime() === yesterday.getTime()) {
      return 'Gestern';
    } else {
      return date.toLocaleDateString('de-DE', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        timeZone: 'Europe/Berlin',
      });
    }
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
  toggleEmojiPicker(): void {
    this.isEmojiPickerVisible = !this.isEmojiPickerVisible;
  }

  /**
   * Adds a globally selected emoji to the current message in the input field.
   */
  addEmoji(event: any): void {
    if (event && event.emoji && event.emoji.native) {
      this.privateMessage += event.emoji.native;
    }
    this.isEmojiPickerVisible = false;
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
   * Shows a tooltip near an emoji, displaying the emoji char and the sender's name.
   */
  showTooltip(event: MouseEvent, emoji: string, senderName: string): void {
    this.tooltipVisible = true;
    this.tooltipEmoji = emoji;
    this.tooltipSenderName = senderName;
    this.tooltipPosition = {
      x: event.clientX,
      y: event.clientY - 40,
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
}
