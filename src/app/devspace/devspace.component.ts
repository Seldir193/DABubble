import {
  Component,
  EventEmitter,
  Output,
  ElementRef,
  HostListener,
  ViewChild,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Firestore } from '@angular/fire/firestore';
import { Router } from '@angular/router';

import { MessageService } from '../message.service';
import { UserService } from '../user.service';
import { ChannelService } from '../channel.service';

import { Message } from '../message.models';
import { PrivateMessagesComponent } from '../private-messages/private-messages.component';

@Component({
  selector: 'app-devspace',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './devspace.component.html',
  styleUrls: ['./devspace.component.scss'],
})
export class DevspaceComponent {
  /**
   * Indicates whether the screen is considered desktop size (e.g., width >= 1278).
   */
  isDesktop = false;

  /**
   * The user's current search query string.
   */
  searchQuery = '';

  /**
   * Stores the filtered channel search results.
   */
  filteredChannels: any[] = [];

  /**
   * Stores the filtered member/user search results.
   */
  filteredMembers: any[] = [];

  /**
   * Flag indicating that no results were found for the current query.
   */
  noResultsFound = false;

  /**
   * Emits when a search is triggered by the devspace component (optional usage).
   */
  @Output() searchTriggered = new EventEmitter<string>();

  /**
   * Indicates whether the menu dropdown is open or closed.
   */
  menuOpen = false;

  /**
   * Stores the current user's display name.
   */
  userName: string = '';

  /**
   * Indicates whether the profile card is open or closed.
   */
  profileOpen = false;

  /**
   * Tracks the current user status, e.g., 'Aktiv' or 'Abwesend'.
   */
  userStatus: string = 'Aktiv';

  /**
   * Holds the inactivity timeout identifier for status resets.
   */
  inactivityTimeout: any;

  /**
   * Used for editing the user's display name.
   */
  editableUserName: string = '';

  /**
   * Used for editing the user's email address.
   */
  editableUserEmail: string = '';

  /**
   * Holds an error message if any operation fails.
   */
  errorMessage: string = '';

  /**
   * Displays a success message after completing an operation.
   */
  successMessage: string = '';

  /**
   * Stores the current user's avatar URL.
   */
  userAvatarUrl: string = 'assets/img/avatar.png';

  /**
   * Stores the current user's email address.
   */
  userEmail: string = '';

  /**
   * Flag indicating if the profile is in edit mode.
   */
  isEditingProfile: boolean = false;

  /**
   * Holds a recipient ID if needed for private messaging contexts.
   */
  recipientId: string = '';

  /**
   * Tracks the current authenticated user object (if any).
   */
  currentUser: any = null;

  /**
   * Stores data for a selected thread (if any).
   */
  selectedThread: any = null;

  /**
   * Tracks the selected member for private messages.
   */
  selectedMember: any = null;

  /**
   * Ensures scrolling to a searched message happens only once.
   */
  private hasScrolledToSearchedMessage: boolean = false;

  /**
   * Stores data for a selected thread channel (if any).
   */
  selectedThreadChannel: any = null;

  searchResults: any[] = [];
  dropdownOpen: boolean = false;

  /**
   * Emits an event when a user member is selected (e.g., to open private chat).
   */
  @Output() memberSelected = new EventEmitter<any>();

  /**
   * Emits an event when a channel is selected.
   */
  @Output() channelSelected = new EventEmitter<any>();

  /**
   * Emits an event to open a private chat context.
   */
  @Output() openPrivateChat = new EventEmitter<void>();

  /**
   * Emits an event to open a thread view.
   */
  @Output() openThread = new EventEmitter<any>();

  /**
   * Emits an event with thread info (ID, message ID) when a thread is selected.
   */
  @Output() threadSelected = new EventEmitter<{
    id: string;
    messageId: string;
  }>();

  /**
   * Emits an event with thread-channel data when a thread channel is selected.
   */
  @Output() threadChannelSelected = new EventEmitter<any>();

  /**
   * Reference to the hidden file input for avatar uploads.
   */
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  /**
   * Reference to a PrivateMessagesComponent if needed for controlling child operations.
   */
  @ViewChild(PrivateMessagesComponent)
  privateMessagesComp!: PrivateMessagesComponent;

  /**
   * Indicates whether the current view is a private chat.
   */
  @Input() isPrivateChat!: boolean;

  /**
   * The display name of the recipient in a private chat context.
   */
  @Input() recipientName: string = '';

  /**
   * The avatar URL of the recipient in a private chat context.
   */
  @Input() recipientAvatarUrl: string = '';

