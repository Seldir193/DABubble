import { Component,OnInit,HostListener, ViewChild,ElementRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { getAuth, onAuthStateChanged ,signOut,updateEmail,reauthenticateWithCredential,EmailAuthProvider,sendSignInLinkToEmail} from '@angular/fire/auth';
import { Firestore,doc,updateDoc } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { UserService } from '../user.service'; // Pfad ggf. anpassen



@Component({
  selector: 'app-chat-header',
  standalone: true,
  imports: [CommonModule,FormsModule],
  templateUrl: './chat-header.component.html',
  styleUrl: './chat-header.component.scss'
})
export class ChatHeaderComponent  implements OnInit{
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  menuOpen = false;
  userName: string = '';
  profileOpen = false; 
  //isEditingProfile = false; // Status für den Bearbeitungsmodus
  userStatus: string = 'Aktiv'; // Standardstatus
  inactivityTimeout: any; // Variable für den Inaktivitäts-Time
  editableUserName: string = '';
  editableUserEmail: string = '';
  errorMessage: string = '';
  successMessage: string = '';
  userAvatarUrl: string = 'assets/img/avatar.png';
  userEmail: string = '';
  isEditingProfile: boolean = false;

  inputStates: { [key: string]: boolean } = {
    name: false,
    email: false
  };

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const clickedInsideMenu = this.elementRef.nativeElement.querySelector('.menu-dropdown')?.contains(event.target);
    const clickedInsideProfile = this.elementRef.nativeElement.querySelector('.profile-card-container')?.contains(event.target);

    // Wenn außerhalb des Menüs und der Profilkarte geklickt wird, schließen
    if (!clickedInsideMenu && !clickedInsideProfile) {
      this.closeMenu();
      this.closeProfileCard();
    }
  }

  @HostListener('document:mousemove') onMouseMove() {
    this.resetInactivityTimer();
  }

  @HostListener('document:keydown') onKeyDown() {
    this.resetInactivityTimer();
  }

  constructor(private router: Router,private firestore: Firestore,private elementRef: ElementRef,private userService: UserService) {}

  ngOnInit(): void {
    this.listenForAuthChanges();
    this.resetInactivityTimer();
    this.loadUserData();

  }

  onAvatarClick(): void {
    this.fileInput.nativeElement.click();
  }
  // Methode zum Zurücksetzen des Inaktivitäts-Timers
  resetInactivityTimer() {
    // Falls bereits ein Timeout läuft, lösche es
    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout);
    }

    // Setze den Benutzerstatus wieder auf 'Aktiv'
    this.userStatus = 'Aktiv';

    // Starte einen neuen Timer für 10 Minuten (600000 ms)
    this.inactivityTimeout = setTimeout(() => {
      this.userStatus = 'Abwesend'; // Status auf 'Abwesend' setzen nach 10 Minuten
    },600000); // 10 Minuten (600000 Millisekunden)
  }

  onInputFocus(inputId: string) {
    console.log(`Fokus auf Eingabefeld: ${inputId}`);
    this.inputStates[inputId] = true;
  }
  
  onInputBlur(inputId: string, inputValue: string) {
    console.log(`Fokus verlassen von: ${inputId}, Wert: ${inputValue}`);
    if (inputValue.trim() === '') {
      this.inputStates[inputId] = false;
    } else {
      this.inputStates[inputId] = true;
    }
  }

  stopPropagation(event: Event) {
    event.stopPropagation();
  }
  
  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu() {
    this.menuOpen = false;
  }

  logoutAndCloseMenu() {
    this.closeMenu();
    this.logout();
  }

  openProfileCard() {
   this.profileOpen = true;
   this.isEditingProfile = false;
  }

  closeProfileCard() {
    this.profileOpen = false;
  }

  openSettingCard(){
    this.isEditingProfile = true;

    this.editableUserName = this.userName;
    this.editableUserEmail = this.userEmail;
  }

  isValidEmail(email: string): boolean {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  }

  async saveProfileChanges(): Promise<void> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
  
      if (!user) {
        throw new Error('Kein Benutzer angemeldet.');
      }
  
      // Prüfen, ob der Name geändert wurde
      if (this.editableUserName && this.editableUserName !== this.userName) {
        await this.userService.updateUserName(this.editableUserName);
        this.userName = this.editableUserName;
      }
  
      // Prüfen, ob die E-Mail geändert wurde
      if (this.editableUserEmail && this.editableUserEmail !== this.userEmail) {
        if (!this.isValidEmail(this.editableUserEmail)) {
          this.errorMessage = 'Bitte geben Sie eine gültige E-Mail-Adresse ein.';
          return;
        }
  
        const password = prompt('Bitte geben Sie Ihr Passwort ein, um die E-Mail zu ändern:');
        
        if (password) {
          try {
            // Reauthentifizierung mit dem aktuellen Passwort
            const credential = EmailAuthProvider.credential(user.email!, password);
            await reauthenticateWithCredential(user, credential);
  
            // **Hier die E-Mail in Firebase aktualisieren**
            await updateEmail(user, this.editableUserEmail);
            console.log('E-Mail-Adresse erfolgreich geändert');
  
            // **Schritt 4: E-Mail in Firestore aktualisieren**
            await this.userService.updateUserEmail(this.editableUserEmail); // Firestore-E-Mail aktualisieren
  
            // Speichere die neue E-Mail im localStorage
            localStorage.setItem('newEmail', this.editableUserEmail);
  
            this.successMessage = 'Ihre E-Mail-Adresse wurde erfolgreich geändert.';
          } catch (error) {
            console.error('Fehler bei der Reauthentifizierung oder der E-Mail-Änderung:', error);
            this.errorMessage = 'Fehler bei der Änderung der E-Mail. Bitte versuchen Sie es erneut.';
          }
        } else {
          this.errorMessage = 'Passwort erforderlich, um die E-Mail zu ändern.';
        }
      }
    } catch (error: any) {
      console.error('Fehler beim Speichern der Profiländerungen:', error);
      this.errorMessage = error.message || 'Fehler beim Speichern der Profiländerungen.';
    }
  }
  
  cancelEditing() {
    this.isEditingProfile = false;
    this.editableUserName = this.userName;
    this.editableUserEmail = this.userEmail;
    this.resetInputBorders();
  }

