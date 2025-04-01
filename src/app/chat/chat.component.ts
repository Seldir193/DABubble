import {
  Component,
  OnInit,
  ViewChild,
  CUSTOM_ELEMENTS_SCHEMA,
  HostListener,
  Output,
  EventEmitter,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatHeaderComponent } from '../chat-header/chat-header.component';
import { DevspaceComponent } from '../devspace/devspace.component';
import { EntwicklerteamComponent } from '../entwicklerteam/entwicklerteam.component';
import { InnerChannelComponent } from '../inner-channel/inner-channel.component';
import { DirectMessagesComponent } from '../direct-messages/direct-messages.component';
import { PrivateMessagesComponent } from '../private-messages/private-messages.component';
import { WelcomeScreenComponent } from '../welcome-screen/welcome-screen.component';
import { AppStateService } from '../app-state.service';
import { UserService } from '../user.service';
import { ChannelService } from '../channel.service';
import { SearchFieldComponent } from '../search-field/search-field.component';
import { ThreadComponent } from '../thread/thread.component';
import { ThreadChannelComponent } from '../thread-channel/thread-channel.component';
import { MessageService } from '../message.service';

interface ThreadChannelParentDoc {
  senderName?: string;
  senderAvatar?: string;
  content?: {
    text?: string;
    emojis?: any[];
  };
  timestamp?: any;
  replyCount?: number;
  channelName?: string;
  channelId?: string;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    ChatHeaderComponent,
    DevspaceComponent,
    EntwicklerteamComponent,
    InnerChannelComponent,
    DirectMessagesComponent,
    PrivateMessagesComponent,
    WelcomeScreenComponent,
    SearchFieldComponent,
    ThreadComponent,
    ThreadChannelComponent,
  ],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ChatComponent implements OnInit {
  isPrivateMessage: boolean = false;
  selectedMemberId: string = '';
  selectedMemberName: string = '';
  isEditingChannel: boolean = false;
  isPrivateChat: boolean = false;
  selectedMember: any = null;
  showWelcomeContainer: boolean = false;
  selectedChannel: any = null;
  isSearchActive: boolean = false;
  selectedThread: any = null;
  selectedThreadChannel: any = null;
  isWorkspaceVisible: boolean = true;
  isThreadFromSearch: boolean = false;
  isThreadChannelFromSearch: boolean = false;
  isThreadActive: boolean = false;
  threadData: any = null; // Even if unused, left as is to not alter logic.
  private recipientCache: Map<string, string> = new Map();

  currentMobileView:
    | 'container'
    | 'team'
    | 'private'
    | 'thread'
    | 'threadChannel'
    | 'welcome'
    | 'search' = 'container';
  previousView:
    | 'container'
    | 'team'
    | 'private'
    | 'thread'
    | 'threadChannel'
    | 'welcome'
    | 'search' = 'container';

  showDesktopHeader = false;
  showMemberListDialog = false;

  @ViewChild('chatHeaderRef') chatHeaderRef!: ChatHeaderComponent;
  @Output() editSquareClicked = new EventEmitter<void>();
  @ViewChild('devspaceRef') devspaceRef!: DevspaceComponent;
  @ViewChild(ChatComponent) chatComponent!: ChatComponent;
  @ViewChild(EntwicklerteamComponent) entwicklerteam!: EntwicklerteamComponent;

  private forcedMobileActive = false;
  private oldDesktopView:
    | 'container'
    | 'team'
    | 'private'
    | 'thread'
    | 'threadChannel'
    | 'welcome'
    | 'search' = 'container';
  private oldIsSearchActive = false;
  private oldIsWorkspaceVisible = true;

  shouldShowContainer = false;

  /**
   * Constructor for the ChatComponent. Injects services needed
   * for managing application state, users, channels, messages, and
   * the change detection reference.
   *
   * @param {AppStateService} appStateService - Manages global state across the app.
   * @param {UserService} userService - Provides user-related operations.
   * @param {ChannelService} channelService - Provides channel-related operations.
   * @param {MessageService} messageService - Provides message-related operations.
   * @param {ChangeDetectorRef} cdr - Detects and triggers UI updates.
   */
  constructor(
    private appStateService: AppStateService,
    private userService: UserService,
    private channelService: ChannelService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {}

  /**
   * Lifecycle hook. Initializes the component,
   * sets the welcome screen visibility, and checks screen size.
   */
  ngOnInit(): void {
    this.showWelcomeContainer = this.appStateService.getShowWelcomeContainer();
    this.checkScreenSize();
    this.updateContainerVisibility();
  }

  /**
   * Opens a private chat with the specified member, hiding the member list
   * and updating relevant component states. If on a small screen, switches
   * to 'private' mobile view and displays the header.
   *
   * @param {{ id: string; name: string }} payload - Contains the member's ID and name.
   */
  onOpenPrivateChat(payload: { id: string; name: string }) {
    this.showMemberListDialog = false;
    this.isPrivateChat = true;
    this.selectedMember = { id: payload.id, name: payload.name };
    this.isSearchActive = false;
    this.selectedChannel = null;

    if (window.innerWidth < 1278) {
      this.currentMobileView = 'private';
      this.showDesktopHeader = true;
    }
  }

  /**
   * Triggered when the edit icon (square) is clicked. Logs a message
   * and, in mobile view, triggers the Devspace component's edit logic.
   * Also displays the desktop header if under a certain width.
   */
  onEditSquareIconClick(): void {
    if (window.innerWidth < 1278) {
      this.devspaceRef.onEditSquareClick();
      this.showDesktopHeader = true;
    }
    this.previousView = this.currentMobileView;
  }

  /**
   * Checks the current screen size and updates `isWorkspaceVisible`
   * accordingly for desktop mode if the width is above 1278.
   */
  private checkScreenSize(): void {
    const width = window.innerWidth;
    if (width >= 1278) {
      this.isWorkspaceVisible = true;
    } else {
      // Additional mobile handling if needed
    }
  }

  /**
   * HostListener that triggers on window resize events.
   * Enters or exits forced mobile mode depending on screen width.
   */
  @HostListener('window:resize')
  onResize() {
    const width = window.innerWidth;
    if (width < 1278) {
      this.isWorkspaceVisible = true;
      if (!this.forcedMobileActive) {
        this.enterForcedMobileMode();
      }
    } else {
      if (this.forcedMobileActive) {
        this.exitForcedMobileMode();
        this.showDesktopHeader = false;
      }
    }
    this.updateContainerVisibility();
  }

  private updateContainerVisibility(): void {
    const width = window.innerWidth;
    // Zeige Container, wenn < 1278 oder >= 1470
    this.shouldShowContainer =
      width < 1278 ||
      width >= 1470 ||
      this.showWelcomeContainer ||
      this.isSearchActive;
    // this.shouldShowContainer = (width >= 1470) || this.showWelcomeContainer;
  }

  openWelcome() {
    this.showWelcomeContainer = true;
    this.updateContainerVisibility(); // Erneut prüfen
  }

  closeWelcome() {
    this.showWelcomeContainer = false;
    this.updateContainerVisibility(); // Erneut prüfen
  }

  /**
   * Activates forced mobile mode by storing the current view
   * and search/workspace states, then switches to 'container' view.
   */
  private enterForcedMobileMode() {
    this.forcedMobileActive = true;
    this.oldDesktopView = this.currentMobileView;
    this.oldIsSearchActive = this.isSearchActive;
    this.oldIsWorkspaceVisible = this.isWorkspaceVisible;
    this.currentMobileView = 'container';
  }

  /**
   * Exits forced mobile mode by restoring the previously stored
   * desktop view and search/workspace states.
   */
  private exitForcedMobileMode() {
    this.forcedMobileActive = false;
    if (this.oldDesktopView === 'search') {
      this.currentMobileView = 'search';
      this.showDesktopHeader = true;
    } else {
      this.currentMobileView = this.oldDesktopView;
      this.isSearchActive = this.oldIsSearchActive;
      this.showDesktopHeader = false;
    }
    this.isWorkspaceVisible = this.oldIsWorkspaceVisible;
  }

  /**
   * Handles the back navigation from the header in mobile view.
   * Resets to the 'container' view and hides the desktop header.
   */
  onHeaderBackClicked() {
    this.showDesktopHeader = false;
    if (this.isPrivateChat && this.selectedMember) {
    } else if (this.selectedChannel) {
    } else if (this.selectedThread) {
    } else {
    }
    this.showDesktopHeader = false;
    this.currentMobileView = 'container';
  }

  /**
   * Simple method to switch the current mobile view
   * back to 'container', typically used in mobile contexts.
   */
  backToContainer() {
    this.currentMobileView = 'container';
  }

  /**
   * Opens a thread channel view from a search result, orchestrating
   * sub-steps like loading data and adjusting UI state.
   *
   * @param {any} result - The search result with details to open the thread channel.
   */
  async openThreadChannelFromSearch(result: any): Promise<void> {
    this.prepThreadChannelSearch(result);
    const threadChannelId = this.getThreadChannelId(result);
    if (!threadChannelId) return;
    const { parentDoc, channelName } = await this.prepareParentDoc(
      threadChannelId
    );
    const formattedMessages = await this.prepareChildMessages(threadChannelId);

    const parentMessage = this.buildParentMessage(
      parentDoc,
      result,
      channelName,
      threadChannelId
    );

    this.assignThreadChannel(result, parentMessage, formattedMessages);
    this.addFallbackMessageIfNeeded(result, threadChannelId);
    this.handleResponsiveThreadChannelView();
  }

  /**
   * Loads the parent document from the message service
   * and determines its channel name if needed.
   *
   * @param {string} threadChannelId - The ID for the thread channel.
   * @returns {Promise<{ parentDoc: ThreadChannelParentDoc | null; channelName: string }>}
   */
  private async prepareParentDoc(threadChannelId: string) {
    const parentDoc = await this.loadParentDoc(threadChannelId);
    const channelName = await this.loadChannelNameIfNeeded(parentDoc);
    return { parentDoc, channelName };
  }

  /**
   * Loads child messages and formats them into a normalized structure.
   *
   * @param {string} threadChannelId - The ID for the thread channel.
   * @returns {Promise<any[]>} The formatted messages.
   */
  private async prepareChildMessages(threadChannelId: string): Promise<any[]> {
    const childMessages = await this.loadChildMessages(threadChannelId);
    return this.formatThreadMessages(childMessages);
  }

  /**
   * Assigns the final data to 'selectedThreadChannel'.
   *
   * @param {any} result - The original search result or context.
   * @param {any} parentMessage - The built parent message object.
   * @param {any[]} formattedMessages - The list of formatted child messages.
   */
  private assignThreadChannel(
    result: any,
    parentMessage: any,
    formattedMessages: any[]
  ): void {
    this.selectedThreadChannel = {
      ...result,
      parentMessage,
      messages: formattedMessages,
    };
  }

  /** Prepares the component state for opening a thread channel from search */
  private prepThreadChannelSearch(result: any): void {
    if (this.selectedThread) {
      this.closeThread();
    }
    this.isThreadChannelFromSearch = true;
    this.isPrivateChat = false;
    this.isSearchActive = false;
    this.showWelcomeContainer = false;
    this.selectedChannel = null;
    this.selectedMember = null;
    // Logically no change, just moved code out of original method
  }

  /** Retrieves the correct threadChannel ID from the search result */
  private getThreadChannelId(result: any): string | null {
    const threadChannelId =
      result.threadChannelId || result.parentId || result.id;
    if (!threadChannelId) {
      return null;
    }
    return threadChannelId;
  }

  /** Loads the parent document from the message service */
  private async loadParentDoc(
    threadChannelId: string
  ): Promise<ThreadChannelParentDoc | null> {
    const doc = (await this.messageService.getMessage(
      'thread-channel',
      threadChannelId
    )) as ThreadChannelParentDoc | null;
    if (!doc) {
    }
    return doc;
  }

  /** Loads the channel name if missing in the parentDoc */
  private async loadChannelNameIfNeeded(
    parentDoc: ThreadChannelParentDoc | null
  ): Promise<string> {
    let channelName = parentDoc?.channelName || 'Unbekannt';
    if (!parentDoc?.channelName && parentDoc?.channelId) {
      const channelData = await this.channelService.getChannelById(
        parentDoc.channelId
      );
      channelName = channelData?.name || 'Unbekannt';
    }
    return channelName;
  }

  /** Loads child messages from the message service */
  private async loadChildMessages(threadChannelId: string): Promise<any[]> {
    const msgs = await this.messageService.getMessagesOnce(
      'thread-channel',
      threadChannelId
    );
    return msgs || [];
  }

  /** Formats child messages to ensure certain properties exist */
  private formatThreadMessages(childMessages: any[]): any[] {
    return (childMessages || []).map((msg) => ({
      ...msg,
      content: msg.content ?? { text: 'Kein Text', emojis: [] },
      timestamp: msg.timestamp || new Date(),
    }));
  }

  /** Builds the parent message object from doc + result data */
  private buildParentMessage(
    parentDoc: ThreadChannelParentDoc | null,
    result: any,
    channelName: string,
    threadChannelId: string
  ) {
    return {
      id: threadChannelId,
      text: parentDoc?.content?.text ?? result?.content?.text ?? 'Kein Text',
      senderName: parentDoc?.senderName || result.senderName || 'Unbekannt',
      senderAvatar:
        parentDoc?.senderAvatar ||
        result.senderAvatar ||
        'assets/img/default-avatar.png',
      timestamp: parentDoc?.timestamp || result.timestamp || new Date(),
      replyCount: parentDoc?.replyCount || result.replyCount || 0,
      channelName,
      channelId: parentDoc?.channelId || null,
      content: parentDoc?.content ?? { text: 'Kein Text', emojis: [] },
    };
  }

  /** If the search result has a different ID than the threadChannelId, add fallback data */
  private addFallbackMessageIfNeeded(
    result: any,
    threadChannelId: string
  ): void {
    if (result.id !== threadChannelId) {
      const fallbackContent = result.content ?? {
        text: 'Kein Text',
        emojis: [],
      };
      const fallbackTimestamp = result.timestamp || new Date();
      this.selectedThreadChannel.messages.push({
        ...result,
        content: fallbackContent,
        timestamp: fallbackTimestamp,
      });
    }
  }

  /** Adjusts UI if on a small screen */
  private handleResponsiveThreadChannelView(): void {
    if (window.innerWidth < 1278) {
      this.currentMobileView = 'threadChannel';
      this.showDesktopHeader = true;
    }
  }

  /**
   * Toggles the visibility of the workspace area (channel/team list).
   */
  toggleWorkspace(): void {
    this.isWorkspaceVisible = !this.isWorkspaceVisible;
  }

  // ------------------------------------------------------------------------------------
  // 2) SPLIT METHODS FOR: onChannelSelected (~25+ lines)
  // ------------------------------------------------------------------------------------

  /**
   * Handles selection of a channel by updating various state flags,
   * resetting threads, and displaying the channel UI. In mobile view,
   * it switches to 'team' mode.
   *
   * @param {any} channel - The channel object selected by the user.
   */
  onChannelSelected(channel: any): void {
    if (channel) {
      this.handleChannelSelection(channel);
    } else {
      this.handleChannelDeselection();
    }
    this.adjustMobileViewAfterChannel();
  }

  /**
   * Handles the scenario where a valid channel is selected.
   * Decides mobile vs. desktop, optionally closes threads,
   * and sets final state for the selected channel.
   */
  private handleChannelSelection(channel: any): void {
    this.setTeamViewDependingOnWidth();
    this.clearThreadIfSearching();
    this.applyChannelSelection(channel);
  }

  /** Decides between mobile/desktop view for 'team' mode */
  private setTeamViewDependingOnWidth(): void {
    this.previousView = this.currentMobileView;
    this.currentMobileView = 'team';
    if (window.innerWidth < 1278) {
      this.showDesktopHeader = true;
    }
  }

  /** Closes thread if we came from a search thread, resets flags */
  private clearThreadIfSearching(): void {
    if (this.isThreadFromSearch) {
      this.closeThread();
    }
    this.isThreadFromSearch = false;
    this.selectedThread = null;
    this.isThreadActive = false;
    this.selectedThreadChannel = null;
  }

  /** Applies the final state for channel selection (overrides private chat etc.) */
  private applyChannelSelection(channel: any): void {
    this.isPrivateChat = false;
    this.selectedChannel = channel;
    this.selectedMember = null;
    this.isSearchActive = false;
    this.showWelcomeContainer = false;
    this.appStateService.setShowWelcomeContainer(false);
  }

  /** Handles the scenario where no channel is selected */
  private handleChannelDeselection(): void {
    this.selectedChannel = null;
    this.showWelcomeContainer = true;
    this.appStateService.setShowWelcomeContainer(true);
  }

  /** Sets or resets the mobile view after channel selection */
  private adjustMobileViewAfterChannel(): void {
    if (window.innerWidth < 1278) {
      this.currentMobileView = 'team';
    }
  }

  // ------------------------------------------------------------------------------------
  // 3) SPLIT METHODS FOR: onMemberSelected (~25+ lines)
  // ------------------------------------------------------------------------------------

  /**
   * Handles selection of a member for private chat, resetting any
   * threads or channel data. In mobile view, switches to 'private'.
   *
   * @param {any} member - The member object that has been selected.
   */
  onMemberSelected(member: any): void {
    if (!member || !member.id) {
      return;
    }
    this.resetThreadIfNeeded();
    this.isPrivateChat = true;
    this.selectedMember = member;
    this.handleMobileViewForMember();
    this.selectedChannel = null;
    this.isSearchActive = false;
    this.showWelcomeContainer = false;
    if (this.selectedThread) {
      this.selectedThread = null;
    }
  }

  /** Closes any open thread or thread channel when a member is selected */
  private resetThreadIfNeeded(): void {
    if (this.isThreadFromSearch) {
      this.closeThread();
    }
    if (this.selectedThreadChannel) {
      this.closeThreadChannel();
    }
  }

  /** Adapts view for mobile when a member is selected */
  private handleMobileViewForMember(): void {
    if (window.innerWidth < 1278) {
      this.previousView = this.currentMobileView;
      this.currentMobileView = 'private';
      this.showDesktopHeader = true;
    } else {
      this.previousView = this.currentMobileView;
      this.currentMobileView = 'private';
    }
  }

  /**
   * Receives member selection event (e.g. from a list) and updates
   * private message state accordingly.
   *
   * @param {{ uid: string; name: string }} event - Contains the unique ID
   * and name of the selected member.
   */
  handleMemberSelected(event: { uid: string; name: string }): void {
    this.selectedMemberId = event.uid;
    this.selectedMemberName = event.name;
    this.isPrivateMessage = true;
  }

  /**
   * Stops the private message mode by clearing member info
   * and resetting the isPrivateMessage flag.
   */
  stopPrivateMessage(): void {
    this.isPrivateMessage = false;
    this.selectedMemberId = '';
    this.selectedMemberName = '';
  }

  /**
   * Handles changes in channel editing state. Disables private chat mode
   * and resets the selected member. (Parameter removed)
   */
  handleEditChannelChange(): void {
    this.isPrivateChat = false;
    this.selectedMember = null;
  }

  /**
   * Opens the search field UI. In mobile view, switches to 'search'
   * mode and optionally handles a search query.
   *
   * @param {string} [searchQuery] - An optional search term to pass along.
   */
  openSearchField(searchQuery?: string): void {
    this.resetThreadsForSearch();
    this.setupSearchView();
    this.activateSearchMode();

    this.isSearchActive = true;
    this.updateContainerVisibility();
    if (searchQuery) {
      // handle the query if needed
    }
  }

  /** Resets any currently open threads so search can start fresh */
  private resetThreadsForSearch(): void {
    this.selectedThread = null;
    this.selectedThreadChannel = null;
  }

  /** Determines whether we use mobile or desktop search view */
  private setupSearchView(): void {
    this.previousView = this.currentMobileView;
    this.currentMobileView = 'search';

    if (window.innerWidth < 1278) {
      this.showDesktopHeader = true;
      if (this.forcedMobileActive) {
        this.oldDesktopView = 'search';
        this.oldIsSearchActive = true;
      }
    } else {
      this.showDesktopHeader = false;
    }
  }

  /** Activates the search mode flags, disabling private chat, etc. */
  private activateSearchMode(): void {
    this.isSearchActive = true;
    this.isPrivateChat = false;
    this.selectedChannel = null;
    this.showWelcomeContainer = false;
  }

  /**
   * Closes the search field UI, returning to the previous view
   * and disabling the search functionality.
   */
  closeSearchField(): void {
    this.showDesktopHeader = false;
    this.currentMobileView = this.previousView;
    this.isSearchActive = false;
    this.updateContainerVisibility();

    if (!this.selectedChannel && !this.isPrivateChat) {
      this.showWelcomeContainer = true;
    }
  }

  /**
   * Handles selection of a member within the app, e.g. from
   * a search result, to open a private chat.
   *
   * @param {any} member - The member object that was selected.
   */
  handleMemberSelection(member: any): void {
    this.isSearchActive = false;
    this.isPrivateChat = true;
    this.selectedChannel = null;
    this.selectedMember = member;
  }

  /**
   * Opens a thread channel in the chat by setting `selectedThreadChannel`
   * to the passed-in data. In mobile view, updates the current view to 'threadChannel'.
   *
   * @param {any} threadData - The data object representing the thread channel.
   */
  openThreadChannel(threadData: any): void {
    this.selectedThreadChannel = threadData;
    if (window.innerWidth < 1278) {
      this.currentMobileView = 'threadChannel';
    }
  }

  /**
   * Closes the currently open thread channel, resetting the UI to either
   * the channel view, private chat view, or welcome screen.
   */
  closeThreadChannel(): void {
    this.selectedThreadChannel = null;
    this.isThreadChannelFromSearch = false;

    if (this.selectedChannel) {
    } else {
      this.showWelcomeContainer = true;
    }

    if (this.selectedChannel) {
      this.currentMobileView = 'team';
    } else if (this.isPrivateChat && this.selectedMember) {
      this.currentMobileView = 'private';
    } else {
      this.currentMobileView = 'container';
    }
  }

  /**
   * Called when the search closes. Logs a message and disables
   * the search mode flag.
   */
  onCloseSearch(): void {
    this.isSearchActive = false;
  }

  /**
   * Scrolls smoothly to a message within the DOM if it exists. Retries a number of times
   * in case the element isn't available immediately.
   *
   * @param {string} messageId - The identifier of the message element to scroll to.
   * @param {number} [retries=5] - How many retries to attempt if the element isn't found.
   */
  private scrollToMessage(messageId: string, retries = 5): void {
    setTimeout(() => {
      const element = document.getElementById(`message-${messageId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('highlight');
        setTimeout(() => element.classList.remove('highlight'), 2000);
      } else if (retries > 0) {
        this.scrollToMessage(messageId, retries - 1);
      }
    }, 300);
  }

  /**
   * Opens a thread view for a specific message within the chat.
   * If on mobile, switches to 'thread'.
   *
   * @param {any} message - The message object to open as a thread.
   */
  openThread(message: any): void {
    this.resetThreadState();
    if (this.isThreadAlreadyOpen(message)) return;

    this.setupSelectedThread(message);
    this.highlightThreadMessageAsync(message);

    if (window.innerWidth < 1278) {
      this.currentMobileView = 'thread';
    }
  }

  /** Resets the current thread/channel flags from a search context */
  private resetThreadState(): void {
    this.selectedThreadChannel = null;
    this.isThreadFromSearch = false;
  }

  /** Checks if the same thread is already open */
  private isThreadAlreadyOpen(message: any): boolean {
    return this.selectedThread?.id === message.id;
  }

  /** Assigns the selected thread based on the provided message data */
  private setupSelectedThread(message: any): void {
    // your original "this.selectedThread = null;" line
    this.selectedThread = null;
    this.selectedThread = {
      ...message,
      recipientName: message.recipientName || message.senderName || 'Unbekannt',
    };
  }

  /** Performs the asynchronous highlight using nested setTimeout calls */
  private highlightThreadMessageAsync(message: any): void {
    setTimeout(() => {
      this.selectedThread = message;
      setTimeout(() => {
        const threadComponent = document.querySelector('app-thread') as any;
        if (threadComponent?.highlightThreadMessage) {
          threadComponent.highlightThreadMessage(message.id);
        }
      }, 300);
    }, 50);
  }

  // ------------------------------------------------------------------------------------
  // 4) SPLIT METHODS FOR: openThreadFromSearch (~40 lines)
  // ------------------------------------------------------------------------------------

  /**
   * Opens a thread from a search result, deactivating private/chat contexts
   * and setting up the thread environment. On mobile, switches to 'thread'.
   *
   * @param {any} message - The message object found in the search to open as a thread.
   */
  async openThreadFromSearch(message: any): Promise<void> {
    this.resetContextForSearchThread();
    const threadId = this.determineThreadId(message);

    let recipientName = message.recipientName || message.senderName;
    if (!recipientName && message.recipientId) {
      recipientName = await this.fetchRecipientName(message.recipientId);
    }

    this.selectedThread = {
      ...message,
      recipientName: recipientName || 'Unbekannt',
      recipientId: message.recipientId || message.senderId,
      threadId: threadId,
    };

    this.isThreadActive = true;
    this.isThreadFromSearch = true;
    this.handleMobileViewForSearchThread();
  }

  /** Resets the environment before opening a search thread */
  private resetContextForSearchThread(): void {
    this.closeThreadChannel();
    this.isPrivateChat = false;
    this.showWelcomeContainer = false;
    this.selectedChannel = null;
    this.selectedMember = null;
  }

  /** Determines the correct thread ID from the message */
  private determineThreadId(message: any): string {
    return message.threadId || message.parentId || message.id;
  }

  /** Adjusts the mobile view and header for a search-based thread */
  private handleMobileViewForSearchThread(): void {
    if (window.innerWidth < 1278) {
      this.currentMobileView = 'thread';
      this.showDesktopHeader = true;
    }
  }

  // ------------------------------------------------------------------------------------
  // 5) SPLIT METHODS FOR: closeThread (~25 lines)
  // ------------------------------------------------------------------------------------

  /**
   * Closes the currently active thread, resetting relevant states
   * to either private chat, channel chat, or the welcome container.
   */
  closeThread(): void {
    this.resetThreadStates();

    if (this.isPrivateChat && this.selectedMember) {
    } else if (this.selectedChannel) {
    } else {
      this.showWelcomeContainer = true;
    }
    this.determineNextViewAfterThreadClose();
  }

  /** Clears out thread-related states */
  private resetThreadStates(): void {
    this.selectedThread = null;
    this.isThreadActive = false;
    this.isThreadFromSearch = false;
    this.selectedThreadChannel = null;
  }

  /** Checks whether to show private, team, or container view after closing a thread */
  private determineNextViewAfterThreadClose(): void {
    if (this.isPrivateChat && this.selectedMember) {
      this.currentMobileView = 'private';
    } else if (this.selectedChannel) {
      this.currentMobileView = 'team';
    } else {
      this.currentMobileView = 'container';
      this.showWelcomeContainer = !this.selectedChannel && !this.selectedMember;
    }
  }

  /**
   * Opens a thread alongside a private message container,
   * so both the private chat and the thread UI are shown.
   *
   * @param {any} message - The message object to be opened in a thread.
   */
  openThreadFromPrivateMessage(message: any): void {
    this.selectedThread = message;
    this.isThreadActive = true;
    this.isThreadFromSearch = false;
  }

  /**
   * Called when a thread is opened from a search in a scenario
   * where neither a member nor a channel is preselected. Sets up
   * the private chat environment with the message's sender data
   * and loads messages.
   *
   * @param {any} result - The search result containing the thread info.
   */
  handleThreadFromSearch(result: any): void {
    this.activatePrivateChat();
    this.updateSelectedMemberFromSearch(result);
    this.updateSelectedThread(result);
    this.fetchMessagesAndScroll(result);
  }

  /** Activates the private chat mode. */
  private activatePrivateChat(): void {
    this.isPrivateChat = true;
  }

  /** Updates the selectedMember object with data from the search result. */
  private updateSelectedMemberFromSearch(result: any): void {
    this.selectedMember = {
      id: result.senderId || this.selectedMember?.id || '',
      name: result.senderName || this.selectedMember?.name || 'Ubekannt',
      avatar:
        result.senderAvatar ||
        this.selectedMember?.avatar ||
        'assets/img/avatar.png',
      conversationId:
        result.conversationId || this.selectedMember?.conversationId,
    };
  }

  /** Updates the selectedThread with the provided result. */
  private updateSelectedThread(result: any): void {
    this.selectedThread = {
      ...result,
      recipientId: result.senderId,
      recipientName: result.senderName,
    };
  }

  /** Loads messages from the messageService, then scrolls to the new thread. */
  private fetchMessagesAndScroll(result: any): void {
    this.messageService
      .getMessagesOnce('private', result.conversationId)
      .then(() => {
        setTimeout(() => {
          this.scrollToMessage(result.id);
        }, 500);
      });
  }

  /**
   * Fetches the recipient's name from Firestore if it's not already
   * cached locally. Returns 'Unbekannt' if the user is not found.
   *
   * @param {string} recipientId - The unique ID of the recipient to look up.
   * @returns {Promise<string>} A promise that resolves to the recipient's name
   *                            or "Unbekannt" if not found.
   */
  private async fetchRecipientName(recipientId: string): Promise<string> {
    if (!recipientId) return 'Unbekannt';

    if (this.recipientCache.has(recipientId)) {
      return this.recipientCache.get(recipientId)!;
    }

    try {
      const user = await this.userService.getUserById(recipientId);
      const recipientName = user?.name || 'Unbekannt';

      this.recipientCache.set(recipientId, recipientName);
      return recipientName;
    } catch (error) {
      return 'Unbekannt';
    }
  }
}