  /**
   * Tracks the focus state of specific input fields, e.g., name or email.
   */
  inputStates: { [key: string]: boolean } = {
    name: false,
    email: false,
  };

  /**
   * Constructor that injects essential services for user, channel, message handling,
   * as well as routing, firestore, and dialog control.
   *
   * @param {Router} router - Manages navigation through the app.
   * @param {Firestore} firestore - Firestore instance for database operations.
   * @param {ElementRef} elementRef - Reference to this component's DOM element.
   * @param {UserService} userService - Custom user-related functionality.
   * @param {ChannelService} channelService - Custom channel-related functionality.
   * @param {MessageService} messageService - Custom message-related functionality.
  
   */
  constructor(
    private router: Router,
    private firestore: Firestore,
    private elementRef: ElementRef,
    private userService: UserService,
    private channelService: ChannelService,
    private messageService: MessageService
  ) {}

  /**
   * Lifecycle hook that runs once this component is initialized.
   * Calls `checkScreenSize` to set up responsive logic.
   */
  ngOnInit() {
    this.checkScreenSize();
  }

  /**
   * HostListener to detect window resize events and recheck if we are in desktop mode.
   *
   * @param {UIEvent} event - The resize event object.
   */
  @HostListener('window:resize', ['$event'])
  onResize(event: UIEvent) {
    this.checkScreenSize();
  }

  /**
   * Determines if the view should be considered desktop by checking the window width.
   */
  private checkScreenSize(): void {
    const width = window.innerWidth;
    this.isDesktop = width >= 1278;
  }

  /**
   * Closes menu and profile card if the user clicks outside of them.
   * @param event The click event.
   */

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const clickedInsideMenu = this.elementRef.nativeElement
      .querySelector('.menu-dropdown')
      ?.contains(event.target);
    const clickedInsideProfile = this.elementRef.nativeElement
      .querySelector('.profile-card-container')
      ?.contains(event.target);
    const clickedInsideSearchDropdown = this.elementRef.nativeElement
      .querySelector('.search-dropdown')
      ?.contains(event.target);

