import { Component,OnInit,HostListener, ElementRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { getAuth, onAuthStateChanged ,signOut } from '@angular/fire/auth';
import { Firestore, collection, query, where, getDocs } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chat-header',
  standalone: true,
  imports: [CommonModule,FormsModule],
  templateUrl: './chat-header.component.html',
  styleUrl: './chat-header.component.scss'
})
export class ChatHeaderComponent  implements OnInit{
  menuOpen = false;
  userName: string = 'Selcuk';
  userAvatar: string = 'assets/img/avatar.png'; 
  userEmail = 'selcuk.@outlook.de';
  //userAvatarUrl = 'assets/img/avatar.png';
  //userStatus = 'Aktive';
  profileOpen = false; 
 
  isEditingProfile = false; // Status für den Bearbeitungsmodus

  userStatus: string = 'Aktiv'; // Standardstatus
  inactivityTimeout: any; // Variable für den Inaktivitäts-Time

  editableUserName = this.userName;
  editableUserEmail = this.userEmail;

  
  //inputStates: { [key: string]: boolean } = {};

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


  constructor(private router: Router,private firestore: Firestore,private elementRef: ElementRef) {}

  ngOnInit(): void {
    this.listenForAuthChanges();
    this.resetInactivityTimer();
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
  }


  saveProfileChanges(): void {
    if (this.isValidEmail(this.editableUserEmail)) {
      this.userName = this.editableUserName;
      this.userEmail = this.editableUserEmail;
      this.isEditingProfile = false;
      this.resetInputBorders();
    } else {
      alert('Bitte geben Sie eine gültige E-Mail-Adresse ein.');
    }
  }
  
  isValidEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  }
  

  // Bricht die Bearbeitung ab und zeigt die normale Ansicht
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
 

  listenForAuthChanges() {
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      if (user) {
        // Der Benutzer ist authentifiziert
        this.loadUserData(user.email!);
      } else {
        // Kein Benutzer authentifiziert
        this.userName = 'Guest';
        this.userAvatar = 'assets/img/avatar.png';
      }
    });
  }

  async loadUserData(email: string) {
    const usersCollection = collection(this.firestore, 'users');
    const q = query(usersCollection, where('email', '==', email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0].data();
      this.userName = userDoc['name'] || 'User';
      this.userAvatar = userDoc['avatarUrl'] || 'assets/img/avatar.png';
    } else {
      console.log('Benutzer nicht gefunden.');
    }
  }

  logout() {
    const auth = getAuth();
    signOut(auth).then(() => {
      // Benutzer wurde erfolgreich abgemeldet
      console.log('User logged out');
      // Nach dem Logout zur Login-Seite weiterleiten
      this.router.navigate(['/login']);
    }).catch((error) => {
      // Bei einem Fehler während des Logouts
      console.error('Logout failed', error);
    });
  }
}




