/***************************************************************
 * The ProfilDialogComponent displays profile information 
 * (e.g., avatar, status, email) for a given user. It allows 
 * closing the dialog or signaling the parent component 
 * to initiate a private chat. No logic or style has been 
 * changed; only these English JSDoc comments have been added.
 ***************************************************************/

import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MessageService } from '../message.service';

/**
 * Data structure expected when opening ProfilDialogComponent via MatDialog.
 */
export interface ProfileData {
  userId: string;
  userName: string;
  userStatus: string;
  userAvatarUrl: string;
  userEmail: string;
}

/**
 * The ProfilDialogComponent is displayed in a Material Dialog
 * to show a user's profile data, including avatar, status, and email.
 */
@Component({
  selector: 'app-profil-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profil-dialog.component.html',
  styleUrls: ['./profil-dialog.component.scss']
})
export class ProfilDialogComponent implements OnInit {
  /**
   * Local copy of user's name, used in the dialog display.
   */
  userName: string = '';

  /**
   * Local copy of user's status (e.g., 'Aktiv', 'Abwesend').
   */
  userStatus: string = 'Aktiv';

  /**
   * Local copy of the user's avatar URL.
   */
  userAvatarUrl: string = 'assets/img/avatar.png';

  /**
   * Local copy of user's email address.
   */
  userEmail: string = '';
  
  /**
   * Hier speichern wir später die unsubscribe-Funktion des Snapshot-Listeners,
   * damit wir ihn bei Bedarf beenden können.
   */
  private unsubscribeRecipient?: () => void;

  /**
   * Constructor injecting the material dialog references and incoming data.
   *
   * @param {MatDialogRef<ProfilDialogComponent>} dialogRef - Reference to this dialog instance.
   * @param {ProfileData} data - Data passed in when opening this dialog (user profile info).
   */
  constructor(
    public dialogRef: MatDialogRef<ProfilDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ProfileData,
    private messageService: MessageService
  ) {}

  /**
   * Lifecycle hook that copies relevant profile data to local variables on initialization.
   */
  ngOnInit(): void {
    if (this.data) {
      this.userName = this.data.userName;
      this.userStatus = this.data.userStatus;
      this.userAvatarUrl = this.data.userAvatarUrl;
      this.userEmail = this.data.userEmail;
    }

    if (this.data.userId) {
      this.unsubscribeRecipient = this.messageService.onRecipientStatusChanged(
        this.data.userId,
        (result) => {
          this.userStatus = result.isOnline ? 'Aktiv' : 'Abwesend';
          this.userAvatarUrl = result.avatarUrl;
          this.userName = result.name;
          this.userEmail = result.email;
        }
      );
    }
  }

  /**
   * Closes the dialog without taking additional action.
   */
  closeDialog(): void {
    this.dialogRef.close();
  }

  /**
   * Closes the dialog and signals the parent that a private chat 
   * should be opened with the given user ID.
   */
  sendMessage(): void {
    this.dialogRef.close({ openChatWith: this.data.userId });
  }

  ngOnDestroy(): void {
    if (this.unsubscribeRecipient) {
      this.unsubscribeRecipient();
    }
  }
}








