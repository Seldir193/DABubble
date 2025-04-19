/***************************************************************
 * The SignupComponent handles user registration via Firebase
 * Authentication, along with some form validation and logic
 * for adjusting UI on small screens. No logic or style has
 * been changed – only these English JSDoc comments have been
 * added.
 ***************************************************************/

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
import { Auth, createUserWithEmailAndPassword, sendEmailVerification  } from '@angular/fire/auth';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { RouterModule } from '@angular/router';

/**
 * The SignupComponent manages user sign-up using Firebase Authentication.
 * It includes form validation, a dynamic TOS checkbox that auto-disables on small screens,
 * and navigation to an avatar selection page after successful registration.
 */
@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HeaderComponent,
    FooterComponent,
    RouterModule,
  ],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss'],
})
export class SignupComponent implements OnInit {
  /**
   * The ReactiveForms form for capturing user sign-up details.
   */
  myForm: FormGroup;

  /**
   * A string to hold error messages displayed to the user.
   */
  errorMessage: string = '';

  /**
   * A string to hold success messages displayed to the user.
   */
  successMessage: string = '';

  /**
   * Whether the TOS (checkbox) is checked.
   */
  isChecked = false;

  /**
   * An object tracking input fields as "filled" or not, for styling or placeholders.
   */
  filledStates: { [key: string]: boolean } = {};

  /**
   * A simple Regex pattern for email validation in this component.
   */
  emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  /**
   * Detects whether the current viewport is < 780px.
   */
  isSmallScreen: boolean = window.innerWidth < 780;

  /**
   * Constructor injecting Auth, Firestore, Router, and FormBuilder services.
   *
   * @param {Auth} auth - Firebase Auth service.
   * @param {Firestore} firestore - Firebase Firestore service.
   * @param {Router} router - Angular Router to navigate after sign-up.
   * @param {FormBuilder} fb - FormBuilder for constructing the ReactiveForms form.
   */
  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.myForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, this.emailValidator.bind(this)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      checkbox: [
        { value: false, disabled: this.isSmallScreen },
        Validators.requiredTrue,
      ],
    });
  }

  /**
   * Lifecycle hook: detects the screen size on initialization and updates the form's state.
   */
  ngOnInit(): void {}

  /**
   * A validator function for the `email` form control using `this.emailPattern`.
   *
   * @param {AbstractControl} control - The form control to validate.
   * @returns {ValidationErrors | null} The validation result, if invalid.
   */
  emailValidator(control: AbstractControl): ValidationErrors | null {
    const email = control.value;
    if (!this.emailPattern.test(email)) {
      return { invalidEmail: true };
    }
    return null;
  }

  passwordFocused = false;
  /**
   * Invoked on focus of a form input, updates `filledStates`.
   *
   * @param {string} type - The control name.
   */
  onFocus(type: string) {
    this.filledStates[type + 'Filled'] = true;
    this.errorMessage = '';

    if (type === 'password') {
      this.passwordFocused = true;
    }
  }

  /**
   * Invoked on blur of a form input, checks whether it's still filled.
   *
   * @param {string} type - The control name.
   */
  onBlur(type: string) {
    this.filledStates[type + 'Filled'] = Boolean(this.myForm.get(type)?.value);

    if (type === 'password') {
      this.passwordFocused = false;
    }
  }

  /**
   * Determines whether the submit button should be enabled.
   * It's always enabled on small screens, or if the form is valid
   * and the TOS checkbox is checked on large screens.
   *
   * @returns {boolean} True if the submit button should be enabled.
   */
  isSubmitButtonEnabled(): boolean {
    return this.isSmallScreen || (this.myForm.valid && this.isChecked);
  }

  /**
   * Called on form submission, registers the user if valid and TOS is confirmed.
   */
  async onSubmit(): Promise<void> {
    // 1) Form validation check
    if (!this.myForm.valid) return;

    // 2) TOS check for large screens
    if (!this.verifyTOSforLargeScreens()) return;

    try {
      // 3) Create user with Firebase Auth
      const { name, email, password } = this.myForm.value;
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        email,
        password
      );

    await sendEmailVerification(userCredential.user, {
      
      url: 'http://localhost:4200/auth-action',
      handleCodeInApp: false,
    });
    this.successMessage = 'Registrierung erfolgreich! Bitte überprüfe dein E-Mail-Postfach, um deine Adresse zu bestätigen.';



      //await signOut(this.auth);
      // 4) Handle sign-up success: build user data, save to Firestore, show success msg
      await this.handleSuccessfulSignup(userCredential.user, name, email);
    } catch (error: any) {
      this.errorMessage = this.getFirebaseErrorMessage(error);
    }

    // 5) Reset form whether success or fail
    this.myForm.reset();
  }

  /**
   * Checks if TOS (checkbox) is confirmed on larger screens.
   * If not confirmed, sets an empty errorMessage and returns false.
   */
  private verifyTOSforLargeScreens(): boolean {
    if (!this.isSmallScreen && !this.isChecked) {
      this.errorMessage = '';
      return false;
    }
    return true;
  }

  /**
   * Handles successful sign-up by building user data, saving it to Firestore,
   * and displaying a success message with a redirect to '/avatar'.
   */
  private async handleSuccessfulSignup(
    user: any, // or Firebase 'User'
    name: string,
    email: string
  ): Promise<void> {
    const userData = {
      uid: user.uid,
      email,
      name,
      timestamp: new Date(),
    };

    await this.saveUser(userData);
    this.successMessage = 'Registrierung erfolgreich! Bitte überprüfe dein E-Mail-Postfach, um deine Adresse zu bestätigen.';
  }

  /**
   * Saves the user data to Firestore under the 'users' collection,
   * using the user's UID as the document ID.
   *
   * @param {object} user - An object containing the user's UID, email, name, and timestamp.
   */
  async saveUser(user: {
    uid: string;
    email: string;
    name: string;
    timestamp: Date;
  }) {
    try {
      const userRef = doc(this.firestore, 'users', user.uid);
      await setDoc(userRef, user);
    } catch (e) {
      console.error('Fehler beim Speichern des Benutzers:', e);
    }
  }

  /**
   * Toggles the TOS checkbox for manual updates if needed.
   */
  toggleCheckbox() {
    const currentValue = this.myForm.get('checkbox')?.value;
    this.myForm.get('checkbox')?.setValue(!currentValue);
    this.isChecked = !currentValue;
  }

  /**
   * Translates Firebase sign-up error codes into user-friendly German messages.
   *
   * @param {any} error - The error object thrown by Firebase.
   * @returns {string} An error message to display.
   */
  getFirebaseErrorMessage(error: any): string {
    switch (error.code) {
      case 'auth/email-already-in-use':
        return 'Diese E-Mail-Adresse wird bereits verwendet.';
      case 'auth/operation-not-allowed':
        return 'Registrierung ist derzeit deaktiviert.';
      default:
        return 'Ein unbekannter Fehler ist aufgetreten.';
    }
  }
}
