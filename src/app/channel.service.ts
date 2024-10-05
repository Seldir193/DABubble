import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

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

  private channelsSource = new BehaviorSubject<{ name: string; members: any[]; description?: string; createdBy?: string }[]>([]);
  currentChannels = this.channelsSource.asObservable();

 

    // Füge einen neuen Channel hinzu
addChannel(channel: { name: string; members: any[]; description?: string; createdBy?: string }): void {
  const channels = this.channelsSource.getValue();
  channels.push(channel);
  this.channelsSource.next([...channels]);

  this.changeChannel(channel);
}




  updateChannel(currentChannelName: string, newChannelName: string, description: string): void {
    const channels = this.channelsSource.getValue();
    const index = channels.findIndex(channel => channel.name === currentChannelName);
    if (index !== -1) {
      channels[index].name = newChannelName;
      channels[index].description = description;
      this.channelsSource.next([...channels]);
    }

  }

  // Methode, um alle Channels abzurufen
  getChannels(): { name: string; members: any[]; description?: string; createdBy?: string }[] {
    return this.channelsSource.getValue();
  }

  setMembers(channelName: string, members: any[]): void {
    // Hole die aktuelle Channels-Liste aus dem Service
    const channels = this.channelsSource.getValue();
    
    // Suche den Channel anhand des Namens
    const channelIndex = channels.findIndex(c => c.name === channelName);
    
    if (channelIndex > -1) {
      // Aktualisiere die Mitglieder des gefundenen Channels
      channels[channelIndex].members = members;
      
      // Setze die aktualisierte Channels-Liste
      this.channelsSource.next([...channels]);
  
      // Falls der aktuelle Channel auch der aktualisierte Channel ist, aktualisiere ihn ebenfalls
      let currentChannel = this.channelSource.getValue();
      if (currentChannel && currentChannel.name === channelName) {
        currentChannel.members = members;
        this.channelSource.next(currentChannel);  // Aktualisiere den aktuellen Channel im Service
      }
    } else {
      console.error('Channel nicht gefunden, Mitglieder konnten nicht aktualisiert werden.');
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

  // Methode zum Abrufen von Mitgliedern
  getMembers(): any[] {
    return this.membersSource.getValue(); // Mitglieder abrufen
  }
}