import { Component, OnInit, Inject, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Angular Material BottomSheet
import { MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';

// Eventuell brauchst du deine Services, etc.
import { UserService } from '../user.service';
import { ChannelService } from '../channel.service';

import { OverlayModule } from '@angular/cdk/overlay';

import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface AddMembersMobileData {
  channelId: string;
  members: any[];
  filteredMembers: any[];
}

@Component({
  selector: 'app-add-members-dialog-mobile',
  standalone: true,
  imports: [CommonModule, FormsModule, OverlayModule],
  templateUrl: './add-members-dialog-mobile.component.html',
  styleUrls: ['./add-members-dialog-mobile.component.scss']
})
export class AddMembersDialogMobileComponent implements OnInit {

  channelId: string = '';
  members: any[] = [];
  filteredMembers: any[] = [];

  // Lokale Variablen für deine Logik
  specificMemberName: string = '';
  selectedMembers: any[] = [];
  allUsers: any[] = [];
  isMembersListVisible = false;

  constructor(
    private userService: UserService,
    private channelService: ChannelService,
    private dialog: MatDialog,
   

    @Optional() public bottomSheetRef?: MatBottomSheetRef<AddMembersDialogMobileComponent>,
    @Optional() @Inject(MAT_BOTTOM_SHEET_DATA) public data?: AddMembersMobileData
  ) {}

  ngOnInit(): void {
    console.log('[AddMembersDialogMobile] ngOnInit => data:', this.data);
    if (this.data) {
      // Übernehme die übergebenen Werte
      this.channelId = this.data.channelId;
      this.members = [...(this.data.members || [])];
      this.filteredMembers = [...(this.data.filteredMembers || [])];
    }

    // Falls du nochmal wirklich Users laden willst:
    if (this.filteredMembers.length === 0) {
      this.loadAllUsers();
    }
  }

  loadAllUsers(): void {
    this.userService.getAllUsers()
      .then(users => {
        this.allUsers = users;
        // Falls keine gefilterten Member vorhanden, Filter anlegen
        if (this.filteredMembers.length === 0) {
          this.filteredMembers = this.allUsers.filter(
            user => !this.members.some(m => m.uid === user.uid)
          );
        }
      })
      .catch(err => console.error('Fehler beim Laden', err));
  }

  onSearchMembers(): void {
    const term = this.specificMemberName.toLowerCase();
    this.filteredMembers = this.allUsers
      .filter(user =>
        user.name.toLowerCase().includes(term) &&
        !this.members.some(m => m.uid === user.uid) &&
        !this.selectedMembers.some(sel => sel.uid === user.uid)
      );
  }




  showAllMembers(): void {
  console.log('showAllMembers() => vorher:', this.filteredMembers);

 console.log('showAllMembers => filteredMembers:', this.filteredMembers);
  this.isMembersListVisible = true;
  
  // Falls allUsers noch leer => brich ab oder lade allUsers
  if (!this.allUsers || this.allUsers.length === 0) {
    console.warn('⚠️ allUsers ist leer, rufe loadAllUsers() auf oder beende');
    return;
  }

  // Filter:
  this.filteredMembers = this.allUsers.filter(user =>
    !this.members.some(m => m.uid === user.uid) &&
    !this.selectedMembers.some(s => s.uid === user.uid)
  );

  console.log('showAllMembers() => nachher:', this.filteredMembers);
}


  hideMembersList(): void {
    console.log('hideMembersList => set isMembersListVisible = false');
    setTimeout(() => {
      this.isMembersListVisible = false;
    }, 200);
  }

  selectMember(user: any): void {
    if (!this.selectedMembers.some(m => m.uid === user.uid)) {
      this.selectedMembers.push(user);
    }
    // Overlay schließen und Input zurücksetzen
    this.specificMemberName = '';
    this.isMembersListVisible = false;
    // Nochmal filtern
    this.filteredMembers = this.filteredMembers.filter(u => u.uid !== user.uid);
  }

  removeMember(user: any): void {
    this.selectedMembers = this.selectedMembers.filter(m => m.uid !== user.uid);
  }

  onCreate(): void {
    // Füge die neuen selectedMembers zur alten members-Liste hinzu:
    const uniqueMembers = this.selectedMembers.filter(
      sel => !this.members.some(m => m.uid === sel.uid)
    );
    if (uniqueMembers.length > 0) {
      const updated = [...this.members, ...uniqueMembers];
      console.log('[AddMembersDialogMobile] Neue Mitglieder:', updated);
      // In Firestore speichern:
      this.channelService.setMembers(this.channelId, updated)
        .then(() => {
          console.log('Erfolgreich gespeichert:', updated);
          // BottomSheet schließen, Rückgabe an Parent
          this.bottomSheetRef?.dismiss(updated);
        })
        .catch(err => console.error('Speichern fehlgeschlagen:', err));
    } else {
      // Keine neuen => einfach schließen
      this.bottomSheetRef?.dismiss();
    }
  }

  onCancel(): void {
    // Nix speichern => nur schließen
    this.bottomSheetRef?.dismiss();
  }
}
