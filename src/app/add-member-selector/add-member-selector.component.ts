// add-member-selector.component.ts
import { Component, Inject, Output, EventEmitter } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-add-member-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './add-member-selector.component.html',
  styleUrls: ['./add-member-selector.component.scss']
})
export class AddMemberSelectorComponent {
  @Output() memberSelected = new EventEmitter<any>();
  
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { members: any[] },
    public dialogRef: MatDialogRef<AddMemberSelectorComponent>
  ) {}

  selectMember(member: any): void {
    this.dialogRef.close(member);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
