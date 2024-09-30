
import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog  } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../user.service'; 
import { OverlayModule } from '@angular/cdk/overlay';
import { SelectedMembersDialogComponent } from '../selected-members-dialog/selected-members-dialog.component';

@Component({
  selector: 'app-mitglieder-dialog',
  standalone: true,
  imports: [CommonModule,FormsModule,OverlayModule],
  templateUrl: './members-dialog.component.html',
  styleUrl: './members-dialog.component.scss'
})
export class MembersDialogComponent implements OnInit {
  selectedOption: string = 'all'; 
  specificMemberName: string = '';
  isButtonDisabled: boolean = false;
  members: any[] = []; // Alle Mitglieder
  filteredMembers: any[] = []; // Gefilterte Mitglieder basierend auf der Suche

  selectedMembers: any[] = []; 

  constructor(
    private userService: UserService, 
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<MembersDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
   
  }

  ngOnInit(): void {
    this.loadAllMembers(); // Lade alle Mitglieder, sobald der Dialog geöffnet wird
    this.selectedMembers = this.data.members || [];
  }

  loadAllMembers(): void {
    this.userService.getAllUsers().then((users) => {
      this.members = users;
    }).catch((error) => {
      console.error('Fehler beim Abrufen der Benutzer:', error);
    });
  }

  onSearchMembers(): void {
    if (this.specificMemberName) {
      const searchTerm = this.specificMemberName.toLowerCase();
      // Filtere die Mitgliederliste basierend auf dem eingegebenen Namen
      this.filteredMembers = this.members.filter(member =>
        member.name.toLowerCase().includes(searchTerm)
      );
    } else {
      this.filteredMembers = []; // Leere Liste, wenn kein Suchbegriff vorhanden ist
    }
  }


  selectMember(member: any): void {
    if (!this.selectedMembers.includes(member)) {
      this.selectedMembers.push(member);
    }
    this.filteredMembers = [];  // Dropdown verstecken
    this.specificMemberName = '';  // Input leeren
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
  
  


  removeMember(member: any): void {
    // Überprüfe, ob das Mitglied in der Liste ist, und entferne es
    this.selectedMembers = this.selectedMembers.filter(m => m !== member);
  }
  

  showAllMembers(): void {
    this.filteredMembers = [...this.members]; // Zeige alle Mitglieder anfangs an
  }


  onCreate() {
    if (this.selectedOption === 'all') {
      // Logik für "Alle Mitglieder hinzufügen"
    } else if (this.selectedOption === 'specific' && this.specificMemberName) {
      // Logik für "Bestimmte Mitglieder hinzufügen"
      console.log('Mitglied hinzufügen:', this.specificMemberName);
    }
    if (!this.isButtonDisabled) {
      // Logik für das Erstellen eines Kanals
      console.log('Erstellen Button geklickt.');
      this.dialogRef.close();
    }
  }

  disableButton(): void {
    this.isButtonDisabled = true;
  }

  // Optional: Methode, um den Button zu aktivieren, wenn das Input-Feld nicht mehr fokussiert ist
  enableButton(): void {
    this.isButtonDisabled = false;
  }


  // Methode zum Schließen des Dialogs ohne Aktion
  onCancel(): void {
    this.dialogRef.close();
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}