    if (
      !clickedInsideMenu &&
      !clickedInsideProfile &&
      !clickedInsideSearchDropdown
    ) {
      this.dropdownOpen = false;
    }
  }

  /**
   * Fired when the user clicks the "Edit Square" icon. Triggers a search event
   * with an optional query.
   */
  onEditSquareClick(): void {
    const searchQuery = '';
    this.searchTriggered.emit(searchQuery);
  }

  showDropdownResults(results: any[]) {
    this.searchResults = results || [];
    this.dropdownOpen = this.searchResults.length > 0;
  }

  onSearchChange(): void {
    const trimmed = this.searchQuery.trim();
    const tq = this.searchQuery.trim();
    if (trimmed.length === 0) {
      this.dropdownOpen = false;
      this.searchResults = [];
      return;
    }

    if (trimmed === '@' || trimmed === '#') {
      this.handleSingleCharSearch(trimmed);
      return;
    }

    if (trimmed.length < 0) {
      this.filteredChannels = [];
      this.filteredMembers = [];
      this.dropdownOpen = false;
      return;
    }

    this.resetSearchLists();
    this.runFullTextSearch(tq);
  }

  /***************************************************************************************
   * Checks for single-char queries '@' (all users) or '#' (all channels),
   * returns true if handled, false otherwise.
   **************************************************************************************/
  private handleSingleCharSearch(q: string): boolean {
    if (q === '@') {
      this.doAtSearch();
      return true;
    }
    if (q === '#') {
      this.doHashSearch();
      return true;
    }
    return false;
  }

  /***************************************************************************************
   * Fetches all users, maps them, then opens user search dialog.
   **************************************************************************************/
  private doAtSearch(): void {
    this.userService.getAllUsers().then((users) => {
      const results = users.map((u) => ({
        id: u.id,
        name: u.name,
        avatarUrl: u.avatarUrl || 'assets/default-avatar.png',
        isOnline: u.isOnline ?? false,
        type: 'user',
      }));
      this.openSearchDialog(results, 'user');
    });
  }

  /***************************************************************************************
   * Fetches all channels, maps them, then opens channel search dialog.
   **************************************************************************************/
  private doHashSearch(): void {
    this.channelService.getAllChannelsOnce().then((channels) => {
      const results = channels.map((ch) => ({
        id: ch.id,
        name: ch.name,
        type: 'channel',
      }));
      this.openSearchDialog(results, 'channel');
    });
  }

  /***************************************************************************************
   * Clears/initializes the search results arrays and noResultsFound.
   **************************************************************************************/
  private resetSearchLists(): void {
    this.filteredChannels = [];
    this.filteredMembers = [];
    this.noResultsFound = false;
  }
  selectedChannel: any;

  /***************************************************************************************
   * Runs a full text search by calling multiple async fetches in parallel,
   * then delegates results to handleSearchResults().
   **************************************************************************************/
  private runFullTextSearch(query: string): void {
    Promise.all([
      this.channelService.getChannelsByName(query),
      this.userService.getUsersByFirstLetter(query),
      this.messageService.getMessagesOnce('private'),
      this.messageService.getMessagesOnce('thread'),
      this.messageService.getMessagesOnce('thread-channel'),
      this.messageService.getChannelMessagesOnce(),
    ])
      .then(([ch, us, pm, tm, tcm,cm]) =>
        this.handleSearchResults(ch, us, pm, tm, tcm,cm)
      )
      .catch(() => {
        // handle error if needed
      });
  }

  /***************************************************************************************
   * Receives raw fetched data, maps channels/users, filters message lists, then merges.
   **************************************************************************************/
  private handleSearchResults(
    channels: any[],
    users: any[],
    priv: any[],
    thr: any[],
    thrCh: any[],
    chMsgs: any[]
  ): void {
    this.mapChannelsAndUsers(channels, users);
    const privList = this.filterPrivateMsgs(priv);
    const thrList = this.filterThreadMsgs(thr);
    const thrChList = this.filterThreadChannelMsgs(thrCh);
    const chList = this.filterChannelMsgs(chMsgs);
    this.combineSearchResults(chList, privList, thrList, thrChList);
  }

  /***************************************************************************************
   * Maps channel and user data into this.filteredChannels / this.filteredMembers arrays.
   **************************************************************************************/
  private mapChannelsAndUsers(channels: any[], users: any[]): void {
    this.filteredChannels = channels.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      type: 'channel',
    }));
    this.filteredMembers = users.map((u) => ({
      id: u.id || u.uid,
      name: u.name,
      avatarUrl: u.avatarUrl || 'assets/default-avatar.png',
      isOnline: u.isOnline ?? false,
      type: 'user',
    }));
  }

  /***************************************************************************************
   * Filters private messages by content, returning mapped objects.
   **************************************************************************************/
  private filterPrivateMsgs(list: any[]): any[] {
    return list
      .filter((m) =>
        m.content?.text?.toLowerCase().includes(this.searchQuery.toLowerCase())
      )
      .map((m) => ({
        id: m.id,
        text: m.content?.text || '⚠️ Kein Text',
        timestamp: m.timestamp,
        type: 'private-message',
        senderId: m.senderId,
        recipientId: m.recipientId,
        conversationId: m.conversationId || null,
      }));
  }

  /***************************************************************************************
   * Filters thread messages by content, returning mapped objects.
   **************************************************************************************/
  private filterThreadMsgs(list: any[]): any[] {
    return list
      .filter((m) =>
        m.content?.text?.toLowerCase().includes(this.searchQuery.toLowerCase())
      )
      .map((m) => ({
        id: m.id,
        text: m.content?.text || '',
        timestamp: m.timestamp,
        type: 'thread',
        threadId: m.threadId || m.parentId || m.id,
        parentId: m.parentId ?? m.threadId ?? m.id,
        senderId: m.senderId,
        senderName: m.senderName || '❌ Unbekannt',
      }));
  }

  /***************************************************************************************
   * Filters thread-channel messages, returning mapped objects.
   **************************************************************************************/
  private filterThreadChannelMsgs(list: any[]): any[] {
    return list
      .filter((m) =>
        m.content?.text?.toLowerCase().includes(this.searchQuery.toLowerCase())
      )
      .map((m) => ({
        id: m.id,
        text: m.content?.text || '',
        timestamp: m.timestamp,
        type: 'thread-channel',
        threadChannelId: m.threadChannelId || m.threadId || m.parentId || m.id,
        senderId: m.senderId,
        senderName: m.senderName || '❌ Unbekannt',
      }));
  }

  /***************************************************************************************
   * Filters normal channel messages, returning mapped objects.
   **************************************************************************************/
  private filterChannelMsgs(list: any[]): any[] {
    return list
      .filter((m) =>
        m.content?.text?.toLowerCase().includes(this.searchQuery.toLowerCase())
      )
      .map((m) => ({
        id: m.id,
        text: m.content?.text || '',
        timestamp: m.timestamp,
        type: 'message',
        channelId: m.channelId || null,
        senderId: m.senderId || null,
      }));
  }

  /***************************************************************************************
   * Combines all partial results, deduplicates, and opens the final search dialog.
   **************************************************************************************/
  private combineSearchResults(
    cList: any[],
    pList: any[],
    tList: any[],
    tChList: any[]
  ): void {
    const combined = [
      ...this.filteredChannels,
      ...this.filteredMembers,
      ...cList,
      ...pList,
      ...tList,
      ...tChList,
    ];
    const deduped = Array.from(
      new Map(combined.map((obj) => [obj.id, obj])).values()
    );
    this.deduplicateAndOpenDialog(deduped);
  }

  /**
   * Opens the dialog with deduplicated search results if any exist.
   */
  private deduplicateAndOpenDialog(results: any[]): void {
    if (!results || results.length === 0) {
      this.noResultsFound = true;
      this.dropdownOpen = false;
      return;
    }
    this.noResultsFound = false;
    this.searchResults = results;
    this.dropdownOpen = true;
  }

  /**
   * Determines where to navigate when the user selects or opens a specific message
   * from search results. It handles channel, private, thread-channel, or thread messages.
   */
  openMessage(message: any): void {
    if (!message || !message.id) return;
    this.hasScrolledToSearchedMessage = false;

    if (message.channelId) {
      this.openChannelMessage(message);
    } else if (message.conversationId) {
      this.openPrivateMessage(message);
    } else if (message.type === 'thread-channel') {
      this.openThreadChannelMessage(message);
    } else if (message.threadId || message.parentId) {
      this.openThreadMessage(message);
    }
  }

  /** Handles opening a channel message by fetching the channel and scrolling to it. */
  private openChannelMessage(msg: any): void {
    this.channelService.getChannelById(msg.channelId).then((channel) => {
      if (!channel) return;
      this.selectChannel(channel);
      setTimeout(() => {
        this.channelService.getMessages(msg.channelId).subscribe((msgs) => {
          this.scrollToMessageIfExists(msgs, msg.id);
        });
      }, 800);
    });
  }

  /** Opens a private message by determining the chat partner, then launching a scroll check. */
  private openPrivateMessage(msg: any): void {
    const partnerId = this.getChatPartnerId(msg);
    this.memberSelected.emit({ id: partnerId, name: msg.recipientName || '' });
    this.launchPrivateScroll(msg);
  }

  /** Computes the correct chat partner ID based on currentUserId vs. sender/recipient. */
  private getChatPartnerId(msg: any): string {
    const curUser = this.userService.getCurrentUserId();
    return msg.senderId === curUser ? msg.recipientId : msg.senderId;
  }

  /** Delays, then fetches private messages. If the target is found, scrolls to it once. */
  private launchPrivateScroll(msg: any): void {
    setTimeout(() => {
      this.messageService.getPrivateMessagesLive(msg.conversationId, (msgs) => {
        if (!this.hasScrolledToSearchedMessage) {
          const found = msgs.find((m) => m.id === msg.id);
          if (found) {
            this.scrollToMessage(found.id);
            this.hasScrolledToSearchedMessage = true;
          }
        }
      });
    }, 800);
  }

  /** Opens a thread-channel message by emitting and listening for updates. */
  private openThreadChannelMessage(msg: any): void {
    if (!msg.threadChannelId) {
      msg.threadChannelId = msg.parentId ?? msg.id;
    }
    this.threadChannelSelected.emit(msg);
    this.hasScrolledToSearchedMessage = false;

    setTimeout(() => {
      this.messageService.listenForMessages(
        'thread-channel',
        msg.threadChannelId,
        (msgs) => {
          if (!this.hasScrolledToSearchedMessage) {
            const found = msgs.find((m) => m.id === msg.id);
            if (found) {
              this.scrollToMessage(found.id);
              this.hasScrolledToSearchedMessage = true;
            }
          }
        }
      );
    }, 1500);
  }

  /***************************************************************************************
   * Opens a normal thread message by ensuring threadId, emitting threadSelected,
   * then initiating a delayed scroll to it.
   **************************************************************************************/
  private openThreadMessage(msg: any): void {
    this.ensureThreadId(msg);
    this.emitThreadData(msg);
    this.launchThreadScroll(msg);
    this.hasScrolledToSearchedMessage = false;
  }

  
  /***************************************************************************************
   * Ensures msg.threadId is set; uses msg.parentId or msg.id if missing.
   **************************************************************************************/
  private ensureThreadId(msg: any): void {
    if (!msg.threadId) {
      msg.threadId = msg.parentId ?? msg.id;
    }
  }

  /***************************************************************************************
   * Builds the thread data object and emits the threadSelected event.
   **************************************************************************************/
  private emitThreadData(msg: any): void {
    const data = {
      ...msg,
      threadId: msg.threadId,
      messageId: msg.id,
      parentId: msg.parentId || msg.threadId,
      parentName: msg.parentName || '',
      id: msg.threadId,
    };
    this.threadSelected.emit(data);
  }

  /***************************************************************************************
   * Delays 800ms, fetches live thread messages, and scrolls if the target is found.
   **************************************************************************************/
  private launchThreadScroll(msg: any): void {
    setTimeout(() => {
      this.messageService.getThreadMessagesLive(msg.threadId, (msgs) => {
        if (!this.hasScrolledToSearchedMessage) {
          const found = msgs.find((m) => m.id === msg.id);
          if (found) {
            this.scrollToMessage(found.id);
            this.hasScrolledToSearchedMessage = true;
          }
        }
      });
    }, 800);
  }

  /**
   * Displays the provided search results in the dropdown
   * (previously opened a Material Dialog).
   */
  openSearchDialog(
    results: any[],
    type:
      | 'channel'
      | 'user'
      | 'message'
      | 'private-message'
      | 'thread'
      | 'thread-channel'
      | 'mixed'
  ): void {
    if (this.searchQuery.trim() === '') return;
    if (!results || results.length === 0) return;

    this.searchResults = results;
    this.dropdownOpen = true;
  }

  onSelectResult(result: any): void {
    this.dropdownOpen = false;
    this.searchQuery = '';

    switch (result.type) {
      case 'channel':
        this.selectChannel(result);
        break;

      case 'user':
        this.selectMember(result);
        break;

      case 'message':
      case 'private-message':
        this.openMessage(result);
        break;

      case 'thread':
        this.openThreadMessage(result);
        break;

      case 'thread-channel':
        this.openThreadChannelMessage(result);
        break;

      default:
        break;
    }
  }
  /**
   * Emits a `threadSelected` event with thread data (ID, messageId).
   */
  selectThread(thread: { id: string; messageId: string }): void {
    this.threadSelected.emit(thread);
  }

  /**
   * Emits a `memberSelected` event when a user or member is chosen,
   * typically to open a private chat.
   */
  selectMember(member: any): void {
    this.memberSelected.emit(member);
  }

  /**
   * Forwards a thread-opening request by emitting `openThread`.
   */
  forwardOpenThread(message: any): void {
    this.openThread.emit(message);
  }

  /**
   * Changes the current channel by invoking the channel service
   * and emits a `channelSelected` event.
   */
  selectChannel(channel: any): void {
    this.channelService.changeChannel(channel);
    this.channelSelected.emit(channel);
  }

  /**
   * Emits a `threadChannelSelected` event for opening a thread channel view.
   */
  selectThreadChannel(threadChannel: any): void {
    this.selectedThreadChannel = threadChannel;
    this.threadChannelSelected.emit(threadChannel);
  }

  /**
   * Checks if a particular message (by ID) exists in an array of messages. If found,
   * calls `scrollToMessage` after a brief delay.
   */
  scrollToMessageIfExists(
    messages: Message[],
    messageId: string,
    retries = 5
  ): void {
    const foundMessage = messages.find((m) => m.id === messageId);
    if (!foundMessage) {
      return;
    }
    setTimeout(() => {
      this.scrollToMessage(messageId, retries);
    }, 500);
  }

  /**
   * Attempts to scroll to a message element in the DOM by its ID. Retries a certain number
   * of times in case the element isn't immediately available or rendered.
   */
  scrollToMessage(messageId: string, retries = 10): void {
    if (this.hasScrolledToSearchedMessage) return;

    setTimeout(() => {
      const messageElement = document.getElementById(`message-${messageId}`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        messageElement.classList.add('highlight');
        setTimeout(() => {
          messageElement.classList.remove('highlight');
        }, 2000);
        this.hasScrolledToSearchedMessage = true;
      } else if (retries > 0) {
        this.scrollToMessage(messageId, retries - 1);
      }
    }, 700);
  }

  /**
   * Highlights a specific message by scrolling it into view and temporarily adding
   * a CSS class.
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









  public async broadcastToAllChannels() {
    // 1) Hole alle Channels, die du verwenden möchtest
    const allChannels = await this.channelService.getAllChannelsOnce();
    // extrahiere die IDs
    const broadcastChannels = allChannels.map(ch => ch.id);
  
    // 2) Rufe den broadcast-Call auf
    await this.messageService.sendBroadcastMessage({
      broadcastChannels,
      senderId: this.currentUser?.id || 'unknown', 
      senderName: this.currentUser?.name || 'Unbekannt',
      content: { text: 'Hallo an alle Channels!', emojis: [] },
      messageFormat: 'text',
    });
  
    console.log('Broadcast gesendet!');
  }
  
}





