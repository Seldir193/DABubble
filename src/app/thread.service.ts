import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp,getDocs,setDoc,getDoc,doc,updateDoc } from '@angular/fire/firestore';
import { Message, MessageContent } from './message.models';

@Injectable({
  providedIn: 'root', // Globale Verfügbarkeit des Services
})
export class ThreadService {
  private parentMessage: any = null; // Speichert die Hauptnachricht für den Thread

  constructor(private firestore: Firestore) {}

  // Hauptnachricht setzen
  setThreadMessage(message: any): void {
    this.parentMessage = message;
  }

  // Hauptnachricht abrufen
  getThreadMessage(): any {
    return this.parentMessage;
  }

  async addThreadReply(threadId: string, reply: any): Promise<void> {
    const threadMessagesCollection = collection(this.firestore, `threads/${threadId}/messages`);
    const threadDocRef = doc(this.firestore, 'threads', threadId);
  
    try {
      // Neue Nachricht hinzufügen
      await addDoc(threadMessagesCollection, {
        ...reply,
        timestamp: serverTimestamp(),
      });
  
      // Aktualisiere den threadLastResponseTime
      await updateDoc(threadDocRef, { threadLastResponseTime: serverTimestamp() });
  
      console.log('Antwort erfolgreich im Thread gespeichert und threadLastResponseTime aktualisiert.');
    } catch (error) {
      console.error('Fehler beim Speichern der Antwort oder beim Aktualisieren von threadLastResponseTime:', error);
    }
  }
  
getThreadMessages(threadId: string, callback: (messages: Message[]) => void): () => void {
  const threadMessagesCollection = collection(this.firestore, `threads/${threadId}/messages`);
  const q = query(threadMessagesCollection, orderBy('timestamp', 'asc'));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const messages: Message[] = [];

    snapshot.forEach((docSnap) => {
      const messageData: Message = { id: docSnap.id, ...docSnap.data() } as Message;

      // Firestore Timestamp -> Date
      if (messageData.timestamp && typeof messageData.timestamp.toDate === 'function') {
        messageData.timestamp = messageData.timestamp.toDate();
      }

      // Keine Sub-Kollektion / replies mehr
      // Keine replyLatestTimestamp mehr

      messages.push(messageData);
    });

    callback(messages);
  });

  return unsubscribe;
}

  async getReplyCountsForMessages(threadIds: string[]): Promise<Record<string, number>> {
    const replyCounts: Record<string, number> = {};
    
    for (const threadId of threadIds) {
      const threadMessagesCollection = collection(this.firestore, `threads/${threadId}/messages`);
      // Nutze getDocs statt onSnapshot für einmalige Abfrage
      const snapshot = await getDocs(threadMessagesCollection);
      replyCounts[threadId] = snapshot.size;
    }
    return replyCounts;
  }

  async initializeThread(threadId: string): Promise<void> {
    console.log(`Versuche Thread zu initialisieren: ${threadId}`);
    const threadDocRef = doc(this.firestore, 'threads', threadId);
    const threadDoc = await getDoc(threadDocRef);
  
    if (!threadDoc.exists()) {
      console.log(`Thread ${threadId} existiert nicht. Erstelle neuen Thread-Eintrag.`);
      await setDoc(threadDocRef, {
        lastUsedEmojisSent: [],
        lastUsedEmojisReceived: []
      });
    } else {
      console.log(`Thread ${threadId} existiert bereits.`);
    }
  }
  
  async updatePrivateMessageEmojis(threadId: string, messageId: string, emojis: any[]): Promise<void> {
    const messageDocRef = doc(this.firestore, `threads/${threadId}/messages`, messageId);

    try {
        await updateDoc(messageDocRef, { 'content.emojis': emojis });
        console.log('Emoji erfolgreich zur Thread-Nachricht hinzugefügt.');
    } catch (error) {
        console.error('Fehler beim Aktualisieren der Emojis in der Thread-Nachricht:', error);
    }
}

  async saveLastUsedEmojis(threadId: string, emojis: string[], type: 'sent' | 'received'): Promise<void> {
    const threadDocRef = doc(this.firestore, 'threads', threadId);
    const fieldToUpdate = type === 'sent' ? 'lastUsedEmojisSent' : 'lastUsedEmojisReceived';
    await updateDoc(threadDocRef, { [fieldToUpdate]: emojis });
}

