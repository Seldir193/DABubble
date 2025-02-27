import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Firestore, collection, addDoc,getDocs,doc,updateDoc, query, where,collectionData,getDoc,deleteDoc, onSnapshot,docData,limit} from '@angular/fire/firestore';
import { MessageContent } from './entwicklerteam/entwicklerteam.component';
import { orderBy } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { serverTimestamp } from '@angular/fire/firestore';
import { getAuth } from 'firebase/auth';
import { UserService } from './user.service';

// Wo auch immer du deinen Channel-Typ definiert hast:


@Injectable({
  providedIn: 'root'
})
export class ChannelService {
  // Channel Typdefinition erweitern
private channelSource = new BehaviorSubject<{ id: string; name: string; members: any[]; description?: string; createdBy?: string; membersUid?: string[]; } | null>(null);
currentChannel = this.channelSource.asObservable();

private selectedChannelSource = new BehaviorSubject<{ id: string; name: string; members: any[]; description?: string; createdBy?: string;membersUid?: string[];  } | null>(null);
selectedChannel = this.selectedChannelSource.asObservable();

  // Ein Observable zur Übertragung der Mitglieder
  private membersSource = new BehaviorSubject<any[]>([]);
  currentMembers = this.membersSource.asObservable();

  private channelsSource = new BehaviorSubject<{id: string; name: string; members: any[]; description?: string; createdBy?: string; membersUid?: string[]; }[]>([]);
  currentChannels = this.channelsSource.asObservable();

  constructor(private firestore: Firestore,private userService:UserService) {}

// In deinem ChannelService:

/**
 * CHANNEL ERSTELLEN
 * - Fügt neben 'members' auch 'membersUid' (nur IDs) hinzu
 */
async addChannel(channel: { name: string; members: any[]; description?: string; createdBy?: string }): Promise<void> {
  try {
    const channelsCollection = collection(this.firestore, 'channels'); 

    // (A) Erzeuge zusätzlich ein String-Array nur mit den UIDs
    const membersUid = channel.members.map(m => m.uid);

    // (B) Speichere beide Felder: 'members' und 'membersUid'
    const docRef = await addDoc(channelsCollection, { 
      ...channel,
      membersUid 
    });

    console.log('Channel erfolgreich hinzugefügt mit ID:', docRef.id);

    const newChannel = { 
      id: docRef.id, 
      ...channel,
      membersUid  // optional, falls du's lokal speichern willst
    };
    
    // Nach dem Hinzufügen erneut Channels laden
    await this.loadChannels();

    // Setze den neu hinzugefügten Channel als aktuellen Channel
    this.changeChannel(newChannel);

  } catch (error) {
    console.error('Fehler beim Hinzufügen des Channels:', error);
  }
}

/**
 * CHANNEL VERLASSEN
 * - Entfernt dich aus 'members' und aus 'membersUid'
 */
async leaveChannel(channelId: string, userId: string): Promise<void> {
  try {
    const channelDocRef = doc(this.firestore, 'channels', channelId);
    const channelDoc = await getDoc(channelDocRef);

    if (channelDoc.exists()) {
      const channelData = channelDoc.data() || {};

      const members = channelData['members'] || [];
      const membersUid = channelData['membersUid'] || [];  // Hier das neue Array

      // (A) Mitglieder filtern: Entferne userId
      const updatedMembers = members.filter((member: any) => member.uid !== userId);
      const updatedMembersUid = membersUid.filter((uid: string) => uid !== userId);

      if (updatedMembers.length > 0) {
        // (B) Update beider Felder
        await updateDoc(channelDocRef, { 
          members: updatedMembers, 
          membersUid: updatedMembersUid 
        });
        console.log(`Benutzer ${userId} erfolgreich aus dem Channel ${channelId} entfernt.`);

      } else {
        // Keine Mitglieder mehr => Channel komplett löschen
        await deleteDoc(channelDocRef);
        console.log(`Channel ${channelId} gelöscht, da keine Mitglieder mehr vorhanden.`);
      }

      // Lokal entfernen ...
      this.removeChannelLocally(channelId);

    } else {
      console.error('Channel nicht gefunden.', channelId);
    }
  } catch (error) {
    console.error('Fehler beim Verlassen des Channels:', error);
    throw error;
  }
}

/**
 * CHANNEL-MITGLIEDER SETZEN
 * - Aktualisiert 'members' + 'membersUid' parallel
 */
async setMembers(channelId: string, members: any[]): Promise<void> {
  try {
    const channels = this.channelsSource.getValue();
    const channelIndex = channels.findIndex(c => c.id === channelId);

    if (channelIndex > -1) {
      const channel = channels[channelIndex];

      // (A) Setze das detailreiche Feld 'members'
      channel.members = members;

      // (B) Erzeuge die UID-Liste
      const membersUid = members.map(m => m.uid);

      // Firestore-Dokument
      const channelDocRef = doc(this.firestore, 'channels', channel.id);

      // (C) Speichere beide Felder in Firestore
      await updateDoc(channelDocRef, { 
        members, 
        membersUid 
      });

      // (D) Lokal updaten
      channels[channelIndex] = { ...channel, membersUid };
      this.channelsSource.next([...channels]);

      // Falls der aktuelle Channel derselbe ist, local updaten
      const currentChannel = this.channelSource.getValue();
      if (currentChannel && currentChannel.id === channelId) {
        currentChannel.members = members;
        // Optional: currentChannel.membersUid = membersUid;
        this.channelSource.next(currentChannel);
      }

      console.log(`Mitglieder für Channel "${channelId}" erfolgreich aktualisiert (inkl. membersUid).`);
    } else {
      console.error('Channel nicht gefunden, Mitglieder konnten nicht aktualisiert werden.');
    }
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Mitglieder:', error);
  }
}






// Lade alle Channels von Firestore
async loadChannels(): Promise<void> {
  try {
    const channelsCollection = collection(this.firestore, 'channels');
    const querySnapshot = await getDocs(channelsCollection);
    const channels: any[] = [];
    
    querySnapshot.forEach((doc) => {
      channels.push({ id: doc.id, ...doc.data() }); // Channels mit ID sammeln
    });
    
    // Aktualisiere die Observable mit den neuesten Daten
    this.channelsSource.next(channels);
   
  } catch (error) {
    console.error('Fehler beim Laden der Channels:', error);
  }
}

removeChannelLocally(channelId: string): void {
  const updatedChannels = this.channelsSource.getValue().filter(channel => channel.id !== channelId);
  this.channelsSource.next(updatedChannels); // Update der lokalen Channel-Liste
}

