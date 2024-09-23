import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-channel-dialog',
  templateUrl: './channel-dialog.component.html',
  styleUrls: ['./channel-dialog.component.scss'],
  standalone: true, // Wichtig für Standalone-Komponenten
  imports: [
    MatFormFieldModule, // Benötigt für <mat-form-field>
    MatInputModule,      // Benötigt für <mat-input>
    MatButtonModule,
    FormsModule
  ]
})
export class ChannelDialogComponent implements OnInit {
 
 

  channelName: string = '';  // Variable für den Channel-Namen

  constructor(public dialogRef: MatDialogRef<ChannelDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any

  ) {}

  onCreate(): void {
    this.dialogRef.close(this.channelName);  // Schließt den Dialog und gibt den Channel-Namen zurück
  }

  ngOnInit(): void {
    console.log(this.data);
      
  }
}

