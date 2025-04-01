/**
 * The VerifyEmailComponent handles verifying a user's email when they click
 * on a link sent to their inbox. It uses Firebase's email link authentication
 * flow to confirm that the user owns the email address. Once verified, it updates
 * the user's email in Firebase and redirects them to the chat page.
 * No logic or styling has been changed – only these English JSDoc comments have been added.
 */

import { Component, OnInit } from '@angular/core';
import {
  getAuth,
  isSignInWithEmailLink,
  signInWithEmailLink,
  updateEmail,
} from 'firebase/auth';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../header/header.component';
import { RouterModule } from '@angular/router';
import { FooterComponent } from '../footer/footer.component';

/**
 * The VerifyEmailComponent listens for email verification links from Firebase,
 * attempts to verify the user's email, and updates the email in Firebase Auth.
 */
@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
    RouterModule,
    FooterComponent,
  ],
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.scss'],
})
export class VerifyEmailComponent implements OnInit {
  /**
   * A variable for editing the user's email in a form (if needed).
   */
  editableUserEmail: string = '';

  /**
   * Stores the email retrieved from localStorage if the user was updating it.
   */
  email: string | null = null;

  /**
   * A success message displayed after successful verification.
   */
  successMessage: string = '';

  /**
   * An error message displayed if verification fails.
   */
  errorMessage: string = '';

  /**
   * Constructs the component, injecting the Router for navigation.
   */
  constructor(private router: Router) {}

  /**
   * OnInit checks if the current URL is a valid sign-in link, attempts to verify the email,
   * and if successful, updates the email in Firebase and redirects to chat.
   */
  async ngOnInit() {
    const firebaseAuth = getAuth();
    const storedEmail = localStorage.getItem('newEmail');
    this.email = storedEmail;
    if (!isSignInWithEmailLink(firebaseAuth, window.location.href)) {
      this.errorMessage = 'Invalid verification link.';
      return;
    }
    if (!storedEmail) return;
    try {
      await this.verifySignInLink(firebaseAuth, storedEmail);
    } catch (error) {
      this.errorMessage = 'Error verifying the email.';
    }
  }

  /**
   * onSubmit can be triggered if there's a form for manually entering the email.
   * It will similarly verify the email link and update the user's email address.
   */
  async onSubmit() {
    const firebaseAuth = getAuth();
    if (!isSignInWithEmailLink(firebaseAuth, window.location.href)) return;
    try {
      await this.submitSignInLink(firebaseAuth, this.editableUserEmail);
    } catch (error) {
      this.errorMessage = 'Error verifying the email.';
    }
  }

  /**
   * Signs in with the existing email link, sets a success message, updates the email in Firebase,
   * removes it from localStorage, and navigates to the chat page.
   */
  private async verifySignInLink(
    firebaseAuth: any,
    storedEmail: string
  ): Promise<void> {
    await signInWithEmailLink(firebaseAuth, storedEmail, window.location.href);
    this.successMessage = 'E-Mail successfully verified.';
    const user = firebaseAuth.currentUser;
    if (!user) return;
    await updateEmail(user, storedEmail);
    localStorage.removeItem('newEmail');
    this.router.navigate(['/chat']);
  }

  /**
   * Signs in with the provided editableUserEmail, sets a success message, updates the email in Firebase,
   * removes it from localStorage, and navigates to the chat page.
   */
  private async submitSignInLink(
    firebaseAuth: any,
    email: string
  ): Promise<void> {
    await signInWithEmailLink(firebaseAuth, email, window.location.href);
    this.successMessage = 'Email successfully verified.';
    const user = firebaseAuth.currentUser;
    if (!user) return;
    await updateEmail(user, email);
    localStorage.removeItem('newEmail');
    this.router.navigate(['/chat']);
  }
}
  
