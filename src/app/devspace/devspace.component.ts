
//import { Component } from '@angular/core';


import { Component, EventEmitter, Output } from '@angular/core';



@Component({
  selector: 'app-devspace',
  standalone: true,
  imports: [],
  templateUrl: './devspace.component.html',
  styleUrls: ['./devspace.component.scss']  // korrigiere "styleUrl" zu "styleUrls"
})
export class DevspaceComponent {

  
  @Output() searchTriggered = new EventEmitter<string>();

  onEditSquareClick(): void {
    const searchQuery = ''; // Optional: Initialisiere mit einem leeren Wert oder einem Beispielwert wie 'J'
    this.searchTriggered.emit(searchQuery); // Löst das Event aus und übergibt den Suchwert
    console.log('Edit square clicked, search triggered with query:', searchQuery);
  }
 
 
}
