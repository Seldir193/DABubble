




import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatHeaderComponent } from '../chat-header/chat-header.component';
import { DevspaceComponent } from '../devspace/devspace.component';
import { EntwicklerteamComponent } from '../entwicklerteam/entwicklerteam.component';
import { InnerChannelComponent } from '../inner-channel/inner-channel.component';
import { DirectMessagesComponent } from '../direct-messages/direct-messages.component';
import { PrivateMessagesComponent } from '../private-messages/private-messages.component';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    ChatHeaderComponent,
    DevspaceComponent,
    EntwicklerteamComponent,
    InnerChannelComponent,
    DirectMessagesComponent,
    PrivateMessagesComponent
  ],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent {
  isPrivateMessage: boolean = false; // Flag für private Nachrichtenansicht
  selectedMemberId: string = ''; // ID des ausgewählten Mitglieds für private Nachrichten
  selectedMemberName: string = ''; // Name des ausgewählten Mitglieds
  isEditingChannel: boolean = false; // Status für den Channel-Bearbeitungsmodus
  isPrivateChat: boolean = false;
  

  selectedMember: any = null;      // Speichert das ausgewählte Mitglied

  
  //selectedMember: { id: string, name: string } | null = null;


 
  selectedChannel: any = null;    // Speichert den ausgewählten Kanal

  // Methode wird aufgerufen, wenn ein Mitglied für den privaten Chat ausgewählt wird
  onMemberSelected(member: any): void {
    this.isPrivateChat = true;   // Wechsel zu Private-Chat-Modus
    this.selectedMember = member; // Speichere das ausgewählte Mitglied
    this.selectedChannel = null;  // Setze den ausgewählten Kanal zurück

  }

  // Methode wird aufgerufen, wenn ein Kanal ausgewählt wurde
  onChannelSelected(channel: any): void {
    this.isPrivateChat = false; // Wechsel zu Kanalansicht
    this.selectedChannel = channel; // Setze den aktuellen Kanal
    this.selectedMember = null;  // Setze das ausgewählte Mitglied zurück
   
  }




  // Methode, wenn ein Mitglied ausgewählt wurde
  handleMemberSelected(event: { uid: string, name: string }): void {
    console.log('Mitglied empfangen:', event);
    this.selectedMemberId = event.uid;
    this.selectedMemberName = event.name;
    this.isPrivateMessage = true; // Umschalten auf die private Nachrichtenansicht
  }

  // Methode, um von der privaten Nachrichtenansicht zum Team zurückzukehren
  stopPrivateMessage(): void {
    this.isPrivateMessage = false;
    this.selectedMemberId = '';
    this.selectedMemberName = '';
  }


  // Methode wird aufgerufen, wenn der Bearbeitungsmodus des Channels geändert wird
  handleEditChannelChange(isEditing: boolean): void {
    this.isPrivateChat = false;
    this.selectedMember = null;
    console.log('Channel-Modus aktiviert');
  }

}






