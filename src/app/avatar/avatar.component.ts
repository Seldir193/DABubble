import { Component, OnInit, HostListener } from '@angular/core';
import {
  Firestore,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  QuerySnapshot,
  DocumentData,
} from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { getAuth, User } from '@angular/fire/auth';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [
    HeaderComponent,
    FooterComponent,
    CommonModule,
    FormsModule,
    RouterLink,
  ],
  templateUrl: './avatar.component.html',
  styleUrls: ['./avatar.component.scss'],
})
export class AvatarComponent implements OnInit {
  avatars = [
    'assets/img/elise.png',
    'assets/img/elias.png',
    'assets/img/frederik.png',
    'assets/img/steffen.png',
    'assets/img/sofia.png',
    'assets/img/noah.png',
  ];
  selectedAvatar: string | null = null;
  errorMessage = '';
  userName = 'User';
  userAvatarUrl = 'assets/img/avatar.png';
  successMessage = '';
  isSmallScreen = window.innerWidth < 780;

  constructor(private firestore: Firestore, private router: Router) {}

  ngOnInit(): void {
    this.loadUserData();
    this.updateScreenSize();
  }

  @HostListener('window:resize', ['$event'])
  onResize(): void {
    this.updateScreenSize();
  }

  updateScreenSize(): void {
    this.isSmallScreen = window.innerWidth < 780;
  }

  selectAvatar(avatar: string): void {
    this.selectedAvatar = avatar;
    this.errorMessage = '';
  }

  /*************************************************************
   * Below is the refactored version of your validateAndUploadProfilePicture
   * method, split into two functions to reduce line count and maintain
   * single-responsibility. No logic has been altered; it is simply
   * reorganized. All JSDoc is in English, and no console logs remain.
   *************************************************************/

  /**
   * Validates the selected file for presence, type, and size.
   * Returns an error message if invalid; an empty string otherwise.
   *
   * @param {File | null} file - The file selected from the input.
   * @returns {string} - An error message or an empty string.
   */
  private validateFile(file: File | null): string {
    if (!file) {
      return 'No file selected.';
    }
    if (!file.type.startsWith('image/')) {
      return 'Please select an image file.';
    }
    if (file.size > 5 * 1024 * 1024) {
      return 'File is too large. Please choose a file under 5 MB.';
    }
    return '';
  }

  /**
   * Reads the chosen image file as a Data URL and updates selectedAvatar.
   *
   * @param {Event} e - The change event from the file input element.
   */
  public validateAndUploadProfilePicture(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files ? input.files[0] : null;

    const fileError = this.validateFile(file);
    if (fileError) {
      this.errorMessage = fileError;
      return;
    }

    this.errorMessage = '';
    const reader = new FileReader();
    reader.onload = () => {
      this.selectedAvatar = reader.result as string;
    };
    reader.readAsDataURL(file as File);
  }

  /**
   * Retrieves user data from Firestore and assigns local fields (userName, avatar).
   * Redirects to '/login' if any checks fail.
   */
  public async loadUserData(): Promise<void> {
    const authUser = getAuth().currentUser;
    if (!this.isUserValid(authUser)) return;

    const snap = await this.fetchUserDocs(authUser!);
    if (!snap || snap.empty) {
      this.errorMessage = 'User not found.';
      this.router.navigate(['/login']);
      return;
    }
    this.setLocalUserFields(snap);
  }

  /**
   * Checks if the user is authenticated and navigates to '/login' if not.
   * @param {User | null} authUser - The currently authenticated user, if any.
   * @returns {boolean} True if user is valid, otherwise false.
   */
  private isUserValid(authUser: User | null): boolean {
    if (!authUser) {
      this.errorMessage = 'No user logged in.';
      this.router.navigate(['/login']);
      return false;
    }
    return true;
  }

