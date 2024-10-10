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
  //entwicklerTeams: { name: string; members: any[] }[] = [];

  entwicklerTeams: { id: string; name: string; members: any[]; description?: string; createdBy?: string }[] = [];

  channelNameExists = false;  // Flag zur Überprüfung, ob der Channel-Name bereits existiert

 // selectedChannelId: string | null = null; 

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
  
      const exists = this.entwicklerTeams.some(channel => channel.name.toLowerCase() === name.toLowerCase());
  
      if (exists) {
        this.channelNameExists = true;
        console.error(`Channel "${name}" existiert bereits.`);
      } else {
        const newChannel = {
          id: Math.random().toString(36).substring(2, 15), // Generiere eine eindeutige ID für den neuen Channel
          name,
          members,
          createdBy: currentUserName  // Hier wird der aktuelle Benutzername gesetzt
        };
  
        this.entwicklerTeams.push(newChannel);
        this.channelService.addChannel(newChannel);  // Speichere den Channel
        this.channelService.changeChannel(newChannel);  // Aktualisiere den Channel
        this.channelNameExists = false;
      }
    }).catch((error) => {
      console.error('Fehler beim Abrufen des Benutzers:', error);
    });
  }
  



  
  
 
 
 
  selectChannel(channel: { id: string; name: string; members: any[]; description?: string; createdBy?: string }): void {
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













