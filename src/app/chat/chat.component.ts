import { Component, OnInit, ViewChild,  CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatHeaderComponent } from '../chat-header/chat-header.component';
import { DevspaceComponent } from '../devspace/devspace.component';
import { EntwicklerteamComponent } from '../entwicklerteam/entwicklerteam.component';
import { InnerChannelComponent } from '../inner-channel/inner-channel.component';
import { DirectMessagesComponent } from '../direct-messages/direct-messages.component';
import { PrivateMessagesComponent } from '../private-messages/private-messages.component';
import { WelcomeScreenComponent } from '../welcome-screen/welcome-screen.component';
import { AppStateService } from '../app-state.service';
import { UserService } from '../user.service';
import { ChannelService } from '../channel.service';
import { SearchFieldComponent } from '../search-field/search-field.component';

import { ThreadComponent } from '../thread/thread.component';
import { ThreadChannelComponent } from '../thread-channel/thread-channel.component';


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
    PrivateMessagesComponent,
    WelcomeScreenComponent,
    SearchFieldComponent,
    ThreadComponent,
    ThreadChannelComponent
  ],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ChatComponent implements OnInit {
  isPrivateMessage: boolean = false; // Flag für private Nachrichtenansicht
  selectedMemberId: string = ''; // ID des ausgewählten Mitglieds für private Nachrichten
  selectedMemberName: string = ''; // Name des ausgewählten Mitglieds
  isEditingChannel: boolean = false; // Status für den Channel-Bearbeitungsmodus
  isPrivateChat: boolean = false;
  selectedMember: any = null; // Speichert das ausgewählte Mitglied
  showWelcomeContainer: boolean = false;
  selectedChannel: any = null; // Speichert den ausgewählten Kanal
  isSearchActive: boolean = false;

  selectedThread: any = null; 

  selectedThreadChannel: any = null; // Für Channel Threads

  


  @ViewChild(ChatComponent) chatComponent!: ChatComponent;

  
  @ViewChild(EntwicklerteamComponent) entwicklerteam!: EntwicklerteamComponent;

  constructor(
    private appStateService: AppStateService,
    private userService: UserService,
    private channelService: ChannelService,
 
  ) {}

  ngOnInit(): void {
    this.showWelcomeContainer = this.appStateService.getShowWelcomeContainer();

   
  }

 


  onChannelSelected(channel: any): void {
    if (channel) {
      this.selectedThreadChannel = null; 
      this.isPrivateChat = false; // Wechsel zu Kanalansicht
      this.selectedChannel = channel; // Setze den aktuellen Kanal
      this.selectedMember = null; // Setze das ausgewählte Mitglied zurück
      this.isSearchActive = false; // Deaktiviert das Suchfeld
      this.showWelcomeContainer = false; // Blende den Welcome-Screen aus
      this.appStateService.setShowWelcomeContainer(false);
    } else {
      this.selectedChannel = null; // Kein Kanal ausgewählt
      this.showWelcomeContainer = true; // Zeige den Welcome-Screen an
      this.appStateService.setShowWelcomeContainer(true);
    }

  }

  onMemberSelected(member: any): void {
    if (this.selectedThreadChannel) {
      this.closeThreadChannel();
    }

    this.isPrivateChat = true; // Wechsel zu Private-Chat-Modus
    this.selectedMember = member; // Speichere das ausgewählte Mitglied
    this.selectedChannel = null; // Setze den ausgewählten Kanal zurück
    this.isSearchActive = false; // Deaktiviert das Suchfeld
    this.showWelcomeContainer = false;

    if (this.selectedThread) {
      this.selectedThread = null; // Schließe bestehenden Thread
    }


  
  }

  handleMemberSelected(event: { uid: string, name: string }): void {
    console.log('Mitglied empfangen:', event);
    this.selectedMemberId = event.uid;
    this.selectedMemberName = event.name;
    this.isPrivateMessage = true; // Umschalten auf die private Nachrichtenansicht

   
  }

  
  


  stopPrivateMessage(): void {
    this.isPrivateMessage = false;
    this.selectedMemberId = '';
    this.selectedMemberName = '';
  }

  handleEditChannelChange(isEditing: boolean): void {
    this.isPrivateChat = false;
    this.selectedMember = null;
    console.log('Channel-Modus aktiviert');
  }

  openSearchField(searchQuery?: string): void {
    this.isSearchActive = true; // Aktiviert das Suchfeld
    this.isPrivateChat = false;
    this.selectedChannel = null;
    this.showWelcomeContainer = false;

    if (searchQuery) {
      console.log('Search initiated with query:', searchQuery);
    } else {
      console.log('Search field activated.');
    }
  }

  closeSearchField(): void {
    this.isSearchActive = false; // Deaktiviert das Suchfeld
    if (!this.selectedChannel && !this.isPrivateChat) {
      this.showWelcomeContainer = true;
    }
  }

  handleMemberSelection(member: any): void {
    console.log('Mitglied ausgewählt:', member);
    this.isSearchActive = false; // Schließt das Suchfeld
    this.isPrivateChat = true; // Aktiviert die private Nachrichtenansicht
    this.selectedChannel = null; // Deaktiviert den Kanal
    this.selectedMember = member; // Speichert das ausgewählte Mitglied
  }

  openThread(message: any): void {
    // Wenn der Thread bereits geöffnet ist, direkt zurückkehren
    if (this.selectedThread?.id === message.id) {
      console.log('Thread ist bereits geöffnet:', message);
      return;
    }
    // Setze den neuen Thread, was automatisch den alten überschreibt
    this.selectedThread = null; // Explizit zurücksetzen, damit Angular das Update erkennt
    setTimeout(() => {
      this.selectedThread = message;
      console.log('Thread gewechselt zu Nachricht:', message);
    }, 0); // Timeout, um sicherzustellen, dass Angular das Template aktualisiert

  }

  closeThread(): void {
    this.selectedThread = null; // Schließe den Thread-Bereich
    if (this.isPrivateChat && this.selectedMember) {
      console.log('Zurück zum privaten Chat');
    } else if (this.selectedChannel) {
      console.log('Zurück zum Kanal-Chat');
    } else {
      this.showWelcomeContainer = true; // Zeige den Welcome-Screen an, falls kein Kontext existiert
    }
  }
  
  openThreadChannel(message: any): void {
    if (this.selectedThreadChannel?.id === message.id) {
      console.log('Channel-Thread ist bereits geöffnet:', message);
      return;
    }
    this.selectedThreadChannel = null; // Zurücksetzen
    setTimeout(() => {
      this.selectedThreadChannel = message;
      console.log('Channel-Thread gewechselt zu Nachricht:', message);
    }, 0);
  }

  closeThreadChannel(): void {
    this.selectedThreadChannel = null;
    if (this.selectedChannel) {
      console.log('Zurück zum Kanal-Chat');
    } else {
      this.showWelcomeContainer = true;
    }
  }
}