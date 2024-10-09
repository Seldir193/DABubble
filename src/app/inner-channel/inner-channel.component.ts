import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';
import { ChannelDialogComponent } from '../channel-dialog/channel-dialog.component';
import { EntwicklerteamComponent } from '../entwicklerteam/entwicklerteam.component';
import { ChannelService } from '../channel.service';
import { UserService } from '../user.service';
@Component({
  selector: 'app-inner-channel',
  standalone: true,
  imports: [CommonModule, MatDialogModule, ChannelDialogComponent],
  templateUrl: './inner-channel.component.html',
  styleUrls: ['./inner-channel.component.scss']  // Korrektur: "styleUrls" im Plural
})
export class InnerChannelComponent {
  @ViewChild(EntwicklerteamComponent) entwicklerteamComponent!: EntwicklerteamComponent;
  isChannelsVisible = true;
  entwicklerTeams: { name: string; members: any[] }[] = [];
  channelNameExists = false;  // Flag zur Überprüfung, ob der Channel-Name bereits existiert

  constructor(public dialog: MatDialog, private channelService: ChannelService,private userService: UserService) {}

  

  ngOnInit(): void {
    this.channelService.loadChannels();
    // Abonniere die Channels, um sie zu aktualisieren
    this.channelService.currentChannels.subscribe((channels) => {
      this.entwicklerTeams = channels;
    });
  }
  


  createChannel(name: string, members: any[]): void {
    this.userService.getCurrentUserData().then((userData) => {
      const currentUserName = userData?.name || 'Unbekannt'; // Setze den Benutzernamen oder 'Unbekannt'
      
      // Überprüfe, ob ein Channel mit demselben Namen bereits existiert
      const exists = this.entwicklerTeams.some(channel => channel.name.toLowerCase() === name.toLowerCase());

      console.log('Benutzername abgerufen:', currentUserName);
  
      if (exists) {
        this.channelNameExists = true;
        console.error(`Channel "${name}" existiert bereits.`);
      } else {
        // Erstelle den neuen Channel mit dem 'createdBy' Feld
        const newChannel = {
          name,
          members,
          createdBy: currentUserName  // Hier wird der aktuelle Benutzername gesetzt
        };
  
        this.entwicklerTeams.push(newChannel);
        this.channelService.addChannel(newChannel);  // Speichere den Channel
        this.channelService.changeChannel(newChannel);  // Aktualisiere den Channel in der Entwicklerteam-Komponente
        this.channelNameExists = false;
      }
    }).catch((error) => {
      console.error('Fehler beim Abrufen des Benutzers:', error);
    });
  }
 

  selectChannel(channel: {  name: string; members: any[] }): void {
    this.channelService.changeChannel(channel);  // Aktualisiere den Channel im EntwicklerteamComponent
  }

  /**
   * Methode zum Öffnen des Dialogs für die Channelerstellung.
   */
  openDialog(): void {
    const dialogRef = this.dialog.open(ChannelDialogComponent);

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('InnerChannelComponent: Channel erstellt:', result.channelName);

        // Versuche, einen neuen Channel zu erstellen
        this.createChannel(result.channelName, result.selectedMembers);
      } else {
        console.error('Kein Channel erstellt');
      }
    });
  }

  /**
   * Methode, um die Sichtbarkeit der Channels umzuschalten.
   */
  toggleChannels(): void {
    this.isChannelsVisible = !this.isChannelsVisible;
  }
}













