import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Firestore,
  collection,
  addDoc,
} from '@angular/fire/firestore';
import { NgForm, FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { PrivacyComponent } from '../privacy/privacy.component';
import { Router } from '@angular/router';
import { Auth, createUserWithEmailAndPassword } from '@angular/fire/auth';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    HeaderComponent,
    FooterComponent,
    CommonModule,
    FormsModule,
    PrivacyComponent,
    RouterLink,
  ],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss'],
})
export class SignupComponent implements OnInit {
  nameFilled = false;
  emailFilled = false;
  passwordFilled = false;
  isChecked = false;
  filledStates: { [key: string]: boolean } = {};
  errorMessage: string = '';
  successMessage: string = '';
  emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private router: Router
  ) {}
  ngOnInit(): void {}

  user: { name: string; email: string; password: string } = {
    name: '',
    email: '',
    password: '',
  };
  isValidEmail(email: string): boolean {
    return this.emailPattern.test(email);
  }

  onInputChange(event: Event, type: string) {
    const target = event.target as HTMLInputElement;
    this.filledStates[type + 'Filled'] = Boolean(target.value);
    this.errorMessage = '';
    this.successMessage = '';
  }

  updateFilledState(type: string, value: string) {
    this.filledStates[type + 'Filled'] = value !== '';
  }

  toggleCheckbox() {
    this.isChecked = !this.isChecked;
  }

  async onSubmit(signupForm: NgForm) {
    this.errorMessage = '';
    this.successMessage = '';
    if (!signupForm.form.valid) {
      this.errorMessage = 'Bitte füllen Sie alle Felder aus.';
      return;
    }

    if (window.innerWidth >= 780 && !this.isChecked) {
      this.errorMessage = 'Bitte stimmen Sie der Datenschutzerklärung zu.';
      return;
    }

    if (!this.isValidEmail(this.user.email)) {
      this.errorMessage = 'Bitte geben Sie eine gültige E-Mail-Adresse ein.';
      return;
    }

    if (this.user.password.length < 6) {
      this.errorMessage = 'Das Passwort muss mindestens 6 Zeichen lang sein.';
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        this.user.email,
        this.user.password
      );
      const user = userCredential.user;

      // Benutzerinformationen in Firestore speichern
      const userData = {
        uid: user.uid,
        email: this.user.email,
        name: this.user.name,
        timestamp: new Date(),
      };

      await this.saveUser(userData);

      this.successMessage = 'Registrierung erfolgreich!';
      setTimeout(() => {
        this.successMessage = '';
        this.router.navigate(['/login']);
      }, 2000);
    } catch (error) {
      console.error('Fehler bei der Registrierung:', error);
      this.errorMessage =
        'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.';
    }

    signupForm.resetForm();
  }

  async saveUser(user: {
    uid: string;
    email: string;
    name: string;
    timestamp: Date;
  }): Promise<void> {
    try {
      const userRef = await addDoc(collection(this.firestore, 'users'), user);
      console.log('Benutzer erfolgreich gespeichert mit ID: ', userRef.id);
    } catch (e) {
      console.error('Fehler beim Speichern des Benutzers: ', e);
    }
  }
}
