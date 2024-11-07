import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, query, where, getDocs, orderBy, DocumentReference, DocumentData, onSnapshot } from '@angular/fire/firestore';
import { Message } from './message.models';
@Injectable({
  providedIn: 'root',
})
export class MessageService {
  constructor(private firestore: Firestore) {}

  generateConversationId(userId1: string, userId2: string): string {
    return [userId1, userId2].sort().join('_');
  }

  async sendPrivateMessage(senderId: string, recipientId: string, message: any): Promise<void> {
    const conversationId = this.generateConversationId(senderId, recipientId);
    const privateMessagesCollection = collection(this.firestore, `privateMessages/${conversationId}/messages`);
    
    const messageData = {
      ...message,
      timestamp: new Date()
    };
  
    await addDoc(privateMessagesCollection, messageData);
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
        messages.push(doc.data() as Message);
      });
      callback(messages);
    });
  }
  
  

  
}
