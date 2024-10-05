import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChannelService } from '../channel.service';

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
  isEditing: boolean = false;

  editedChannelName: string = '';

  constructor(
    public dialogRef: MatDialogRef<EditChannelDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { name: string; description: string; createdBy: string },
    private channelService: ChannelService
  ) {
    this.channelName = data.name;
    this.description = data.description;
    this.createdBy = data.createdBy;
  }

  ngOnInit(): void {
    // Aktuelle Channel-Daten aus dem Service laden und sicherstellen, dass Änderungen synchronisiert bleiben
    this.channelService.currentChannels.subscribe(channels => {
      const currentChannel = channels.find(channel => channel.name === this.channelName);
      if (currentChannel) {
        this.channelName = currentChannel.name;
        this.description = currentChannel.description || '';
        console.log('Aktualisierte Channels:', channels);
      }
    });
  }
  
  onSave(): void {
    // Die Methode wird aufgerufen, wenn der Nutzer auf "Speichern" klickt
    if (this.editedChannelName.trim()) {
      // Speichern des geänderten Channel-Namens und der Beschreibung im ChannelService
      this.channelService.updateChannel(this.data.name, this.editedChannelName, this.description);
    } else {
      this.channelService.updateChannel(this.data.name, this.channelName, this.description);
    }
    this.dialogRef.close();
  }
  
  onCancel(): void {
    // Schließe den Dialog ohne Änderungen zu speichern
    this.dialogRef.close();
  }

  toggleEditing() {
    this.isEditing = !this.isEditing;

    if (this.isEditing) {
      // Setze den Channel-Namen als Ausgangswert für die Bearbeitung
      this.editedChannelName = '';
      
    } else {
      // Speichere den neuen Channel-Namen nur, wenn der Bearbeitungsmodus beendet wird
      this.saveChannelName();
    }
  }

  saveChannelName(): void {
    if (this.editedChannelName.trim()) {
      // Nur speichern, wenn ein neuer Name eingegeben wurde
      this.channelName = this.editedChannelName;

      // Aktualisiere den neuen Channel-Namen im ChannelService
      this.channelService.updateChannel(this.data.name, this.editedChannelName, this.description);
      console.log('Neuer Channel-Name gespeichert:', this.channelName);
    }
    // Beende den Bearbeitungsmodus
    this.isEditing = false;
  }
}
