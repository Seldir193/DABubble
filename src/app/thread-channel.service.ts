import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, getDocs, setDoc, getDoc, doc, updateDoc } from '@angular/fire/firestore';



import { Message, MessageContent } from './message.models';

@Injectable({
  providedIn: 'root',
})
export class ThreadChannelService {
  private channelId!: string;
  private parentMessage: any = null; // Speichert die Hauptnachricht für den Thread-Channel



  constructor(private firestore: Firestore) {}

  // Hauptnachricht setzen
  setThreadMessage(message: any): void {
    this.parentMessage = message;
  }

  // Hauptnachricht abrufen
  getThreadMessage(): any {
    return this.parentMessage;
  }

  setChannelId(channelId: string): void {
    this.channelId = channelId;
  }
  


 

  async addThreadReply(channelId: string, threadId: string, reply: any): Promise<void> {
    const threadMessagesCollection = collection(
      this.firestore,
      `channels/${channelId}/threads/${threadId}/messages`
    );
    const threadDocRef = doc(this.firestore, `channels/${channelId}/threads/${threadId}`);
  
    try {
      // Nachricht hinzufügen
      await addDoc(threadMessagesCollection, {
        ...reply,
        timestamp: serverTimestamp(),
      });
  
      // Aktualisiere den Zeitstempel der letzten Antwort im Thread
      await updateDoc(threadDocRef, { threadLastResponseTime: serverTimestamp() });
  
      console.log('Antwort erfolgreich hinzugefügt und Zeitstempel aktualisiert.');
    } catch (error) {
      console.error('Fehler beim Hinzufügen der Antwort:', error);
    }
  }
  





  

  



  

  

  getThreadMessages(channelId: string, threadId: string, callback: (messages: Message[]) => void): () => void {
    const threadMessagesCollection = collection(this.firestore, `channels/${channelId}/threads/${threadId}/messages`);
    const q = query(threadMessagesCollection, orderBy('timestamp', 'asc'));
  
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages: Message[] = [];
  
      snapshot.forEach((docSnap) => {
        const messageData: Message = { id: docSnap.id, ...docSnap.data() } as Message;
  
        // Firestore Timestamp -> Date
        messageData.timestamp = this.convertToDate(messageData.timestamp);
  
        messages.push(messageData);
      });
  
      callback(messages);
    });
  
    return unsubscribe;
  }
  
  
  
  public convertToDate(timestamp: any): Date | null {
    if (!timestamp) return null;
    if (timestamp.toDate) {
      return timestamp.toDate();
    }
    if (timestamp instanceof Date) {
      return timestamp;
    }
    const parsed = new Date(timestamp);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  
  
  

  async getReplyCountsForMessages(channelId: string, threadIds: string[]): Promise<Record<string, number>> {
    const replyCounts: Record<string, number> = {};
  
    for (const threadId of threadIds) {
      const threadMessagesCollection = collection(this.firestore, `channels/${channelId}/threads/${threadId}/messages`);
      const snapshot = await getDocs(threadMessagesCollection);
      replyCounts[threadId] = snapshot.size;
    }
  
    return replyCounts;
  }

 

  async getLastUsedEmojis(channelId: string, threadId: string, type: 'sent' | 'received'): Promise<string[]> {
    const threadDocRef = doc(this.firestore, `channels/${channelId}/threads/${threadId}`);
    const threadDoc = await getDoc(threadDocRef);
  
    if (threadDoc.exists()) {
      const data = threadDoc.data();
      return type === 'sent' ? data['lastUsedEmojisSent'] || [] : data['lastUsedEmojisReceived'] || [];
    }
  
    return [];
  }
  



  async initializeThread(channelId: string, threadId: string): Promise<void> {
    const threadDocRef = doc(this.firestore, `channels/${channelId}/threads/${threadId}`);
    const threadDoc = await getDoc(threadDocRef);
  
    if (!threadDoc.exists()) {
      console.log(`Thread ${threadId} existiert nicht. Erstelle neuen Thread-Eintrag.`);
      await setDoc(
        threadDocRef,
        { lastUsedEmojisSent: [], lastUsedEmojisReceived: [] },
        { merge: true }
      );
      
      
    } else {
      console.log(`Thread ${threadId} existiert bereits.`);
    }
  }



  async updateThreadMessageContent(channelId: string, threadId: string, messageId: string, updatedText: string): Promise<void> {
    const messageDocRef = doc(this.firestore, `channels/${channelId}/threads/${threadId}/messages`, messageId);

    try {
      await updateDoc(messageDocRef, {
        'content.text': updatedText,
        timestamp: serverTimestamp(),
      });
      console.log('Nachricht erfolgreich in Firestore aktualisiert.');
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Nachricht in Firestore:', error);
    }
  }



  loadReplyCountsLive(channelId: string, threadIds: string[], callback: (replyCounts: Record<string, number>) => void): void {
    const replyCounts: Record<string, number> = {};
    console.log('Starte Live-Reply-Updates für Thread IDs:', threadIds);

    threadIds.forEach((threadId) => {
      const threadMessagesCollection = collection(this.firestore, `channels/${channelId}/threads/${threadId}/messages`);
      onSnapshot(threadMessagesCollection, (snapshot) => {
        replyCounts[threadId] = snapshot.size; 
        console.log(`Live-Update: Thread ${threadId} hat jetzt ${replyCounts[threadId]} Antworten.`);

        callback(replyCounts);
      });
    });
  }

 

  async updateThreadLastResponseTime(channelId: string, threadId: string): Promise<void> {
    const threadDocRef = doc(this.firestore, `channels/${channelId}/threads`, threadId);

    try {
      await updateDoc(threadDocRef, { threadLastResponseTime: serverTimestamp() });
      console.log('ThreadLastResponseTime erfolgreich aktualisiert.');
    } catch (error) {
      console.error('Fehler beim Aktualisieren von ThreadLastResponseTime:', error);
    }
  }

  listenToThreadDetails(channelId: string, threadId: string, callback: (data: any) => void): () => void {
    const threadDocRef = doc(this.firestore, `channels/${channelId}/threads`, threadId);

    return onSnapshot(
      threadDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          callback(docSnap.data());
        }
      },
      (error) => {
        console.error(`Fehler beim Anhören des Threads ${threadId}:`, error);
      }
    );
  }





  async saveLastUsedEmojis(channelId: string, threadId: string, emojis: string[], type: 'sent' | 'received'): Promise<void> {
    const threadDocRef = doc(this.firestore, `channels/${channelId}/threads/${threadId}`);
    const field = type === 'sent' ? 'lastUsedEmojisSent' : 'lastUsedEmojisReceived';
  
    try {
      await updateDoc(threadDocRef, { [field]: emojis });
    } catch (error) {
      console.error('Fehler beim Speichern der zuletzt verwendeten Emojis:', error);
    }
  }
  
  async updatePrivateMessageEmojis(channelId: string, threadId: string, messageId: string, emojis: any[]): Promise<void> {
    const messageDocRef = doc(this.firestore, `channels/${channelId}/threads/${threadId}/messages/${messageId}`);
  
    try {
      await updateDoc(messageDocRef, { 'content.emojis': emojis });
      console.log('Emojis erfolgreich aktualisiert.');
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Emojis:', error);
    }
  }
  
}