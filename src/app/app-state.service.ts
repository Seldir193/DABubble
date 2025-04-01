import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AppStateService {
  private showWelcomeContainer: boolean = true;  

  getShowWelcomeContainer(): boolean {
    return this.showWelcomeContainer;
  }

  setShowWelcomeContainer(show: boolean): void {
    this.showWelcomeContainer = show;
  }
}