async getLastUsedEmojis(threadId: string, type: 'sent' | 'received'): Promise<string[]> {
  const threadDocRef = doc(this.firestore, 'threads', threadId);
  const threadDoc = await getDoc(threadDocRef);
  if (threadDoc.exists()) {
      const data = threadDoc.data();
      return type === 'sent' ? data['lastUsedEmojisSent'] || [] : data['lastUsedEmojisReceived'] || [];
  }
  return [];
}

async updateThreadMessageContent(threadId: string, messageId: string, updatedText: string): Promise<void> {
  const messageDocRef = doc(this.firestore, `threads/${threadId}/messages`, messageId);

  try {
    await updateDoc(messageDocRef, {
      'content.text': updatedText,
      timestamp: serverTimestamp(), // Aktualisiere den Zeitstempel
    });
    console.log('Nachricht erfolgreich in Firestore aktualisiert.');
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Nachricht in Firestore:', error);
  }
}

listenToThreadDetails(threadId: string, callback: (data: any) => void): () => void {
  const threadDocRef = doc(this.firestore, 'threads', threadId);

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

async updateThreadLastResponseTime(threadId: string): Promise<void> {
  const threadDocRef = doc(this.firestore, 'threads', threadId);

  try {
    const threadMessagesCollection = collection(this.firestore, `threads/${threadId}/messages`);
    const snapshot = await getDocs(threadMessagesCollection);
    
    if (!snapshot.empty) {
      const messages = snapshot.docs.map(doc => {
        const data = doc.data(); // Daten aus Firestore-Dokument extrahieren
        return {
          id: doc.id,
          timestamp: data['timestamp'] || null, // Richtige Zugriffsmethode mit eckigen Klammern
        };
      });

      // Finde die Nachricht mit dem neuesten Timestamp
      const latestMessage = messages.reduce((latest, msg) =>
        msg['timestamp'] && latest['timestamp'] && msg['timestamp'] > latest['timestamp'] ? msg : latest, messages[0]
      );

      // Falls eine Nachricht gefunden wurde, deren Timestamp speichern
      if (latestMessage?.['timestamp']) {
        await updateDoc(threadDocRef, { threadLastResponseTime: latestMessage['timestamp'] });
        console.log('ThreadLastResponseTime mit der neuesten Nachricht aktualisiert.');
      }
    }
  } catch (error) {
    console.error('Fehler beim Aktualisieren von ThreadLastResponseTime:', error);
  }
}

loadReplyCountsLive(threadIds: string[], callback: (replyCounts: Record<string, { count: number; lastResponseTime: Date | null }> ) => void): void {
  const replyCounts: Record<string, { count: number; lastResponseTime: Date | null }> = {};

  threadIds.forEach((threadId) => {
    const threadMessagesCollection = collection(this.firestore, `threads/${threadId}/messages`);
    
    onSnapshot(threadMessagesCollection, (snapshot) => {
      const messages = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          timestamp: data['timestamp'] ? data['timestamp'].toDate() : null,
        };
      });

      // Finde die letzte Antwort (neueste Nachricht)
      const latestMessage = messages.reduce((latest, msg) =>
        msg.timestamp && latest.timestamp && msg.timestamp > latest.timestamp ? msg : latest, messages[0]
      );

      replyCounts[threadId] = {
        count: snapshot.size, // Anzahl der Antworten im Thread
        lastResponseTime: latestMessage?.timestamp || null, // Neueste Antwortzeit setzen
      };

      callback(replyCounts);
    });
  });
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
}



















































