  updateLocalChannels(updatedChannels: any[]): void {
    // Aktualisiere die Observable mit den neuen lokalen Channels
    this.channelsSource.next(updatedChannels);
  }
  
  async updateChannel(channelId: string, newChannelName: string, description: string): Promise<void> {
    try {
      const channels = this.channelsSource.getValue();
      const index = channels.findIndex(channel => channel.id === channelId);
  
      if (index !== -1) {
        channels[index].name = newChannelName;
        channels[index].description = description;
  
        // Firestore-Dokument-Referenz aktualisieren
        const channelDocRef = doc(this.firestore, 'channels', channelId);
        await updateDoc(channelDocRef, {
          name: newChannelName,
          description
        });
  
        this.channelsSource.next([...channels]);  // Aktualisiere die lokale Channels-Liste
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Channels:', error);
      throw error;
    }
  }

// Methode zum Ändern des aktuell ausgewählten Channels
changeSelectedChannel(channel: { id: string; name: string; members: any[]; description?: string; createdBy?: string }) {
  this.selectedChannelSource.next(channel);
}
// Methode zum Ändern des aktuellen Channels
changeChannel(channel: { id: string; name: string; members: any[]; description?: string; createdBy?: string }) {
  this.channelSource.next(channel);
}
// Methode, um alle Channels abzurufen
getChannels(): { name: string; members: any[]; description?: string; createdBy?: string }[] {
  return this.channelsSource.getValue();
}
// Methode zum Abrufen von Mitgliedern
getMembers(): any[] {
  return this.membersSource.getValue(); // Mitglieder abrufen
}

async addMessage(channelId: string, message: any): Promise<string> {
  try {
    const messagesCollection = collection(this.firestore, 'messages'); // Die Sammlung für Nachrichten
    const docRef = await addDoc(messagesCollection, { ...message, channelId,timestamp: serverTimestamp() });
    console.log('Nachricht erfolgreich hinzugefügt mit ID: ', docRef.id);
    return docRef.id; // ID zur Nachricht zurückgeben
  } catch (error) {
    console.error('Fehler beim Hinzufügen der Nachricht:', error);
    throw error; // Fehler weiterwerfen
  }
}

getMessages(channelId: string): Observable<any[]> {
  const messagesCollection = collection(this.firestore, 'messages');
  
  // Firestore-Abfrage: Nachrichten sortiert nach timestamp
  const q = query(
    messagesCollection,
    where('channelId', '==', channelId),
    orderBy('timestamp', 'asc') // Aufsteigende Reihenfolge nach timestamp
  );
  
  // Mit collectionData() ein Observable zurückgeben, das die Nachrichten in Echtzeit liefert
  return collectionData(q, { idField: 'id' }) as Observable<any[]>;
}

async updateMessage(channelId: string, messageId: string, updatedContent: MessageContent): Promise<void> {
  try {
    console.log('Aktualisiere Nachricht für Channel ID:', channelId);
    // Reference to the specific message document
    const messageDocRef = doc(this.firestore, 'messages', messageId);
    
    // Update Firestore with the new content
    await updateDoc(messageDocRef, {
      content: updatedContent,timestamp: serverTimestamp()
    });
    
    console.log('Nachricht erfolgreich gespeichert');
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Nachricht:', error);
  }
}

async saveLastUsedEmojis(channelId: string, lastUsedEmojis: string[], type: 'sent' | 'received'): Promise<void> {
  if (!channelId) return;

  const channelDocRef = doc(this.firestore, 'channels', channelId);
  try {
    // Unterscheide zwischen gesendeten und empfangenen Emojis
    if (type === 'sent') {
      await updateDoc(channelDocRef, { lastUsedEmojisSent: lastUsedEmojis });
    } else {
      await updateDoc(channelDocRef, { lastUsedEmojisReceived: lastUsedEmojis });
    }
    console.log(`Letzte Emojis (${type}) erfolgreich gespeichert.`);
  } catch (error) {
    console.error(`Fehler beim Speichern der letzten Emojis (${type}):`, error);
  }
}

async getLastUsedEmojis(channelId: string, type: 'sent' | 'received'): Promise<string[] | undefined> {
  if (!channelId) return;

  const channelDocRef = doc(this.firestore, 'channels', channelId);
  const channelDoc = await getDoc(channelDocRef);

  if (channelDoc.exists()) {
    const data = channelDoc.data();
    return type === 'sent' ? data['lastUsedEmojisSent'] || [] : data['lastUsedEmojisReceived'] || [];
  } else {
    console.error('Channel-Dokument nicht gefunden.');
    return [];
  }
}

async deleteChannel(channelId: string): Promise<void> {
  try {
    const channelDocRef = doc(this.firestore, 'channels', channelId);
    await deleteDoc(channelDocRef); // Lösche das Kanal-Dokument aus Firestore
    console.log(`Channel ${channelId} erfolgreich gelöscht.`);
    
    // Aktualisiere die Channels im Frontend
    //await this.loadChannels();

    this.removeChannelLocally(channelId);
   
  } catch (error) {
    console.error('Fehler beim Löschen des Channels:', error);
  }
}

getAllChannels(callback: (channels: any[]) => void): () => void {
  const channelsCollection = collection(this.firestore, 'channels');
  
  const unsubscribe = onSnapshot(channelsCollection, (snapshot) => {
    const channels: any[] = [];
    
    snapshot.forEach((doc) => {
      channels.push({ id: doc.id, ...doc.data() });
    });

    callback(channels);  // Daten an die Callback-Funktion weitergeben
  });

  return unsubscribe; // Gibt die Möglichkeit zurück, das Live-Tracking zu beenden
}



async getChannelById(channelId: string): Promise<any> {
  const channelDocRef = doc(this.firestore, 'channels', channelId);
  const channelDoc = await getDoc(channelDocRef);

  if (channelDoc.exists()) {
    return { id: channelDoc.id, ...channelDoc.data() };
  } else {
    throw new Error('Kanal nicht gefunden');
  }
}

async getChannelsByName(channelName: string): Promise<any[]> {
  const currentUserId = this.userService.getCurrentUserId(); // Deine Methode fürs User-Login
  if (!currentUserId) {
    console.warn("Kein currentUser eingeloggt.");
    return [];
  }



  const channelsCollection = collection(this.firestore, 'channels');
  const q = query(channelsCollection,
     where('name', '>=', channelName), 
     where('name', '<=', channelName + '\uf8ff'),
     where('membersUid' , 'array-contains', currentUserId)
    );

  console.log("📡 Firestore-Query für Channels:", channelName);

  try {
    const querySnapshot = await getDocs(q);
    const channels = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    console.log("✅ Channels von Firestore erhalten:", channels);
    return channels;
  } catch (error) {
    console.error("❌ Fehler beim Abrufen der Channels aus Firestore:", error);
    return [];
  }
}

async getUsersByFirstLetter(firstLetter: string): Promise<any[]> {
  const usersCollection = collection(this.firestore, 'users');
  const q = query(usersCollection, where('name', '>=', firstLetter), where('name', '<=', firstLetter + '\uf8ff'));

  console.log("🔍 Firestore-Query für Benutzer:", firstLetter);

  try {
    const querySnapshot = await getDocs(q);
    const users = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    console.log("✅ Benutzer von Firestore erhalten:", users);
    return users;
  } catch (error) {
    console.error("❌ Fehler beim Abrufen der Benutzer aus Firestore:", error);
    return [];
  }
}

getAllMessagesLive(callback: (messages: any[]) => void): () => void {
  const messagesCollection = collection(this.firestore, 'messages');
  const q = query(messagesCollection, orderBy('timestamp', 'asc'));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const messages: any[] = [];

    snapshot.forEach((docSnap) => {
      messages.push({ id: docSnap.id, ...docSnap.data() });
    });

    callback(messages);
  });

  return unsubscribe;
}
}