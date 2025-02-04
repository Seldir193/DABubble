import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, query, where, getDocs,setDoc,getDocFromCache, orderBy,getDoc, DocumentReference, DocumentData, onSnapshot,doc,updateDoc, limit, collectionGroup} from '@angular/fire/firestore';
import { Message } from './message.models';
import { serverTimestamp } from 'firebase/firestore';
import { MessageContent } from './message.models';
import { FieldValue, arrayUnion } from 'firebase/firestore';

import { getAuth } from 'firebase/auth';

import { Timestamp } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  constructor(private firestore: Firestore) {}

generateConversationId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join('_');
}





async getPrivateMessages(senderId: string, recipientId: string): Promise<Message[]> {
  const conversationId = this.generateConversationId(senderId, recipientId);
  const messagesRef = collection(this.firestore, `privateMessages/${conversationId}/messages`);

  const q = query(messagesRef, orderBy('timestamp', 'asc'));
  const querySnapshot = await getDocs(q);

  const messages = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data()['timestamp'] instanceof Timestamp 
          ? doc.data()['timestamp'].toDate() 
          : new Date()
  }));

  // Entferne doppelte Nachrichten basierend auf der ID
  return Array.from(new Map(messages.map(msg => [msg.id, msg])).values()) as Message[];
}


listenForPrivateMessages(conversationId: string, callback: (messages: Message[]) => void): () => void {
  // Greift auf die Firestore-Collection zu: privateMessages/{conversationId}/messages
  const privateMessagesCollection = collection(this.firestore, `privateMessages/${conversationId}/messages`);
  const q = query(privateMessagesCollection, orderBy('timestamp', 'asc'));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const messages: Message[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data() as any;

      return {
        id: docSnap.id,
        content: data.content || {},           // Falls kein content vorhanden ist, leeres Objekt
        senderId: data.senderId || '',         // Falls senderId fehlt, leerer String
        senderName: data.senderName || '',
        senderAvatar: data.senderAvatar || '',
        timestamp: data['timestamp'] instanceof Timestamp
          ? data['timestamp'].toDate()  // Falls es ein Firestore-Timestamp ist, in Date umwandeln
          : new Date()
      };
    });

    callback(messages);
  });

  return unsubscribe;
}



async findPrivateMessage(conversationId: string, messageId: string): Promise<Message | null> {
  if (!conversationId || !messageId) {
    console.error("❌ Ungültige Parameter für findPrivateMessage!", { conversationId, messageId });
    return null;
  }

  try {
    const messageDocRef = doc(this.firestore, `privateMessages/${conversationId}/messages`, messageId);
    const messageDoc = await getDoc(messageDocRef);

    if (messageDoc.exists()) {
      const data = messageDoc.data();
      return {
        id: messageDoc.id,
        content: data?.['content'] || {}, // Index-Zugriff zur Fehlervermeidung
        senderId: data?.['senderId'] || '',
        senderName: data?.['senderName'] || '',
        senderAvatar: data?.['senderAvatar'] || '',
        timestamp: data?.['timestamp'] instanceof Timestamp ? data['timestamp'].toDate() : new Date()
      };
    } else {
      console.warn(`⚠️ Nachricht mit ID ${messageId} nicht gefunden!`);
      return null;
    }
  } catch (error) {
    console.error("❌ Fehler beim Abrufen der Nachricht:", error);
    return null;
  }
}


  async sendPrivateMessage(conversationId: string, messageData: any): Promise<void> {
    const privateMessagesCollection = collection(this.firestore, `privateMessages/${conversationId}/messages`);
    const conversationDocRef = doc(this.firestore, 'conversations', conversationId);
  
    try {
      // Nachricht in der Subkollektion speichern
      await addDoc(privateMessagesCollection, {
        ...messageData,
        timestamp: serverTimestamp(),
      });
  
      // Aktualisiere das Feld `lastResponseTime` in der Hauptkollektion
      await updateDoc(conversationDocRef, {
        lastResponseTime: serverTimestamp(),
      });
  
      console.log('Nachricht erfolgreich gesendet und lastResponseTime aktualisiert.');
    } catch (error) {
      console.error('Fehler beim Senden der Nachricht oder beim Aktualisieren von lastResponseTime:', error);
    }
  }


  
  async initializeConversation(conversationId: string): Promise<void> {
    const conversationDocRef = doc(this.firestore, 'conversations', conversationId);
    const conversationDoc = await getDoc(conversationDocRef);
    
    if (!conversationDoc.exists()) {
      // Initialisiere ein neues Konversationsdokument, wenn es nicht existiert
      await setDoc(conversationDocRef, {
        lastUsedEmojisSent: [],
        lastUsedEmojisReceived: []
      });
    }
  }

  async saveLastUsedEmojis(conversationId: string, emojis: string[], type: 'sent' | 'received'): Promise<void> {
    const conversationDocRef = doc(this.firestore, 'conversations', conversationId);
    const fieldToUpdate = type === 'sent' ? 'lastUsedEmojisSent' : 'lastUsedEmojisReceived';
    await updateDoc(conversationDocRef, { [fieldToUpdate]: emojis });
  }

  async getLastUsedEmojis(conversationId: string, type: 'sent' | 'received'): Promise<string[]> {
    const conversationDocRef = doc(this.firestore, 'conversations', conversationId);
    const conversationDoc = await getDoc(conversationDocRef);
    if (conversationDoc.exists()) {
      const data = conversationDoc.data();
      return type === 'sent' ? data['lastUsedEmojisSent'] || [] : data['lastUsedEmojisReceived'] || [];
    }
    return [];
  }

