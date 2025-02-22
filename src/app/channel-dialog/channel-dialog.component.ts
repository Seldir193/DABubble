
import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MembersDialogComponent } from '../members-dialog/members-dialog.component';
import { ChannelService } from '../channel.service';


@Component({
  selector: 'app-channel-dialog',
  templateUrl: './channel-dialog.component.html',
  styleUrls: ['./channel-dialog.component.scss'],
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    FormsModule,
    MatDialogModule,
    CommonModule,
  ]
})
export class ChannelDialogComponent implements OnInit {
  channelName: string = '';
  
  channelNameExists = false;  // Flag für vorhandenen Channel-Namen
  isChannelNameValid = false;
  description: string = '';

  constructor(
    public dialogRef: MatDialogRef<ChannelDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialog: MatDialog,
    private channelService: ChannelService,
    
   

    
    
  ) {}

  onChannelNameChange(value: string): void {
    this.isChannelNameValid = value.trim().length >= 3;  // Channel-Name ist gültig, wenn mindestens 3 Zeichen
  }


  onCreate(): void {
    if (!this.isChannelNameValid) {
      return;  // Verhindere das Erstellen, falls der Channel-Name ungültig ist
    }
    // Überprüfe, ob der Channel-Name bereits existiert
    const exists = this.channelService.getChannels().some((channel: { name: string; members: any[] }) => 
      channel.name.toLowerCase() === this.channelName.toLowerCase()
    );
  
    if (exists) {
      this.channelNameExists = true;  // Setze das Flag, um die Fehlermeldung anzuzeigen
    } else {
      this.channelNameExists = false;
  
      // Öffne den Mitglieder-Dialog direkt nach dem Schließen des Channel-Dialogs
      const mitgliederDialogRef = this.dialog.open(MembersDialogComponent, {
        data: { channelName: this.channelName },  // Gebe den Channel-Namen weiter
      });
  
      mitgliederDialogRef.afterClosed().subscribe(result => {
        if (result && result.selectedMembers) {
          // Channel speichern (erst jetzt, nach Auswahl der Mitglieder)
          this.channelService.addChannel({
            name: this.channelName,
            members: result.selectedMembers,
            description: this.description 
          });
  
          console.log('Channel erstellt mit Mitgliedern:', {
            name: this.channelName,
            members: result.selectedMembers,
            description: this.description 
          });
        }
      });
  
      this.dialogRef.close(); // Schließe den Channel-Dialog nachdem Mitglieder-Dialog geöffnet wurde
    }
  }
 

  
  
  
  

  closeDialog(): void {
    this.dialogRef.close();
  }

  ngOnInit(): void {
    console.log(this.data);
  }
}
