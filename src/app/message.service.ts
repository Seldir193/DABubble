import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, query, where, getDocs } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  constructor(private firestore: Firestore) {}

  async getPrivateMessages(recipientId: string): Promise<any[]> {
    const messagesCollection = collection(this.firestore, 'messages');
    const q = query(messagesCollection, where('recipientId', '==', recipientId));

    const querySnapshot = await getDocs(q);
    const messages: any[] = [];

    querySnapshot.forEach((doc) => {
      messages.push(doc.data());
    });

    return messages;
  }

  async sendPrivateMessage(message: any): Promise<void> {
    const messagesCollection = collection(this.firestore, 'messages');
    await addDoc(messagesCollection, message);
  }

  async addPrivateMessage(recipientId: string, message: any): Promise<void> {
    const messagesRef = collection(this.firestore, 'privateMessages', recipientId, 'messages');
    return addDoc(messagesRef, message).then(() => {});  // Rückgabe als leeres Promise<void>
  }
  
  
}
