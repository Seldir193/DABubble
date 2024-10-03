import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserService } from '../user.service';
import { onSnapshot, doc, updateDoc, Firestore, collection } from '@angular/fire/firestore';
import { getAuth, onAuthStateChanged } from '@angular/fire/auth';

@Component({
  selector: 'app-direct-messages',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './direct-messages.component.html',
  styleUrl: './direct-messages.component.scss'
})

export class DirectMessagesComponent implements OnInit {
  members: any[] = [];
  isChannelsVisible: boolean = false;
  inactivityTimeout: any;
  currentUserStatus: string = 'Abwesend';

  userIsActive: boolean = true;

  constructor(private userService: UserService, private router: Router,private firestore: Firestore)
   {}

  ngOnInit(): void {
    this.loadMembers();
    this.listenForAuthChanges(); // Authentifizierungsänderungen überwachen
    this.loadMembersInRealtime(); // Lade die Mitgliederliste in Echtzeit
    this.resetInactivityTimer();
  }

  loadMembers(): void {
    // Nehme an, du verwendest Firestore oder eine API, um den Benutzerstatus zu laden
    this.userService.getAllUsers()
      .then((data) => {
        // Der Online-Status wird aus der Datenbank geholt (z. B. Firestore)
        this.members = data.map(member => ({
          ...member,
          userStatus: member.isOnline ? 'Aktiv' : 'Abwesend'  // Setze Status basierend auf Daten
        }));
        
        console.log('Mitglieder geladen:', this.members);
      })
      .catch((error) => {
        console.error('Fehler beim Laden der Mitglieder:', error);
      });
  }

    // Setzt den Benutzer auf "aktiv" und startet den Inaktivitäts-Timer neu
    resetInactivityTimer(): void {
      const auth = getAuth();
      const currentUser = auth.currentUser;
  
      if (currentUser) {
        const userDocRef = doc(this.firestore, 'users', currentUser.uid);
  
        // Überprüfe, ob der Benutzer aktuell inaktiv ist
        if (!this.userIsActive) {
          // Setze den Benutzerstatus nur auf "aktiv", wenn er aktuell als inaktiv gilt
          this.userIsActive = true;
          updateDoc(userDocRef, { isOnline: true })
            .then(() => {
              console.log('Benutzer ist wieder aktiv.');
            })
            .catch((error) => {
              console.error('Fehler beim Aktualisieren des Aktiv-Status:', error);
            });
        }
      }
  
      // Lösche den bestehenden Timer
      if (this.inactivityTimeout) {
        clearTimeout(this.inactivityTimeout);
      }
  
      // Starte einen neuen Timer für 5 Minuten (300000 ms)
      this.inactivityTimeout = setTimeout(() => {
        this.setUserAsInactive();
      }, 5000); // 5 Minuten Inaktivität
    }
  
    // Setzt den Benutzer auf "inaktiv"
    async setUserAsInactive(): Promise<void> {
      const auth = getAuth();
      const currentUser = auth.currentUser;
  
      if (currentUser && this.userIsActive) {
        const userDocRef = doc(this.firestore, 'users', currentUser.uid);
  
        // Setze den Benutzer nur auf "inaktiv", wenn er aktuell als aktiv gilt
        this.userIsActive = false;
        await updateDoc(userDocRef, { isOnline: false });
        console.log('Benutzer ist jetzt inaktiv/abwesend.');
      }
    }


// Überwache Maus- und Tastaturaktivitäten, um den Timer zurückzusetzen
@HostListener('document:mousemove')
@HostListener('document:keydown')
handleUserActivity(): void {
  this.resetInactivityTimer();  // Setze den Timer bei jeder Aktivität zurück
}

  toggleChannels(): void {
    this.isChannelsVisible = !this.isChannelsVisible;
  }

  openDirectMessage(member: any): void {
    console.log('Öffne Direktnachricht mit:', member);
  }

  loadMembersInRealtime(): void {
    const membersCollectionRef = collection(this.firestore, 'users');
  
    // Echtzeit-Listener, um Änderungen am Benutzerstatus live zu verfolgen
    onSnapshot(membersCollectionRef, (snapshot) => {
      this.members = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,  // Wichtig: ID für jedes Mitglied hinzufügen
        userStatus: doc.data()['isOnline'] ? 'Aktiv' : 'Abwesend' // Zugriff auf isOnline mit ['isOnline']
      }));
  
      console.log('Echtzeit-Status-Update:', this.members);
    });
  }
  
  // Überwache den Authentifizierungsstatus
  listenForAuthChanges(): void {
    const auth = getAuth();

    onAuthStateChanged(auth, async (user) => {
      if (user && user.uid) {
        const userDocRef = doc(this.firestore, 'users', user.uid);
        
        // Benutzer ist online, setze isOnline auf true
        await updateDoc(userDocRef, { isOnline: true });
        this.resetInactivityTimer();
        console.log('Benutzer ist online:', user.email);
      } else {
        // Benutzer ist abgemeldet, setze isOnline auf false
        const currentUser = auth.currentUser;
        if (currentUser) {
          const userDocRef = doc(this.firestore, 'users', currentUser.uid);
          await updateDoc(userDocRef, { isOnline: false });
          console.log('Benutzer ist abgemeldet.');
        }
      }
    });
  }
}


