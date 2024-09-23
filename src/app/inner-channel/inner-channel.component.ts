import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';
import { ChannelDialogComponent } from '../channel-dialog/channel-dialog.component';

@Component({
  selector: 'app-inner-channel',
  standalone: true,
  imports: [CommonModule, MatDialogModule, ChannelDialogComponent],
  templateUrl: './inner-channel.component.html',
  styleUrls: ['./inner-channel.component.scss']  // Korrektur: "styleUrls" im Plural
})
export class InnerChannelComponent {
  entwicklerTeams = [{ name: 'Entwicklerteam' }]; // Liste der Entwicklerteam-Boxen

  constructor(public dialog: MatDialog) {}

  openDialog(): void {
    const dialogRef = this.dialog.open(ChannelDialogComponent, {
      width: '400px',
      panelClass: 'custom-dialog-container',
      position: { top: '50%', left: '50%' }
    });
  
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.addEntwicklerTeam(result);  // Den Namen des neuen Teams aus dem Dialog verwenden
      }
    });
  }
  
  addEntwicklerTeam(name: string) {
    this.entwicklerTeams.push({ name });
  }

}

