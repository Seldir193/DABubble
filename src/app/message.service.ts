import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, query, where, getDocs, doc, updateDoc, orderBy, getDoc, onSnapshot, setDoc, Query, DocumentData, collectionData} from '@angular/fire/firestore';
import { Message } from './message.models';
import { serverTimestamp,arrayUnion } from 'firebase/firestore';
import { MessageContent } from './message.models';
import { getAuth } from 'firebase/auth';
import { Observable } from 'rxjs';
type ReplyCountsMap = Record<string, { count: number; lastResponseTime: Date | null }>;

type MessageType = 'text' | 'private' | 'thread' | 'thread-channel';

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  constructor(private firestore: Firestore ) {}

generateConversationId(userId1: string, userId2: string): string {
    return [userId1, userId2].sort().join('_');
  }

async sendMessage(data: {
  type: 'thread' | 'private' | 'thread-channel',
  threadChannelId?: string,  // 🆕 Thread-ID für Thread-Channel-Nachrichten
  conversationId?: string,
  channelId?: string,  
  content: MessageContent, 
  senderId: string,
  parentId?: string, 
  senderName?: string,
  senderAvatar?: string,
  recipientId?: string
}): Promise<string> {
  if (data.type === 'thread-channel' && !data.threadChannelId) {
    console.error("❌ `threadChannelId` ist erforderlich für `thread-channel`");
    throw new Error("Fehlende `threadChannelId` für Thread-Channel-Nachricht");
  }

  const messagesRef = collection(this.firestore, 'messages');

  const messageData = {
    ...data,
    timestamp: serverTimestamp(),
    channelId: data.channelId ?? null,  // ✅ Falls `channelId` undefined ist, setze es auf `null`
    threadChannelId: data.threadChannelId ?? null  // ✅ Falls `threadChannelId` undefined ist, setze es auf `null`
  };
  
  const docRef = await addDoc(messagesRef, messageData);
  console.log('✅ Nachricht gesendet mit ID:', docRef.id);
  return docRef.id;
}

getMessages(channelId: string, threadChannelId?: string): Observable<any[]> {
  const messagesCollection = collection(this.firestore, 'messages');

  let q;
  if (threadChannelId) {
    // Nur Nachrichten für den Thread-Channel
    q = query(
      messagesCollection,
      where('threadChannelId', '==', threadChannelId),
      orderBy('timestamp', 'asc')
    );
  } else {
    // Normale Kanal-Nachrichten (ohne threadChannelId)
    q = query(
      messagesCollection,
      where('channelId', '==', channelId),
      where('threadChannelId', '==', null),
      orderBy('timestamp', 'asc')
    );
  }

  return collectionData(q, { idField: 'id' }) as Observable<any[]>;
}

async getMessagesOnce(type: 'private' | 'thread' | 'thread-channel', id?: string): Promise<any[]> {
  const messagesRef = collection(this.firestore, 'messages');
  let q;

  if (id) {
    // Wähle das passende Feld je nach type
    let filterField: string;
    if (type === 'private') filterField = 'conversationId';
    else if (type === 'thread-channel') filterField = 'threadChannelId';
    else filterField = 'threadId'; // => 'thread'

    q = query(
      messagesRef,
      where('type', '==', type),
      where(filterField, '==', id),
      orderBy('timestamp', 'asc')
    );
  } else {
    // Kein ID => einfach nach type filtern
    q = query(
      messagesRef,
      where('type', '==', type),
      orderBy('timestamp', 'asc')
    );
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      time: this.convertToTime(data['timestamp']),
    };
  });
}

