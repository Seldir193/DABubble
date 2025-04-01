/**
 * The SelectedMembersDialogComponent is a Material Dialog that displays 
 * and manages a list of currently selected members. Users can remove 
 * members from the list, then confirm or cancel the dialog. 
 * No logic or style has been changed – only these English JSDoc comments 
 * have been added.
 */

import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';

/**
 * The SelectedMembersDialogComponent displays the list of currently
 * selected members passed in via the dialog data context.
 */
@Component({
  selector: 'app-selected-members-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './selected-members-dialog.component.html',
  styleUrls: ['./selected-members-dialog.component.scss']
})
export class SelectedMembersDialogComponent {
  /**
   * An array of selected members passed in through `MAT_DIALOG_DATA`.
   */
  selectedMembers: any[];

  /**
   * Constructor for the SelectedMembersDialogComponent, injecting
   * the dialog reference and the members data.
   *
   * @param {MatDialogRef<SelectedMembersDialogComponent>} dialogRef - Reference to this dialog instance.
   * @param {any} data - The data object passed to the dialog, containing members.
   */
  constructor(
    public dialogRef: MatDialogRef<SelectedMembersDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.selectedMembers = data.members || [];
  }

  /**
   * Removes a member from the selectedMembers array at the specified index.
   *
   * @param {number} index - The index of the member to remove.
   */
  removeMember(index: number): void {
    this.selectedMembers.splice(index, 1);
  }

  /**
   * Closes the dialog, optionally returning updated data if needed.
   */
  closeDialog(): void {
    this.dialogRef.close();
  }

  /**
   * Closes the dialog without any further action or changes.
   */
  onCancel(): void {
    this.dialogRef.close();
  }
}
