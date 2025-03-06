


























import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OverlayModule } from '@angular/cdk/overlay';
import { MatDialog } from '@angular/material/dialog';

import { UserService } from '../user.service';
import { ChannelService } from '../channel.service';
import { SelectedMembersDialogComponent } from '../selected-members-dialog/selected-members-dialog.component';

@Component({
  selector: 'app-add-members-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, OverlayModule],
  templateUrl: './add-members-dialog.component.html',
  styleUrls: ['./add-members-dialog.component.scss']
})
export class AddMembersDialogComponent implements OnInit {

  @Input() channelId!: string;
  @Input() channelName: string = '';
  @Input() existingMembers: any[] = [];  // Statt this.data.members

  @Output() close = new EventEmitter<void>();
  @Output() membersAdded = new EventEmitter<any[]>();

  specificMemberName: string = '';
  filteredMembers: any[] = [];
  selectedMembers: any[] = [];
  isMembersListVisible = false;
  allUsers: any[] = [];

  constructor(
    private userService: UserService,
    private channelService: ChannelService,
    private dialog: MatDialog, // Falls du den nested DialogSelectedMembers beibehalten möchtest
  ) {}

  ngOnInit(): void {
    console.log('[Overlay init] existingMembers:', this.existingMembers);
    this.loadAllUsers();
  }

  // Lade alle Nutzer
  loadAllUsers(): void {
    this.userService.getAllUsers()
      .then(users => {
        this.allUsers = users;
        this.filterAlreadySelectedMembers();
      })
      .catch(err => console.error('Fehler beim Laden', err));
  }

  // Filterlogik
  filterAlreadySelectedMembers(): void {
    this.filteredMembers = this.allUsers.filter(member => 
      !this.existingMembers.some(existing => existing.name === member.name) &&
      !this.selectedMembers.some(selected => selected.name === member.name)
    );
  }

  showAllMembers(): void {
    this.isMembersListVisible = true;
    this.filterAlreadySelectedMembers();
  }
  hideMembersList(): void {
    setTimeout(() => {
      this.isMembersListVisible = false;
    }, 200);
  }
  onSearchMembers(): void {
    const term = this.specificMemberName.toLowerCase();
    this.filteredMembers = this.allUsers
      .filter(member =>
        member.name.toLowerCase().includes(term) &&
        !this.existingMembers.some(ex => ex.name === member.name) &&
        !this.selectedMembers.some(se => se.name === member.name)
      );
  }

  selectMember(member: any): void {
    if (!this.selectedMembers.some(m => m.name === member.name)) {
      this.selectedMembers.push(member);
    }
    this.specificMemberName = '';
    this.isMembersListVisible = false;
    this.filterAlreadySelectedMembers();
  }

  removeMember(member: any): void {
    this.selectedMembers = this.selectedMembers.filter(m => m !== member);
    this.filterAlreadySelectedMembers();
  }

  // Speichern
  onCreate(): void {
    const uniqueMembers = this.selectedMembers.filter(
      member => !this.existingMembers.some(m => m.name === member.name)
    );
    if (uniqueMembers.length > 0) {
      console.log('Neue Mitglieder:', uniqueMembers);
      const updatedMembers = [...this.existingMembers, ...uniqueMembers];
      
      // ChannelService
      this.channelService.setMembers(this.channelId, updatedMembers)
        .then(() => {
          console.log('Erfolgreich gespeichert');
          // Output-Event an Eltern
          this.membersAdded.emit(updatedMembers);
          // Overlay schließen
          this.close.emit();
        })
        .catch(err => console.error('Fehler beim Speichern:', err));
    } else {
      console.log('Keine neuen Mitglieder ausgewählt');
      this.close.emit();
    }
  }

  // Optional
  openMembersDialog(): void {
    // Nested Dialog -> Nur wenn du es willst
    const dialogRef = this.dialog.open(SelectedMembersDialogComponent, {
      data: { members: this.selectedMembers }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.selectedMembers = result;
      }
    });
  }

  onCancel(): void {
    // Overlay schließen, ohne was zu tun
    this.close.emit();
  }
}
