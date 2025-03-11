
































import { Component, Input, Output, EventEmitter, Optional, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ChannelService } from '../channel.service';

/**
 * Falls du Material-Dialog-Daten übergeben willst,
 * definieren wir ein optionales Interface:
 */
export interface MemberListDialogData {
  channelId?: string;
  members?: any[];
}

@Component({
  selector: 'app-member-list-dialog',
  standalone: true,
  imports: [CommonModule, OverlayModule],
  templateUrl: './member-list-dialog.component.html',
  styleUrls: ['./member-list-dialog.component.scss']
})
export class MemberListDialogComponent implements OnInit {

  // === cdkOverlay Inputs ===
  @Input() channelId!: string;
  @Input() members: any[] = [];

  // === cdkOverlay Outputs ===
  @Output() close = new EventEmitter<void>();
  @Output() openAddMembersOverlay = new EventEmitter<void>();
  @Output() openPrivateChat = new EventEmitter<{ id: string; name: string }>();
  @Output() openProfileRequested = new EventEmitter<any>(); 

  constructor(
    private channelService: ChannelService,

    // Für Material-Dialog:
    @Optional() public dialogRef?: MatDialogRef<MemberListDialogComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data?: MemberListDialogData
  ) {}

  ngOnInit(): void {
    // (1) Falls wir Material-Dialog-Daten übergeben haben => channelId, members ...
    if (this.data) {
      if (this.data.channelId) {
        this.channelId = this.data.channelId;
      }
      if (this.data.members) {
        this.members = this.data.members;
      }
    }
  }

  // ========== Remove Member ==========
  removeMember(member: any): void {
    this.members = this.members.filter(m => m !== member);
    this.updateChannelMembers();
  }

  updateChannelMembers(): void {
    if (!this.channelId) return;
    this.channelService.setMembers(this.channelId, this.members)
      .then(() => {
        console.log('Mitglieder erfolgreich aktualisiert:', this.channelId);
      })
      .catch(error => {
        console.error('Fehler beim Aktualisieren der Mitglieder:', error);
      });
  }

  // ========== Schließen ==========
  onCancel(): void {
    // Material-Dialog => dialogRef.close()
    // cdkOverlay => (close).emit()
    if (this.dialogRef) {
      this.dialogRef.close();
    } else {
      this.close.emit();
    }
  }



  // ========== Private Chat ==========
  startPrivateChat(member: any) {
    const payload = { id: member.uid, name: member.name };
    if (this.dialogRef) {
      // Material => .close({ openChatWith: payload })
      this.dialogRef.close({ openChatWith: payload });
    } else {
      // cdkOverlay => emit
      this.openPrivateChat.emit(payload);
      this.close.emit();
    }
  }
















  openProfileDialog(member: any) {
    if (this.dialogRef) {
      // Mobile-Fall => Material-Dialog
      this.dialogRef.close({ openProfile: member });
    } else {
      // Desktop-Fall => cdkOverlay
      this.openProfileRequested.emit(member);
      this.close.emit();
    }
  }
  
  openAddMembersOverlayMethod() {
    if (this.dialogRef) {
      // Mobile-Fall => Material-Dialog
      this.dialogRef.close({ addMembers: true });
    } else {
      // Desktop-Fall => cdkOverlay
      this.openAddMembersOverlay.emit();
    }
  }
  





}
