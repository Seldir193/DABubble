


import { Component, OnInit, ViewChild, ElementRef, Input, AfterViewInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../user.service';
import { MessageService } from '../message.service';
import { MemberSectionDialogComponent } from '../member-section-dialog/member-section-dialog.component';
import { formatDate } from '@angular/common';

export interface MessageContent {
  text?: string;
  image?: string | ArrayBuffer | null;
}

@Component({
  selector: 'app-private-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, PickerModule],
  templateUrl: './private-messages.component.html',
  styleUrls: ['./private-messages.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PrivateMessagesComponent implements OnInit, AfterViewInit {
  @ViewChild('messageList') messageList!: ElementRef;
  @ViewChild('textArea') textArea!: ElementRef;
  
  @Input() recipientName: string = ''; // Name des Empfängers der privaten Nachricht
  @Input() recipientId: string = '';   // ID des Empfängers der privaten Nachricht
  imageUrl: string | ArrayBuffer | null = null; 
  privateMessage: string = '';
 
  currentUser: any;
  privateMessages: any[] = [];
  isEmojiPickerVisible: boolean = false;
  isImageModalOpen = false;
  searchLetter: string = '';
  filteredMembers: any[] = [];
  isTextareaExpanded: boolean = false;
  yesterdayDate: string = this.getYesterdayDate();
  currentDate: string = formatDate(new Date(), 'dd.MM.yyyy', 'en');


  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private messageService: MessageService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();

    // Route-Parameter auslesen
    this.route.params.subscribe(params => {
      this.recipientName = params['name'];
      this.recipientId = params['id'];
    });

    // Private Nachrichten laden
    this.loadPrivateMessages();
  }

  ngAfterViewInit(): void {
    this.scrollToBottom();
  }

  getYesterdayDate(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return formatDate(yesterday, 'dd.MM.yyyy', 'en');
  }

  isToday(date: string): boolean {
    return date === this.currentDate;
  }

  isYesterday(date: string): boolean {
    return date === this.yesterdayDate;
  }

  loadCurrentUser(): void {
    this.userService.getCurrentUserData().then(user => {
      this.currentUser = user;
    }).catch(err => {
      console.error('Fehler beim Laden des aktuellen Benutzers:', err);
    });
  }

  loadPrivateMessages(): void {
    this.messageService.getPrivateMessages(this.recipientId).then(messages => {
      this.privateMessages = messages;
      this.scrollToBottom();
    }).catch(error => {
      console.error('Fehler beim Laden der privaten Nachrichten:', error);
    });
  }

  sendPrivateMessage(): void {
    if (this.privateMessage.trim() || this.imageUrl) {
      const message = {
        senderId: this.currentUser.id,
        recipientId: this.recipientId,
        content: {
          text: this.privateMessage,
          image: this.imageUrl
        },
        timestamp: new Date().toISOString()
      };

      this.messageService.sendPrivateMessage(message).then(() => {
        this.privateMessage = ''; // Nachricht zurücksetzen
        this.imageUrl = null; // Bild zurücksetzen
        this.scrollToBottom();
      }).catch(error => {
        console.error('Fehler beim Senden der Nachricht:', error);
      });
    }
  }

  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendPrivateMessage();
    }
  }

  scrollToBottom(): void {
    if (this.messageList) {
      setTimeout(() => {
        this.messageList.nativeElement.scrollTop = this.messageList.nativeElement.scrollHeight;
      }, 100);
    }
  }

  toggleEmojiPicker(): void {
    this.isEmojiPickerVisible = !this.isEmojiPickerVisible;
  }

  addEmoji(event: any): void {
    if (event && event.emoji && event.emoji.native) {
      this.privateMessage += event.emoji.native;
    }
    this.isEmojiPickerVisible = false;
  }

  openMemberSelectionDialog(): void {
    const dialogRef = this.dialog.open(MemberSectionDialogComponent, {
      width: '400px',
      data: { members: this.filteredMembers }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.router.navigate(['/private-messages', { id: result.id, name: result.name }]);
      }
    });
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imageUrl = e.target?.result || null; // Entfernt `undefined`
        this.adjustTextareaHeight(); // Textarea-Höhe anpassen
        this.isTextareaExpanded = true;
      };
      reader.readAsDataURL(file);
    }
  }

  adjustTextareaHeight(): void {
    if (this.textArea && this.imageUrl) {
      this.textArea.nativeElement.style.paddingBottom = '160px';
    }
  }

  resetTextareaHeight(): void {
    if (this.textArea) {
      this.textArea.nativeElement.style.paddingBottom = '20px';
    }
  }

  openImageModal(): void {
    this.isImageModalOpen = true;
  }

  closeImageModal(): void {
    this.isImageModalOpen = false;
  }

  closeProfileCard(): void {
    this.imageUrl = null;  // Entfernt das Bild
  }
}

