
import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA ,MatDialog } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { AddMembersDialogComponent } from '../add-members-dialog/add-members-dialog.component';
import { ChannelService } from '../channel.service';

@Component({
  selector: 'app-member-list-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './member-list-dialog.component.html',
  styleUrls: ['./member-list-dialog.component.scss']
})
export class MemberListDialogComponent {
  members: any[] = [];
 
  constructor(
    public dialog: MatDialog,
    
    public dialogRef: MatDialogRef<MemberListDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { members: any[] },
    private channelService: ChannelService
  ) {
    this.members = data.members; 
  }

  removeMember(member: any): void {
    this.data.members = this.data.members.filter(m => m !== member);
  }


  openAddMembersDialog(): void {
    // Schließe den aktuellen Dialog, bevor der neue Dialog geöffnet wird
    this.dialogRef.close();  // Schliesse MemberListDialogComponent

    // Öffne den AddMembersDialogComponent
    const dialogRef = this.dialog.open(AddMembersDialogComponent, {
      data: { members: this.members }
    });

    dialogRef.afterClosed().subscribe((updatedMembers: any[] | undefined) => {
      if (updatedMembers && updatedMembers.length > 0) {
        const uniqueMembers = updatedMembers.filter(member =>
          !this.members.some(m => m.name === member.name)
        );
        this.members = [...this.members, ...uniqueMembers]; // Aktualisiere die Mitgliederliste
       
        
        // Gib die aktualisierte Liste an EntwicklerteamComponent zurück
        this.closeDialog();  // Schließt den Dialog und gibt die aktualisierten Mitglieder zurück
      }
    });
}


  closeDialog(): void {
    this.dialogRef.close(this.members);  // Rückgabe der aktualisierten Mitgliederliste
  }

   // Methode zum Schließen des Dialogs ohne Aktion
   onCancel(): void {
    this.dialogRef.close();
  }
  
  updateMembers(updatedMembers: any[]): void {
    this.members = updatedMembers;
  }
}