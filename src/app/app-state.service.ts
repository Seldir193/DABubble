import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AppStateService {
  private showWelcomeContainer: boolean = true;  // Initialer Zustand: Welcome-Screen anzeigen

  // Getter-Methode für den Zustand
  getShowWelcomeContainer(): boolean {
    return this.showWelcomeContainer;
  }

  // Setter-Methode zum Ändern des Zustands
  setShowWelcomeContainer(show: boolean): void {
    this.showWelcomeContainer = show;
  }
}

