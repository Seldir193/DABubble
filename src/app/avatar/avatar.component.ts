import { Component, OnInit } from '@angular/core';
import { Firestore, updateDoc } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { getAuth } from '@angular/fire/auth';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { PrivacyComponent } from '../privacy/privacy.component';
import { query, where, getDocs, collection } from '@angular/fire/firestore';

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [
    HeaderComponent,
    FooterComponent,
    CommonModule,
    FormsModule,
    PrivacyComponent,
    RouterLink,
  ],
  templateUrl: './avatar.component.html',
  styleUrls: ['./avatar.component.scss'],
})
export class AvatarComponent implements OnInit {
  avatars: string[] = [
    'assets/img/elise.png',
    'assets/img/elias.png',
    'assets/img/frederik.png',
    'assets/img/steffen.png',
    'assets/img/sofia.png',
    'assets/img/noah.png',
  ];

  selectedAvatar: string | null = null;
  errorMessage: string = '';
  userName: string = 'User';
  userAvatarUrl: string = 'assets/img/avatar.png';

  constructor(private firestore: Firestore, private router: Router) {}

  ngOnInit(): void {
    this.loadUserData();
  }

  async loadUserData() {
    const auth = getAuth();
    const user = auth.currentUser;

    if (user && user.email) {
      const usersCollection = collection(this.firestore, 'users');
      const q = query(usersCollection, where('email', '==', user.email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0].data();
        this.userName = userDoc['name'] || 'User';
        this.userAvatarUrl = userDoc['avatarUrl'] || 'assets/img/avatar.png';
        this.selectedAvatar = this.userAvatarUrl; // Preselect the user's avatar
      }
    } else {
      this.router.navigate(['/login']);
    }
  }

  selectAvatar(avatar: string): void {
    this.selectedAvatar = avatar;
    this.errorMessage = '';

    // Aktualisieren Sie das Firestore-Dokument sofort
    this.confirmSelection();
  }

  validateAndUploadProfilePicture(event: Event): void {
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
      // Maximal 5 MB
      this.errorMessage =
        'Die Datei ist zu groß. Bitte wählen Sie eine Datei, die kleiner als 5 MB ist.';
      return;
    }

    this.errorMessage = ''; // Fehlernachricht zurücksetzen

    const reader = new FileReader();
    reader.onload = () => {
      this.selectedAvatar = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  async confirmSelection(): Promise<void> {
    if (!this.selectedAvatar) {
      this.errorMessage = 'Bitte wählen Sie ein Avatar-Bild aus.';
      return;
    }

    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (user && user.email) {
        const usersCollection = collection(this.firestore, 'users');
        const q = query(usersCollection, where('email', '==', user.email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0].ref;
          await updateDoc(userDoc, {
            avatarUrl: this.selectedAvatar,
            name: this.userName, // Hier auch den Namen aktualisieren
          });
          console.log('Benutzer-Avatar und Name aktualisiert.');

          // Aktualisieren Sie den Benutzernamen und das Avatar-Bild in der Komponente
          this.loadUserData();
        } else {
          this.errorMessage = 'Benutzer nicht gefunden.';
        }
      }
    } catch (error) {
      console.error('Fehler beim Bestätigen der Auswahl:', error);
      this.errorMessage = 'Fehler beim Bestätigen der Auswahl.';
    }
  }
}