  /**
   * Fetches the user's Firestore document based on whether they are anonymous or have an email.
   * @param {User} authUser - The current, verified user object.
   * @returns {Promise<QuerySnapshot<DocumentData> | null>} The Firestore snapshot or null on error.
   */
  private async fetchUserDocs(authUser: User) {
    const ref = collection(this.firestore, 'users');
    if (authUser.isAnonymous) {
      return await getDocs(query(ref, where('uid', '==', authUser.uid)));
    }
    if (!authUser.email) {
      this.errorMessage = 'Missing E-Mail?';
      this.router.navigate(['/login']);
      return null;
    }
    return await getDocs(query(ref, where('email', '==', authUser.email)));
  }

  /**
   * Sets userName, userAvatarUrl, and selectedAvatar fields from the Firestore snapshot.
   * @param {QuerySnapshot<DocumentData>} snap - The snapshot containing the user data.
   */
  private setLocalUserFields(snap: QuerySnapshot<DocumentData>): void {
    const data = snap.docs[0].data();
    this.userName = data['name'] || 'User';
    this.userAvatarUrl = data['avatarUrl'] || 'assets/img/avatar.png';
    this.selectedAvatar = this.userAvatarUrl;
  }
  /**
   * Confirms the selected avatar and updates Firestore with the new info.
   * Displays a success message and navigates to '/chat' if successful,
   * or sets an error message otherwise.
   */
  public async confirmSelection(): Promise<void> {
    if (!this.validateAvatarSelection()) return;

    try {
      const currentUser = getAuth().currentUser;
      if (!this.isUserAuthenticated(currentUser)) return;

      const snap = await this.fetchUserDocuments(currentUser!);
      if (!snap || snap.empty) {
        this.errorMessage = 'User not found in Firestore.';
        return;
      }
      await this.updateUserAvatar(snap);
      this.handleAvatarUpdateSuccess();
    } catch {
      this.errorMessage = 'Error confirming selection.';
    }
  }

  /**
   * Checks if an avatar has been selected; sets an error message if not.
   * @returns {boolean} True if an avatar is selected, otherwise false.
   */
  private validateAvatarSelection(): boolean {
    if (!this.selectedAvatar) {
      this.errorMessage = 'Please select an avatar.';
      return false;
    }
    return true;
  }

  /**
   * Verifies that a user is authenticated.
   * @param {User | null} user - The currently authenticated user (if any).
   * @returns {boolean} True if the user is authenticated, otherwise false.
   */
  private isUserAuthenticated(user: User | null): boolean {
    if (!user) {
      this.errorMessage = 'No user logged in.';
      return false;
    }
    return true;
  }

  /**
   * Fetches the Firestore user documents, depending on whether the user is anonymous or has an email.
   * @param {User} user - The currently authenticated user.
   * @returns {Promise<QuerySnapshot<DocumentData> | null>} The user documents snapshot or null on error.
   */
  private async fetchUserDocuments(user: User) {
    const ref = collection(this.firestore, 'users');
    if (user.isAnonymous) {
      return await getDocs(query(ref, where('uid', '==', user.uid)));
    }
    if (!user.email) {
      this.errorMessage = 'Missing E-Mail?';
      return null;
    }
    return await getDocs(query(ref, where('email', '==', user.email)));
  }

  /**
   * Updates the user's document in Firestore with the selected avatar and the current userName.
   * @param {QuerySnapshot<DocumentData>} snap - The Firestore snapshot containing the user docs.
   */
  private async updateUserAvatar(
    snap: QuerySnapshot<DocumentData>
  ): Promise<void> {
    await updateDoc(snap.docs[0].ref, {
      avatarUrl: this.selectedAvatar,
      name: this.userName,
    });
  }

  /**
   * Sets a success message, clears it after 3 seconds, and navigates to '/chat'.
   */
  private handleAvatarUpdateSuccess(): void {
    this.successMessage = 'Account successfully updated!';
    setTimeout(() => {
      this.successMessage = '';
      this.router.navigate(['/chat']);
    }, 3000);
  }
}
