import { Subscription } from 'rxjs';
import { formatDate } from '@angular/common';
import { getYesterdayDate } from './date-utils';
import {
  getFormattedDate,
  getFormattedTime,
  convertFirestoreTimestampToDate,
  getFormattedThreadLastResponseTime,
} from './date-format-utils';
import { MessageContent } from '../message.models';

export class BaseChatComponent {
  public isDesktop: boolean = false;
  public message: string = '';
  public isEmojiPickerVisible: boolean = false;
  public imageUrl: string | ArrayBuffer | null | undefined = null;
  public isTextareaExpanded: boolean = false;
  public yesterDayDate: Date = getYesterdayDate();
  public isImageModalOpen: boolean = false;
  public dropdownState: 'hidden' | 'user' | 'channel' = 'hidden';
  public cycleStep: number = 1;
  public lastOpenedChar: string = '';
  public showEditOptions: boolean = false;
  public newMessage: string = '';
  public privateMessage: string = '';
  public showWelcomeContainer: boolean = false;
  public tooltipVisible: boolean = false;
  public tooltipPosition: { x: number; y: number } = { x: 0, y: 0 };
  public tooltipEmoji: string = '';
  public tooltipSenderName: string = '';
  public showLargeImage: boolean = false;
  public largeImageUrl: string | null = null;
  public isOverlayOpen: boolean = false;
  public isAddMembersOverlayOpen: boolean = false;
  public lastUsedEmojisSent: string[] = [];
  public lastUsedEmojisReceived: string[] = [];
  public currentMessageId: string | null = null;
  public selectedMember: any = null;

  public allChannels: any[] = [];
  public channels: {
    id: string;
    name: string;
    members: any[];
    description?: string;
    createdBy?: string;
  }[] = [];
  public messages: Array<{
    id: string;
    type: string;
    content: MessageContent;
    senderId: string;
    time: string;
    date: string;
    timestamp?: Date;
    replyCount?: number;
    isEditing?: boolean;
    showAllEmojisList?: boolean;
    expanded?: boolean;
    threadId?: string;
    parentId?: string;
    lastReplyTime?: string | Date;
    threadLastResponseTime?: string | Date | null;
    isTimeFixed?: boolean;
    isHighlighted?: boolean;
    isEmojiPickerVisible?: boolean;
    edited?: boolean;
  }> = [];
  public members: any[] = [];
  public allUsers: any[] = [];
  public userMap: {
    [uid: string]: { name: string; avatarUrl: string } | undefined;
  } = {};

  public currentUser: any;
  public currentDate: string = formatDate(new Date(), 'dd.MM.yyyy', 'en');
  public currentDateString: string = new Date().toISOString();
  public formattedDate: string = '';
  public formattedTime: string = '';
  public dateObj: Date | null = null;
  public threadTime: string = '';

  public allUsersOriginal: any[] = [];
  public allChannelsOriginal: any[] = [];

  public getFormattedDate = getFormattedDate;
  public getFormattedTime = getFormattedTime;
  public convertFirestoreTimestampToDate = convertFirestoreTimestampToDate;
  public getFormattedThreadLastResponseTime =
    getFormattedThreadLastResponseTime;

  public unsubscribeFromThreadMessages: (() => void) | null = null;
  public unsubscribeLiveReplyCounts: (() => void) | null = null;
  public unsubscribeFromThreadDetails: (() => void) | null = null;
  public replyCountsUnsubscribe: (() => void) | null = null;
  public unsubscribeChannels: (() => void) | null = null;
  public unsubscribeUsers: (() => void) | null = null;
  public unsubscribeTopLevel?: Subscription;
  public unsubscribeSubCollection?: Subscription;
  protected hasInitialScrollDone: boolean = false;
  public setChannelsUnsubscribe: (() => void) | null = null;
  public setUsersUnsubscribe: (() => void) | null = null;
}
