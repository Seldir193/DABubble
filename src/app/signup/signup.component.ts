import { Component, OnInit, HostListener } from '@angular/core';
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
import { Auth, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { Firestore, collection, addDoc,setDoc,doc } from '@angular/fire/firestore';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { PrivacyComponent } from '../privacy/privacy.component';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HeaderComponent,
    FooterComponent,
    PrivacyComponent,
    RouterModule,
  ],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss'],
})
export class SignupComponent implements OnInit {
  myForm: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';
  isChecked = false;
  filledStates: { [key: string]: boolean } = {};
  emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  isSmallScreen: boolean = window.innerWidth < 780;

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

  ngOnInit(): void {
    this.updateScreenSize();
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.updateScreenSize();
  }

  updateScreenSize() {
    this.isSmallScreen = window.innerWidth < 780;
    const checkboxControl = this.myForm.get('checkbox');
    if (checkboxControl) {
      if (this.isSmallScreen) {
        checkboxControl.disable();
        this.myForm.get('checkbox')?.setValue(false);
      } else {
        checkboxControl.enable();
      }
    }
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
  }

  onBlur(type: string) {
    this.filledStates[type + 'Filled'] = Boolean(this.myForm.get(type)?.value);
  }

  isSubmitButtonEnabled(): boolean {
    return this.isSmallScreen || (this.myForm.valid && this.isChecked);
  }

  async onSubmit() {
    if (this.myForm.valid) {
      const { name, email, password } = this.myForm.value;
      if (!this.isSmallScreen && !this.isChecked) {
        this.errorMessage = '';
        return;
      }

      try {
        const userCredential = await createUserWithEmailAndPassword(
          this.auth,
          email,
          password
        );
        const user = userCredential.user;

        const userData = {
          uid: user.uid,
          email: email,
          name: name,
          timestamp: new Date(),
        };

        await this.saveUser(userData);

        this.successMessage = 'Sie werden weitergeleitet zum Avatar Seite!';
        setTimeout(() => {
          this.successMessage = '';
          this.router.navigate(['/avatar']);
        }, 3000);
      } catch (error: any) {
        console.error('Fehler bei der Registrierung:', error.code, error.message);
        this.errorMessage = this.getFirebaseErrorMessage(error);
      }
      this.myForm.reset();
    }
  }

  async saveUser(user: {
    uid: string;
    email: string;
    name: string;
    timestamp: Date;
  }) {
    try {
      const userRef = doc(this.firestore, 'users', user.uid);
      await setDoc(userRef, user);
      console.log('Benutzer erfolgreich gespeichert mit UID als Dokument-ID.');
    } catch (e) {
      console.error('Fehler beim Speichern des Benutzers: ', e);
    }
  }

  toggleCheckbox() {
    const currentValue = this.myForm.get('checkbox')?.value;
    this.myForm.get('checkbox')?.setValue(!currentValue);
    this.isChecked = !currentValue;
  }

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
