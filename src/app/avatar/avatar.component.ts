import { Component, OnInit, HostListener } from '@angular/core';
import {
  Firestore,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { getAuth } from '@angular/fire/auth';
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

  /**
   * Loads user data from Firestore and sets local state.
   * If the user or email is missing, or Firestore has no result,
   * navigates to /login.
   */
  async loadUserData(): Promise<void> {
    const user = getAuth().currentUser;
    if (!user || !user.email) {
      this.errorMessage = 'No user logged in.';
      this.router.navigate(['/login']);
      return;
    }
    const ref = collection(this.firestore, 'users');
    const snap = await getDocs(query(ref, where('email', '==', user.email)));
    if (snap.empty) {
      this.errorMessage = 'User not found.';
      this.router.navigate(['/login']);
      return;
    }
    const data = snap.docs[0].data();
    this.userName = data['name'] || 'User';
    this.userAvatarUrl = data['avatarUrl'] || 'assets/img/avatar.png';
    this.selectedAvatar = this.userAvatarUrl;
  }

  selectAvatar(avatar: string): void {
    this.selectedAvatar = avatar;
    this.errorMessage = '';
  }

  validateAndUploadProfilePicture(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files ? input.files[0] : null;
    if (!file) {
      this.errorMessage = 'No file selected.';
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.errorMessage = 'Please select an image file.';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage = 'File is too large. Please choose a file under 5 MB.';
      return;
    }
    this.errorMessage = '';
    const reader = new FileReader();
    reader.onload = () => {
      this.selectedAvatar = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  async confirmSelection(): Promise<void> {
    if (!this.selectedAvatar) {
      this.errorMessage = 'Please select an avatar.';
      return;
    }
    try {
      const current = getAuth().currentUser;
      if (current && current.email) {
        const ref = collection(this.firestore, 'users');
        const snap = await getDocs(
          query(ref, where('email', '==', current.email))
        );
        if (!snap.empty) {
          await updateDoc(snap.docs[0].ref, {
            avatarUrl: this.selectedAvatar,
            name: this.userName,
          });
          this.successMessage = 'Account successfully updated!';
          setTimeout(() => {
            this.successMessage = '';
            this.router.navigate(['/chat']);
          }, 3000);
        } else {
          this.errorMessage = 'User not found.';
        }
      }
    } catch {
      this.errorMessage = 'Error confirming selection.';
    }
  }
}
