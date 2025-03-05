import { Component, Inject, OnInit, HostListener } from '@angular/core';
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

  isDesktop = false;
  isInputFocused = false;
  

  constructor(
    private userService: UserService, 
    private channelService: ChannelService ,
    private dialog: MatDialog,
    public dialogRef: MatDialogRef<MembersDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
  }

  ngOnInit(): void {
    this.selectedMembers = this.data.members || [];
    this.loadMembers();
    this.loadAllMembers();
  



    this.isDesktop = window.innerWidth >= 1278;
  }

  onFocus() {
    this.isInputFocused = true;
  }

  onBlur() {
    this.isInputFocused = false;
  }
 
  @HostListener('window:resize')
  onResize() {
    // Bei jeder Größenänderung:
    this.isDesktop = window.innerWidth >= 1278;
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

    this.closeDropdown();
   

    if (this.selectedMembers.length > 0) {
      this.enableButton();
    }
  }



  // Optional: Methode, um den Button zu aktivieren, wenn das Input-Feld nicht mehr fokussiert ist
  enableButton(): void {
    this.isButtonDisabled = false;
  }

  

  closeDropdown(): void {
    this.filteredMembers = [];
  }

  openMembersDialog(): void {
    const dialogRef = this.dialog.open(SelectedMembersDialogComponent, {
    
      data: { members: this.selectedMembers },
      
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

    if (this.selectedOption === 'specific' && this.selectedMembers.length === 0) {
      this.disableButton();
    }

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

 

  
  // Methode zum Schließen des Dialogs ohne Aktion
  onCancel(): void {
    this.dialogRef.close();
  }

  closeDialog(): void {
    this.dialogRef.close();
  }











  onRadioChange(): void {
    if (this.selectedOption === 'all') {
      // Sobald "Alle" ausgewählt ist, kannst du den Button direkt aktivieren
      this.enableButton();
    } else if (this.selectedOption === 'specific') {
      // Bei "bestimmte Leute" Button nur aktivieren, wenn schon welche ausgewählt sind
      if (this.selectedMembers.length > 0) {
        this.enableButton();
      } else {
        this.disableButton();
      }
    }
  }

  onFocusInput(): void {
    // Zeige zunächst alle Member
    this.showAllMembers();
  
    // Nur dann deaktivieren, wenn "specific" aktiv und noch keine ausgewählt
    if (this.selectedOption === 'specific' && this.selectedMembers.length === 0) {
      this.disableButton();
    }
  }
  

  
}


