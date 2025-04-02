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
  async loadUserData(): Promise<void> {
    const authUser = getAuth().currentUser;
  
    if (!authUser) {
      this.errorMessage = 'No user logged in.';
      this.router.navigate(['/login']);
      return;
    }
  
    
    const ref = collection(this.firestore, 'users');
  
    let snap;
   
    if (authUser.isAnonymous) {
      
      snap = await getDocs(query(ref, where('uid', '==', authUser.uid)));
    } else {
      
      if (!authUser.email) {
        this.errorMessage = 'Missing E-Mail?';
        this.router.navigate(['/login']);
        return;
      }
      snap = await getDocs(query(ref, where('email', '==', authUser.email)));
    }
  
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

  async confirmSelection(): Promise<void> {
    if (!this.selectedAvatar) {
      this.errorMessage = 'Please select an avatar.';
      return;
    }
    try {
      const currentUser = getAuth().currentUser;
      if (!currentUser) {
        this.errorMessage = 'No user logged in.';
        return;
      }
  
      const ref = collection(this.firestore, 'users');
      let snap;
  
      if (currentUser.isAnonymous) {
        snap = await getDocs(query(ref, where('uid', '==', currentUser.uid)));
      } else {
        if (!currentUser.email) {
          this.errorMessage = 'Missing E-Mail?';
          return;
        }
        snap = await getDocs(query(ref, where('email', '==', currentUser.email)));
      }
  
      if (snap.empty) {
        this.errorMessage = 'User not found in Firestore.';
        return;
      }
  
      await updateDoc(snap.docs[0].ref, {
        avatarUrl: this.selectedAvatar,
        name: this.userName,
      });
  
      this.successMessage = 'Account successfully updated!';
      setTimeout(() => {
        this.successMessage = '';
        this.router.navigate(['/chat']);
      }, 3000);
  
    } catch {
      this.errorMessage = 'Error confirming selection.';
    }
  }
  
}
