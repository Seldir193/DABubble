import { Component, Output, EventEmitter } from '@angular/core';
import { UserService } from '../user.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-field',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-field.component.html',
  styleUrls: ['./search-field.component.scss'],
})
export class SearchFieldComponent {
  @Output() close = new EventEmitter<void>();
  @Output() memberSelected = new EventEmitter<any>(); // Event, um das ausgewählte Mitglied zu übergeben
  searchQuery: string = '';
  filteredMembers: any[] = [];
  noResultsFound: boolean = false; // Neues Feld für die Fehlermeldung

  constructor(private userService: UserService) {}

 

  onSearchInput(): void {
    if (this.searchQuery.trim()) {
      this.userService
        .getUsersByFirstLetter(this.searchQuery)
        .then((users) => {
          console.log('Gefundene Benutzer:', users); // Debugging
          this.filteredMembers = users.map(user => ({
            id: user.id || user.uid,
            name: user.name,
            avatarUrl: user.avatarUrl || 'assets/default-avatar.png',
          }));
          this.noResultsFound = users.length === 0;
        })
        .catch(() => {
          console.error('Fehler beim Abrufen der Benutzer.');
          this.filteredMembers = [];
          this.noResultsFound = true;
        });
    } else {
      this.filteredMembers = [];
      this.noResultsFound = false;
    }
  }
  


  selectMember(member: any): void {
    console.log('Mitglied ausgewählt:', member);
    this.memberSelected.emit(member); // Mitglied weitergeben
    this.closeSearch(); // Schließe das Suchfeld nach der Auswahl
  }

  closeSearch(): void {
    this.close.emit();
  }
}
