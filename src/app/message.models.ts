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

}

export interface MessageContent {
  text?: string;
  image?: string | ArrayBuffer | null;
  emojis?: Array<{ emoji: string; count: number }>;
}

/**
 * FirestoreMessageData defines the structure of a message document in Firestore.
 * Add more properties as needed to reflect your Firestore schema.
 */
export interface FirestoreMessageData {
  content?: {
    emojis?: Array<{
      emoji: string;
      count: number;
    }>;
  };
  // additional fields go here, e.g. senderId, timestamp, etc.
}




// message.models.ts
export interface BroadcastMessageData {
  broadcastChannels: string[]; 
  senderId: string;
  date?: string;
  time?: string;
  timestamp?: any;
  senderName?: string;
  senderAvatar?: string;
  content: {
    text: string;
    image?: string;
    emojis?: any[];
  };
  messageFormat: string; 
}





// message.models.ts

export interface ChannelMessageData {
  channelId?: string;
  date?: string;
  time?: string;
  timestamp?: any;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  content: {
    text: string;
    image?: string;
    emojis?: any[];
  };
  messageFormat: string; 
}
