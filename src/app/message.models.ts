export interface Message {
    id?: string;
    content: MessageContent;
    
    timestamp: any; // Verwende `any` oder `Date`, je nachdem, ob es ein Firestore-Zeitstempel ist
    senderId: string;
    senderName: string;
    senderAvatar: string;
   //emojis?: Array<{ emoji: string; count: number }>; 
    //emojis?: any[];
    //emojis?: any[];
  }
  
  export interface MessageContent {
    text?: string;
    image?: string | ArrayBuffer | null;
    emojis?: Array<{ emoji: string; count: number }>; // Emojis als Array von Objekten
  }