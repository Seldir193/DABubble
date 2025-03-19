/**
 * The SearchFieldComponent provides a combined UI for searching users
 * and sending messages (including images/emojis) to either selected
 * recipients or all at once. It integrates user filtering, private
 * message handling, and additional functionalities such as system
 * messages and typed mentions. No logic or style has been changed –
 * only these English JSDoc comments have been added.
 */
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
import { CommonModule, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../user.service';
import { ChannelService } from '../channel.service';
import { MatDialog } from '@angular/material/dialog';
import { Message } from '../message.models';
import { MessageService } from '../message.service';
import { ActivatedRoute } from '@angular/router';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { Router } from '@angular/router';
import { OverlayModule } from '@angular/cdk/overlay';

/**
 * Structure of a message's main content, potentially containing text,
 * an image, and an array of emojis with usage counts.
 */
export interface MessageContent {
  text?: string;
  image?: string | ArrayBuffer | null;
}

/**
 * Structure of an emoji item, with an emoji character and a usage count.
 */
interface EmojiItem {
  emoji: string;
  count: number;
}

/**
 * The SearchFieldComponent allows for user search,
 * multi-selection of recipients, and sending messages
 * (including images and emojis) to these recipients.
 */
@Component({
  selector: 'app-search-field',
  standalone: true,
  imports: [CommonModule, FormsModule, PickerModule, OverlayModule],
  templateUrl: './search-field.component.html',
  styleUrls: ['./search-field.component.scss'],
})
export class SearchFieldComponent {
  /**
   * Emitted when this search field is closed (e.g., user
   * has completed or canceled the search).
   */
  @Output() close = new EventEmitter<void>();

  /**
   * Emitted when a user is selected, passing that user's info
   * (e.g., id, name) to the parent.
   */
  @Output() memberSelected = new EventEmitter<any>();

  /**
   * The query text used for searching users.
   */
  searchQuery: string = '';

  /**
   * Holds the users filtered by the search query.
   */
  filteredMembers: any[] = [];

  /**
   * Flag indicating if no results were found for the current query.
   */
  noResultsFound: boolean = false;

  /**
   * A reference to the DOM element containing the message list,
   * used for auto-scrolling.
   */
  @ViewChild('messageList') messageList!: ElementRef;

  /**
   * The display name of a specific recipient (if used for direct messages).
   */
  @Input() recipientName: string = '';

  /**
   * The unique ID of that recipient (if used for direct messages).
   */
  @Input() recipientId: string = '';

  /**
   * Toggles the visibility of the search field in the UI.
   */
  @Input() showSearchField: boolean = false;

  /**
   * An image URL or data URL representing a selected file to attach to a message.
   */
  imageUrl: string | ArrayBuffer | null = null;

  /**
   * Text for sending as a private or group message.
   */
  privateMessage: string = '';

  /**
   * Stores the current user's info after loading from Firestore.
   */
  currentUser: any;

  /**
   * Array of messages if fetching direct messages. Each item is typed
   * as a `Message` from message.models.
   */
  privateMessages: any[] = [];

  /**
   * A generated conversation ID (if used for a direct conversation).
   */
  conversationId: string | undefined;

  /**
   * The online/offline status of a direct chat recipient (e.g., 'Aktiv', 'Abwesend').
   */
  recipientStatus: string = '';

  /**
   * The avatar URL of the direct chat recipient.
   */
  recipientAvatarUrl: string = '';

  /**
   * Toggles the global emoji picker for sending messages.
   */
  isEmojiPickerVisible: boolean = false;

  /**
   * Indicates if an image modal is open for viewing a selected image in detail.
   */
  isImageModalOpen = false;

  /**
   * Stores the current date for logic such as "Heute" or "Gestern".
   */
  currentDate: Date = new Date();

  /**
   * The "yesterday" date used for date comparisons.
   */
  yesterdayDate: Date = this.getYesterdayDate();

  /**
   * Tracks if a textarea is expanded because an image is attached.
   */
  isTextareaExpanded: boolean = false;

  /**
   * Text used in the message input field (e.g. if sending broadcast messages).
   */
  //message: string = '';

  /**
   * Lists of emojis frequently used in sent or received messages.
   */
  lastUsedEmojisReceived: string[] = [];
  lastUsedEmojisSent: string[] = [];

  /**
   * Toggles edit options for a specific message.
   */
  showEditOptions: boolean = false;

  /**
   * Identifies the currently edited message by its ID.
   */
  currentMessageId: string | null = null;

  /**
   * Stores a backup of the original message content if the user starts editing.
   */
  originalMessage: any = null;

  /**
   * Tooltip management for emojis (visibility, position, etc.).
   */
  tooltipVisible = false;
  tooltipPosition = { x: 0, y: 0 };
  tooltipEmoji = '';
  tooltipSenderName = '';

  /**
   * If sending a broadcast message to multiple recipients,
   * this array tracks which recipients are selected.
   */
  selectedRecipients: any[] = [];

  /**
   * The text typed when sending a broadcast to all selected recipients.
   */
  messageToAll: string = 'An: #channel, oder @jemand';

  /**
   * Optional array for storing "system messages" if needed. (Currently unused)
   */
  //systemMessages: any[] = [];

  /**
   * Toggles an "@" mention dropdown.
   */
  showAtDropdown: boolean = false;

  /**
   * Holds all members (e.g., for mention or multi-select).
   */
  allMembers: any[] = [];

  /**
   * Indicates whether the screen is in desktop mode (>= 1278px).
   */
  isDesktop = false;
  placeholderText = '';

  /**
   * Constructor injecting route info, user/channels, dialog, messageService, and router if needed.
   */
  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private channelService: ChannelService,
    private dialog: MatDialog,
    private messageService: MessageService,
    private router: Router
  ) {}

 
  /**
   * Lifecycle hook. Loads current user, recipient data, sets desktop mode,
   * and if needed, fetches messages or emojis for a direct conversation.
   */
  async ngOnInit(): Promise<void> {
    // 1) Allg. Initialisierungen
    await this.loadCurrentUser();
    this.loadRecipientData();
    this.checkDesktopWidth();
    this.updatePlaceholderText(window.innerWidth);

    // 2) Lade den aktuellen User nochmals (falls nötig)
    this.currentUser = await this.userService.getCurrentUserData();

    // 3) Wenn wir einen Empfänger haben, führe das Setup der Conversation durch
    if (this.currentUser && this.recipientId) {
      this.initializeDirectConversation();
    }
  }

 

  /**
   * Ausgelagerte Logik, die bisher in ngOnInit() stand.
   * Lädt Nachrichten und Emojis zur privaten Unterhaltung.
   */
  private initializeDirectConversation(): void {
    // Conversation ID generieren
    this.conversationId = this.messageService.generateConversationId(
      this.currentUser.id,
      this.recipientId
    );

    // Nachrichten laden
    this.messageService
      .getMessagesOnce('private', this.conversationId)
      .then((messages: Message[]) => {
        this.privateMessages = messages.map((msg) => ({
          ...msg,
          content: { ...msg.content, emojis: msg.content?.emojis || [] },
        }));
        this.scrollToBottom();
      })
      .catch(() => {});

    // Emojis laden
    this.loadLastUsedEmojis();
  }

  /**
   * HostListener tracking window resize events to update desktop mode status.
   */
  @HostListener('window:resize',  ['$event'])
  onResize(event: any): void {
    this.checkDesktopWidth();
    this.updatePlaceholderText(event.target.innerWidth);
  }

  /**
   * Updates the placeholder text depending on screen width.
   */
  private updatePlaceholderText(width: number) {
    if (width > 1278) {
      this.placeholderText = 'An: #channel, oder @jemand oder E-Mail Adresse';
    } else {
      this.placeholderText = 'An: #channel, oder @jemand';
    }
  }

  /**
   * Checks if the screen width is >= 1278px to set isDesktop to true.
   */
  checkDesktopWidth() {
    this.isDesktop = window.innerWidth >= 1278;
  }

  /**
   * Loads the last used emojis from the conversation's recent messages,
   * storing them in `lastUsedEmojisSent`/`Received`.
   */
  private async loadLastUsedEmojis(): Promise<void> {
    if (!this.conversationId) return;

    try {
      const messages = await this.messageService.getMessagesOnce(
        'private',
        this.conversationId
      );
      const lastMessages = messages.slice(-10);

      this.lastUsedEmojisSent = [];
      this.lastUsedEmojisReceived = [];

      lastMessages.forEach((msg: Message) => {
        if (msg.content?.emojis) {
          if (msg.senderId === this.currentUser.id) {
            this.lastUsedEmojisSent.push(
              ...msg.content.emojis.map((e) => e.emoji)
            );
          } else {
            this.lastUsedEmojisReceived.push(
              ...msg.content.emojis.map((e) => e.emoji)
            );
          }
        }
      });

      this.lastUsedEmojisSent = [...new Set(this.lastUsedEmojisSent)].slice(
        0,
        5
      );
      this.lastUsedEmojisReceived = [
        ...new Set(this.lastUsedEmojisReceived),
      ].slice(0, 5);
    } catch (error) {}
  }

  /**
   * Formats a date string as 'Heute', 'Gestern', or a localized German date.
   */
  getFormattedDate(dateString: string): string {
    if (!dateString) {
      return 'Ungültiges Datum';
    }

    // 1) Date parsen
    const date = this.parseDateString(dateString);

    // 2) Prüfen, ob das Ergebnis ein gültiges Date ist
    if (isNaN(date.getTime())) {
      return 'Ungültiges Datum';
    }

    // 3) Heute / Gestern prüfen
    if (this.isSameDay(date, new Date())) {
      return 'Heute';
    } else if (this.isSameDay(date, this.getYesterdayDate())) {
      return 'Gestern';
    }

    // 4) Andernfalls lokalisiertes Datum zurückgeben
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    };
    return date.toLocaleDateString('de-DE', options);
  }

  /**
   * Parses a date string in the format 'dd.mm.yyyy' or a generic string date.
   * Returns the corresponding Date object (may be invalid if the parsing fails).
   */
  private parseDateString(dateString: string): Date {
    const parts = dateString.split('.');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return new Date(dateString);
  }

  /**
   * Returns the date object representing "yesterday" for date comparison.
   */
  private getYesterdayDate(): Date {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  }

  /**
   * Checks if two dates fall on the same calendar day.
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  }

  /**
   * Loads the current user's data from Firestore, storing it in `currentUser`.
   */
  async loadCurrentUser(): Promise<void> {
    return this.userService
      .getCurrentUserData()
      .then((user) => {
        this.currentUser = user;
      })
      .catch(() => {});
  }

  /**
   * If a `recipientId` is provided, loads that user's data (status, avatar, etc.) for display.
   */
  loadRecipientData(): void {
    if (this.recipientId) {
      this.userService
        .getUserById(this.recipientId)
        .then((userData) => {
          this.recipientStatus = userData.isOnline ? 'Aktiv' : 'Abwesend';
          this.recipientAvatarUrl = userData.avatarUrl || '';
        })
        .catch(() => {});
    }
  }

  /**
   * Loads private messages once for the generated conversation ID, storing them in `privateMessages`.
   */
  loadPrivateMessages(): void {
    const senderId = this.userService.getCurrentUserId();
    if (senderId && this.recipientId) {
      const conversationId = this.messageService.generateConversationId(
        senderId,
        this.recipientId
      );
      this.messageService
        .getMessagesOnce('private', conversationId)
        .then((messages: Message[]) => {
          this.privateMessages = messages.map((msg: Message) => ({
            ...msg,
            timestamp:
              msg.timestamp instanceof Date ? msg.timestamp : new Date(),
          }));
          this.scrollToBottom();
        })
        .catch(() => {});
    } else {
    }
  }

  /**
   * Called when an image is selected from a file input. Reads as data URL and optionally adjusts textarea height.
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
   * Toggles the global emoji picker for the broadcast message input or other usage.
   */
  toggleEmojiPicker(): void {
    this.isEmojiPickerVisible = !this.isEmojiPickerVisible;
  }

  /**
   * Adds a selected emoji from the global picker to `messageToAll`.
   */
  addEmoji(event: any): void {
    if (event?.emoji?.native) {
      this.messageToAll += event.emoji.native;
    }
    this.isEmojiPickerVisible = false;
  }

  /**
   * Opens a modal to view the selected image in larger detail.
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
   * Closes the profile card or image preview, clearing the selected image and resetting textarea height.
   */
  closeProfileCard(textArea: HTMLTextAreaElement): void {
    this.imageUrl = null;
    this.resetTextareaHeight(textArea);
  }

  /**
   * Increases the textarea's bottom padding if an image is present.
   */
  adjustTextareaHeight(textArea: HTMLTextAreaElement): void {
    if (this.imageUrl) {
      textArea.style.paddingBottom = '160px';
    }
  }

  /**
   * Resets the bottom padding of the textarea to default.
   */
  resetTextareaHeight(textArea: HTMLTextAreaElement): void {
    textArea.style.paddingBottom = '20px';
  }

  /**
   * Handles the Enter key in the broadcast message input. If Shift is not pressed, sends the message.
   */
  handleKeyDown(event: KeyboardEvent, textArea: HTMLTextAreaElement): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessageToAll(textArea);
    }
  }

  /**
   * Scrolls the message list to the bottom after a brief delay, ensuring the view is updated first.
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
   * Inserts '@' at the end of messageToAll, potentially used to mention a user
   * in a broadcast scenario.
   */
  addAtSymbolAndOpenDialog(): void {
    this.messageToAll += '@';
  }

  /**
   * Toggles an inline emoji picker for a specific message object, ensuring only one is open at once.
   */
  toggleEmojiPickerForMessage(msg: any): void {
    const isCurrentlyVisible = msg.isEmojiPickerVisible;
    this.privateMessages.forEach((m) => (m.isEmojiPickerVisible = false));
    msg.isEmojiPickerVisible = !isCurrentlyVisible;
  }

  /**
   * Lifecycle hook that watches for changes to `recipientId`,
   * reloading data if a new recipient is set.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['recipientId'] && !changes['recipientId'].isFirstChange()) {
      this.loadRecipientData();
      this.loadPrivateMessages();
    }
  }

  /**
   * Generates a stable conversation ID by sorting two user IDs alphabetically.
   */
  generateConversationId(userId1: string, userId2: string): string {
    return [userId1, userId2].sort().join('_');
  }

  /**
   * Adds an emoji to a given message, updating the local message's emoji array.
   * (Ohne das Schließen des Pickers und Firestore-Update)
   */
  addEmojiToMessage(event: any, msg: any): void {
    if (!msg.content.emojis) {
      msg.content.emojis = [];
    }
    const newEmoji = event.emoji.native;
    const existingEmoji = msg.content.emojis.find(
      (e: any) => e.emoji === newEmoji
    );

    if (existingEmoji) {
      existingEmoji.count += 1;
    } else {
      msg.content.emojis.push({ emoji: newEmoji, count: 1 });
    }

    if (msg.senderName === this.currentUser?.name) {
      if (!this.lastUsedEmojisSent.includes(newEmoji)) {
        this.lastUsedEmojisSent = [newEmoji, ...this.lastUsedEmojisSent].slice(
          0,
          2
        );
      }
    } else {
      if (!this.lastUsedEmojisReceived.includes(newEmoji)) {
        this.lastUsedEmojisReceived = [
          newEmoji,
          ...this.lastUsedEmojisReceived,
        ].slice(0, 2);
      }
    }
  }

  /**
   * Closes the emoji picker for the given message and saves the updated emoji array to Firestore.
   */
  closeEmojiPicker(msg: any): void {
    msg.isEmojiPickerVisible = false;

    this.messageService
      .updateMessage(msg.id, {
        'content.emojis': msg.content.emojis,
      })
      .then(() => {
        // console.log entfernt
      })
      .catch((error) => console.error('❌ Error adding emoji:', error));
  }

  /**
   * Saves an edited message to Firestore, updating the local list afterward.
   */
  async saveMessage(msg: any): Promise<void> {
    if (msg?.isEditing !== undefined) {
      msg.isEditing = false;
      const messageId = msg.id;
      if (messageId) {
        try {
          await this.messageService.updateMessage(messageId, {
            content: msg.content,
          });
          this.privateMessages = this.privateMessages.map((m) =>
            m.id === messageId ? { ...msg, isEditing: false } : m
          );
        } catch (err) {}
      } else {
      }
    }
  }

  /**
   * Initializes a conversation by loading the last emojis and messages for a user/recipient combination.
   */
  async initializeConversation(): Promise<void> {
    // Früher Check: Haben wir alle nötigen Daten?
    if (!this.currentUser || !this.recipientId) {
      return;
    }

    // Conversation-ID ermitteln
    const conversationId = this.messageService.generateConversationId(
      this.currentUser.id,
      this.recipientId
    );

    // 1) Emojis laden & "lastUsedEmojisSent"/"lastUsedEmojisReceived" aktualisieren
    await this.loadLastUsedEmojisForConversation(conversationId);

    // 2) Private Nachrichten laden und in this.privateMessages speichern
    this.loadPrivateMessagesForConversation(conversationId);
  }

  /**
   * Loads up to the last 10 messages of the conversation, extracting emojis
   * to update 'lastUsedEmojisSent' / 'lastUsedEmojisReceived' for the current user.
   */
  private async loadLastUsedEmojisForConversation(
    conversationId: string
  ): Promise<void> {
    try {
      // 1) Letzte 10 Nachrichten abrufen
      const lastMessages = await this.fetchLastTenMessages(conversationId);

      // 2) Emojis je nach Sender in lastUsedEmojisSent / lastUsedEmojisReceived pushen
      this.processEmojisFromMessages(lastMessages);

      // 3) Auf 5 unique Emojis begrenzen
      this.limitTopEmojis();
    } catch (error: any) {
      console.error('❌ Error loading last emojis:', error);
    }
  }

  /**
   * Fetches all messages and returns only the last 10 of them.
   */
  private async fetchLastTenMessages(
    conversationId: string
  ): Promise<Message[]> {
    const messages: Message[] = await this.messageService.getMessagesOnce(
      'private',
      conversationId
    );
    return messages.slice(-10);
  }

  /**
   * Pushes emojis from each message into either lastUsedEmojisSent or lastUsedEmojisReceived,
   * depending on who sent the message.
   */
  private processEmojisFromMessages(lastMessages: Message[]): void {
    this.lastUsedEmojisSent = [];
    this.lastUsedEmojisReceived = [];

    lastMessages.forEach((msg: Message) => {
      if (msg.content?.emojis) {
        if (msg.senderId === this.currentUser.id) {
          this.lastUsedEmojisSent.push(
            ...msg.content.emojis.map((e) => e.emoji)
          );
        } else {
          this.lastUsedEmojisReceived.push(
            ...msg.content.emojis.map((e) => e.emoji)
          );
        }
      }
    });
  }

  /**
   * Keeps only up to the first 5 unique emojis in both
   * lastUsedEmojisSent and lastUsedEmojisReceived.
   */
  private limitTopEmojis(): void {
    this.lastUsedEmojisSent = [...new Set(this.lastUsedEmojisSent)].slice(0, 5);
    this.lastUsedEmojisReceived = [
      ...new Set(this.lastUsedEmojisReceived),
    ].slice(0, 5);
  }

  /**
   * Loads all messages for the conversation, normalizing the 'emojis' array,
   * then scrollt zum Ende der Liste.
   */
  private loadPrivateMessagesForConversation(conversationId: string): void {
    this.messageService
      .getMessagesOnce('private', conversationId)
      .then((messages: Message[]) => {
        this.privateMessages = messages.map((msg: Message) => ({
          ...msg,
          content: { ...msg.content, emojis: msg.content?.emojis || [] },
        }));
        this.scrollToBottom();
      })
      .catch((error: any) => {
        console.error('❌ Error retrieving private messages:', error);
      });
  }

  /**
   * Toggles the edit options for a specific message based on its ID.
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
   * Marks a message as editing mode, storing its original for revert if canceled.
   */
  startEditing(msg: any): void {
    msg.isEditing = true;
    this.originalMessage = { ...msg };
    this.showEditOptions = false;
  }

  /**
   * Alternative approach to open editing for a message, also saving the original content.
   */
  toggleEditMessage(msg: any): void {
    msg.isEditing = true;
    this.originalMessage = { ...msg };
  }

  /**
   * Cancels editing of a message, reverting to the original text if available.
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
   * Displays a tooltip above an emoji, showing the emoji char and the sender's name.
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
   * Hides the currently shown tooltip.
   */
  hideTooltip(): void {
    this.tooltipVisible = false;
  }

  /**
   * Selects a user from the search results, emits an event to the parent, then closes the search.
   */
  selectMember(member: any): void {
    this.memberSelected.emit(member);
    this.closeSearch();
  }

  /**
   * Closes the search field, emitting an event to the parent.
   */
  closeSearch(): void {
    this.close.emit();
  }

  /**
   * Called whenever the user types in the search field,
   * filtering members via userService.getUsersByFirstLetter().
   */
  onSearchInput(): void {
    if (this.searchQuery.trim()) {
      this.userService
        .getUsersByFirstLetter(this.searchQuery)
        .then((users) => {
          this.filteredMembers = users.map((user) => ({
            id: user.id || user.uid,
            email: user.email,
            name: user.name,
            avatarUrl: user.avatarUrl || 'assets/img/avatar.png',
          }));
          this.noResultsFound = users.length === 0;
        })
        .catch(() => {
          this.filteredMembers = [];
          this.noResultsFound = true;
        });
    } else {
      this.filteredMembers = [];
      this.noResultsFound = false;
    }
  }

  /**
   * Broadcasts a message (and optional image) to all selected recipients,
   * sending separate private messages to each. Clears the input afterward.
   */
  async sendMessageToAll(textArea: HTMLTextAreaElement): Promise<void> {
    // 1) Schnelle Abbruchprüfung
    if (this.shouldCancelBroadcast()) {
      return;
    }

    // 2) Für jeden Empfänger eine Private Message senden
    for (const recipient of this.selectedRecipients) {
      const conversationId = this.messageService.generateConversationId(
        this.currentUser.id,
        recipient.id
      );
      const messageData = this.createBroadcastMessageData(
        conversationId,
        recipient.id
      );
      try {
        await this.messageService.sendMessage(messageData);
      } catch (error) {
        // Fehler beim Senden eines PM
      }
    }

    // 3) Felder zurücksetzen + Textarea-Reset
    this.clearBroadcastInput(textArea);
  }

  /**
   * Prüft, ob wir den Vorgang abbrechen sollen (z.B. kein Text/keine ID).
   */
  private shouldCancelBroadcast(): boolean {
    if (!this.messageToAll.trim() && !this.imageUrl) {
      return true;
    }
    if (!this.currentUser?.id) {
      return true;
    }
    return false;
  }

  /**
   * Erstellt die Message-Daten für die Private Message
   * inkl. Zeitstempel, Text, Bild etc.
   */
  private createBroadcastMessageData(
    conversationId: string,
    recipientId: string
  ) {
    return {
      type: 'private' as const,
      conversationId,
      content: {
        text: this.messageToAll.trim(),
        image: typeof this.imageUrl === 'string' ? this.imageUrl : '',
        emojis: [],
      },
      date: formatDate(new Date(), 'dd.MM.yyyy', 'en'),
      timestamp: new Date(),
      time: new Date().toLocaleTimeString(),
      senderId: this.currentUser.id,
      senderName: this.currentUser.name || 'Unbekannt',
      senderAvatar: this.currentUser.avatarUrl || '',
      recipientId,
    };
  }

  /**
   * Setzt nach erfolgreichem Senden das Eingabefeld, das Bild und
   * die Emoji-Picker-Ansicht zurück und scrollt ans Ende.
   */
  private clearBroadcastInput(textArea: HTMLTextAreaElement): void {
    this.messageToAll = '';
    this.imageUrl = null;
    if (textArea) this.resetTextareaHeight(textArea);

    this.isEmojiPickerVisible = false;
    this.scrollToBottom();
  }

  /**
   * Adds a recipient to the array of selected recipients.
   */
  addRecipient(member: any) {
    const alreadySelected = this.selectedRecipients.some(
      (m) => m.id === member.id
    );
    if (!alreadySelected) {
      this.selectedRecipients.push(member);

      // Optionally add a system message about it:
    }

    this.searchQuery = '';
    this.filteredMembers = [];
  }

  /**
   * Removes a previously added recipient from the selectedRecipients array.
   */
  removeRecipient(member: any) {
    const index = this.selectedRecipients.findIndex((m) => m.id === member.id);
    if (index > -1) {
      this.selectedRecipients.splice(index, 1);
    }
  }

  /**
   * (Optional) Adds a system message to the local privateMessages array or systemMessages array.
   */
  addSystemMessage(text: string) {
    const sysMsg = {
      type: 'system',
      content: { text },
      timestamp: new Date(),
    };
    this.privateMessages.push(sysMsg);
  }

  /**
   * Toggles the "@" mention dropdown, loading all members if opening for the first time.
   */
  toggleAtDropdown(): void {
    if (!this.showAtDropdown) {
      this.loadAllUsers();
    }
    this.showAtDropdown = !this.showAtDropdown;
  }

  /**
   * Loads all users from Firestore for mention or multi-recipient selection,
   * storing them in `allMembers`.
   */
  loadAllUsers(): void {
    this.userService
      .getAllUsers()
      .then((users) => {
        this.allMembers = users.map((u) => ({
          id: u.id,
          name: u.name,
          avatarUrl: u.avatarUrl || 'assets/img/avatar.png',
          isOnline: u.isOnline ?? false,
        }));
      })
      .catch((err) => console.error('Error loading all users:', err));
  }

  /**
   * On selecting a user from the "@" mention dropdown, inserts their name
   * into the messageToAll string and closes the dropdown.
   */
  addAtSymbolFor(member: any): void {
    this.messageToAll += '@' + member.name + ' ';
    this.showAtDropdown = false;
  }
}
