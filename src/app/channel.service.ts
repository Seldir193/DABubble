import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Firestore, collection, addDoc,getDocs,doc,updateDoc, query, where,collectionData,getDoc,deleteDoc} from '@angular/fire/firestore';
import { MessageContent } from './entwicklerteam/entwicklerteam.component';
import { orderBy } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { serverTimestamp } from '@angular/fire/firestore';
import { getAuth } from 'firebase/auth';
import { UserService } from './user.service';



@Injectable({
  providedIn: 'root'
})
export class ChannelService {
  // Channel Typdefinition erweitern
private channelSource = new BehaviorSubject<{ id: string; name: string; members: any[]; description?: string; createdBy?: string } | null>(null);
currentChannel = this.channelSource.asObservable();

private selectedChannelSource = new BehaviorSubject<{ id: string; name: string; members: any[]; description?: string; createdBy?: string } | null>(null);
selectedChannel = this.selectedChannelSource.asObservable();

  // Ein Observable zur Übertragung der Mitglieder
  private membersSource = new BehaviorSubject<any[]>([]);
  currentMembers = this.membersSource.asObservable();

  private channelsSource = new BehaviorSubject<{id: string; name: string; members: any[]; description?: string; createdBy?: string }[]>([]);
  currentChannels = this.channelsSource.asObservable();

  constructor(private firestore: Firestore,private userService:UserService) {}


  async addChannel(channel: { name: string; members: any[]; description?: string; createdBy?: string }): Promise<void> {
    try {
      const channelsCollection = collection(this.firestore, 'channels'); // Channels Collection in Firestore
      const docRef = await addDoc(channelsCollection, channel); // Channel wird hinzugefügt
      console.log('Channel erfolgreich hinzugefügt mit ID: ', docRef.id);

      const newChannel = { id: docRef.id, ...channel };
    
      await this.loadChannels();
      
      // Setze den neu hinzugefügten Channel als aktuellen Channel
      this.changeChannel(newChannel);
  
      // Lade alle Channels neu, nachdem ein neuer hinzugefügt wurde
    
    } catch (error) {
      console.error('Fehler beim Hinzufügen des Channels:', error);
    }
  }

async leaveChannel(channelId: string, userId: string): Promise<void> {
  try {
    // Hole den Channel aus Firestore
    const channelDocRef = doc(this.firestore, 'channels', channelId);
    const channelDoc = await getDoc(channelDocRef);

    if (channelDoc.exists()) {
      const channelData = channelDoc.data();

      // Entferne den Benutzer aus der Mitgliederliste
      const updatedMembers = (channelData['members'] || []).filter((member: string) => member !== userId);

      if (updatedMembers.length > 0) {
        // Aktualisiere die Mitgliederliste im Firestore, falls noch Mitglieder vorhanden sind
        await updateDoc(channelDocRef, { members: updatedMembers });
        console.log(`Benutzer ${userId} erfolgreich aus dem Channel ${channelId} entfernt.`);
      } else {
        // Lösche den Channel nur, wenn keine Mitglieder mehr vorhanden sind
        await deleteDoc(channelDocRef);
        console.log(`Channel ${channelId} gelöscht, da keine Mitglieder mehr vorhanden.`);
      }

      // Lokales Entfernen des Channels, damit er für den Benutzer nicht mehr sichtbar ist
      this.removeChannelLocally(channelId);
      
    } else {
      console.error('Channel nicht gefunden.');
    }
  } catch (error) {
    console.error('Fehler beim Verlassen des Channels:', error);
    throw error;
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
  async setMembers(channelId: string, members: any[]): Promise<void> {
    try {
      // Hole die aktuelle Channels-Liste aus dem Service
      const channels = this.channelsSource.getValue();
  
      // Suche den Channel anhand der ID
      const channelIndex = channels.findIndex(c => c.id === channelId);
      
      if (channelIndex > -1) {
        const channel = channels[channelIndex];
  
        // Aktualisiere die Mitglieder des gefundenen Channels
        channel.members = members;
  
        // Speichere die Mitglieder auch in Firestore
        const channelDocRef = doc(this.firestore, 'channels', channel.id);
        await updateDoc(channelDocRef, { members });
  
        // Setze die aktualisierte Channels-Liste
        this.channelsSource.next([...channels]);
  
        // Falls der aktuelle Channel auch der aktualisierte Channel ist, aktualisiere ihn ebenfalls
        const currentChannel = this.channelSource.getValue();
        if (currentChannel && currentChannel.id === channelId) {
          currentChannel.members = members;
          this.channelSource.next(currentChannel); // Aktualisiere den aktuellen Channel im Service
        }
  
        console.log(`Mitglieder für Channel mit ID "${channelId}" erfolgreich aktualisiert.`);
      } else {
        console.error('Channel nicht gefunden, Mitglieder konnten nicht aktualisiert werden.');
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Mitglieder:', error);
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




}