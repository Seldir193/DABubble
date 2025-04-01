import {
  Component,
  OnInit,
  HostListener,
  ViewChild,
  ElementRef,
  EventEmitter,
  Output,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { getAuth, onAuthStateChanged } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { UserService } from '../user.service';
import { ChannelService } from '../channel.service';
import { MessageService } from '../message.service';

import { Message } from '../message.models';
import { PrivateMessagesComponent } from '../private-messages/private-messages.component';

/**
 * The header component for the chat application. Handles user profile,
 * status, searching functionality, and high-level navigation events.
 */
@Component({
  selector: 'app-chat-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-header.component.html',
  styleUrls: ['./chat-header.component.scss'],
})
export class ChatHeaderComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  /**
   * Indicates whether the main menu is open.
   */
  menuOpen = false;

  /**
   * Stores the current user's display name.
   */
  userName: string = '';

  /**
   * Indicates whether the profile card is open.
   */
  profileOpen = false;

  /**
   * Current user status, e.g. "Aktiv" or "Abwesend".
   */
  userStatus: string = 'Aktiv';

  /**
   * Timeout identifier for inactivity (switches user status).
   */
  inactivityTimeout: any;

  /**
   * Temporary editable field for the user's name in editing mode.
   */
  editableUserName: string = '';

  /**
   * Temporary editable field for the user's email in editing mode.
   */
  // editableUserEmail: string = '';

  /**
   * Stores an error message for display if needed.
   */
  errorMessage: string = '';

  /**
   * Stores a success message for display if needed.
   */
  successMessage: string = '';

  /**
   * Avatar URL for the current user.
   */
  userAvatarUrl: string = 'assets/img/avatar.png';

  /**
   * Email address of the current user.
   */
  userEmail: string = '';

  /**
   * Indicates if the profile is in editing mode.
   */
  isEditingProfile: boolean = false;

  /**
   * Prevents opening multiple dialogs at once.
   */
  //isDialogOpen = false;

  /**
   * The current search query entered by the user.
   */
  searchQuery: string = '';

  /**
   * Filtered member results from searches.
   */
  filteredMembers: any[] = [];

  /**
   * Filtered channel results from searches.
   */
  filteredChannels: any[] = [];

  /**
   * Indicates whether no results were found in a search.
   */
  noResultsFound: boolean = false;

  /**
   * Stores the currently authenticated user object (if any).
   */
  currentUser: any = null;

  /**
   * Holds a reference to the selected thread data if relevant.
   */
  selectedThread: any = null;

  /**
   * Holds a reference to the selected member if opening a private chat.
   */
  selectedMember: any = null;

  /**
   * Ensures scrolling to a specific searched message only happens once.
   */
  private hasScrolledToSearchedMessage: boolean = false;

  /**
   * Holds a reference to the selected thread channel data if relevant.
   */
  selectedThreadChannel: any = null;

  /**
   * Emits an event when a member is selected (for private chat).
   */
  @Output() memberSelected = new EventEmitter<any>();

  /**
   * Emits an event when a channel is selected.
   */
  @Output() channelSelected = new EventEmitter<any>();

  /**
   * Emits when the user initiates a private chat.
   */
  @Output() openPrivateChat = new EventEmitter<void>();

  /**
   * Reference to the PrivateMessagesComponent if needed.
   */
  @ViewChild(PrivateMessagesComponent)
  privateMessagesComp!: PrivateMessagesComponent;

  /**
   * Emits an event to open a thread with given data.
   */
  @Output() openThread = new EventEmitter<any>();

  /**
   * Emits an event when a thread is selected.
   */
  @Output() threadSelected = new EventEmitter<{
    id: string;
    messageId: string;
  }>();

  /**
   * Emits an event when a thread-channel is selected.
   */
  @Output() threadChannelSelected = new EventEmitter<any>();

  /**
   * Emits an event when the user clicks a back button in the header.
   */
  @Output() backClicked = new EventEmitter<void>();

  /**
   * Indicates if the layout is in desktop mode.
   */
  isDesktop = false;

  searchResults: any[] = [];
  dropdownOpen: boolean = false;

  /**
   * Parent component can control if a desktop header is shown.
   */
  @Input() showDesktop = false;

  /**
   * Tracks which inputs (name/email) are focused, for styling purposes.
   */
  inputStates: { [key: string]: boolean } = {
    name: false,
    email: false,
  };

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
      this.closeMenu();
      this.closeProfileCard();
      this.dropdownOpen = false;
    }
  }

  /**
   * Resets the inactivity timer on mouse movement.
   */
  @HostListener('document:mousemove')
  onMouseMove() {
    this.resetInactivityTimer();
  }

  /**
   * Resets the inactivity timer on any key press.
   */
  @HostListener('document:keydown')
  onKeyDown() {
    this.resetInactivityTimer();
  }

  /**
   * Checks window size on resize to determine if layout is desktop.
   * @param event The resize event.
   */
  @HostListener('window:resize', ['$event'])
  onResize() {
    this.checkIfDesktop();
  }

  /**
   * Constructor injecting necessary services and references.
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
   * Lifecycle hook: initializes the component,
   * listens for auth changes, resets inactivity, loads user data,
   * and checks screen size.
   */
  ngOnInit(): void {
    this.listenForAuthChanges();
    this.resetInactivityTimer();
    this.loadUserData();
    this.checkIfDesktop();
  }

  /**
   * Determines if the layout should be desktop by window width.
   */
  checkIfDesktop() {
    this.isDesktop = window.innerWidth >= 1278;
  }

  /**
   * Emits a backClicked event (e.g. for mobile navigation).
   */
  onBackClick(): void {
    this.backClicked.emit();
  }

  /**
   * Toggles the visibility of the main menu.
   */
  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  /**
   * Closes the main menu if it is open.
   */
  closeMenu() {
    this.menuOpen = false;
  }

  /**
   * Opens the profile card in view mode (non-edit).
   */
  openProfileCard() {
    this.profileOpen = true;
    this.isEditingProfile = false;
  }

  /**
   * Closes the profile card if open.
   */
  closeProfileCard() {
    this.profileOpen = false;
  }

  /**
   * Opens profile card in editing mode, sets name/email from current user data.
   */
  openSettingCard() {
    this.isEditingProfile = true;
    this.editableUserName = this.userName;
    // this.editableUserEmail = this.userEmail;
  }

  /**
   * Resets input focus states for name/email.
   */
  resetInputBorders() {
    this.inputStates = { name: false, email: false };
  }

  /**
   * Marks the specified input as focused.
   * @param inputId The identifier for the input field (name or email).
   */
  onInputFocus(inputId: string) {
    this.inputStates[inputId] = true;
  }

  /**
   * Marks the specified input as blurred. If empty, reset focus style.
   * @param inputId The identifier for the input field.
   * @param inputValue The current input value.
   */
  onInputBlur(inputId: string, inputValue: string) {
    if (inputValue.trim() === '') {
      this.inputStates[inputId] = false;
    } else {
      this.inputStates[inputId] = true;
    }
  }

  /**
   * Resets the inactivity timer, keeping user status as "Aktiv".
   * After 10 mins with no activity, status changes to "Abwesend".
   */
  resetInactivityTimer() {
    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout);
    }
    this.userStatus = 'Aktiv';
    this.inactivityTimeout = setTimeout(() => {
      this.userStatus = 'Abwesend';
    }, 600000);
  }

  /**
   * Saves profile changes (name/email) by orchestrating sub-steps.
   */
  async saveProfileChanges(): Promise<void> {
    try {
      const user = this.ensureUserIsLoggedIn();
      await this.checkAndUpdateUserName(user);
      //await this.checkAndUpdateUserEmail(user);
    } catch (error: any) {
      this.errorMessage =
        error.message || 'Fehler beim Speichern der Profiländerungen.';
    }
  }

  /**
   * Ensures that a user is logged in; otherwise throws an error.
   */
  private ensureUserIsLoggedIn(): any {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Kein Benutzer angemeldet.');
    }
    return user;
  }

  /**
   * Checks if the username changed, and if so, updates it.
   */
  private async checkAndUpdateUserName(user: any): Promise<void> {
    if (this.editableUserName && this.editableUserName !== this.userName) {
      await this.userService.updateUserName(this.editableUserName);
      this.userName = this.editableUserName;
    }
  }

  /***************************************************************************************
   * Triggers file selection for updating the user's avatar.
   **************************************************************************************/
  onAvatarClick(): void {
    this.fileInput.nativeElement.click();
  }

  /***************************************************************************************
   * Called after the user selects a file. Checks file type/size, then calls readAndUploadFile.
   **************************************************************************************/
  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files ? input.files[0] : null;
    if (!file) {
      this.errorMessage = 'Keine Datei ausgewählt.';
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.errorMessage = 'Bitte wählen Sie eine Bilddatei aus.';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage = 'Die Datei ist zu groß. Bitte < 5 MB auswählen.';
      return;
    }
    this.errorMessage = '';
    this.readAndUploadFile(file);
  }

  /***************************************************************************************
   * Reads the file as DataURL, then updates Firestore with the new avatar URL.
   **************************************************************************************/
  private readAndUploadFile(file: File): void {
    const reader = new FileReader();
    reader.onload = async () => {
      const imageDataUrl = reader.result as string;
      try {
        await this.userService.updateUserAvatar(imageDataUrl);
        this.userAvatarUrl = imageDataUrl;
        this.successMessage = 'Profilbild erfolgreich aktualisiert!';
        setTimeout(() => (this.successMessage = ''), 3000);
      } catch (err: any) {
        this.errorMessage =
          err.message || 'Fehler beim Aktualisieren des Profilbildes.';
      }
    };
    reader.readAsDataURL(file);
  }

  /**
   * Listens for authentication state changes (login/logout) and reloads user data.
   */
  listenForAuthChanges() {
    const auth = getAuth();
    onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          this.loadUserData();
        } else {
          this.userName = 'Guest';
          this.userAvatarUrl = 'assets/img/avatar.png';
        }
      },
      () => {
        this.errorMessage =
          'Fehler bei der Überprüfung des Authentifizierungsstatus.';
      }
    );
  }

  /**
   * Logs out the current user via userService.
   */
  logout() {
    this.userService.logout();
  }

  /**
   * Loads user data (name, email, avatar) from Firestore.
   */
  async loadUserData() {
    try {
      const userData = await this.userService.getCurrentUserData();
      this.userName = userData.name;
      this.userEmail = userData.email;
      this.userAvatarUrl = userData.avatarUrl;
    } catch (error: any) {
      this.errorMessage =
        error.message || 'Fehler beim Laden der Benutzerdaten.';
    }
  }

  showDropdownResults(results: any[]) {
    this.searchResults = results || [];
    this.dropdownOpen = this.searchResults.length > 0;
  }

  onSearchChange(): void {
    const trimmed = this.searchQuery.trim();

    // 1) Wenn leer, Dropdown schließen und Abbruch
    if (trimmed.length === 0) {
      this.dropdownOpen = false;
      this.searchResults = [];
      return;
    }

    // 2) Wenn du Sonderzeichen wie @ oder # hast:
    if (trimmed === '@' || trimmed === '#') {
      this.handleSingleCharSearch(trimmed);
      return;
    }

    // 3) Wenn du erst ab 3 Buchstaben suchen willst,
    //    kannst du z. B. anpassen auf 1 oder 2:
    if (trimmed.length < 0) {
      this.filteredChannels = [];
      this.filteredMembers = [];
      this.dropdownOpen = false;
      return;
    }

    // 4) Deine gewohnte Logik für Volltextsuche
    //    (ohne Enter):
    this.runFullTextSearch();
  }

  /**
   * Checks for single-char '@' or '#' search,
   * then delegates to doAtSearch() or doHashSearch().
   */
  private handleSingleCharSearch(query: string): void {
    if (query === '@') {
      this.doAtSearch();
    } else if (query === '#') {
      this.doHashSearch();
    }
  }

  /**
   * Fetches all users, maps them, then opens user search dialog.
   */
  private doAtSearch(): void {
    this.userService.getAllUsers().then((users) => {
      const mapped = users.map((u) => ({
        id: u.id,
        name: u.name,
        avatarUrl: u.avatarUrl || 'assets/default-avatar.png',
        isOnline: u.isOnline ?? false,
        type: 'user',
      }));
      this.openSearchDialog(mapped, 'user');
    });
  }

  /**
   * Fetches all channels, maps them, then opens channel search dialog.
   */

  private doHashSearch(): void {
    
    this.channelService.getAllChannelsOnce().then((chs) => {
      
      const mapped = chs.map((ch) => ({
        id: ch.id,
        name: ch.name,
        type: 'channel',
      }));
      this.openSearchDialog(mapped, 'channel');
    });
  }
  

  /***************************************************************************************
   * Initiates a full text search by resetting arrays, then fetching data in parallel.
   **************************************************************************************/
  private runFullTextSearch(): void {
    this.filteredChannels = [];
    this.filteredMembers = [];
    this.noResultsFound = false;
    this.fetchSearchData()
      .then(
        ([
          channels,
          users,
          privateMsgs,
          threadMsgs,
          threadChMsgs,
          channelMsgs,
        ]) => {
          this.handleSearchResults(
            channels,
            users,
            privateMsgs,
            threadMsgs,
            threadChMsgs,
            channelMsgs
          );
        }
      )
      .catch(() => {
        // Silently ignore search errors
      });
  }
  selectedChannel: any;

  /***************************************************************************************
   * Fetches data from channels, users, and various message collections in parallel.
   **************************************************************************************/
  private fetchSearchData(): Promise<any[]> {
    
    return Promise.all([
      this.channelService.getChannelsByName(this.searchQuery),
      this.userService.getUsersByFirstLetter(this.searchQuery),
      this.messageService.getMessagesOnce('private'),
      this.messageService.getMessagesOnce('thread'),
      this.messageService.getMessagesOnce('thread-channel'),
      this.messageService.getChannelMessagesOnce(),
    ]);
  }

  /***************************************************************************************
   * Maps channels/users, filters each message type, merges results, deduplicates, opens dialog.
   **************************************************************************************/
  private async handleSearchResults(
    channels: any[],
    users: any[],
    privateMsgs: any[],
    threadMsgs: any[],
    threadChMsgs: any[],
    channelMsgs: any[]
  ): Promise<void> {
    this.filteredChannels = this.mapChannels(channels);
    this.filteredMembers = this.mapUsers(users);
    const privList = this.filterPrivateMessages(privateMsgs);
    const thrList = this.filterThreadMessages(threadMsgs);
    const thrChList = await this.filterThreadChannelMessages(threadChMsgs);
    const chList = await this.filterChannelMessages(channelMsgs);
    this.combineAndOpenResults(chList, privList, thrList, thrChList);
  }


  /***************************************************************************************
   * Converts raw channel data into a typed structure.
   **************************************************************************************/
  private mapChannels(list: any[]): any[] {
    return list.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      type: 'channel',
    }));
  }

  /***************************************************************************************
   * Converts raw user data into a typed structure.
   **************************************************************************************/
  private mapUsers(list: any[]): any[] {
    return list.map((u) => ({
      id: u.id || u.uid,
      name: u.name,
      avatarUrl: u.avatarUrl || 'assets/default-avatar.png',
      isOnline: u.isOnline ?? false,
      type: 'user',
    }));
  }

  /***************************************************************************************
   * Filters and maps private messages that match this.searchQuery.
   **************************************************************************************/

