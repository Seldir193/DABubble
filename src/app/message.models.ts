
export interface Message {
  id?: string;
  content: MessageContent;
  timestamp: any; // Verwende `any` oder `Date`, je nachdem, ob es ein Firestore-Zeitstempel ist
  senderId: string;
  senderName: string;
  senderAvatar: string;
  time: string;
  date?: string | { seconds: number; nanoseconds: number }; // ✅ Fix: `date` hinzufügen
  recipientId?: string;  // ✅ Falls es sich um eine private Nachricht handelt
  channelId?: string;    // ✅ Falls es sich um eine Channel-Nachricht handelt
  conversationId?: string; // ✅ Wird für private Nachrichten gespeichert
  formattedDate?: string;  // Optional für Datum
  replyCount?: number; // ✅ 
  lastResponseTime?: any;
  
  channelName?: string; 

 threadChannelId?: string;
  parentId?: string;


  
} 


  export interface MessageContent {
    text?: string;
    image?: string | ArrayBuffer | null;
    emojis?: Array<{ emoji: string; count: number }>; // Emojis als Array von Objekten

  }


  