listenMessages(
  type: 'private' | 'thread' | 'thread-channel',
  id: string,
  callback: (messages: any[]) => void
): () => void {
  console.log(`📡 Starte Live-Listener für ${type} mit ID: ${id}`);

  const messagesRef = collection(this.firestore, 'messages');
  let q;

  if (type === 'private') {
    q = query(
      messagesRef,
      where('type', '==', 'private'),
      where('conversationId', '==', id),
      orderBy('timestamp', 'asc')
    );
  } else if (type === 'thread') {
    q = query(
      messagesRef,
      where('type', '==', 'thread'),
      where('threadId', '==', id),
      orderBy('timestamp', 'asc')
    );
  } else if (type === 'thread-channel') {
    q = query(
      messagesRef,
      where('type', '==', 'thread-channel'),
      where('threadChannelId', '==', id),
      orderBy('timestamp', 'asc')
    );
  } else {
    console.error(`❌ Ungültiger Nachrichtentyp: ${type}`);
    return () => {};
  }

  const unsubscribe = onSnapshot(q, (snapshot) => {
    console.log(`🔥 Live-Update erhalten für ${type}, Nachrichten: ${snapshot.size}`);

    const messages: any[] = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    callback(messages);
  }, (error) => {
    console.error(`❌ Fehler beim Live-Tracking für ${type}:`, error);
  });

  return unsubscribe;
}

listenForMessages(
  type: 'private' | 'thread' | 'thread-channel',
  parentId: string,
  callback: (messages: any[]) => void
): () => void {
  console.log(`📡 Starte Firestore-Abfrage für ${type} mit parentId:`, parentId);

  const messagesCollection = collection(this.firestore, 'messages');
  let q = query(messagesCollection, where('type', '==', type));

  // Falls 'thread-channel', filter = 'threadChannelId'
  // sonst = 'parentId'
  if (type === 'thread-channel') {
    q = query(q, where('threadChannelId', '==', parentId));
  } else {
    q = query(q, where('parentId', '==', parentId));
  }

  q = query(q, orderBy('timestamp', 'asc'));

  return onSnapshot(q, (snapshot) => {
    console.log(`🔥 Firestore-Listener für ${type}, Anzahl: ${snapshot.size}`);

    const messages: any[] = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    if (callback) {
      callback(messages);
    }
  });
}

async updateReplyCount(
  parentMessageId: string,
  type: 'private' | 'thread' | 'thread-channel'
): Promise<void> {
  const messageRef = doc(this.firestore, 'messages', parentMessageId);

  try {
    const messageSnap = await getDoc(messageRef);
    if (!messageSnap.exists()) {
      console.warn(`❌ Nachricht mit ID ${parentMessageId} nicht gefunden.`);
      return;
    }

    const messageData = messageSnap.data();
    let replyCount = messageData?.['replyCount'] || 0;

    console.log(`📝 Firestore-Daten vor Update für ${parentMessageId}:`, messageData);

    // Wähle das richtige Feld für die Abfrage
    const filterField = type === 'thread-channel' ? 'threadChannelId' : 'parentId';

    const repliesQuery = query(
      collection(this.firestore, 'messages'),
      where(filterField, '==', parentMessageId),
      orderBy('timestamp', 'asc')
    );

    const repliesSnap = await getDocs(repliesQuery);
    replyCount = repliesSnap.size; // Anzahl der Antworten

    // Firestore-Dokument aktualisieren
    await updateDoc(messageRef, { replyCount });

    console.log(`✅ Antwortzähler aktualisiert für ${parentMessageId}: ${replyCount}`);
  } catch (error) {
    console.error(
      `❌ Fehler beim Aktualisieren des Antwortzählers für ${parentMessageId}:`,
      error
    );
  }
}

async getReplyCountsForMessages(
  messageIds: string[],
  type: 'private' | 'thread' | 'thread-channel'
): Promise<ReplyCountsMap> {
  const replyCounts: ReplyCountsMap = {};

  // Wähle das richtige Feld für die Abfrage
  const filterField = type === 'thread-channel' ? 'threadChannelId' : 'parentId';

  for (const messageId of messageIds) {
    const q = query(
      collection(this.firestore, 'messages'),
      where(filterField, '==', messageId),
      orderBy('timestamp', 'asc')
    );

    const snapshot = await getDocs(q);
    const count = snapshot.size;
    let lastResponseTime: Date | null = null;

    if (count > 0) {
      const lastDoc = snapshot.docs[snapshot.size - 1];
      const ts = lastDoc.data()['timestamp'];
      if (ts?.toDate) {
        lastResponseTime = ts.toDate();
      }
    }

    replyCounts[messageId] = { count, lastResponseTime };
  }

  console.log('📊 ReplyCounts nach Laden:', replyCounts);
  return replyCounts;
}