private filterPrivateMessages(list: any[]): any[] {
  const currentUserId = this.userService.getCurrentUserId();
  return list
    .filter((m) => {
      const textMatches = m.content?.text
        ?.toLowerCase()
        .includes(this.searchQuery.toLowerCase());
      const userIsSenderOrRecipient =
        m.senderId === currentUserId || m.recipientId === currentUserId;
      return textMatches && userIsSenderOrRecipient;
    })
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
   * Filters and maps 'thread' messages.
   **************************************************************************************/
  private filterThreadMessages(list: any[]): any[] {
    const currentUserId = this.userService.getCurrentUserId();
  return list
    .filter((m) => {
      const textMatches = m.content?.text
        ?.toLowerCase()
        .includes(this.searchQuery.toLowerCase());
      const userIsSenderOrRecipient =
        m.senderId === currentUserId || m.recipientId === currentUserId;
      return textMatches && userIsSenderOrRecipient;
    })

   
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

 /** Filters thread-channel messages by text search and user membership. */
private async filterThreadChannelMessages(list: any[]): Promise<any[]> {
  const channels = await this.channelService.getAllChannelsOnce(),
        userChannelIds = new Set(channels.map(ch => ch.id)),
        result: any[] = [];
  for (const msg of list) {
    const cId = await this.messageService.findChannelIdIfMissing(msg),
          textMatches = msg.content?.text
            ?.toLowerCase()
            .includes(this.searchQuery.toLowerCase());
    if (cId && userChannelIds.has(cId) && textMatches) {
      result.push({
        id: msg.id,
        text: msg.content?.text || '',
        timestamp: msg.timestamp,
        type: 'thread-channel',
        threadChannelId: msg.threadChannelId || msg.threadId || msg.parentId || msg.id,
        senderId: msg.senderId,
        senderName: msg.senderName || '❌ Unbekannt'
      });
    }
  }
  return result;
}

  private async filterChannelMessages(list: any[]):  Promise<any[]> {
    const userChannels = await this.channelService.getAllChannelsOnce();
    const userChannelIds = new Set(userChannels.map(ch => ch.id));
    return list
      .filter((m) => m.content?.text?.toLowerCase().includes(this.searchQuery.toLowerCase()) &&
       userChannelIds.has(m.channelId)
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
   * Merges and deduplicates everything, then calls deduplicateAndOpenDialog.
   **************************************************************************************/
  private combineAndOpenResults(
    chList: any[],
    privList: any[],
    thrList: any[],
    thrChList: any[]
  ): void {
    const combined = [
      ...this.filteredChannels,
      ...this.filteredMembers,
      ...chList,
      ...privList,
      ...thrList,
      ...thrChList,
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
   * Displays the search results in the dropdown
   * and (optionally) clears the search query afterward.
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
    if (this.searchQuery.trim() === '') {
      return;
    }
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
   * Decides how to open a message object based on its type or fields.
   * @param message The message object to handle.
   */
  openMessage(message: any): void {
    if (!message || !message.id) {
      return;
    }
    this.hasScrolledToSearchedMessage = false;

    if (message.channelId) {
      this.openChannelMessage(message);
      return;
    }
    if (message.conversationId) {
      this.openPrivateMessage(message);
      return;
    }
    if (message.type === 'thread-channel') {
      this.openThreadChannelMessage(message);
      return;
    }
    if (message.threadId || message.parentId) {
      this.openThreadMessage(message);
    }
  }

  /**
   * Opens a channel message by fetching the channel and scrolling to the message.
   */
  private openChannelMessage(message: any): void {
    this.channelService.getChannelById(message.channelId).then((channel) => {
      if (channel) {
        this.selectChannel(channel);
        setTimeout(() => {
          this.channelService
            .getMessages(message.channelId)
            .subscribe((msgs) => {
              this.scrollToMessageIfExists(msgs, message.id);
            });
        }, 800);
      }
    });
  }

  /***************************************************************************************
   * Opens a private message by determining the chat partner, then launching a scroll check.
   **************************************************************************************/
  private openPrivateMessage(msg: any): void {
    const partnerId = this.getChatPartnerId(msg);
    this.memberSelected.emit({ id: partnerId, name: msg.recipientName || '' });
    this.launchPrivateScroll(msg);
  }

  /***************************************************************************************
   * Computes the correct chat partner ID based on the current user vs. sender/recipient.
   **************************************************************************************/
  private getChatPartnerId(msg: any): string {
    const currentUserId = this.userService.getCurrentUserId();
    return msg.senderId === currentUserId ? msg.recipientId : msg.senderId;
  }

  /***************************************************************************************
   * Delays, then fetches private messages. If the target is found, scrolls to it once.
   **************************************************************************************/
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

  /***************************************************************************************
   * Opens a thread-channel message by ensuring the channelId is set,
   * emitting an event, then scrolling to the found message.
   **************************************************************************************/
  private openThreadChannelMessage(msg: any): void {
    this.ensureThreadChannelId(msg);
    this.threadChannelSelected.emit(msg);
    this.launchThreadChannelScroll(msg);
    this.hasScrolledToSearchedMessage = false;
  }

  /***************************************************************************************
   * Ensures msg.threadChannelId is defined. If not, use parentId or msg.id.
   **************************************************************************************/
  private ensureThreadChannelId(msg: any): void {
    if (!msg.threadChannelId) {
      msg.threadChannelId = msg.parentId ?? msg.id;
    }
  }

  /***************************************************************************************
   * Delays, then listens for thread-channel messages, scrolls to match if not scrolled yet.
   **************************************************************************************/
  private launchThreadChannelScroll(msg: any): void {
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
    }, 800);
  }

  /***************************************************************************************
   * Opens a thread message, sets threadId if needed, emits threadSelected,
   * then initiates a delayed scroll to the message.
   **************************************************************************************/
  private openThreadMessage(msg: any): void {
    this.ensureThreadId(msg);
    this.emitThreadEvent(msg);
    this.launchThreadScroll(msg);
    this.hasScrolledToSearchedMessage = false;
  }

  /***************************************************************************************
   * Ensures msg.threadId is set; if not, uses parentId or msg.id.
   **************************************************************************************/
  private ensureThreadId(msg: any): void {
    if (!msg.threadId) {
      msg.threadId = msg.parentId ?? msg.id;
    }
  }

  /***************************************************************************************
   * Emits the threadSelected event with mapped thread data.
   **************************************************************************************/
  private emitThreadEvent(msg: any): void {
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
   * Delays 800ms, then fetches live thread messages, scrolls if the target is found.
   **************************************************************************************/
  private launchThreadScroll(msg: any): void {
    setTimeout(() => {
      this.selectedThread = msg;
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
   * Emits a thread event with the given data.
   */
  selectThread(thread: { id: string; messageId: string }): void {
    this.threadSelected.emit(thread);
  }

  /**
   * Emits a memberSelected event to open a private chat with this member.
   */
  selectMember(member: any): void {
    this.memberSelected.emit(member);
  }

  /**
   * Emits openThread with the given message data.
   */
  forwardOpenThread(message: any): void {
    this.openThread.emit(message);
  }

  /**
   * Selects a channel by emitting channelSelected and changing it in the service.
   */
  selectChannel(channel: any): void {
    this.channelService.changeChannel(channel);
    this.channelSelected.emit(channel);
  }

  /**
   * Selects a thread channel and emits threadChannelSelected.
   */
  selectThreadChannel(threadChannel: any): void {
    this.selectedThreadChannel = threadChannel;
    this.threadChannelSelected.emit(threadChannel);
  }

  /**
   * Checks if a specific message exists in the given array; if found, scrolls to it.
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
   * Attempts to scroll to a message in the DOM, retrying if not immediately found.
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
   * Prevents the click event from propagating further, e.g., to close menus or dialogs.
   * @param event The original click event.
   */
  stopPropagation(event: Event): void {
    event.stopPropagation();
  }

  /**
   * Cancels editing mode for the profile, reverting the name/email
   * to their previous values and closing the profile card.
   */
  cancelEditing(): void {
    this.isEditingProfile = false;
    this.editableUserName = this.userName;
    // this.editableUserEmail = this.userEmail;
    this.resetInputBorders();
    this.closeProfileCard();
  }


}
