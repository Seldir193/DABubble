import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';

import { ChannelService } from '../channel.service';

@Component({
  selector: 'app-member-list-dialog',
  standalone: true,
  imports: [CommonModule, OverlayModule],
  templateUrl: './member-list-dialog.component.html',
  styleUrls: ['./member-list-dialog.component.scss']
})
export class MemberListDialogComponent {
  @Input() channelId!: string;     // Falls du channelId brauchst
  @Input() members: any[] = [];    // Die anzuzeigenden Mitglieder

  @Output() close = new EventEmitter<void>();                // Schließen des Dialogs
  @Output() openAddMembersOverlay = new EventEmitter<void>(); // Klick auf "Mitglieder hinzufügen"

  constructor(private channelService: ChannelService) {}

  // Methode, um ein Mitglied zu entfernen
  removeMember(member: any): void {
    this.members = this.members.filter(m => m !== member);
    this.updateChannelMembers();
  }

  // Aktualisiert die Mitglieder im ChannelService
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

  // Wird aufgerufen, wenn der User auf das "X" klickt
  onCancel(): void {
    this.close.emit();
  }

  openAddMembersOverlayMethod(): void {
    this.openAddMembersOverlay.emit();
  }
  
}
