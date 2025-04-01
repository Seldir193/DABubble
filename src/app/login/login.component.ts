/**
 * The LoginComponent is responsible for handling user sign-in, whether by email/password
 * or via Google sign-in. It validates user input, checks for existing users, updates
 * Firestore records, and navigates to the appropriate pages upon successful login.
 */
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
import { FirebaseError } from '@firebase/util';
import {
  Firestore,
  query,
  where,
  getDocs,
  collection,
  setDoc,
  doc,
  getDoc,
  updateDoc,
} from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { RouterModule, Router } from '@angular/router';

import {
  getAuth,
  signInAnonymously,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  User,
} from '@angular/fire/auth';
import { AppStateService } from '../app-state.service';
import { UserService } from '../user.service';
import { ChannelService } from '../channel.service';
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    FooterComponent,
    HeaderComponent,
    ReactiveFormsModule,
    RouterModule,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  /** Indicates whether the email field is currently filled. */
  emailFilled = false;
  /** Indicates whether the password field is currently filled. */
  passwordFilled = false;
  /** A map of states for each field, indicating if it is filled or not. */
  filledStates: { [key: string]: boolean } = {};
  /** Displays an error message when login fails. */
  errorMessage = '';
  /** Displays a success message when login succeeds. */
  successMessage = '';
  /** Stores the user's email input. */
  errorPassword = '';
  /** A regex pattern used for validating email format. */
  emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  /** Reactive form group for validation of name, email, password, and a checkbox. */
  myForm: FormGroup;

  constructor(
    private firestore: Firestore,
   // private router: Router,
    private fb: FormBuilder,
    private appStateService: AppStateService,
    private userService: UserService,
    public router: Router,
    private channelService: ChannelService
  ) {
    this.myForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, this.emailValidator.bind(this)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      checkbox: [false, Validators.requiredTrue],
    });
  }

  /** Lifecycle hook that runs after component initialization. */
  ngOnInit(): void { 
}
  /** Validates the email format using a regex pattern. */
  emailValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!this.emailPattern.test(value)) return { invalidEmail: true };
    return null;
  }

  /** Sets the form field's filled state to true when focused, clearing any error messages. */
  onFocus(type: string): void {
    this.filledStates[type + 'Filled'] = true;
    this.errorMessage = '';
    this.errorPassword = '';
  }

  /** Updates the field's filled state on blur, depending on its current value. */
  onBlur(type: string): void {
    const val = this.myForm.get(type)?.value;
    this.filledStates[type + 'Filled'] = !!val;
  }

  /** Updates the filled state for a given field by checking if the string is non-empty. */
  updateFilledState(type: string, value: string): void {
    this.filledStates[type + 'Filled'] = value !== '';
  }

  /** Checks Firestore to see if a given email already exists in the 'users' collection. */
  async checkEmailExists(email: string): Promise<boolean> {
    const colRef = collection(this.firestore, 'users');
    const q = query(colRef, where('email', '==', email));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  }

  /** Handles the login form submission with email/password credentials. */
  async onSubmit(): Promise<void> {
    this.clearMessages();
    if (this.fieldsAreEmpty()) return;

    const emailVal = this.myForm.get('email')?.value as string;

    const emailExists = await this.checkEmailExists(emailVal);
    if (!emailExists) {
      this.errorMessage = 'Diese E-Mail-Adresse ist nicht registriert.';
      return;
    }
    await this.attemptEmailSignIn();
  }

  /** Clears all error and success messages. */
  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.errorPassword = '';
  }

  /** Checks if email or password is empty, sets an error message if so. */
  private fieldsAreEmpty(): boolean {
    const emailVal = this.myForm.get('email')?.value;
    const passwordVal = this.myForm.get('password')?.value;

    if (!emailVal || !passwordVal) {
      this.errorMessage = 'Bitte füllen Sie alle Felder aus.';
      this.errorPassword = 'Bitte füllen Sie alle Felder aus.';
      return true;
    }
    return false;
  }

  /** Attempts sign-in with email and password, handles success or error feedback. */
  private async attemptEmailSignIn(): Promise<void> {
    try {
      const auth = getAuth();

      const emailVal = this.myForm.get('email')?.value;
      const passwordVal = this.myForm.get('password')?.value;
      await signInWithEmailAndPassword(auth, emailVal, passwordVal);

      this.appStateService.setShowWelcomeContainer(true);
      this.handleLoginSuccess();
    } catch (err) {
      this.handleLoginError(err);
    }
  }

  /** Sets a success message and navigates to chat after a short delay. */
  private handleLoginSuccess(): void {
    this.successMessage = 'Anmelden';
    setTimeout(() => {
      this.successMessage = '';
      this.router.navigate(['/chat']);
    }, 3000);
  }

  /** Handles login error: sets appropriate error messages for known Firebase errors. */
  private handleLoginError(error: unknown): void {
    const fbErr = error as FirebaseError;
    if (fbErr.code === 'auth/invalid-password') {
      this.errorPassword = 'Das Passwort ist falsch.';
    } else if (fbErr.code === 'auth/too-many-requests') {
      this.errorMessage =
        'Ihre Anmeldung wurde vorübergehend gesperrt, weil Sie zu viele falsche Anmeldeversuche gemacht haben. Bitte versuchen Sie es später erneut oder setzen Sie Ihr Passwort zurück.';
    } else {
      this.errorPassword = 'Das Passwort ist falsch.';
    }
  }

  /**
   * Loads user data from Firestore based on the authenticated user's ID.
   * If no record exists, creates a new one; otherwise updates the existing record.
   */
  async loadUserData(
    email: string,
    name: string | undefined = undefined,
    avatarUrl: string | undefined = undefined
  ): Promise<void> {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user?.uid) {
      try {
        const ref = doc(this.firestore, 'users', user.uid);
        const snap = await getDoc(ref);
        snap.exists()
          ? await this.updateExistingUser(ref, {
              lastLogin: new Date(),
              name,
              avatarUrl,
            })
          : await this.saveNewUser(user.uid, email, name, avatarUrl);
      } catch (_) {}
    }
  }

  /** Creates a new user document in Firestore with the given data if none exists. */
  private async saveNewUser(
    uid: string,
    email: string,
    name?: string,
    avatarUrl?: string
  ): Promise<void> {
    const user = {
      uid,
      email,
      name: name || 'Unbekannt',
      avatarUrl: avatarUrl || '',
      createdAt: new Date(),
      lastLogin: new Date(),
    };
    await setDoc(doc(this.firestore, 'users', uid), user);
  }

  /** Updates an existing user's Firestore document with new data. */
  private async updateExistingUser(
    userDoc: any,
    data: Partial<{ lastLogin: Date; name?: string; avatarUrl?: string }>
  ): Promise<void> {
    const updateData = { ...data, lastLogin: data.lastLogin || new Date() };
    await updateDoc(userDoc, updateData);
  }

  /** Signs the user in with Google, then loads/creates their Firestore record. */
  async signInWithGoogle(): Promise<void> {
    try {
      const provider = new GoogleAuthProvider();
      const auth = getAuth();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      if (user?.email) {
        const avatarUrl = user.photoURL || '';
        await this.loadUserData(
          user.email,
          user.displayName || undefined,
          avatarUrl
        );
        this.router.navigate(['/avatar']);
      }
    } catch (_) {
      this.errorMessage = 'Fehler bei der Google-Anmeldung.';
    }
  }

  /** Navigates to the signup page if the user chooses to register. */
  navigateToSignup(): void {
    this.router.navigate(['/signup']);
  }

  /** Signs in user as a guest (anonymous), creates a Firestore doc, then goes to /chat. */


  navigateToGuestLogin(): void {
    const auth = getAuth();
    signInAnonymously(auth)
      .then(async (cred) => {
        if (!cred.user) return;
        const randomSuffix = Math.random().toString(36).substring(2, 6);
        const guestName = `Guest-${randomSuffix}`;
        const ref = doc(this.firestore, 'users', cred.user.uid);

        await setDoc(ref, {
          uid: cred.user.uid,
          name: guestName,
          isOnline: true,
          createdAt: new Date(),
        });

        this.router.navigate(['/chat']);
      })
      .catch(() => {});
  }


  /** Logs the user out via the UserService. */
  logout(): void {
    this.userService.logout();
  }
}
