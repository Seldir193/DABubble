
import { Component, OnInit ,CUSTOM_ELEMENTS_SCHEMA  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { HostListener } from '@angular/core';
import { ChannelService } from '../channel.service';
import { MemberListDialogComponent } from '../member-list-dialog/member-list-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { AddMembersDialogComponent } from '../add-members-dialog/add-members-dialog.component';
import { EditChannelDialogComponent } from '../edit-channel-dialog/edit-channel-dialog.component';


@Component({
  selector: 'app-entwicklerteam',
  standalone: true,
  imports: [CommonModule,FormsModule,PickerModule],
  templateUrl: './entwicklerteam.component.html',
  styleUrls: ['./entwicklerteam.component.scss'] ,
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class EntwicklerteamComponent implements OnInit {
  message: string = '';
  isEmojiPickerVisible: boolean = false;
  imageUrl: string | ArrayBuffer | null | undefined = null;  // Typ mit undefined erweitert
  isTextareaExpanded: boolean = false;
  isImageModalOpen = false;
  channels: { name: string; members: any[] }[] = [];
  selectedChannel: { name: string; members: any[] } | null = null;
  
  

  constructor(private channelService: ChannelService,private dialog: MatDialog){}

  receiveNewTeam(name: string, members: any[]): void {
    // Überschreibe die Channel-Liste mit dem neuen Channel
    this.channels = [{ name, members }];
    console.log('EntwicklerteamComponent: Neuer Channel hinzugefügt:', this.channels);
  }

  onImageSelected(event: Event, textArea: HTMLTextAreaElement): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imageUrl = e.target?.result;  // Das neue Bild ersetzt das alte
        if (!this.isTextareaExpanded) {
          this.adjustTextareaHeight(textArea); // Textarea-Höhe anpassen
          this.isTextareaExpanded = true; // Markiere, dass das Textarea bereits vergrößert wurde
        }
      };
      reader.readAsDataURL(file);
    }
  }

  closeProfileCard(textArea: HTMLTextAreaElement): void {
    this.imageUrl = null;  // Entfernt das Bild
    this.isTextareaExpanded = false; 
    this.resetTextareaHeight(textArea);  // Textarea-Höhe wird zurückgesetzt
  }

  adjustTextareaHeight(textArea: HTMLTextAreaElement): void {
    if (this.imageUrl) {
      //textArea.style.height = ${textArea.scrollHeight + 110}px; // Vergrößere die Höhe basierend auf der Bildgröße
      textArea.style.paddingBottom = `${160}px`; 
    }
  }
  
  // Textarea-Größe auf ursprüngliche Höhe zurücksetzen
  resetTextareaHeight(textArea: HTMLTextAreaElement): void {
    //textArea.style.height = '145px';  // Zurücksetzen auf die ursprüngliche Höhe
    textArea.style.paddingBottom = '20px'; 
  }

  toggleEmojiPicker(): void {
    this.isEmojiPickerVisible = !this.isEmojiPickerVisible; // Umschalten der Sichtbarkeit
    console.log('Emoji Picker Sichtbarkeit:', this.isEmojiPickerVisible); // Zum Debuggen in der Konsole
  }
  
  addAtSymbol(): void {
    this.message += '@';
  }

  addEmoji(event: any): void {
    if (event.emoji && event.emoji.native) {
      this.message += event.emoji.native;
    } else {
      console.error('Emoji Event Fehler:', event);
    }
    this.isEmojiPickerVisible = false;
  }

  sendMessage(): void {
    console.log("Message sent: ", this.message);
    // Nachricht senden
  }

  




  ngOnInit(): void {
    // Abonniere den Channel-Service, um den aktuell ausgewählten Channel zu empfangen
    this.channelService.currentChannel.subscribe(channel => {
      if (channel) {
        // Zeige nur den aktuell ausgewählten Channel an und ersetze den alten
        this.channels = [{ name: channel.name, members: channel.members }];
        console.log('Aktueller Channel im EntwicklerteamComponent:', this.channels);
      }
    });
  }
  



  
  openAddMembersDialog(channel: { name: string; members: any[] }): void {
    const dialogRef = this.dialog.open(AddMembersDialogComponent, {
      data: { members: channel.members }
    });

    dialogRef.afterClosed().subscribe((updatedMembers: any[] | undefined) => {
      if (updatedMembers && updatedMembers.length > 0) {
        const uniqueMembers = updatedMembers.filter(member =>
          !channel.members.some(m => m.name === member.name)
        );
        channel.members = [...channel.members, ...uniqueMembers]; // Füge neue Mitglieder hinzu
        console.log('Aktualisierte Mitgliederliste:', channel.members);

        // Setze die Mitglieder im ChannelService, um sie zu speichern
        this.channelService.setMembers(channel.name, channel.members);
      }
    });
  }


  openMembersDialog(channel: { name: string; members: any[] }): void {
    const dialogRef = this.dialog.open(MemberListDialogComponent, {
      data: { channelName: channel.name, members: channel.members }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.selectedMembers) {
        channel.members = result.selectedMembers; // Aktualisiere die Mitglieder des Channels

        // Setze die Mitglieder im ChannelService, um sie zu speichern
        this.channelService.setMembers(channel.name, result.selectedMembers);
      }
    });
  }


  openEditChannelDialog(channel: { name: string; members: any[]; description?: string; createdBy?: string }): void {
    const dialogRef = this.dialog.open(EditChannelDialogComponent, {
      data: {
        name: channel.name,
        members: channel.members,  // Übergib die Mitglieder des Channels
        description: channel.description || '',  // Verwende einen leeren String, falls description undefined ist
        createdBy: channel.createdBy || 'Unbekannt'
      }
    });
  
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Aktualisiere den Channel mit der neuen Beschreibung und dem neuen Namen
        this.channelService.updateChannel(channel.name, result.name, result.description || '');
  
        // Optionale: Stelle sicher, dass Änderungen an den Mitgliedern auch gespeichert werden
        this.channelService.setMembers(result.name, channel.members);
      }
    });
  }
  



  




  
  


  
  



  

  
  
  
  openImageModal() {
    this.isImageModalOpen = true;
  }

  closeImageModal() {
    this.isImageModalOpen = false;
  }

  @HostListener('document:keydown.escape', ['$event'])
    onEscapePress(event: KeyboardEvent) {
  this.closeImageModal();
}
}
