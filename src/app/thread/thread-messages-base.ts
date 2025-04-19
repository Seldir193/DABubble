import { Message } from '../message.models';
import { getYesterdayDateComp } from './thread.time.helpers';

export class ThreadMessagesBase {
  isTextareaExpanded: boolean = false;
  privateMessage: string = '';
  currentUser: any;
  imageUrl: string | null = null;
  isEmojiPickerVisible: boolean = false;
  isImageModalOpen: boolean = false;
  tooltipVisible: boolean = false;
  tooltipPosition = { x: 0, y: 0 };
  tooltipEmoji: string = '';
  tooltipSenderName: string = '';
  lastUsedEmojisSent: string[] = [];
  lastUsedEmojisReceived: string[] = [];
  showEditOptions: boolean = false;
  currentMessageId: string | null = null;
  originalMessage: any = null;
  yesterdayDate: Date = getYesterdayDateComp();
  currentDate: Date = new Date();
  formattedParentMessageDate: string = '';
  formattedMessageTime: string = '';
  threadId!: string;
  replyCount: number = 0;
  threadMessages: Message[] = [];
  showLargeImage = false;
  largeImageUrl: string | null = null;
  isDesktop = false;
  allUsers: any[] = [];
  allChannels: any[] = [];
  dropdownState: 'hidden' | 'user' | 'channel' = 'hidden';
  cycleStep = 1;
  lastOpenedChar = '';
  public allUsersOriginal: any[] = [];
  public allChannelsOriginal: any[] = [];

  userMap: {
    [key: string]:
      | {
          name: string;
          avatarUrl: string;
        }
      | undefined;
  } = {};

  public recipientCache: Map<string, string> = new Map();
  public unsubscribeFromThreadMessages: (() => void) | null = null;
  public unsubscribeEmojiListener?: () => void;
  public unsubscribeReplyCount: (() => void) | null = null;
  public unsubscribeChannels: (() => void) | null = null;
  public unsubscribeUsers: (() => void) | null = null;
  public unsubscribeParent?: () => void;
}
