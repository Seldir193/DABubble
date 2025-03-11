

import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface ProfileData {
  userId: string; 
  userName: string;
  userStatus: string;
  userAvatarUrl: string;
  userEmail: string;
}

@Component({
  selector: 'app-profil-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profil-dialog.component.html',
  styleUrls: ['./profil-dialog.component.scss']
})
export class ProfilDialogComponent implements OnInit {
  userName: string = '';
  userStatus: string = 'Aktiv';
  userAvatarUrl: string = 'assets/img/avatar.png';
  userEmail: string = '';

  constructor(
    // Wichtig: DialogRef und Data brauchst du, um das Dialog zu schließen
    // und ankommende Daten (member) zu erhalten
    public dialogRef: MatDialogRef<ProfilDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ProfileData
  ) {}

  ngOnInit(): void {
    // Falls du data lokal kopieren willst (optional)
    if (this.data) {
      this.userName = this.data.userName;
      this.userStatus = this.data.userStatus;
      this.userAvatarUrl = this.data.userAvatarUrl;
      this.userEmail = this.data.userEmail;
    }
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  sendMessage(): void {
    // Signal an den Parent: "Bitte privaten Chat öffnen mit userId"
    this.dialogRef.close({ openChatWith: this.data.userId });
  }
}
















