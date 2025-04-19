import {
  Component,
  OnInit,
  HostListener,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserService } from '../user.service';
import { MessageService } from '../message.service';
import { getAuth, onAuthStateChanged } from '@angular/fire/auth';

@Component({
  selector: 'app-direct-messages',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './direct-messages.component.html',
  styleUrls: ['./direct-messages.component.scss'],
})
export class DirectMessagesComponent implements OnInit {
  @Output() memberSelected = new EventEmitter<any>();
  members: any[] = [];
  isChannelsVisible: boolean = false;

  inactivityTimeout: any;
  currentUserStatus: string = 'Abwesend';
  userIsActive: boolean = true;

  constructor(
    private userService: UserService,
    private messageService: MessageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadMembers();

    this.messageService.onAllUsersChanged((allUsers) => {
      const auth = getAuth();
      const currentUid = auth.currentUser?.uid;
      this.members = allUsers
        .filter((m) => m.id !== currentUid)
        .map((m) => ({
          ...m,
          userStatus: m.isOnline ? 'Aktiv' : 'Abwesend',
        }));
    });

    this.listenForAuthChanges();
    this.resetInactivityTimer();
  }

  private loadMembers(): void {
    this.userService
      .getAllUsers()
      .then((data) => {
        const auth = getAuth();
        const currentUid = auth.currentUser?.uid;
        this.members = data
          .filter((m) => m.id !== currentUid)
          .map((m) => ({
            ...m,
            userStatus: m.isOnline ? 'Aktiv' : 'Abwesend',
          }));
      })
      .catch(() => {});
  }

  @HostListener('document:mousemove')
  @HostListener('document:keydown')
  handleUserActivity(): void {
    this.resetInactivityTimer();
  }

  private resetInactivityTimer(): void {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (currentUser && !this.userIsActive) {
      this.userIsActive = true;
      this.messageService.setUserOnlineStatus(currentUser.uid, true);
    }
    if (this.inactivityTimeout) clearTimeout(this.inactivityTimeout);

    this.inactivityTimeout = setTimeout(() => {
      this.setUserAsInactive();
    }, 50000);
  }

  private async setUserAsInactive(): Promise<void> {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (currentUser && this.userIsActive) {
      this.userIsActive = false;
      await this.messageService.setUserOnlineStatus(currentUser.uid, false);
    }
  }

  private listenForAuthChanges(): void {
    const auth = getAuth();
    onAuthStateChanged(auth, async (user) => {
      if (user && user.uid) {
        await this.messageService.setUserOnlineStatus(user.uid, true);
        this.resetInactivityTimer();
      } else {
        const current = auth.currentUser;
        if (current) {
          await this.messageService.setUserOnlineStatus(current.uid, false);
        }
      }
    });
  }

  toggleChannels(): void {
    this.isChannelsVisible = !this.isChannelsVisible;
  }

  openDirectMessage(member: any): void {
    this.memberSelected.emit(member);
  }
}
