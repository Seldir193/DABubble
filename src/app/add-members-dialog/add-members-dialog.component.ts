import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../user.service'; 
import { OverlayModule } from '@angular/cdk/overlay';
import { SelectedMembersDialogComponent } from '../selected-members-dialog/selected-members-dialog.component';
import { ChannelService } from '../channel.service';

@Component({
  selector: 'app-add-members-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, OverlayModule],
  templateUrl: './add-members-dialog.component.html',
  styleUrls: ['./add-members-dialog.component.scss']
})
export class AddMembersDialogComponent implements OnInit {
  specificMemberName: string = ''; // Eingabefeld wird geleert
  members: any[] = []; // Alle Mitglieder
  filteredMembers: any[] = []; // Gefilterte Mitglieder basierend auf der Suche
  selectedMembers: any[] = []; 
  existingMembers: any[] = []; // Bereits vorhandene Mitglieder aus Entwicklerteam/MemberList
  isMembersListVisible: boolean = false; // Zeigt an, ob die Liste der Mitglieder sichtbar ist
  isButtonDisabled: boolean = false;

  constructor(
    private userService: UserService, 
    private channelService: ChannelService,
    private dialog: MatDialog,

    public dialogRef: MatDialogRef<AddMembersDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any // Übergebe bestehende Mitglieder als `data`
  ) {}

  ngOnInit(): void {
    
    console.log('Mitglieder im Dialog:', this.data.members);
    this.specificMemberName = ''; // Leere das Eingabefeld beim Öffnen
    this.existingMembers = this.data.members || []; // Lade bereits vorhandene Mitglieder (Entwicklerteam + MemberList)
    this.loadMembers();
  }

  // Lade alle Mitglieder und filtere diejenigen heraus, die bereits ausgewählt oder in den bestehenden Listen vorhanden sind
  loadMembers(): void {
    this.userService.getAllUsers()
      .then((data) => {
        this.members = data.map(member => ({
          ...member,
          userStatus: member.isOnline ? 'Aktiv' : 'Abwesend'
        }));
        this.filterAlreadySelectedMembers(); // Filtere Mitglieder, die bereits vorhanden sind
      })
      .catch((error) => {
        console.error('Fehler beim Laden der Mitglieder:', error);
      });
  }

  // Filtere die Mitglieder, die bereits in Entwicklerteam oder MemberList vorhanden sind
  filterAlreadySelectedMembers(): void {
    this.filteredMembers = this.members.filter(member => 
      !this.existingMembers.some(existing => existing.name === member.name) && 
      !this.selectedMembers.some(selected => selected.name === member.name)
    );
  }

  disableButton(): void {
    this.isButtonDisabled = true;
  }

  // Optional: Methode, um den Button zu aktivieren, wenn das Input-Feld nicht mehr fokussiert ist
  enableButton(): void {
    this.isButtonDisabled = false;
  }

  // Zeige Mitglieder, die noch nicht ausgewählt oder bereits vorhanden sind
  showAllMembers(): void {
    this.isMembersListVisible = true;
    this.filterAlreadySelectedMembers(); // Filtere die Liste erneut, falls neue Mitglieder hinzugefügt wurden
  }

  // Verstecke die Liste, wenn das Input-Feld verlassen wird
  hideMembersList(): void {
    setTimeout(() => {
      this.isMembersListVisible = false;
    }, 200); // Timeout, um Klicks auf Mitglieder zu erlauben
  }

  // Suche nach Mitgliedern und filtere diejenigen heraus, die bereits in Entwicklerteam oder MemberList sind
  onSearchMembers(): void {
    if (this.specificMemberName) {
      const searchTerm = this.specificMemberName.toLowerCase();
      this.filteredMembers = this.members
        .filter(member => 
          member.name.toLowerCase().includes(searchTerm) && 
          !this.existingMembers.some(existing => existing.name === member.name) && 
          !this.selectedMembers.some(selected => selected.name === member.name)
        );
    } else {
      this.filterAlreadySelectedMembers(); // Filtere nur nicht hinzugefügte Mitglieder
    }
  }

  // Füge ein Mitglied zur Liste hinzu, wenn es noch nicht in Entwicklerteam/MemberList ist
  selectMember(member: any): void {
    if (!this.selectedMembers.some(selected => selected.name === member.name)) {
      this.selectedMembers.push(member);
    }

    this.filterAlreadySelectedMembers(); // Aktualisiere die gefilterte Liste
    this.specificMemberName = '';  // Leere das Eingabefeld nach Auswahl
    this.isMembersListVisible = false; // Verstecke die Mitgliederliste
  }


  // Entferne ein Mitglied aus der Liste
  removeMember(member: any): void {
    this.selectedMembers = this.selectedMembers.filter(m => m !== member);
    this.filterAlreadySelectedMembers(); // Aktualisiere die gefilterte Liste nach dem Entfernen
  }



  onCreate(): void {
    console.log('Mitglieder vor dem Speichern:', this.selectedMembers);
  
    const uniqueMembers = this.selectedMembers.filter(member =>
      !this.data.members.some((m: any) => m.name === member.name)
    );
  
    if (uniqueMembers.length > 0) {
      console.log('Neue Mitglieder hinzugefügt:', uniqueMembers);
  
      // Kombiniere die bereits vorhandenen und neu ausgewählten Mitglieder
      const updatedMembers = [...this.data.members, ...uniqueMembers];
  
      // Aktualisiere die Mitglieder im ChannelService und speichere in Firestore
      this.channelService.setMembers(this.data.channelName, updatedMembers)
        .then(() => {
          console.log('Mitglieder erfolgreich gespeichert.');
          
          // Schließe den Dialog und übergebe die aktualisierte Mitgliederliste
          this.dialogRef.close(updatedMembers);  // Stelle sicher, dass die aktualisierte Mitgliederliste zurückgegeben wird
        })
        .catch(error => {
          console.error('Fehler beim Speichern der Mitglieder:', error);
        });
  
    } else {
      console.log('Keine neuen Mitglieder ausgewählt.');
      this.dialogRef.close(null); // Falls keine neuen Mitglieder, Dialog schließen ohne Änderung
    }
  }
  






  
  
  
openMembersDialog(): void {
  const dialogRef = this.dialog.open(SelectedMembersDialogComponent, {
    data: { members: this.selectedMembers }
  });

  dialogRef.afterClosed().subscribe(updatedMembers => {
    if (updatedMembers) {
      this.selectedMembers = updatedMembers; // Aktualisiere die Liste mit den ausgewählten Mitgliedern
    }
  });
}

onCancel(): void {
  this.dialogRef.close(); // Schließt den Dialog, wenn die Methode aufgerufen wird
}
}






