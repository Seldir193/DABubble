
import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-selected-members-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './selected-members-dialog.component.html',
  styleUrls: ['./selected-members-dialog.component.scss']
})
export class SelectedMembersDialogComponent {
  // Die ausgewählten Mitglieder werden über den Dialog-Datenkontext übergeben
  selectedMembers: any[];

  constructor(
    public dialogRef: MatDialogRef<SelectedMembersDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.selectedMembers = data.members || []; // Erhalte die ausgewählten Mitglieder aus den Dialog-Daten
  }

  removeMember(index: number): void {
    this.selectedMembers.splice(index, 1); // Entferne das Mitglied aus der Liste
  }

  // Methode zum Schließen des Dialogs
  closeDialog(): void {
    this.dialogRef.close();
  }

  // Methode zum Schließen des Dialogs ohne Aktion
  onCancel(): void {
    this.dialogRef.close();
  }
}
