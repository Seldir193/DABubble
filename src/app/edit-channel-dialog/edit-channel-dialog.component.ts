import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChannelService } from '../channel.service';
import { UserService } from '../user.service'; 

@Component({
  selector: 'app-edit-channel-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-channel-dialog.component.html',
  styleUrls: ['./edit-channel-dialog.component.scss']
})



export class EditChannelDialogComponent implements OnInit {
  channelName: string = '';
  description: string = '';
  createdBy: string = '';
  members: any[] = [];

  // Separate Flags für die Bearbeitung
  isEditingName: boolean = false;
  isEditingDescription: boolean = false;

  // Variablen für bearbeitete Daten
  editedChannelName: string = '';
  editedDescription: string = '';

  constructor(
    public dialogRef: MatDialogRef<EditChannelDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { name: string; members: any[]; description: string; createdBy: string },
    private channelService: ChannelService,
    private userService: UserService 
  ) {
    this.channelName = data.name;
    this.members = data.members;
    this.description = data.description;
    this.createdBy = data.createdBy || 'Unbekannt';
  }

  ngOnInit(): void {
    // Hole den aktuellen Channel aus dem Service
    this.channelService.currentChannels.subscribe(channels => {
      const currentChannel = channels.find(channel => channel.name === this.channelName);
      if (currentChannel) {
        this.channelName = currentChannel.name;
        this.description = currentChannel.description || '';
        this.members = currentChannel.members || [];
        this.createdBy = currentChannel.createdBy || ''; 
      
        this.userService.getCurrentUserData().then(userData => {
          if (userData && userData.name) {
            this.createdBy = userData.name; // Setze den Benutzernamen als Ersteller des Channels
          }
        }).catch(err => {
          console.error('Fehler beim Abrufen des Benutzers:', err);
        });
      }

    });
  }


  
  onSave(): void {
    // Falls der Channel-Name bearbeitet wurde, speichere die Änderungen
    const updatedChannel = {
      name: this.editedChannelName.trim() ? this.editedChannelName : this.channelName,
      members: this.members, // Behalte die Mitglieder bei
      description: this.description,
      createdBy: this.createdBy
    };

    this.channelService.updateChannel(this.channelName, updatedChannel.name, this.description);
    this.channelService.setMembers(updatedChannel.name, this.members); // Stelle sicher, dass Mitglieder auch aktualisiert werden

    this.dialogRef.close(updatedChannel); // Übergib den aktualisierten Channel beim Schließen des Dialogs
  }





  


  // Methode zum Bearbeiten und Speichern des Channel-Namens
  toggleEditingName(): void {
    this.isEditingName = !this.isEditingName;
    if (this.isEditingName) {
      this.editedChannelName = ''; // Leere das Eingabefeld beim Bearbeiten
    } else {
      this.saveChannelName(); // Speichere den Namen
    }
  }

  saveChannelName(): void {
    if (this.editedChannelName.trim()) {
      this.channelService.updateChannel(this.channelName, this.editedChannelName, this.description);
      this.channelName = this.editedChannelName; // Aktualisiere den Channel-Namen
    }
    this.isEditingName = false;
  }

  // Methode zum Bearbeiten und Speichern der Beschreibung
  toggleEditingDescription(): void {
    this.isEditingDescription = !this.isEditingDescription;
    if (this.isEditingDescription) {
      this.editedDescription = ''; // Leere das Eingabefeld beim Bearbeiten
    } else {
      this.saveDescription(); // Speichere die Beschreibung
    }
  }

  saveDescription(): void {
    if (this.editedDescription.trim()) {
      this.channelService.updateChannel(this.channelName, this.channelName, this.editedDescription);
      this.description = this.editedDescription; // Aktualisiere die Beschreibung
    }
    this.isEditingDescription = false;
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}