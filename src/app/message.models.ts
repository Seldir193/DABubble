// src/app/models/message.model.ts
export interface Message {
    content: {
      text?: string;
      image?: string | ArrayBuffer | null;
    };
    timestamp: any; // Verwende `any` oder `Date`, je nachdem, ob es ein Firestore-Zeitstempel ist
    senderId: string;
    senderName: string;
    senderAvatar: string;
  }
  