loadReplyCountsLive(
  messageIds: string[],
  type: 'private' | 'thread' | 'thread-channel',
  callback: (replyCounts: ReplyCountsMap) => void
): () => void {
  // Wenn nichts zu beobachten ist, gib leeren Unsubscribe zurück
  if (messageIds.length === 0) {
    return () => {};
  }

  console.log('📡 Starte `loadReplyCountsLive()` für:', messageIds);

  const aggregateCounts: ReplyCountsMap = {};
  const unsubscribes: Array<() => void> = [];

  const filterField = type === 'thread-channel' ? 'threadChannelId' : 'parentId';

  // Für jede msgId einen eigenen Snapshot-Listener starten
  for (const msgId of messageIds) {
    const q = query(
      collection(this.firestore, 'messages'),
      where(filterField, '==', msgId),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const count = snapshot.size;
      let lastResponseTime: Date | null = null;

      if (count > 0) {
        const lastDoc = snapshot.docs[snapshot.size - 1];
        const ts = lastDoc.data()['timestamp'];
        if (ts?.toDate) {
          lastResponseTime = ts.toDate();
        }
      }

      aggregateCounts[msgId] = { count, lastResponseTime };
      console.log(`📊 Live-Update für ${msgId}:`, aggregateCounts[msgId]);

      // Callback mit Kopie des gesamten Aggregats aufrufen
      callback({ ...aggregateCounts });
    });

    unsubscribes.push(unsubscribe);
  }

  // Gebe eine Funktion zurück, die alle Listener beendet.
  return () => {
    unsubscribes.forEach((u) => u());
  };
}

  listenForThreadDetails(threadId: string, callback: (data: any) => void): () => void {
    const threadDocRef = doc(this.firestore, 'messages', threadId);
  
    return onSnapshot(threadDocRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data());
      } else {
        console.warn(`❌ Kein Thread-Dokument für ID ${threadId} gefunden.`);
      }
    }, (error) => {
      console.error(`❌ Fehler beim Anhören des Threads ${threadId}:`, error);
    });
  }
  
  async updateThreadLastResponseTime(threadId: string): Promise<void> {
    const messageRef = doc(this.firestore, 'messages', threadId); // 🔥 `threads` durch `messages` ersetzt!
    await updateDoc(messageRef, {
      lastResponseTime: serverTimestamp()
    });
    console.log('✅ Thread `lastResponseTime` aktualisiert:', threadId);
  }
  
  async getMessage(type: 'private' | 'channel' | 'thread' | 'thread-channel', messageId: string): Promise<Message | null> {
    try {
      const docRef = doc(this.firestore, 'messages', messageId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          ...data,
          id: docSnap.id,
          timestamp: data['timestamp']?.toDate() // Firestore-Timestamp konvertieren
        } as Message;
      }
      return null;
    } catch (error) {
      console.error('Fehler beim Laden der Nachricht:', error);
      return null;
    }
  }

