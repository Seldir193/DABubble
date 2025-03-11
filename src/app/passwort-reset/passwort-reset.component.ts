import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router } from '@angular/router';
import { Auth, sendPasswordResetEmail } from '@angular/fire/auth';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';

import { RouterModule } from '@angular/router';
import {
  Firestore,
  query,
  where,
  getDocs,
  collection,
} from '@angular/fire/firestore';

@Component({
  selector: 'app-passwort-reset',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HeaderComponent,
    FooterComponent,
    RouterModule,
  ],
  templateUrl: './passwort-reset.component.html',
  styleUrls: ['./passwort-reset.component.scss'],
})
export class PasswortResetComponent implements OnInit {
  resetPasswordForm: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';
  filledStates: { [key: string]: boolean } = {};
  emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  isSmallScreen: boolean = window.innerWidth < 780;

  constructor(
    private firestore: Firestore,
    private auth: Auth,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.resetPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  ngOnInit(): void {}

  emailValidator(control: AbstractControl): ValidationErrors | null {
    const email = control.value;
    if (!this.emailPattern.test(email)) {
      return { invalidEmail: true };
    }
    return null;
  }

  async checkEmailExists(email: string): Promise<boolean> {
    const usersCollection = collection(this.firestore, 'users');
    const q = query(usersCollection, where('email', '==', email));
    const querySnapshot = await getDocs(q);

    return !querySnapshot.empty;
  }

  onFocus(field: string) {
    this.filledStates[field + 'Filled'] = true;

    if (field === 'email') {
      this.errorMessage = '';
      this.successMessage = '';
    }
  }

  onBlur(field: string) {
    this.filledStates[field + 'Filled'] = Boolean(
      this.resetPasswordForm.get(field)?.value
    );
  }

  async resetPassword(email: string, actionCodeSettings: any): Promise<void> {
    try {
      await sendPasswordResetEmail(this.auth, email, actionCodeSettings);
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }

  async onSubmit() {
    if (this.resetPasswordForm.valid) {
      const email = this.resetPasswordForm.value.email;

      const emailExists = await this.checkEmailExists(email);
      if (!emailExists) {
        this.errorMessage = 'Diese E-Mail-Adresse ist nicht registriert.';
        return;
      }

      const actionCodeSettings = {
        url: 'http://localhost:4200/new-passwort', 
        handleCodeInApp: true,
      };

      
      try {
        await this.resetPassword(email, actionCodeSettings);
        this.successMessage = 'E-Mail gesendet';
        this.errorMessage = '';
        setTimeout(() => {
          this.successMessage = '';
          this.router.navigate(['/new-passwort']);
        }, 3000);
      } catch (error: any) {
        console.error('Fehler beim Zurücksetzen des Passworts:', error);
        this.successMessage = '';
        this.errorMessage = error.message;
      }
    }
  }

  getErrorMessage(error: any): string {
    switch (error.code) {
      case 'auth/invalid-email':
        return 'Die angegebene E-Mail-Adresse ist ungültig.';
      case 'auth/user-not-found':
        return 'Es gibt keinen Benutzer mit dieser E-Mail-Adresse.';
      default:
        return 'Ein unbekannter Fehler ist aufgetreten.';
    }
  }
}