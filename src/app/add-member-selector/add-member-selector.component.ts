import { Component, Inject, OnInit, Output, EventEmitter } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { UserService } from '../user.service';



@Component({
  selector: 'app-add-member-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './add-member-selector.component.html',
  styleUrls: ['./add-member-selector.component.scss']
})
export class AddMemberSelectorComponent implements OnInit {
  @Output() memberSelected = new EventEmitter<any>();
  members: any[] = [];

  constructor(
    private userService: UserService,
    @Inject(MAT_DIALOG_DATA) public data: { members: any[] },
    public dialogRef: MatDialogRef<AddMemberSelectorComponent>
  ) {}
  
  ngOnInit(): void {
    this.userService.getAllUsersRealTime((users) => {
      this.updateMemberStatus(users); 
    });
  }
  
  updateMemberStatus(users: any[]): void {
    this.data.members = this.data.members.map(member => {
      const userFromFirestore = users.find((u: any) => u.id === member.id);
      return {
        ...member,
        isOnline: userFromFirestore?.isOnline ?? false 
      };
    });
    console.log('Mitglieder in Echtzeit aktualisiert:', this.data.members); 
  }
  
  sortMembersByStatus(): void {
    this.members.sort((a, b) => Number(b.isOnline) - Number(a.isOnline)); 
  }

  selectMember(member: any): void {
    this.dialogRef.close(member); 
  }

  cancel(): void {
    this.dialogRef.close();
  }
}




