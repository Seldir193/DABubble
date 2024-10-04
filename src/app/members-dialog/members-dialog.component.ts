import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog  } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../user.service'; 
import { OverlayModule } from '@angular/cdk/overlay';
import { SelectedMembersDialogComponent } from '../selected-members-dialog/selected-members-dialog.component';
import { ChannelService } from '../channel.service';

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
  allMembers: any[] = [];

 

  constructor(
    private userService: UserService, 
    private channelService: ChannelService ,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<MembersDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
  }

  ngOnInit(): void {
    //this.loadAllMembers(); // Lade alle Mitglieder, sobald der Dialog geöffnet wird
    this.selectedMembers = this.data.members || [];
   
    this.loadMembers();
    this.loadAllMembers();
  }

  
  loadAllMembers(): void {
    this.userService.getAllUsers().then((members) => {
      this.allMembers = members; // Alle Mitglieder werden geladen
    }).catch((error) => {
      console.error('Fehler beim Laden der Mitglieder:', error);
    });
  }


  loadMembers(): void {
    this.userService.getAllUsers()
      .then((data) => {
        this.members = data.map(member => ({
          ...member,
          userStatus: member.isOnline ? 'Aktiv' : 'Abwesend'
        }));
      })
      .catch((error) => {
        console.error('Fehler beim Laden der Mitglieder:', error);
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

  onCreate(): void {
    if (this.selectedOption === 'all') {
      // Wenn "Alle Mitglieder" ausgewählt ist, füge alle Mitglieder hinzu
      this.selectedMembers = [...this.allMembers];
      console.log('Alle Mitglieder wurden ausgewählt:', this.selectedMembers);
    }
  
    // Schließe den Dialog und übergebe die ausgewählten Mitglieder
    this.dialogRef.close({
      selectedMembers: this.selectedMembers
    });
  
    // Stelle sicher, dass die Mitglieder im Service gespeichert sind.
    this.channelService.setMembers(this.data.channelName, this.selectedMembers);
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


