import { Component, OnInit, ViewChild } from '@angular/core';
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
    SearchFieldComponent
  ],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
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

  @ViewChild(EntwicklerteamComponent) entwicklerteam!: EntwicklerteamComponent;

  constructor(
    private appStateService: AppStateService,
    private userService: UserService,
    private channelService: ChannelService
  ) {}

  ngOnInit(): void {
    this.showWelcomeContainer = this.appStateService.getShowWelcomeContainer();
  }

  // Methode wird aufgerufen, wenn ein Kanal ausgewählt oder verlassen wurde
  onChannelSelected(channel: any): void {
    if (channel) {
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
    this.isPrivateChat = true; // Wechsel zu Private-Chat-Modus
    this.selectedMember = member; // Speichere das ausgewählte Mitglied
    this.selectedChannel = null; // Setze den ausgewählten Kanal zurück
    this.isSearchActive = false; // Deaktiviert das Suchfeld
    this.showWelcomeContainer = false;
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
}
