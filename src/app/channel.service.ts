import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Firestore, collection, addDoc,getDocs,doc,updateDoc } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class ChannelService {
  // Ein Observable zur Übertragung des aktuellen Channels
  private channelSource = new BehaviorSubject<{ name: string; members: any[] } | null>(null);
  currentChannel = this.channelSource.asObservable();

  // Ein Observable zur Übertragung des aktuell ausgewählten Channels
  private selectedChannelSource = new BehaviorSubject<{ name: string; members: any[] } | null>(null);
  selectedChannel = this.selectedChannelSource.asObservable();

  // Ein Observable zur Übertragung der Mitglieder
  private membersSource = new BehaviorSubject<any[]>([]);
  currentMembers = this.membersSource.asObservable();

  private channelsSource = new BehaviorSubject<{id: string; name: string; members: any[]; description?: string; createdBy?: string }[]>([]);
  currentChannels = this.channelsSource.asObservable();

  constructor(private firestore: Firestore) {}


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

  async setMembers(channelName: string, members: any[]): Promise<void> {
    try {
      // Hole die aktuelle Channels-Liste aus dem Service
      const channels = this.channelsSource.getValue();
  
      // Suche den Channel anhand des Namens
      const channelIndex = channels.findIndex(c => c.name === channelName);
      
      if (channelIndex > -1) {
        const channel = channels[channelIndex];
  
        // Aktualisiere die Mitglieder des gefundenen Channels
        channel.members = members;
  
        // Speichere die Mitglieder auch in Firestore
        const channelDocRef = doc(this.firestore, 'channels', channel.id); // Channel-ID aus dem Channel-Objekt
        await updateDoc(channelDocRef, { members });
  
        // Setze die aktualisierte Channels-Liste
        this.channelsSource.next([...channels]);
  
        // Falls der aktuelle Channel auch der aktualisierte Channel ist, aktualisiere ihn ebenfalls
        const currentChannel = this.channelSource.getValue();
        if (currentChannel && currentChannel.name === channelName) {
          currentChannel.members = members;
          this.channelSource.next(currentChannel); // Aktualisiere den aktuellen Channel im Service
        }
  
        console.log(`Mitglieder für Channel "${channelName}" erfolgreich aktualisiert.`);
      } else {
        console.error('Channel nicht gefunden, Mitglieder konnten nicht aktualisiert werden.');
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Mitglieder:', error);
    }
  }



  
  

// Methode zum Ändern des aktuell ausgewählten Channels
changeSelectedChannel(channel: { name: string; members: any[] }) {
  this.selectedChannelSource.next(channel);
}

// Methode zum Ändern des aktuellen Channels
changeChannel(channel: { name: string; members: any[] }) {
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
}
