
import { Component, Input, Output, EventEmitter, OnInit, Optional, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OverlayModule } from '@angular/cdk/overlay';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';




import { UserService } from '../user.service';
import { ChannelService } from '../channel.service';
import { SelectedMembersDialogComponent } from '../selected-members-dialog/selected-members-dialog.component';

import { MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';

import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
// OPTIONAL: Data interface, falls wir per Material-Dialog .open({ data: {...} }) aufrufen
export interface AddMembersDialogData {
  channelId?: string;
  channelName?: string;
  members?: any[];
  filteredMembers?: any[]; 
}

@Component({
  selector: 'app-add-members-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, OverlayModule],
  templateUrl: './add-members-dialog.component.html',
  styleUrls: ['./add-members-dialog.component.scss']
})
export class AddMembersDialogComponent implements OnInit {

  // === cdkOverlay Inputs ===
  @Input() channelId!: string;
  @Input() channelName: string = '';
  @Input() members: any[] = [];  // <-- Vorhandene Mitglieder

  // === cdkOverlay Outputs ===
  @Output() close = new EventEmitter<void>();
  @Output() membersAdded = new EventEmitter<any[]>();

  // Lokale Variablen für die Komponenten-Logik
  specificMemberName: string = '';
  filteredMembers: any[] = [];
  selectedMembers: any[] = [];
  isMembersListVisible = false;
  allUsers: any[] = [];
 
  //data: AddMembersDialogData = {};

  constructor(
    private userService: UserService,
    private channelService: ChannelService,
    private dialog: MatDialog,
   

    // Falls Material-Dialog:
    @Optional() public dialogRef?: MatDialogRef<AddMembersDialogComponent>,

    @Optional() public bottomSheetRef?: MatBottomSheetRef<AddMembersDialogComponent>,
   // @Optional() @Inject(MAT_DIALOG_DATA) public dialogData?: AddMembersDialogData,
   // @Optional() @Inject(MAT_BOTTOM_SHEET_DATA) public bottomSheetData?: AddMembersDialogData
    @Optional() @Inject(MAT_DIALOG_DATA) public data?: AddMembersDialogData
  ) {
   // this.data = this.dialogData || this.bottomSheetData || {};
  }

   

  ngOnInit(): void {
    // (1) Falls wir per Material-Dialog Daten übergeben haben => channelId, members ...
    console.log('[AddMembersDialog] ngOnInit => data:', this.data);

    if (this.data) {
      if (this.data.channelId) {
        this.channelId = this.data.channelId;
      }
      if (this.data.channelName) {
        this.channelName = this.data.channelName;
      }
      if (this.data.members) {
       //this.members = this.data.members;

       this.members = [...this.data.members];
      }
      if (this.data.filteredMembers) {
        this.filteredMembers = [...this.data.filteredMembers]; // ✅ Falls übergeben, NICHT erneut setzen!
      } else {
        this.filteredMembers = []; // Falls `filteredMembers` nicht existiert, leeres Array setzen
      }
     
    }
    console.log('[AddMembersDialog] INIT => members:', this.members);
    console.log('[AddMembersDialog] INIT => gefilterte Mitglieder:', this.filteredMembers);
  
    //this.loadAllUsers();

    if (this.filteredMembers.length === 0) {
      this.loadAllUsers();
    }

  }

 





   // Alle Nutzer laden
   loadAllUsers(): void {
    this.userService.getAllUsers()
     .then(users => {
       this.allUsers = users;
       this.filterAlreadySelectedMembers();

       if (!this.data?.filteredMembers || this.filteredMembers.length === 0) {
        this.filteredMembers = this.allUsers.filter(user => 
          !this.members.some(existing => existing.uid === user.uid)
        );
      }
     
     })
     .catch(err => console.error('Fehler beim Laden', err));
 }
  



  filterAlreadySelectedMembers(): void {
    this.filteredMembers = this.allUsers.filter(member => 
      !this.members.some(existing => existing.name === member.name) &&
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
        !this.members.some(ex => ex.name === member.name) &&
      
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

 








  onCreate(): void {
    // (1) Ermittle nur die „neuen“ Mitglieder, die noch nicht in this.members sind
    const uniqueMembers = this.selectedMembers.filter(
      member => !this.members.some(m => m.name === member.name)
    );
  
    if (uniqueMembers.length > 0) {
      console.log('Neue Mitglieder:', uniqueMembers);
  
      // (2) Füge neue hinzu: [alte + neue]
      console.log('>> Alte members =', this.members);
      const updatedMembers = [...this.members, ...uniqueMembers];

  console.log('>> updatedMembers =', updatedMembers);

      // (3) Speichere in Firestore
      this.channelService.setMembers(this.channelId, updatedMembers)
        .then(() => {
          console.log('Erfolgreich gespeichert in Firestore:', updatedMembers);
  
          // (4) Je nach Umgebung anders schließen
          if (this.dialogRef) {
            // Material-Dialog => mit Rückgabe
            this.dialogRef.close(updatedMembers);
  
          } else if (this.bottomSheetRef) {
            // BottomSheet => dismiss
            this.bottomSheetRef.dismiss(updatedMembers);
  
          } else {
            // cdkOverlay / Inline => per Output-Events
            this.membersAdded.emit(updatedMembers);
            this.close.emit();
          }
        })
        .catch(err => {
          console.error('Fehler beim Speichern:', err);
        });
  
    } else {
      console.log('Keine neuen Mitglieder ausgewählt');
      // => Keine neuen Member => nur schließen
      if (this.dialogRef) {
        this.dialogRef.close();
      } else if (this.bottomSheetRef) {
        this.bottomSheetRef.dismiss();
      } else {
        // cdkOverlay => Output-Events
        this.close.emit();
      }
    }
  }
  





   









  // Optional: Nested Dialog
  openMembersDialog(): void {
    // Nested => selectedMembers
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
    // => cdkOverlay vs. MaterialDialog
    if (this.dialogRef) {
      this.dialogRef.close();
    } else {
      this.close.emit();
    }

  }
}

