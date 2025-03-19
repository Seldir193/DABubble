/**
 * The PasswortResetComponent provides a form for users to request
 * a password reset email. It verifies that the email exists in
 * Firestore, then uses Firebase Auth to send a reset email. After
 * sending, it navigates the user to a new password screen.
 * No logic or style has been changed — only these JSDoc comments 
 * have been added in English.
 */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors
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
  collection
} from '@angular/fire/firestore';

@Component({
  selector: 'app-passwort-reset',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HeaderComponent,
    FooterComponent,
    RouterModule
  ],
  templateUrl: './passwort-reset.component.html',
  styleUrls: ['./passwort-reset.component.scss']
})
export class PasswortResetComponent implements OnInit {
  /**
   * The reactive form containing the email field.
   */
  resetPasswordForm: FormGroup;

  /**
   * Holds any error message that occurs during the reset process.
   */
  errorMessage: string = '';

  /**
   * Holds a success message once the reset email is sent.
   */
  successMessage: string = '';

  /**
   * Tracks which fields are filled for styling purposes.
   */
  filledStates: { [key: string]: boolean } = {};

  /**
   * A regex pattern for validating emails.
   */
  emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  /**
   * Boolean to determine if the screen width is below 780px (mobile styling).
   */
  isSmallScreen: boolean = window.innerWidth < 780;

  /**
   * @param {Firestore} firestore - Firestore service for database checks.
   * @param {Auth} auth - Firebase Auth service for password reset.
   * @param {Router} router - Angular Router for navigation.
   * @param {FormBuilder} fb - Utility for constructing the reactive form.
   */
  constructor(
    private firestore: Firestore,
    private auth: Auth,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.resetPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  /**
   * Lifecycle hook that currently has no additional logic.
   */
  ngOnInit(): void {}

  /**
   * Validates an email string using a regex pattern.
   *
   * @param {AbstractControl} control - The form control to validate.
   * @returns {ValidationErrors | null} - Error object if invalid, or null if valid.
   */
  emailValidator(control: AbstractControl): ValidationErrors | null {
    const email = control.value;
    if (!this.emailPattern.test(email)) {
      return { invalidEmail: true };
    }
    return null;
  }

  /**
   * Checks Firestore to see if the given email exists in the 'users' collection.
   *
   * @param {string} email - The email to check.
   * @returns {Promise<boolean>} - True if email is found, otherwise false.
   */
  async checkEmailExists(email: string): Promise<boolean> {
    const usersCollection = collection(this.firestore, 'users');
    const q = query(usersCollection, where('email', '==', email));
    const querySnapshot = await getDocs(q);

    return !querySnapshot.empty;
  }

  /**
   * Marks the specified form field as filled and clears error messages if focusing on email.
   *
   * @param {string} field - The name of the form field.
   */
  onFocus(field: string) {
    this.filledStates[field + 'Filled'] = true;

    if (field === 'email') {
      this.errorMessage = '';
      this.successMessage = '';
    }
  }

  /**
   * Marks the specified form field as filled or unfilled on blur,
   * based on whether it has a value.
   *
   * @param {string} field - The name of the form field.
   */
  onBlur(field: string) {
    this.filledStates[field + 'Filled'] = Boolean(
      this.resetPasswordForm.get(field)?.value
    );
  }

  /**
   * Sends a password reset email using Firebase Auth.
   *
   * @param {string} email - The user's email for reset.
   * @param {any} actionCodeSettings - Additional settings for reset links.
   */
 
  async resetPassword(email: string, actionCodeSettings: any): Promise<void> {
    try {
      await sendPasswordResetEmail(this.auth, email, actionCodeSettings);
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error));
    }
  }
  
  /**
   * Submits the form, checks if email exists, and if valid,
   * sends a reset email. Displays success or error messages as needed,
   * and navigates to '/new-passwort' after a short delay.
   */
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
        handleCodeInApp: true
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
        this.successMessage = '';
        this.errorMessage = error.message;
      }
    }
  }

  /**
   * Translates Firebase error codes into user-friendly messages.
   *
   * @param {any} error - The caught error object.
   * @returns {string} - A string describing the error.
   */
 
  getErrorMessage(error: any): string {
    switch (error.code) {
      case 'auth/invalid-email':
        return 'Die angegebene E-Mail-Adresse ist ungültig.';
      case 'auth/user-not-found':
        return 'Es gibt keinen Benutzer mit dieser E-Mail-Adresse.';
      case 'auth/too-many-requests':
        return 'Zu viele Anfragen in kurzer Zeit. Bitte versuche es später erneut.';
      default:
        return 'Ein unbekannter Fehler ist aufgetreten.';
    }
  }
}
