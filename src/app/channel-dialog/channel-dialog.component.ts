import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog, } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MembersDialogComponent } from '../members-dialog/members-dialog.component';

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
    MembersDialogComponent
  ]
})
export class ChannelDialogComponent implements OnInit {
  selectedOption: string = 'all'; 

  channelName = [];
  constructor(public dialogRef: MatDialogRef<ChannelDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialog: MatDialog
  ) {}

  onCreate(): void {
    // Überprüfen, welche Option gewählt wurde
    if (this.selectedOption === 'all') {
      console.log('Alle Mitglieder wurden ausgewählt.');
    } else if (this.selectedOption === 'specific') {
      console.log('Bestimmte Mitglieder wurden ausgewählt.');
    }

    // Schließe den Channel-Dialog und öffne den Mitglieder-Dialog
    this.dialogRef.close();

    // Öffne den Mitglieder-Dialog nach Schließen des Channel-Dialogs
    const mitgliederDialogRef = this.dialog.open(MembersDialogComponent, {
     // width: '710px',
      //height: '279px'
      
    });

    mitgliederDialogRef.afterClosed().subscribe(result => {
      console.log('Mitglieder Dialog geschlossen. Ergebnis:', result);
      // Hier kannst du die Logik für die ausgewählten Mitglieder implementieren
    });
  }

  ngOnInit(): void {
    console.log(this.data);
  }
}




