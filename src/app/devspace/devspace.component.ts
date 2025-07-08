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
import { runFullTextSearch } from './devspace-search-logic';
import {
  openChannelMessage,
  openPrivateMessage,
  openThreadChannelMessage,
  openThreadMessage,
} from './devspace-open-logic';

@Component({
  selector: 'app-devspace',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './devspace.component.html',
  styleUrls: ['./devspace.component.scss'],
})
export class DevspaceComponent {
  isDesktop = false;
  searchQuery = '';
  filteredChannels: any[] = [];
  filteredMembers: any[] = [];
  noResultsFound = false;
  @Output() searchTriggered = new EventEmitter<string>();
  menuOpen = false;
  selectedChannel: any;
  userName: string = '';
  profileOpen = false;
  userStatus: string = 'Aktiv';
  inactivityTimeout: any;
  editableUserName: string = '';
  editableUserEmail: string = '';
  errorMessage: string = '';
  successMessage: string = '';
  userAvatarUrl: string = 'assets/img/avatar.png';
  userEmail: string = '';
  isEditingProfile: boolean = false;
  recipientId: string = '';
  currentUser: any = null;
  selectedThread: any = null;
  selectedMember: any = null;
  private hasScrolledToSearchedMessage: boolean = false;
  selectedThreadChannel: any = null;
  searchResults: any[] = [];
  dropdownOpen: boolean = false;
  @Output() memberSelected = new EventEmitter<any>();
  @Output() channelSelected = new EventEmitter<any>();
  @Output() openPrivateChat = new EventEmitter<void>();
  @Output() openThread = new EventEmitter<any>();
  @Output() threadSelected = new EventEmitter<{
    id: string;
    messageId: string;
  }>();
  @Output() threadChannelSelected = new EventEmitter<any>();
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild(PrivateMessagesComponent)
  privateMessagesComp!: PrivateMessagesComponent;
  @Input() isPrivateChat!: boolean;
  @Input() recipientName: string = '';
  @Input() recipientAvatarUrl: string = '';
  inputStates: { [key: string]: boolean } = {
    name: false,
    email: false,
  };

  constructor(
    private router: Router,
    private firestore: Firestore,
    private elementRef: ElementRef,
    public userService: UserService,
    public channelService: ChannelService,
    public messageService: MessageService
  ) {}

  ngOnInit() {
    this.checkScreenSize();
    this.userService.getCurrentUserData().then(user => {
      this.currentUser = user;
    });
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: UIEvent) {
    this.checkScreenSize();
  }

  private checkScreenSize(): void {
    const width = window.innerWidth;
    this.isDesktop = width >= 1278;
  }

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
    runFullTextSearch(this, tq);
  }

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

  private resetSearchLists(): void {
    this.filteredChannels = [];
    this.filteredMembers = [];
    this.noResultsFound = false;
  }

  openMessage(message: any): void {
    if (!message || !message.id) return;
    this.hasScrolledToSearchedMessage = false;

    if (message.channelId) {
      openChannelMessage(this, message);
    } else if (message.conversationId) {
      openPrivateMessage(this, message);
    } else if (message.type === 'thread-channel') {
      openThreadChannelMessage(this, message);
    } else if (message.threadId || message.parentId) {
      openThreadMessage(this, message);
    }
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
        openThreadMessage(this, result);
        break;

      case 'thread-channel':
        openThreadChannelMessage(this, result);
        break;

      default:
        break;
    }
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

  selectChannel(channel: any): void {
    this.channelService.changeChannel(channel);
    this.channelSelected.emit(channel);
  }

  selectThreadChannel(threadChannel: any): void {
    this.selectedThreadChannel = threadChannel;
    this.threadChannelSelected.emit(threadChannel);
  }

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
}






















































