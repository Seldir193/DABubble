export interface Message {
  id?: string;
  content: MessageContent;
  timestamp: any;
  senderId: string;
  time: string;
  date?: string | { seconds: number; nanoseconds: number };
  recipientId?: string;
  channelId?: string;
  conversationId?: string;
  formattedDate?: string;
  replyCount?: number;
  lastResponseTime?: any;
  channelName?: string;
  threadChannelId?: string;
  parentId?: string;
  isHighlighted?: boolean;
  isEditing?: boolean;
  isEmojiPickerVisible?: boolean;
  showAllEmojisList?: boolean;
  expanded?: boolean;
  type?: string;
  threadId?: string;
  lastReplyTime?: any;
  recipientName?: string;
  showDateSeparator?: boolean; 
  edited?: boolean;
}
export interface MessageContent {
  text?: string;
  image?: string | ArrayBuffer | null;
  emojis?: Array<{ emoji: string; count: number }>;
  edited?: boolean;
}

export interface FirestoreMessageData {
  content?: {
    emojis?: Array<{
      emoji: string;
      count: number;
    }>;
  };
}
export interface ChannelMessageData {
  channelId?: string;
  date?: string;
  time?: string;
  timestamp?: any;
  senderId: string;
  senderName?: string;
  senderAvatar?: string ;
  content: {
    text: string;
    image?: string;
    emojis?: any[];
  };
  messageFormat: string; 
}



export type ReplyCountsMap = Record<
  string,
  { count: number; lastResponseTime: Date | null }
>;







