import { Message } from '../message.models';
import { getYesterdayDateHelper } from './thread-channel.date-helpers';

export class ThreadChannelBase {
  isTextareaExpanded: boolean = false;
  selectedChannel: {
    id: string;
    name: string;
    members: any[];
    description?: string;
    createdBy?: string;
  } | null = null;
  channelMessage: string = '';
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
  messages: any[] = [];
  currentDate: Date = new Date();
  yesterdayDate: Date = getYesterdayDateHelper();
  originalParentMessage: any = null;
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

  public unsubscribeFromThreadMessages?: () => void;
  public unsubscribeFromReplyCount?: () => void;
  public unsubscribeChannels: (() => void) | null = null;
  public unsubscribeUsers: (() => void) | null = null;
  public unsubscribeParent?: () => void;
}
