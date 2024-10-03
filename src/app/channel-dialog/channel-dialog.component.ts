import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog, } from '@angular/material/dialog';
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
  standalone: true, // Wichtig für Standalone-Komponenten
  imports: [
    MatFormFieldModule, // Benötigt für <mat-form-field>
    MatInputModule,      // Benötigt für <mat-input>
    MatButtonModule,
    FormsModule,
    MatDialogModule, // Benötigt für MatDialog
    CommonModule,
    //MembersDialogComponent
  ]
})
export class ChannelDialogComponent implements OnInit {
  selectedOption: string = 'all'; 
  channelName: string = '' ;
  selectedMembers: any[] = []; 

  allMembers: any[] = [];

  constructor(public dialogRef: MatDialogRef<ChannelDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialog: MatDialog,
    private channelService: ChannelService,
    
   
  ) {}

  onCreate(): void {
    // Schließe den ersten Dialog und übergib den Channel-Namen
    this.dialogRef.close({ channelName: this.channelName });
  
    // Öffne den Mitglieder-Dialog direkt nach dem Schließen des ersten Dialogs
    const mitgliederDialogRef = this.dialog.open(MembersDialogComponent, {
      data: { channelName: this.channelName },  // Gebe den Channel-Namen weiter
    });
  
    // Warte auf das Schließen des Mitglieder-Dialogs
    mitgliederDialogRef.afterClosed().subscribe(result => {
      if (result && result.selectedMembers) {
        // Mitglieder erfolgreich ausgewählt
        console.log('Mitglieder erfolgreich ausgewählt: ', result.selectedMembers);
  
        // Optional: Falls der Channel-Service genutzt wird, um die Daten zu speichern
        this.channelService.changeChannel({
          name: this.channelName,
          members: result.selectedMembers
        });
  
        // Gebe den Channel-Namen und die ausgewählten Mitglieder an die nächste Komponente weiter
        this.dialogRef.close({
          channelName: this.channelName,
          selectedMembers: result.selectedMembers
        });
      }
    });
  }
  
  closeDialog(): void {
    this.dialogRef.close();
  }

  ngOnInit(): void {
    console.log(this.data); 
  }
}



 







