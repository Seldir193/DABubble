import { Component, ViewChild, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';
import { ChannelDialogComponent } from '../channel-dialog/channel-dialog.component';
import { EntwicklerteamComponent } from '../entwicklerteam/entwicklerteam.component';
import { ChannelService } from '../channel.service';
import { UserService } from '../user.service';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-inner-channel',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  templateUrl: './inner-channel.component.html',
  styleUrls: ['./inner-channel.component.scss']  // Korrektur: "styleUrls" im Plural
})
export class InnerChannelComponent {
  @ViewChild(EntwicklerteamComponent) entwicklerteamComponent!: EntwicklerteamComponent;
  @Output() channelSelected = new EventEmitter<any>(); // EventEmitter für Kanaländerungen
  isChannelsVisible = true;
  entwicklerTeams: { id: string; name: string; members: any[]; description?: string; createdBy?: string }[] = [];
  channelNameExists = false;  // Flag zur Überprüfung, ob der Channel-Name bereits existiert
  showWelcomeContainer: boolean = false;
  selectedChannel: any = null;

  constructor(public dialog: MatDialog, private channelService: ChannelService, private userService: UserService,private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.channelService.loadChannels();
    // Abonniere die Channels, um sie zu aktualisieren
    this.channelService.currentChannels.subscribe((channels) => {
      const currentUserId = this.userService.getCurrentUserId();
      
      this.entwicklerTeams = channels.filter((channel) =>
        channel.members.some((member: any) => member.uid === currentUserId)
      );
    });
  }
  

  async createChannel(name: string, selectedMembers: any[]): Promise<void> {
    try {
      // 1) Userdaten laden (aktuell eingeloggter User)
      const userData = await this.userService.getCurrentUserData();
      if (!userData) {
        console.error('Kein User eingeloggt oder Daten nicht gefunden.');
        return;
      }
  
      // Wichtige Infos
      const currentUserId = userData.uid;        // UID des aktuellen Nutzers
      const currentUserName = userData.name || 'Unbekannt';
  
      // 2) Prüfe, ob Channel-Name schon existiert (indem du in this.entwicklerTeams suchst)
      const exists = this.entwicklerTeams.some(channel =>
        channel.name.toLowerCase() === name.toLowerCase()
      );
      if (exists) {
        this.channelNameExists = true;
        console.error(`Channel "${name}" existiert bereits.`);
        return;
      }
      this.channelNameExists = false; // Reset Flag
  
      // 3) Sicherstellen, dass der aktuelle User im Array von "selectedMembers" enthalten ist
      if (!selectedMembers.some((m: any) => m.uid === currentUserId)) {
        selectedMembers.push({
          uid: currentUserId,
          name: currentUserName,
          // avatarUrl: userData.avatarUrl ? userData.avatarUrl : 'assets/img/default.png',
          // isOnline: userData.isOnline,  // falls du so was hast
        });
      }
  
      // 4) Channel-Objekt erstellen
      const newChannel = {
        // Falls du eine echte Firestore-ID brauchst, 
        // überlässt du das `id: ...` dem Service (oder setz testweise eine pseudo-ID):
        id: Math.random().toString(36).substring(2, 15),
        name,
        members: selectedMembers,
        createdBy: currentUserName,
      };
  
      // 5) Direkt in der lokalen Liste einfügen (damit es sofort sichtbar ist)
      this.entwicklerTeams.push(newChannel);
  
      // 6) ChannelService aufrufen, um den Channel in Firestore zu speichern
      await this.channelService.addChannel(newChannel);
  
      // 7) Optional: Direkt als aktuellen Channel setzen
      this.channelService.changeChannel(newChannel);
  
      console.log('Neuer Channel erstellt und im Service gespeichert:', newChannel);
    } catch (error) {
      console.error('Fehler beim Erstellen des Channels:', error);
    }
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
        //console.error('Kein Channel erstellt');
      }
    });
  }
  
  toggleChannels(): void {
    this.isChannelsVisible = !this.isChannelsVisible;
  }

  async leaveChannel(channelId: string): Promise<void> {
    const userId = this.userService.getCurrentUserId(); // Benutzer-ID holen
  
    if (userId) {
      try {
        // Entferne den Benutzer aus Firestore, aber lösche den Channel nicht vollständig
        await this.channelService.leaveChannel(channelId, userId);
        
        // Der Channel wird aus der lokalen Channel-Liste entfernt
        this.entwicklerTeams = this.entwicklerTeams.filter(channel => channel.id !== channelId);
        
        // Emitte ein Event, dass kein Channel mehr ausgewählt ist
        this.channelSelected.emit(null);
      } catch (error) {
        console.error('Fehler beim Verlassen des Channels:', error);
      }
    } else {
      console.error('Benutzer-ID konnte nicht abgerufen werden.');
    }
  }
}