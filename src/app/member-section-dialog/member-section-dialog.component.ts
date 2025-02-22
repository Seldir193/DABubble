




import { Component, Output, EventEmitter, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-member-section-dialog',
  standalone: true,
  templateUrl: './member-section-dialog.component.html',
  styleUrls: ['./member-section-dialog.component.scss'],
  imports: [CommonModule, FormsModule]
})
export class MemberSectionDialogComponent {
  @Output() memberSelected = new EventEmitter<{ uid: string, name: string }>();
  members: any[] = [];

  constructor(
    public dialogRef: MatDialogRef<MemberSectionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.members = data.members || [];
  }

  selectMember(member: any): void {
    console.log('Ausgewähltes Mitglied:', member);
    if (member && member.uid && member.name) {
      this.dialogRef.close();  // Close the dialog
      this.memberSelected.emit({ uid: member.uid, name: member.name });  // Emit selected member
    } else {
      console.error('Ungültiges Mitglied:', member);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}