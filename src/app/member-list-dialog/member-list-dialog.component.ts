







import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
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
    @Inject(MAT_DIALOG_DATA) public data: { channelId: string; channelName: string; members: any[] },
    private channelService: ChannelService
  ) {
    this.members = [...data.members]; // Erstelle eine Kopie der Mitgliederliste, um direkte Mutationen zu vermeiden
  }

  // Methode zum Entfernen eines Mitglieds
  removeMember(member: any): void {
    this.members = this.members.filter(m => m !== member);
    this.updateChannelMembers();
  }

  // Methode zum Hinzufügen von Mitgliedern über den AddMembersDialog
  openAddMembersDialog(): void {

    this.dialogRef.close(); 

    const dialogRef = this.dialog.open(AddMembersDialogComponent, {
      data: { members: this.members }
    });

    dialogRef.afterClosed().subscribe((updatedMembers: any[] | undefined) => {
      if (updatedMembers && updatedMembers.length > 0) {
        const uniqueMembers = updatedMembers.filter(member =>
          !this.members.some(m => m.name === member.name)
        );

        if (uniqueMembers.length > 0) {
          this.members = [...this.members, ...uniqueMembers]; // Aktualisiere die Mitgliederliste
          this.updateChannelMembers();
        }

        this.closeDialog(); 
      }
    });
  }

  // Methode zur Aktualisierung der Mitgliederliste im ChannelService
  updateChannelMembers(): void {
    this.channelService.setMembers(this.data.channelId, this.members)
      .then(() => {
        console.log('Mitglieder erfolgreich im ChannelService aktualisiert.');
      })
      .catch((error) => {
        console.error('Fehler beim Aktualisieren der Mitglieder im ChannelService:', error);
      });
  }

  // Methode zum Schließen des Dialogs und Rückgabe der aktualisierten Mitgliederliste
  closeDialog(): void {
    // Gib die aktualisierte Mitgliederliste zurück
    this.dialogRef.close({ members: this.members });
  }

  // Methode zum Schließen des Dialogs ohne Änderungen
  onCancel(): void {
    this.dialogRef.close();
  }
}
