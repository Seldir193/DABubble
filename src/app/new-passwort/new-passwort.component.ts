/**
 * The NewPasswortComponent allows users to set a new password 
 * after receiving an email-based reset code (oobCode). It verifies 
 * matching passwords, resets the password via Firebase Auth, 
 * and redirects to the login screen on success. No logic or 
 * style has been altered — only these JSDoc comments have been 
 * added in English.
 */
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Auth, confirmPasswordReset } from '@angular/fire/auth';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-new-passwort',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HeaderComponent,
    FooterComponent,
    RouterModule
  ],
  templateUrl: './new-passwort.component.html',
  styleUrls: ['./new-passwort.component.scss']
})
export class NewPasswortComponent implements OnInit {
  /**
   * A reactive form group containing newPassword and confirmPassword fields.
   */
  newPasswordForm: FormGroup;

  /**
   * Displays any error message encountered during the password reset process.
   */
  errorMessage: string = '';

  /**
   * Displays a success message once the password is successfully reset.
   */
  successMessage: string = '';

  /**
   * The out-of-band code (oobCode) passed through query parameters for password reset.
   */
  private oobCode: string | null = null;

  /**
   * Indicates whether the form has been submitted (used to manage error resetting).
   */
  submitted: boolean = false;

  /**
   * @param {Auth} auth - Firebase Auth instance.
   * @param {FormBuilder} fb - Utility for creating and managing form controls.
   * @param {Router} router - The Angular router for navigation.
   * @param {ActivatedRoute} route - Used to read the query parameters (oobCode).
   */
  constructor(
    private auth: Auth,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.newPasswordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  /**
   * Lifecycle hook that initializes the component by subscribing 
   * to query parameters and form value changes.
   */
  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.oobCode = params['oobCode'] || null;
    });

    this.newPasswordForm.valueChanges.subscribe(() => {
      if (this.submitted) {
        this.errorMessage = '';
      }
    });
  }

  /**
   * Called when the user submits the form. Validates password 
   * match and uses Firebase Auth to confirm the password reset 
   * if valid.
   */
  async onSubmit() {
    this.submitted = true;

    if (!this.passwordsMatch()) {
      this.errorMessage = 'Die Passwörter stimmen nicht überein.';
      return;
    }

    if (this.newPasswordForm.valid && this.oobCode) {
      const newPassword = this.newPasswordForm.value.newPassword;

      try {
        await confirmPasswordReset(this.auth, this.oobCode, newPassword);
        this.successMessage = 'Ihr Passwort wurde zurückgesetzt.';
        this.errorMessage = '';
        this.newPasswordForm.reset();
        this.submitted = false;

        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      } catch (error: any) {
        this.successMessage = '';
        this.errorMessage = this.getErrorMessage(error);
        this.newPasswordForm.reset();
      }
    }
  }

  /**
   * Checks if newPassword and confirmPassword fields contain the same value.
   *
   * @returns {boolean} - True if both fields match; false otherwise.
   */
  passwordsMatch(): boolean {
    const password = this.newPasswordForm.get('newPassword')?.value;
    const confirmPassword = this.newPasswordForm.get('confirmPassword')?.value;
    return password === confirmPassword;
  }

  /**
   * Retrieves a user-friendly error message based on Firebase's error codes.
   *
   * @param {any} error - The error object caught during password reset.
   * @returns {string} - A descriptive error message for display.
   */
  getErrorMessage(error: any): string {
    switch (error.code) {
      case 'auth/invalid-action-code':
        return 'Der Link ist ungültig oder abgelaufen.';
      case 'auth/expired-action-code':
        return 'Der Link ist abgelaufen.';
      default:
        return 'Ein unbekannter Fehler ist aufgetreten.';
    }
  }
}


