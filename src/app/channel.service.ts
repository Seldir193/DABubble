

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChannelService {

  // Ein Observable zur Übertragung des Channels und der Mitglieder
  private channelSource = new BehaviorSubject<{ name: string; members: any[] } | null>(null);
  currentChannel = this.channelSource.asObservable();

  private membersSource = new BehaviorSubject<any[]>([]);
  currentMembers = this.membersSource.asObservable();

  

  private selectedChannelSource = new BehaviorSubject<{ name: string; members: any[] } | null>(null);
  selectedChannel = this.selectedChannelSource.asObservable();

  // Methode zum Ändern des ausgewählten Channels
  changeSelectedChannel(channel: { name: string; members: any[] }) {
    this.selectedChannelSource.next(channel);
  }

  getMembers(): any[] {
    return this.membersSource.getValue(); // Mitglieder abrufen
  }

  setMembers(channelName: string, members: any[]): void {
    // Finde den existierenden Channel und aktualisiere dessen Mitglieder
    let currentChannel = this.channelSource.getValue();
    console.log('Aktueller Channel:', currentChannel, 'Neue Mitglieder:', members);
    if (currentChannel && currentChannel.name === channelName) {
      currentChannel.members = members;
      this.channelSource.next(currentChannel);  // Aktualisiere den Channel im Service
    }
  }


  // Methode zum Ändern des aktuellen Channels
  changeChannel(channel: { name: string; members: any[] }) {
    this.channelSource.next(channel);
  }

}