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
import { onChannelSelectedLogic } from './chat-channel-logic';
import { onMemberSelectedLogic } from './chat-member-logic';
import { openThreadLogic } from './chat-thread-logic';
import { openSearchFieldLogic } from './chat-search-logic';
import { openThreadChannelFromSearchLogic } from './chat-threadchannel-logic';
import { scrollToMessage } from './chat-scroll-logic';
import { openThreadFromSearch } from './chat-thread-search-logic';
import {
  enterForcedMobileMode,
  exitForcedMobileMode,
} from './chat-mobile-mode-logic';

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
  threadData: any = null;
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
  shouldShowContainer = false;
  @ViewChild('chatHeaderRef') chatHeaderRef!: ChatHeaderComponent;
  @Output() editSquareClicked = new EventEmitter<void>();
  @ViewChild('devspaceRef') devspaceRef!: DevspaceComponent;
  @ViewChild(ChatComponent) chatComponent!: ChatComponent;
  @ViewChild(EntwicklerteamComponent) entwicklerteam!: EntwicklerteamComponent;
  public forcedMobileActive = false;
  public oldDesktopView:
    | 'container'
    | 'team'
    | 'private'
    | 'thread'
    | 'threadChannel'
    | 'welcome'
    | 'search' = 'container';
  public oldIsSearchActive = false;
  public oldIsWorkspaceVisible = true;

  constructor(
    public appStateService: AppStateService,
    private userService: UserService,
    public channelService: ChannelService,
    public messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.showWelcomeContainer = this.appStateService.getShowWelcomeContainer();
    this.checkScreenSize();
    this.updateContainerVisibility();
  }

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

  onEditSquareIconClick(): void {
    if (window.innerWidth < 1278) {
      this.devspaceRef.onEditSquareClick();
      this.showDesktopHeader = true;
    }
    this.previousView = this.currentMobileView;
  }

  private checkScreenSize(): void {
    const width = window.innerWidth;
    if (width >= 1278) {
      this.isWorkspaceVisible = true;
    } else {
    }
  }

  @HostListener('window:resize')
  onResize() {
    const width = window.innerWidth;
    if (width < 1278) {
      this.isWorkspaceVisible = true;
      if (!this.forcedMobileActive) {
        enterForcedMobileMode(this);
      }
    } else {
      if (this.forcedMobileActive) {
        exitForcedMobileMode(this);
        this.showDesktopHeader = false;
      }
    }
    this.updateContainerVisibility();
  }

  public updateContainerVisibility(): void {
    const width = window.innerWidth;
    this.shouldShowContainer =
      width < 1278 ||
      width >= 1470 ||
      this.showWelcomeContainer ||
      this.isSearchActive;
  }

  public openWelcome(): void {
    this.showWelcomeContainer = true;
    this.updateContainerVisibility();
  }

  public closeWelcome(): void {
    this.showWelcomeContainer = false;
    this.updateContainerVisibility();
  }

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

  backToContainer() {
    this.currentMobileView = 'container';
  }

  async openThreadChannelFromSearch(result: any): Promise<void> {
    await openThreadChannelFromSearchLogic(this, result);
  }

  toggleWorkspace(): void {
    this.isWorkspaceVisible = !this.isWorkspaceVisible;
  }

  onChannelSelected(channel: any): void {
   
    onChannelSelectedLogic(this, channel);
  }

 

  onMemberSelected(member: any): void {
    onMemberSelectedLogic(this, member);
  }

  handleMemberSelected(event: { uid: string; name: string }): void {
    this.selectedMemberId = event.uid;
    this.selectedMemberName = event.name;
    this.isPrivateMessage = true;
  }

  stopPrivateMessage(): void {
    this.isPrivateMessage = false;
    this.selectedMemberId = '';
    this.selectedMemberName = '';
  }

  handleEditChannelChange(): void {
    this.isPrivateChat = false;
    this.selectedMember = null;
  }

  openSearchField(searchQuery?: string): void {
    openSearchFieldLogic(this, searchQuery);
  }

  closeSearchField(): void {
    this.showDesktopHeader = false;
    this.currentMobileView = this.previousView;
    this.isSearchActive = false;
    this.updateContainerVisibility();

    if (!this.selectedChannel && !this.isPrivateChat) {
      this.showWelcomeContainer = true;
    }
  }

  handleMemberSelection(member: any): void {
    this.isSearchActive = false;
    this.isPrivateChat = true;
    this.selectedChannel = null;
    this.selectedMember = member;
  }

  openThreadChannel(threadData: any): void {
    this.selectedThreadChannel = threadData;
    if (window.innerWidth < 1278) {
      this.currentMobileView = 'threadChannel';
    }
  }

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

  onCloseSearch(): void {
    this.isSearchActive = false;
  }

  private scrollToMessage(messageId: string, retries = 5): void {
    scrollToMessage(this, messageId, retries);
  }

  openThread(message: any): void {
    openThreadLogic(this, message);
  }

  closeThread(): void {
    this.resetThreadStates();

    if (this.isPrivateChat && this.selectedMember) {
    } else if (this.selectedChannel) {
    } else {
      this.showWelcomeContainer = true;
    }
    this.determineNextViewAfterThreadClose();
  }

  private resetThreadStates(): void {
    this.selectedThread = null;
    this.isThreadActive = false;
    this.isThreadFromSearch = false;
    this.selectedThreadChannel = null;
  }

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

  openThreadFromPrivateMessage(message: any): void {
    this.selectedThread = message;
    this.isThreadActive = true;
    this.isThreadFromSearch = false;
  }

  handleThreadFromSearch(result: any): void {
    this.activatePrivateChat();
    this.updateSelectedMemberFromSearch(result);
    this.updateSelectedThread(result);
    this.fetchMessagesAndScroll(result);
  }

  private activatePrivateChat(): void {
    this.isPrivateChat = true;
  }

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

  private updateSelectedThread(result: any): void {
    this.selectedThread = {
      ...result,
      recipientId: result.senderId,
      recipientName: result.senderName,
    };
  }

  private fetchMessagesAndScroll(result: any): void {
    this.messageService
      .getMessagesOnce('private', result.conversationId)
      .then(() => {
        setTimeout(() => {
          this.scrollToMessage(result.id);
        }, 500);
      });
  }

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

  async openThreadFromSearch(message: any): Promise<void> {
    await openThreadFromSearch(this, message);
  }
}

