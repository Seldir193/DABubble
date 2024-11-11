import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, query, where, getDocs,setDoc,getDocFromCache, orderBy,getDoc, DocumentReference, DocumentData, onSnapshot,doc,updateDoc } from '@angular/fire/firestore';
import { Message } from './message.models';
import { serverTimestamp } from 'firebase/firestore';
import { MessageContent } from './message.models';

import { FieldValue, arrayUnion } from 'firebase/firestore';

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  constructor(private firestore: Firestore) {}

  generateConversationId(userId1: string, userId2: string): string {
    return [userId1, userId2].sort().join('_');
  }

  async getPrivateMessages(senderId: string, recipientId: string): Promise<any[]> {
    const conversationId = this.generateConversationId(senderId, recipientId);
    const privateMessagesCollection = collection(this.firestore, `privateMessages/${conversationId}/messages`);
    
    const q = query(privateMessagesCollection, orderBy('timestamp', 'asc'));
    const querySnapshot = await getDocs(q);
    const messages: any[] = [];
    
    querySnapshot.forEach((doc) => {
      messages.push(doc.data());
    });
    
    return messages;
  }

  listenForPrivateMessages(conversationId: string, callback: (messages: Message[]) => void): void {
    const privateMessagesCollection = collection(this.firestore, `privateMessages/${conversationId}/messages`);
    const q = query(privateMessagesCollection, orderBy('timestamp', 'asc'));
  
    onSnapshot(q, (snapshot) => {
      const messages: Message[] = [];
      snapshot.forEach((doc) => {
        const messageData = doc.data() as Message;
        messageData.id = doc.id; // Nachricht-ID hinzufügen
        messageData.content.emojis = messageData.content.emojis || [];
        messages.push(messageData);
      });
      callback(messages);
    });
  }

  async sendPrivateMessage(conversationId: string, messageData: any): Promise<void> {
    const privateMessagesCollection = collection(this.firestore, `privateMessages/${conversationId}/messages`);
    await addDoc(privateMessagesCollection, {
      ...messageData,
      timestamp: serverTimestamp(),
    });
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
    
    // Referenz auf das spezifische Nachrichtendokument
    const messageDocRef = doc(this.firestore, `privateMessages/${conversationId}/messages`, messageId);
    
    // Aktualisiere Firestore mit dem neuen Inhalt und aktualisiere den Zeitstempel
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
      timestamp: new Date() // Aktualisiere den Zeitstempel
    });
    console.log('Nachricht erfolgreich im Firestore aktualisiert');
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Nachricht im Firestore:', error);
  }
}
}
