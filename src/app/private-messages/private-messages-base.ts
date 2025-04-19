// private-messages-base.ts

import { Message } from '../message.models';

export class PrivateMessagesBase {
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
  yesterdayDate: Date = new Date();
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
  isDesktop = false;
  allChannels: any[] = [];
  dropdownState: 'hidden' | 'user' | 'channel' = 'hidden';
  cycleStep = 1;
  lastOpenedChar = '';
  userMap: { [uid: string]: { name: string; avatarUrl: string } | undefined } =
    {};
  public allUsersOriginal: any[] = [];
  public allChannelsOriginal: any[] = [];

  public replyCache: Map<string, any[]> = new Map();
  public unsubscribeFromThreadMessages: (() => void) | null = null;
  public unsubscribeLiveReplyCounts: (() => void) | null = null;
  public unsubscribeFromThreadDetails: (() => void) | null = null;
  public unsubscribeEmojiListener?: () => void;
  public unsubscribeFromPrivateMessages: (() => void) | null = null;
  public unsubscribeRecipient?: () => void;
  public unsubscribeChannels: (() => void) | null = null;
  public unsubscribeUsers: (() => void) | null = null;
  public hasScrolledOnChange: boolean = false;
  public isChatChanging: boolean = false;
}
