

import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';
import { ChannelDialogComponent } from '../channel-dialog/channel-dialog.component';
import { EntwicklerteamComponent } from '../entwicklerteam/entwicklerteam.component';
import { ChannelService } from '../channel.service';

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

  constructor(public dialog: MatDialog, private channelService: ChannelService) {}

  /**
   * Methode zum Erstellen oder Aktualisieren eines Channels.
   * Vermeidet doppelte Channels und aktualisiert die Mitglieder bei einem existierenden Channel.
   */

  createChannel(name: string, members: any[]): void {
    const newChannel = { name, members };
    this.entwicklerTeams.push(newChannel);
    this.channelService.changeChannel(newChannel);  // Sende den neuen Channel an EntwicklerteamComponent
  }
  
 
  /**
   * Methode, um einen Channel auszuwählen und ihn an den EntwicklerteamComponent zu senden.
   */
  selectChannel(channel: { name: string; members: any[] }): void {
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

        // Füge den neuen Kanal hinzu und speichere die Mitglieder
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
