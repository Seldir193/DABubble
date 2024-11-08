import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, ViewChild, ElementRef, Input, EventEmitter, Output,OnChanges, SimpleChanges  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { ChannelService } from '../channel.service';
import { UserService } from '../user.service';
import { MatDialog } from '@angular/material/dialog';
import { formatDate } from '@angular/common';
import { AddMemberSelectorComponent } from '../add-member-selector/add-member-selector.component';
import { Message } from '../message.models';
import { MessageService } from '../message.service';
import { ActivatedRoute, Router } from '@angular/router';

export interface MessageContent {
  text?: string;
  image?: string | ArrayBuffer | null;
  emojis?: any[];
}

@Component({
  selector: 'app-private-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, PickerModule],
  templateUrl: './private-messages.component.html',
  styleUrls: ['./private-messages.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PrivateMessagesComponent implements OnInit {
  @ViewChild('messageList') messageList!: ElementRef;
  @Input() recipientName: string = '';
  @Input() recipientId: string = '';
  @Output() memberSelected = new EventEmitter<any>();

  imageUrl: string | ArrayBuffer | null = null;
  privateMessage: string = '';
  currentUser: any;
  privateMessages: any[] = [];
  recipientStatus: string = '';  // Status of the recipient
  recipientAvatarUrl: string = ''; // Added recipientAvatarUrl property
  isEmojiPickerVisible: boolean = false;
  isImageModalOpen = false;
  yesterdayDate: string = this.getYesterdayDate();
  currentDate: string = formatDate(new Date(), 'dd.MM.yyyy', 'en');

  isTextareaExpanded: boolean = false;
  message: string = ''; 

  constructor(
    
    private route: ActivatedRoute,

    private userService: UserService,
    private channelService: ChannelService,
    private dialog: MatDialog,
    private messageService: MessageService

  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadRecipientData();
    this.loadPrivateMessages();
  }

  getYesterdayDate(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return formatDate(yesterday, 'dd.MM.yyyy', 'en');
  }

  loadCurrentUser(): void {
    this.userService.getCurrentUserData().then(user => {
      this.currentUser = user;
    }).catch(err => {
      console.error('Fehler beim Laden des aktuellen Benutzers:', err);
    });
  }

  loadRecipientData(): void {
    if (this.recipientId) {
      this.userService.getUserById(this.recipientId).then(userData => {
        this.recipientStatus = userData.isOnline ? 'Aktiv' : 'Abwesend';
        this.recipientAvatarUrl = userData.avatarUrl || ''; // Set recipient's avatar URL
      }).catch(error => {
        console.error('Fehler beim Laden des Empfängers:', error);
      });
    }
  }


  
  loadPrivateMessages(): void {
    const senderId = this.userService.getCurrentUserId();
    if (senderId && this.recipientId) {
      const conversationId = this.messageService.generateConversationId(senderId, this.recipientId);
  
      this.messageService.listenForPrivateMessages(conversationId, (messages: Message[]) => {
        this.privateMessages = messages.map((msg: Message) => ({
          ...msg,
          timestamp: msg.timestamp ? msg.timestamp.toDate() : new Date()
        }));
        this.scrollToBottom();
      });
    } else {
      console.error("Fehlende Benutzer-ID oder Empfänger-ID beim Laden der Nachrichten");
    }
  }


  async sendPrivateMessage(textArea: HTMLTextAreaElement): Promise<void> {
    const senderId = this.userService.getCurrentUserId();
    const recipientId = this.recipientId;

    if (!senderId || !recipientId) {
        console.error("Sender or recipient ID is missing.");
        return;
    }

    const conversationId = this.generateConversationId(senderId, recipientId);
    const messageData = {
        content: {
            text: this.privateMessage || null,
            image: this.imageUrl || null
        },
        date: formatDate(new Date(), 'dd.MM.yyyy', 'en'),
        timestamp: new Date(),
        time: formatDate(new Date(), 'HH:mm', 'en'),
        senderId: senderId,
        senderName: this.currentUser?.name || "Unknown",
        senderAvatar: this.currentUser?.avatarUrl || ""
    };

    // Senden der Nachricht über MessageService
    await this.messageService.sendPrivateMessage(senderId, recipientId, messageData);

    // Textbereich zurücksetzen
    this.privateMessage = '';
    this.imageUrl = null;

    // Textarea-Größe nach dem Senden zurücksetzen
    if (textArea) {
        this.resetTextareaHeight(textArea);
    }

    // Scrollen zur letzten Nachricht
    this.scrollToBottom();
}

  

  




 
  
  onImageSelected(event: Event, textArea?: HTMLTextAreaElement): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imageUrl = e.target?.result || null;
        if (textArea) {
          this.adjustTextareaHeight(textArea);
        }
        this.isTextareaExpanded = true;
      };
      reader.readAsDataURL(file);
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

  openImageModal(): void {
    this.isImageModalOpen = true;
  }

  closeImageModal(): void {
    this.isImageModalOpen = false;
  }

  closeProfileCard(textArea: HTMLTextAreaElement): void {
    this.imageUrl = null;
    this.resetTextareaHeight(textArea);
  }

  adjustTextareaHeight(textArea: HTMLTextAreaElement): void {
    if (this.imageUrl) {
      textArea.style.paddingBottom = '160px';
    }
  }

  resetTextareaHeight(textArea: HTMLTextAreaElement): void {
    textArea.style.paddingBottom = '20px';
  }

  handleKeyDown(event: KeyboardEvent, textArea: HTMLTextAreaElement): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendPrivateMessage(textArea);
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messageList) {
        this.messageList.nativeElement.scrollTop = this.messageList.nativeElement.scrollHeight;
      }
    }, 100);
  }




  addAtSymbolAndOpenDialog(): void {
    this.privateMessage += '@';
  
    // Alle Benutzer abrufen und an den Dialog übergeben
    this.userService.getAllUsers().then(users => {
      const dialogRef = this.dialog.open(AddMemberSelectorComponent, {
        data: { members: users }
      });
  
      dialogRef.afterClosed().subscribe(selectedMember => {
        if (selectedMember) {
          this.privateMessage += ` ${selectedMember.name} `;
        }
      });
    }).catch(error => {
      console.error('Fehler beim Abrufen der Benutzer:', error);
    });
  }
  


  


  



  
  generateConversationId(userId1: string, userId2: string): string {
    return [userId1, userId2].sort().join('_'); // Alphabetisch sortieren und verbinden
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['recipientId'] && !changes['recipientId'].isFirstChange()) {
      this.loadRecipientData();
      this.loadPrivateMessages();
    }
  }


}