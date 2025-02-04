
import { Component, OnInit } from '@angular/core';
import { getAuth, isSignInWithEmailLink, signInWithEmailLink, updateEmail } from "firebase/auth";
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../header/header.component';
import { RouterModule } from '@angular/router';
import { FooterComponent } from '../footer/footer.component';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule,FormsModule,HeaderComponent,RouterModule,FooterComponent],
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.scss']
})
export class VerifyEmailComponent implements OnInit {
  editableUserEmail: string = '';
  email: string | null = null;
  successMessage: string = '';
  errorMessage: string = '';

  constructor(private router: Router) {}

  async ngOnInit() {
    const auth = getAuth();
    const storedEmail = localStorage.getItem('newEmail');
    this.email = storedEmail;

    // Überprüfen, ob der Link gültig ist
    if (isSignInWithEmailLink(auth, window.location.href)) {
      if (storedEmail) {
        try {
          await signInWithEmailLink(auth, storedEmail, window.location.href);
          this.successMessage = 'E-Mail erfolgreich verifiziert.';

          // E-Mail in Firebase aktualisieren
          const user = auth.currentUser;
          if (user) {
            await updateEmail(user, storedEmail);
            console.log('E-Mail-Adresse erfolgreich geändert');

            // Entferne die E-Mail aus dem localStorage nach dem Update
            localStorage.removeItem('newEmail');

            // Weiterleitung zur Chat-Seite
            this.router.navigate(['/chat']);
          }
        } catch (error) {
          this.errorMessage = 'Fehler bei der Verifizierung der E-Mail.';
          console.error(error);
        }
      }
    } else {
      this.errorMessage = 'Ungültiger Verifizierungslink.';
    }
  }

  // Diese Methode wird ausgelöst, wenn der Benutzer das Formular abschickt
  async onSubmit() {
    const auth = getAuth();

    // Verifiziere die E-Mail-Adresse mit dem E-Mail-Link
    if (isSignInWithEmailLink(auth, window.location.href)) {
      try {
        // E-Mail mit dem Bestätigungslink verifizieren
        await signInWithEmailLink(auth, this.editableUserEmail, window.location.href);
        this.successMessage = 'E-Mail erfolgreich verifiziert.';

        // E-Mail in Firebase aktualisieren
        const user = auth.currentUser;
        if (user) {
          await updateEmail(user, this.editableUserEmail);
          console.log('E-Mail-Adresse erfolgreich geändert');

          // Entferne die E-Mail aus dem localStorage
          localStorage.removeItem('newEmail');

          // Weiterleitung zur Chat-Seite
          this.router.navigate(['/chat']);
        }
      } catch (error) {
        this.errorMessage = 'Fehler bei der Verifizierung der E-Mail.';
        console.error(error);
      }
    }
  }
}






