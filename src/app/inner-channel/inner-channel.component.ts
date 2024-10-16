





import { Component, ViewChild, Output, EventEmitter } from '@angular/core';
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
  @Output() channelSelected = new EventEmitter<any>(); // EventEmitter für Kanaländerungen
  isChannelsVisible = true;

  entwicklerTeams: { id: string; name: string; members: any[]; description?: string; createdBy?: string }[] = [];
  channelNameExists = false;  // Flag zur Überprüfung, ob der Channel-Name bereits existiert

  constructor(public dialog: MatDialog, private channelService: ChannelService, private userService: UserService) {}

  ngOnInit(): void {
    this.channelService.loadChannels();
    // Abonniere die Channels, um sie zu aktualisieren
    this.channelService.currentChannels.subscribe((channels) => {
      this.entwicklerTeams = channels;
    });
  }

  

  createChannel(name: string, members: any[]): void {
    this.userService.getCurrentUserData().then((userData) => {
      const currentUserName = userData?.name || 'Unbekannt';
      const exists = this.entwicklerTeams.some(channel => channel.name.toLowerCase() === name.toLowerCase());

      if (exists) {
        this.channelNameExists = true;
        console.error(`Channel "${name}" existiert bereits.`);
      } else {
        const newChannel = {
          id: Math.random().toString(36).substring(2, 15),
          name,
          members,
          createdBy: currentUserName
        };

        this.entwicklerTeams.push(newChannel);
        this.channelService.addChannel(newChannel);
        this.channelService.changeChannel(newChannel);
        this.channelNameExists = false;
      }
    }).catch((error) => {
      console.error('Fehler beim Abrufen des Benutzers:', error);
    });
  }

  selectChannel(channel: { id: string; name: string; members: any[]; description?: string; createdBy?: string }): void {
    // Wähle den Kanal aus und speichere ihn im Zustand
    this.channelService.changeChannel(channel);
    // Löse das Event aus, damit die `ChatComponent` weiß, dass ein neuer Kanal ausgewählt wurde
    this.channelSelected.emit(channel);
  }


  openDialog(): void {
    const dialogRef = this.dialog.open(ChannelDialogComponent);

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('InnerChannelComponent: Channel erstellt:', result.channelName);
        this.createChannel(result.channelName, result.selectedMembers);
      } else {
        console.error('Kein Channel erstellt');
      }
    });
  }
  

  

  toggleChannels(): void {
    this.isChannelsVisible = !this.isChannelsVisible;
  }

 
}















