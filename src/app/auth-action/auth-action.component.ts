import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Auth,
  updateEmail,
  verifyPasswordResetCode,
  applyActionCode
} from '@angular/fire/auth';
import { UserService } from '../user.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';

/**
 * Handles Firebase authentication actions such as password reset and email verification.
 */
@Component({
  selector: 'app-auth-action',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, FooterComponent],
  templateUrl: './auth-action.component.html',
  styleUrls: ['./auth-action.component.scss']
})
export class AuthActionComponent implements OnInit {
  mode: string | null = null;
  oobCode: string | null = null;
  loading = true;

  /**
   * @param route - For reading query parameters like mode and oobCode.
   * @param auth - The Firebase Auth instance.
   * @param router - For navigation to routes after actions are handled.
   * @param userService - Custom service for updating user info in Firestore.
   */
  constructor(
    private route: ActivatedRoute,
    private auth: Auth,
    private router: Router,
    private userService: UserService
  ) {}

  /**
   * Reads 'mode' and 'oobCode' from query params and calls the appropriate handler.
   */
  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.mode = params['mode'];
      this.oobCode = params['oobCode'];
      if (this.mode === 'resetPassword') {
        this.handlePasswordReset(this.oobCode);
      } else if (this.mode === 'verifyEmail') {
        this.handleEmailVerification(this.oobCode);
      }
    });
  }

  /**
   * Verifies the password reset code, then navigates to 'new-passwort' if valid.
   */
  async handlePasswordReset(oobCode: string | null): Promise<void> {
    if (!oobCode) return;
    try {
      await verifyPasswordResetCode(this.auth, oobCode);
      this.router.navigate(['/new-passwort'], { queryParams: { oobCode } });
    } catch {}
  }

  /**
   * Applies the code to verify user email, updates new email if needed, then navigates away.
   */
  async handleEmailVerification(oobCode: string | null): Promise<void> {
    if (!oobCode) return;
    try {
      await applyActionCode(this.auth, oobCode);
      const newEmail = localStorage.getItem('newEmail');
      const user = this.auth.currentUser;
      if (user && newEmail) {
        await updateEmail(user, newEmail);
        await this.userService.updateEmailInFirestore(user.uid, newEmail);
        localStorage.removeItem('newEmail');
      }
      this.loading = false;
      this.router.navigate(['/avatar']);
    } catch {}
  }
}