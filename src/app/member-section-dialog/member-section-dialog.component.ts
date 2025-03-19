/************************************************************
 * The MemberSectionDialogComponent enables the user to select 
 * a member from a provided list of members. If a valid member 
 * is chosen, it closes the dialog and emits the selected 
 * member's data. No logic or style has been altered, only 
 * these JSDoc comments have been added in English.
 ************************************************************/

import { Component, Output, EventEmitter, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * The MemberSectionDialogComponent is a dialog that displays 
 * a list of members and allows the user to pick one. Once 
 * selected, it emits the chosen member and closes the dialog.
 */
@Component({
  selector: 'app-member-section-dialog',
  standalone: true,
  templateUrl: './member-section-dialog.component.html',
  styleUrls: ['./member-section-dialog.component.scss'],
  imports: [CommonModule, FormsModule]
})
export class MemberSectionDialogComponent {
  /**
   * Emits an event containing the selected member's UID and name.
   */
  @Output() memberSelected = new EventEmitter<{ uid: string, name: string }>();

  /**
   * The list of members provided to the dialog.
   */
  members: any[] = [];

  /**
   * Constructor that receives the members array from the dialog data.
   *
   * @param {MatDialogRef<MemberSectionDialogComponent>} dialogRef 
   *   Reference to the current dialog.
   * @param {any} data 
   *   Data injected into the dialog, expected to contain `members`.
   */
  constructor(
    public dialogRef: MatDialogRef<MemberSectionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.members = data.members || [];
  }

  /**
   * Selects a member, closing the dialog and emitting `memberSelected` 
   * if the member data is valid.
   *
   * @param {any} member - The chosen member object.
   */
  selectMember(member: any): void {
    if (member && member.uid && member.name) {
      this.dialogRef.close(); 
      this.memberSelected.emit({ uid: member.uid, name: member.name });
    } else {
    }
  }

  /**
   * Closes the dialog without selecting any member.
   */
  onCancel(): void {
    this.dialogRef.close();
  }
}
