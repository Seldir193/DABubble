import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth, confirmPasswordReset } from '@angular/fire/auth';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { PrivacyComponent } from '../privacy/privacy.component';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-new-passwort',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HeaderComponent,
    FooterComponent,
    PrivacyComponent,
    RouterModule,
  ],
  templateUrl: './new-passwort.component.html',
  styleUrls: ['./new-passwort.component.scss'],
})
export class NewPasswortComponent implements OnInit {
  newPasswordForm: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';
  private oobCode: string | null = null;
  submitted: boolean = false;

  constructor(
    private auth: Auth,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.newPasswordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

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
        console.error('Fehler beim Zurücksetzen des Passworts:', error);
        this.successMessage = '';
        this.errorMessage = this.getErrorMessage(error);
        this.newPasswordForm.reset();
      }
    }
  }

  passwordsMatch(): boolean {
    const password = this.newPasswordForm.get('newPassword')?.value;
    const confirmPassword = this.newPasswordForm.get('confirmPassword')?.value;
    return password === confirmPassword;
  }

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