async updatePrivateMessageEmojis(conversationId: string, messageId: string, emojis: any[]): Promise<void> {
  // Referenz zur spezifischen Nachrichtendokument in Firestore
  const messageDocRef = doc(this.firestore, `privateMessages/${conversationId}/messages`, messageId);

  try {
      // Aktualisiere nur das Emoji-Array innerhalb der Nachricht
      await updateDoc(messageDocRef, { 'content.emojis': emojis });
      console.log('Emoji erfolgreich zur Nachricht in Firestore hinzugefügt.');
     
  } catch (error) {
      console.error('Fehler beim Aktualisieren der Emoji-Reaktionen in Firestore:', error);
  }
}

async updatePrivateMessage(conversationId: string, messageId: string, updatedContent: MessageContent): Promise<void> {
  
  try {
    console.log(`Aktualisiere Nachricht in Konversation ID: ${conversationId}`);
    
    const messageDocRef = doc(this.firestore, `privateMessages/${conversationId}/messages`, messageId);
    
    await updateDoc(messageDocRef, {
      content: updatedContent,
      timestamp: serverTimestamp()
    });

    console.log('Nachricht erfolgreich aktualisiert.');
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Nachricht:', error);
  }
}

async updatePrivateMessageContent(conversationId: string, messageId: string, updatedContent: MessageContent): Promise<void> {
  const messageDocRef = doc(this.firestore, `privateMessages/${conversationId}/messages`, messageId);

  try {
    await updateDoc(messageDocRef, {
      content: updatedContent,
      //timestamp: new Date() // Aktualisiere den Zeitstempel
      timestamp: serverTimestamp()
    });
    console.log('Nachricht erfolgreich im Firestore aktualisiert');
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Nachricht im Firestore:', error);
  }
}








startPrivateChat(userId: string): void {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    console.error('Kein Benutzer angemeldet.');
    return;
  }

  const conversationId = this.generateConversationId(currentUser.uid, userId);
  console.log('Öffne privaten Chat:', conversationId);

  // Hier kannst du z.B. eine Router-Navigation oder einen Event-Emitter hinzufügen,
  // um die Benutzeroberfläche zu aktualisieren und den privaten Chat anzuzeigen.
}





























getAllPrivateMessagesLive(callback: (messages: any[]) => void): () => void {
  const privateMessagesRef = collectionGroup(this.firestore, 'messages');

  const unsubscribe = onSnapshot(privateMessagesRef, (snapshot) => {
    const allMessages: any[] = [];

    snapshot.forEach((docSnap) => {
      const msgData = docSnap.data();

      // 🔥 Falls `conversationId` fehlt, generiere sie aus `senderId` und `recipientId`
      if (!msgData['conversationId'] && msgData['senderId'] && msgData['recipientId']) {
        msgData['conversationId'] = [msgData['senderId'], msgData['recipientId']].sort().join('_');
      }

      allMessages.push({ id: docSnap.id, ...msgData });
    });

    console.log("📩 ALLE privaten Nachrichten von Firestore erhalten:", allMessages);
    callback(allMessages);
  });

  return unsubscribe;
}










async getPrivateMessageById(conversationId: string, messageId: string): Promise<any> {
  try {
      const messageDocRef = doc(this.firestore, `privateMessages/${conversationId}/messages`, messageId);
      const messageDoc = await getDoc(messageDocRef);

      if (messageDoc.exists()) {
          const messageData = messageDoc.data();
          messageData['id'] = messageDoc.id;
          messageData['conversationId'] = conversationId;

          // ✅ recipientId aus der conversationId bestimmen, falls es fehlt
          if (!messageData['recipientId'] || messageData['recipientId'] === "unknown") {
              const ids = conversationId.split('_');
              messageData['recipientId'] = ids.find(id => id !== messageData['senderId']) || null;
          }

          return messageData;
      } else {
          throw new Error('❌ Nachricht nicht gefunden');
      }
  } catch (error) {
      console.error('Fehler beim Abrufen der Nachricht:', error);
      throw error;
  }
}






}