getPrivateMessagesLive(conversationId: string, callback: (messages: any[]) => void): () => void {
  const messagesCollection = collection(this.firestore, 'messages');
  const q = query(
    messagesCollection,
    where('type', '==', 'private'),
    where('conversationId', '==', conversationId),  // 🔥 Nur Nachrichten von diesem Chat
    orderBy('timestamp', 'asc')
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const messages: any[] = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        ...data,
        id: docSnap.id,
        time: this.convertToTime(data['timestamp']),   // ✅ Zeit immer setzen
      };
    });

    callback(messages);
  });
  return unsubscribe;
}

 convertToTime(timestamp: any): string {
  if (!timestamp) return '';
  const date = timestamp?.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

public convertToDate(timestamp: any): Date | null {
  if (!timestamp) return null;
  if (timestamp.toDate) {
    return timestamp.toDate();  // Konvertiert Firestore-Timestamp
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  const parsed = new Date(timestamp);
  return isNaN(parsed.getTime()) ? null : parsed;
}


async updateMessage(messageId: string, updatedData: Partial<any>): Promise<void> {
  const msgRef = doc(this.firestore, 'messages', messageId);
  //await updateDoc(msgRef, {...updatedData,timestamp: serverTimestamp()});

  await updateDoc(msgRef, updatedData); 
  console.log('✅ Nachricht aktualisiert:', messageId);
}

listenForEmojiUpdates(
  conversationId: string,
  callback: (sent: string[], received: string[]) => void
): () => void {
  if (!conversationId) return () => {};

  // Wir suchen in der Collection "messages"
  const docRef = doc(this.firestore, 'messages', conversationId);

  return onSnapshot(docRef, (snapshot) => {
    if (!snapshot.exists()) {
      console.warn("❌ Dokument existiert nicht:", conversationId);
      callback([], []);
      return;
    }
    const data = snapshot.data() || {};
    const sentEmojis = data['lastUsedEmojisSent']?.slice(0,2) || [];
    const receivedEmojis = data['lastUsedEmojisReceived']?.slice(0,2) || [];
    callback(sentEmojis, receivedEmojis);
  });
}
async getLastUsedEmojis(
  conversationId: string,
  type: 'sent' | 'received'
): Promise<string[]> {
  if (!conversationId) return [];

  const docRef = doc(this.firestore, 'messages', conversationId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    console.warn("❌ Dokument existiert nicht:", conversationId);
    return [];
  }
  const data = docSnap.data() || {};
  const fieldName = (type === 'sent') ? 'lastUsedEmojisSent' : 'lastUsedEmojisReceived';
  const emojis = data[fieldName] || [];
  return emojis.slice(0,2);
}

async saveLastUsedEmojis(
  conversationId: string,
  newEmojis: string[],
  type: 'sent' | 'received'
): Promise<void> {
  if (!conversationId) return;
  const docRef = doc(this.firestore, 'messages', conversationId);

  const fieldName = (type === 'sent') ? 'lastUsedEmojisSent' : 'lastUsedEmojisReceived';
  
  const docSnap = await getDoc(docRef);
  let existing: string[] = [];
  if (docSnap.exists()) {
    existing = docSnap.data()?.[fieldName] || [];
  }

  // Füge Emojis zusammen, evtl. Set und max. 2
  const merged = [...new Set([...newEmojis, ...existing])].slice(0,2);

  // setDoc mit { merge: true }, damit andere Felder bleiben
  await setDoc(docRef, { [fieldName]: merged }, { merge: true });
  console.log(`✅ Emojis (${type}) gespeichert in "messages"/${conversationId}`, merged);
}

async addEmojiToThreadMessage(threadId: string, emoji: string, senderId: string): Promise<void> {
  const docRef = doc(this.firestore, 'messages', threadId);

  try {
    const docSnap = await getDoc(docRef);
    let emojis: { emoji: string; count: number }[] = [];

    if (docSnap.exists()) {
      const data = docSnap.data();
      emojis = data?.['content']?.['emojis'] || [];
    }

    // 🟢 Emoji-Count aktualisieren
    const existingEmoji = emojis.find((e) => e.emoji === emoji);
    if (existingEmoji) {
      existingEmoji.count += 1;
    } else {
      emojis.push({ emoji, count: 1 });
    }

    // 🟢 Emojis in der Nachricht aktualisieren
    await updateDoc(docRef, { "content.emojis": emojis });
    console.log("✅ Emoji erfolgreich zum Thread hinzugefügt.");

    // 🟢 Letzte verwendete Emojis speichern
    const emojiType = senderId === getAuth().currentUser?.uid ? "sent" : "received";
    await this.saveLastUsedEmojis(threadId, [emoji], emojiType);
  } catch (error) {
    console.error("❌ Fehler beim Hinzufügen des Emojis zum Thread:", error);
  }
}

getThreadMessagesLive(threadId: string, callback: (messages: any[]) => void): () => void {
  if (!threadId) {
    console.error("❌ Fehler: `threadId` ist leer!");
    return () => {};
  }

  const messagesCollection = collection(this.firestore, 'messages');
  const q = query(
    messagesCollection,
    where('type', '==', 'thread'),
    where('threadId', '==', threadId),  // 🔥 Nur Nachrichten von diesem Thread
    orderBy('timestamp', 'asc')
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const messages: any[] = snapshot.docs.map(docSnap => {
      const data = docSnap.data() as { [key: string]: any }; // ✅ Sicherstellen, dass TypeScript das akzeptiert

      return {
        id: docSnap.id,
        ...data,
        parentId: data['parentId'] !== data['threadId'] ? data['parentId'] : null
      };
    });

    console.log("📩 Live-Update empfangen für Thread:", threadId, messages);

    callback(messages);
  }, (error) => {
    console.error("❌ Fehler beim Live-Listener für Thread-Nachrichten:", error);
  });

  return unsubscribe;
}

async saveLastUsedThreadEmojis(
  threadId: string,
  newEmojis: string[],
  type: 'sent' | 'received'
): Promise<void> {
  const docRef = doc(this.firestore, 'messages', threadId); // 🔥 `threads` durch `messages` ersetzt!
  const fieldToUpdate = type === 'sent' ? 'lastUsedEmojisSent' : 'lastUsedEmojisReceived';

  try {
    const docSnap = await getDoc(docRef);
    let existingEmojis: string[] = [];

    if (docSnap.exists()) {
      const data = docSnap.data();
      existingEmojis = data[fieldToUpdate] || [];
    }

    const updatedEmojis = [...new Set([...newEmojis, ...existingEmojis])].slice(0, 2);
    await setDoc(docRef, { [fieldToUpdate]: updatedEmojis }, { merge: true });

    console.log(`✅ Letzte 2 Emojis (${type}) für Threads gespeichert:`, updatedEmojis);
  } catch (error) {
    console.error(`❌ Fehler beim Speichern der Emojis in Threads (${type}):`, error);
  }
}

async getLastUsedThreadEmojis(threadId: string, type: 'sent' | 'received'): Promise<string[]> {
  if (!threadId) {
    console.warn("❌ Kein `threadId` angegeben.");
    return [];
  }

  try {
    //const docRef = doc(this.firestore, 'threads', threadId); // 🔥 Threads-Sammlung!
    const docRef = doc(this.firestore, 'messages', threadId);

    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const emojis = type === 'sent' ? data['lastUsedEmojisSent'] || [] : data['lastUsedEmojisReceived'] || [];

      console.log(`📥 Firestore gibt zurück für ${type} in Threads:`, emojis);
      return emojis.slice(0, 2);
    } else {
      console.warn("❌ Dokument existiert nicht:", threadId);
      return [];
    }
  } catch (error) {
    console.error(`❌ Fehler beim Abrufen der letzten Emojis (${type}) für Threads:`, error);
    return [];
  }
}

listenForThreadEmojiUpdates(
  threadId: string,
  callback: (sentEmojis: string[], receivedEmojis: string[]) => void
): () => void {
  if (!threadId) return () => {};

  const docRef = doc(this.firestore, 'messages', threadId);

  return onSnapshot(docRef, (docSnapshot) => {
    if (docSnapshot.exists()) {
      const data = docSnapshot.data() || {};
      const updatedEmojisSent = data['lastUsedEmojisSent']?.slice(0, 2) || [];
      const updatedEmojisReceived = data['lastUsedEmojisReceived']?.slice(0, 2) || [];

      console.log("🔥 Live-Emoji-Update für Threads empfangen:", updatedEmojisSent, updatedEmojisReceived);
      callback(updatedEmojisSent, updatedEmojisReceived);
    }
  });
}
}