resetInputBorders() {
    this.inputStates = {
      'name': false,
      'email': false
    };
  }

  async loadUserData() {
    try {
      const userData = await this.userService.getCurrentUserData();
      this.userName = userData.name;
      this.userEmail = userData.email;
      this.userAvatarUrl = userData.avatarUrl;
    } catch (error: any) {
      console.error('Fehler beim Laden der Benutzerdaten:', error);
      this.errorMessage = error.message || 'Fehler beim Laden der Benutzerdaten.';
    }
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files ? input.files[0] : null;
  
    if (!file) {
      this.errorMessage = 'Keine Datei ausgewählt.';
      return;
    }
  
    if (!file.type.startsWith('image/')) {
      this.errorMessage = 'Bitte wählen Sie eine Bilddatei aus.';
      return;
    }
  
    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage = 'Die Datei ist zu groß. Bitte wählen Sie eine Datei, die kleiner als 5 MB ist.';
      return;
    }
  
    this.errorMessage = '';
  
    const reader = new FileReader();
    reader.onload = async () => {
      const imageDataUrl = reader.result as string;
      try {
        // Aktualisiere die Avatar-URL in Firestore
        await this.userService.updateUserAvatar(imageDataUrl);
        this.userAvatarUrl = imageDataUrl;
        this.successMessage = 'Profilbild erfolgreich aktualisiert!';
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      } catch (error: any) {
        console.error('Fehler beim Aktualisieren des Profilbildes:', error);
        this.errorMessage = error.message || 'Fehler beim Aktualisieren des Profilbildes.';
      }
    };
    reader.readAsDataURL(file);
  }
  
  listenForAuthChanges() {
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      if (user) {
        // Der Benutzer ist authentifiziert
        this.loadUserData();
      } else {
        // Kein Benutzer authentifiziert
        this.userName = 'Guest';
        this.userAvatarUrl = 'assets/img/avatar.png';
      }
    }, (error) => {
      console.error('Fehler bei der Authentifizierung:', error);
      this.errorMessage = 'Fehler bei der Überprüfung des Authentifizierungsstatus.';
    });
  }
  
  async logout() {
    const auth = getAuth();
    const user = auth.currentUser; // Speichere den Benutzer vor dem Abmelden
  
    if (user) {
      try {
        const userDocRef = doc(this.firestore, 'users', user.uid);
  
        // Setze den Benutzer auf offline, bevor du ihn abmeldest
        await updateDoc(userDocRef, { isOnline: false });
  
        // Benutzer abmelden
        await signOut(auth);
        console.log('Benutzer wurde erfolgreich abgemeldet und als offline markiert.');
  
        // Weiterleitung zur Login-Seite oder eine andere Seite
        this.router.navigate(['/login']);
        
      } catch (error) {
        console.error('Fehler beim Abmelden oder beim Setzen des Offline-Status:', error);
      }
    } else {
      console.error('Kein Benutzer angemeldet.');
    }
  }

}




















