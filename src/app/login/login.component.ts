import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Firestore,
  query,
  where,
  getDocs,
  collection,
  addDoc,
  updateDoc,
} from '@angular/fire/firestore';
import { NgForm, FormsModule } from '@angular/forms';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { Router } from '@angular/router';
import {
  getAuth,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from '@angular/fire/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, FooterComponent, HeaderComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  emailFilled = false;
  passwordFilled = false;
  filledStates: { [key: string]: boolean } = {};
  errorMessage: string = '';
  email: string = '';
  password: string = '';
  successMessage: string = '';

  constructor(private firestore: Firestore, private router: Router) {}

  ngOnInit(): void {}

  onInputChange(event: Event, type: string) {
    const target = event.target as HTMLInputElement;
    this.filledStates[type + 'Filled'] = Boolean(target.value);
    this.errorMessage = '';
  }

  updateFilledState(type: string, value: string) {
    this.filledStates[type + 'Filled'] = value !== '';
  }

  async onSubmit(loginForm: NgForm) {
    this.errorMessage = '';
    this.successMessage = '';
    if (!this.email || !this.password) {
      this.errorMessage = 'Bitte füllen Sie alle Felder aus.';
      return;
    }

    if (!loginForm.form.valid) {
      this.errorMessage = 'Bitte füllen Sie alle Felder aus.';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'Das Passwort muss mindestens 6 Zeichen lang sein.';
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(this.email)) {
      this.errorMessage = 'Bitte geben Sie eine gültige E-Mail-Adresse ein.';
      return;
    }

    try {
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, this.email, this.password);
      console.log('Benutzer erfolgreich angemeldet');
      this.successMessage = 'Erfolgreich angemeldet!';
      setTimeout(() => {
        this.successMessage = '';
        this.router.navigate(['/avatar']);
      }, 2000);
    } catch (error) {
      console.error('Fehler bei der Anmeldung:', error);
      this.errorMessage = 'Ungültige E-Mail oder Passwort.';
    }
  }

  async signInWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const auth = getAuth();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (user && user.email) {
        console.log('User signed in with Google:', user);
        await this.loadUserData(
          user.email,
          user.displayName || undefined,
          user.photoURL || undefined
        ); // Ensure email, name, and avatar are loaded
        this.router.navigate(['/avatar']);
      } else {
        throw new Error('Google sign-in result does not contain user email.');
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      this.errorMessage = 'Fehler bei der Google-Anmeldung.';
    }
  }

  async loadUserData(
    email: string,
    name: string | undefined = undefined,
    avatarUrl: string | undefined = undefined
  ) {
    try {
      const usersCollection = collection(this.firestore, 'users');
      const q = query(usersCollection, where('email', '==', email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        await this.saveNewUser(email, name, avatarUrl);
        return;
      }

      const userDoc = querySnapshot.docs[0].ref;
      console.log('User data loaded:', querySnapshot.docs[0].data());

      await updateDoc(userDoc, { timestamp: new Date() });
      console.log('User timestamp updated:', email);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  async saveNewUser(
    email: string,
    name: string | undefined = undefined,
    avatarUrl: string | undefined = undefined
  ) {
    try {
      const user = {
        email: email,
        name: name,
        avatarUrl: avatarUrl,
        timestamp: new Date(),
      };
      await addDoc(collection(this.firestore, 'users'), user);
      console.log('New user created:', email);
    } catch (error) {
      console.error('Error creating new user:', error);
    }
  }

  navigateToSignup() {
    this.router.navigate(['/signup']);
  }

  navigateToAvatar() {
    this.router.navigate(['/avatar']);
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
  }

  navigateToGuestLogin() {
    this.router.navigate(['/guest-login']);
  }
}
