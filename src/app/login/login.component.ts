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
  addDoc,
  updateDoc,
  getDoc,
  setDoc,
  doc,
} from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import {
  getAuth,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from '@angular/fire/auth';
import { AppStateService } from '../app-state.service'; 

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
  emailFilled = false;
  passwordFilled = false;
  filledStates: { [key: string]: boolean } = {};
  errorMessage: string = '';
  email: string = '';
  password: string = '';
  successMessage: string = '';
  emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  myForm: FormGroup;

  errorPassword: string = '';

  constructor(
    private firestore: Firestore,
    private router: Router,
    private fb: FormBuilder,
    private appStateService: AppStateService
  ) {
    this.myForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, this.emailValidator.bind(this)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      checkbox: [false, Validators.requiredTrue],
    });
  }

  ngOnInit(): void {
   
  }



 
  emailValidator(control: AbstractControl): ValidationErrors | null {
    const email = control.value;
    if (!this.emailPattern.test(email)) {
      return { invalidEmail: true };
    }
    return null;
  }

  onFocus(type: string) {
    this.filledStates[type + 'Filled'] = true;
    this.errorMessage = '';
    this.errorPassword = '';
  }

  onBlur(type: string) {
    this.filledStates[type + 'Filled'] = Boolean(this.myForm.get(type)?.value);

   
  }

  updateFilledState(type: string, value: string) {
    this.filledStates[type + 'Filled'] = value !== '';
  }





  async checkEmailExists(email: string): Promise<boolean> {
    const usersCollection = collection(this.firestore, 'users');
    const q = query(usersCollection, where('email', '==', email));
    const querySnapshot = await getDocs(q);

    return !querySnapshot.empty;
  }

  async onSubmit() {
    this.errorMessage = '';
    this.successMessage = '';
    this.errorPassword = '';

    if (!this.email || !this.password) {
      this.errorMessage = 'Bitte füllen Sie alle Felder aus.';
      this.errorPassword = 'Bitte füllen Sie alle Felder aus.'
      return;
    }

    const emailExists = await this.checkEmailExists(this.email);
    if (!emailExists) {
      this.errorMessage = 'Diese E-Mail-Adresse ist nicht registriert.';
      return;
    }

    try {
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, this.email, this.password);

      this.appStateService.setShowWelcomeContainer(true);

      this.successMessage = 'Anmelden';
      setTimeout(() => {
        this.successMessage = '';
        this.router.navigate(['/chat']);
      }, 3000);
    } catch (error) {
      console.error('Fehler bei der Anmeldung:', error);

      const firebaseError = error as FirebaseError;
      console.log('Error code:', firebaseError.code);
      if (firebaseError.code === 'auth/invalid-password') {
        this.errorPassword = 'Das Passwort ist falsch.';
      } else if (firebaseError.code === 'auth/too-many-requests') {
        this.errorMessage =
          'Ihre Anmeldung wurde vorübergehend gesperrt, weil Sie zu viele falsche Anmeldeversuche gemacht haben. Bitte versuchen Sie es später erneut oder setzen Sie Ihr Passwort zurück.';
      } else {
        this.errorPassword = 'Das Passwort ist falsch.';
      }
    }
  }

  async loadUserData(email: string, name: string | undefined = undefined, avatarUrl: string | undefined = undefined) {
    const auth = getAuth();
    const user = auth.currentUser;
  
    if (user && user.uid) {
      try {
        const userDocRef = doc(this.firestore, 'users', user.uid); // Verwende die UID
        const userDocSnap = await getDoc(userDocRef);
  
        if (userDocSnap.exists()) {
          // Update the existing user data in Firestore
          await this.updateExistingUser(userDocRef, {
            lastLogin: new Date(),
            name: name,
            avatarUrl: avatarUrl,
          });
        } else {
          // Save a new user if it doesn't exist in Firestore
          await this.saveNewUser(user.uid, email, name, avatarUrl);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    } else {
      console.error('No authenticated user found.');
    }
  }
  
  async saveNewUser(uid: string, email: string, name: string | undefined = undefined, avatarUrl: string | undefined = undefined) {
    try {
      const user = {
        uid: uid,
        email: email,
        name: name || 'Unbekannt',
        avatarUrl: avatarUrl || '',
        createdAt: new Date(),
        lastLogin: new Date(),
      };
      // Verwende setDoc mit der UID des Benutzers
      await setDoc(doc(this.firestore, 'users', uid), user);
      console.log('New user created with UID:', uid);
    } catch (error) {
      console.error('Error creating new user:', error);
    }
  }
  
  async updateExistingUser(userDoc: any, data: Partial<{ lastLogin: Date; name?: string; avatarUrl?: string }>) {
    try {
      const updateData = {
        ...data,
        lastLogin: data.lastLogin || new Date(),
      };
  
      console.log('Updating user data with:', updateData);
      await updateDoc(userDoc, updateData);
      console.log('User data updated:', userDoc.id);
    } catch (error) {
      console.error('Error updating user data:', error);
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
        const avatarUrl = user.photoURL || '';

        await this.loadUserData(
          user.email,
          user.displayName || undefined,
          avatarUrl
        );

        this.router.navigate(['/avatar']);
      } else {
        throw new Error('Google sign-in result does not contain user email.');
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      this.errorMessage = 'Fehler bei der Google-Anmeldung.';
    }
  }

  navigateToSignup() {
    this.router.navigate(['/signup']);
  }

  navigateToGuestLogin() {
    this.router.navigate(['/chat']);
  }
}
