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
  
  entwicklerTeams: { name: string }[] = [];
  isChannelsVisible = true;
  

  constructor(public dialog: MatDialog) {}

  openDialog(): void {
    const dialogRef = this.dialog.open(ChannelDialogComponent, {
      
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

  toggleChannels(): void {
    this.isChannelsVisible = !this.isChannelsVisible;
  }

}

