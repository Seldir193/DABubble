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
import { onSearchChangeLogic } from './chat-header-search-logic';
import { onFileSelectedLogic } from './chat-header-logic';
import {
  resetInactivityTimerLogic,
  onMouseMoveLogic,
  onKeyDownLogic,
} from './chat-header-inactivity-logic';
import { openThreadMessage } from './chat-header-thread-logic';
import { openThreadChannelMessage } from './chat-header-thread-channel-logic';
import { openChannelMessage, selectChannel } from './chat-header-channel-logic';
import {
  scrollToMessageIfExists,
  scrollToMessage,
} from './chat-header-scroll-logic';
import { openPrivateMessage } from './chat-header-private-logic';

@Component({
  selector: 'app-chat-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-header.component.html',
  styleUrls: ['./chat-header.component.scss'],
})
export class ChatHeaderComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  menuOpen = false;
  selectedChannel: any;
  userName: string = '';
  profileOpen = false;
  userStatus: string = 'Aktiv';
  inactivityTimeout: any;
  editableUserName: string = '';
  errorMessage: string = '';
  successMessage: string = '';
  userAvatarUrl: string = 'assets/img/avatar.png';
  userEmail: string = '';
  isEditingProfile: boolean = false;
  searchQuery: string = '';
  filteredMembers: any[] = [];
  filteredChannels: any[] = [];
  noResultsFound: boolean = false;
  currentUser: any = null;
  selectedThread: any = null;
  selectedMember: any = null;
  public hasScrolledToSearchedMessage: boolean = false;
  selectedThreadChannel: any = null;
  @Output() memberSelected = new EventEmitter<any>();
  @Output() channelSelected = new EventEmitter<any>();
  @Output() openPrivateChat = new EventEmitter<void>();
  @ViewChild(PrivateMessagesComponent)
  privateMessagesComp!: PrivateMessagesComponent;
  @Output() openThread = new EventEmitter<any>();
  @Output() threadSelected = new EventEmitter<{
    id: string;
    messageId: string;
  }>();
  @Output() threadChannelSelected = new EventEmitter<any>();
  @Output() backClicked = new EventEmitter<void>();
  isDesktop = false;
  searchResults: any[] = [];
  dropdownOpen: boolean = false;
  @Input() showDesktop = false;
  inputStates: { [key: string]: boolean } = {
    name: false,
    email: false,
  };

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

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.checkIfDesktop();
  }

  constructor(
    private router: Router,
    private firestore: Firestore,
    private elementRef: ElementRef,
    public userService: UserService,
    public channelService: ChannelService,
    public messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.listenForAuthChanges();
    this.resetInactivityTimer();
    this.loadUserData();
    this.checkIfDesktop();
  }

  checkIfDesktop() {
    this.isDesktop = window.innerWidth >= 1278;
  }

  onBackClick(): void {
    this.backClicked.emit();
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu() {
    this.menuOpen = false;
  }

  closeProfileCard() {
    this.profileOpen = false;
  }

  openSettingCard() {
    this.isEditingProfile = true;
    this.editableUserName = this.userName;
  }

  resetInputBorders() {
    this.inputStates = { name: false, email: false };
  }

  onInputFocus(inputId: string) {
    this.inputStates[inputId] = true;
  }

  onInputBlur(inputId: string, inputValue: string) {
    if (inputValue.trim() === '') {
      this.inputStates[inputId] = false;
    } else {
      this.inputStates[inputId] = true;
    }
  }

  @HostListener('document:mousemove')
  onMouseMove() {
    onMouseMoveLogic(this);
  }

  @HostListener('document:keydown')
  onKeyDown() {
    onKeyDownLogic(this);
  }

  resetInactivityTimer() {
    resetInactivityTimerLogic(this);
  }

  async saveProfileChanges(): Promise<void> {
    try {
      const user = this.ensureUserIsLoggedIn();
      await this.checkAndUpdateUserName(user);
    } catch (error: any) {
      this.errorMessage =
        error.message || 'Fehler beim Speichern der Profiländerungen.';
    }
  }

  private ensureUserIsLoggedIn(): any {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Kein Benutzer angemeldet.');
    }
    return user;
  }

  private async checkAndUpdateUserName(user: any): Promise<void> {
    if (this.editableUserName && this.editableUserName !== this.userName) {
      await this.userService.updateUserName(this.editableUserName);
      this.userName = this.editableUserName;
    }
  }

  openProfileCard() {
    this.profileOpen = true;
    this.isEditingProfile = false;
  }

  onAvatarClick(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): Promise<void> {
    return onFileSelectedLogic(this, event);
  }

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

  logout() {
    this.userService.logout();
  }

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
    onSearchChangeLogic(this);
  }

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

  public selectChannel(channel: any): void {
    selectChannel(this, channel);
  }

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

  public openChannelMessage(message: any): void {
    openChannelMessage(this, message);
  }

  public openPrivateMessage(msg: any): void {
    openPrivateMessage(this, msg);
  }

  public scrollToMessageIfExists(
    messages: Message[],
    messageId: string,
    retries = 5
  ): void {
    scrollToMessageIfExists(this, messages, messageId, retries);
  }

  public scrollToMessage(messageId: string, retries = 10): void {
    scrollToMessage(this, messageId, retries);
  }

  public openThreadChannelMessage(msg: any): void {
    openThreadChannelMessage(this, msg);
  }

  public openThreadMessage(msg: any): void {
    openThreadMessage(this, msg);
  }

  selectThread(thread: { id: string; messageId: string }): void {
    this.threadSelected.emit(thread);
  }

  selectMember(member: any): void {
    this.memberSelected.emit(member);
  }

  forwardOpenThread(message: any): void {
    this.openThread.emit(message);
  }

  selectThreadChannel(threadChannel: any): void {
    this.selectedThreadChannel = threadChannel;
    this.threadChannelSelected.emit(threadChannel);
  }

  stopPropagation(event: Event): void {
    event.stopPropagation();
  }

  cancelEditing(): void {
    this.isEditingProfile = false;
    this.editableUserName = this.userName;
    this.resetInputBorders();
    this.closeProfileCard();
  }
}







































