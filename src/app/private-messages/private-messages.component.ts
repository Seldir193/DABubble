import { Component, OnInit, ViewChild, ElementRef, Input, AfterViewInit, CUSTOM_ELEMENTS_SCHEMA, EventEmitter, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../user.service';
import { MessageService } from '../message.service';
import { formatDate } from '@angular/common';
import { Message } from '../message.models';




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
export class PrivateMessagesComponent implements OnInit, AfterViewInit,OnChanges{
  @ViewChild('messageList') messageList!: ElementRef;
  @Input() recipientName: string = '';
  @Input() recipientId: string = '';
  @Output() memberSelected = new EventEmitter<any>();

  imageUrl: string | ArrayBuffer | null = null; 
  privateMessage: string = '';
  currentUser: any;
  privateMessages: any[] = [];
  recipient: any = null;
  isEmojiPickerVisible: boolean = false;
  isImageModalOpen = false;
  yesterdayDate: string = this.getYesterdayDate();
  currentDate: string = formatDate(new Date(), 'dd.MM.yyyy', 'en');

  recipientAvatarUrl: string = '';
  recipientStatus: string = ''; 
 

  


  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserService,
    private messageService: MessageService,
    private dialog: MatDialog
  ) {}



  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadRecipientData();
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

  


  
  ngAfterViewInit(): void {
    this.scrollToBottom();
  }


  loadCurrentUser(): void {
    this.userService.getCurrentUserData().then(user => {
      this.currentUser = user;
      console.log("Current User:", this.currentUser);
      console.log("Recipient ID:", this.recipientId);
      
      // Überprüfen Sie, ob beide IDs vorhanden sind, bevor Sie die Nachrichten laden
      if (this.currentUser?.id && this.recipientId) {
        this.loadPrivateMessages();
      } else {
        console.error("Fehlende Benutzer-ID oder Empfänger-ID beim Initialisieren");
      }
    }).catch(err => {
      console.error('Fehler beim Laden des aktuellen Benutzers:', err);
    });

  }
  

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imageUrl = e.target?.result || null;
      };
      reader.readAsDataURL(file);
    }
  }

  private loadRecipientData(): void {
    if (!this.recipientId) {
      console.error("Fehlende Empfänger-ID beim Laden der Empfängerdaten");
      return;
    }
    this.userService.getUserById(this.recipientId)
      .then(userData => {
        this.recipientAvatarUrl = userData.avatarUrl;
        this.recipientName = userData.name;
        this.recipientStatus = userData.isOnline ? 'Aktiv' : 'Abwesend';
      })
      .catch(error => {
        console.error('Fehler beim Laden des Empfängers:', error);
      });
  }


  loadPrivateMessages(): void {
    const senderId = this.userService.getCurrentUserId();
    const recipientId = this.recipientId;
  
    if (senderId && recipientId) {
      const conversationId = this.generateConversationId(senderId, recipientId);
      this.messageService.listenForPrivateMessages(conversationId, (messages) => {
        this.privateMessages = messages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp ? msg.timestamp.toDate() : new Date()
        }));
        this.scrollToBottom();
      });
    } else {
      console.error("Fehlende Benutzer-ID oder Empfänger-ID beim Laden der Nachrichten");
    }
  }

  async sendPrivateMessage(): Promise<void> {
    const senderId = this.userService.getCurrentUserId();
    const recipientId = this.recipientId;
    if (!senderId || !recipientId) {
      console.error("Fehlende Benutzer-ID oder Empfänger-ID beim Senden der Nachricht");
      return;
    }
  
    const conversationId = this.generateConversationId(senderId, recipientId);
    const messageData = {
      content: {
        text: this.privateMessage || null,
        image: this.imageUrl || null
      },
      timestamp: new Date(),
      senderId: senderId,
      senderName: this.currentUser.name || "Unbekannt",
      senderAvatar: this.currentUser.avatarUrl || ""
    };
  
    await this.messageService.sendPrivateMessage(senderId, recipientId, messageData);
    // Entferne diese Zeile, um das doppelte Hinzufügen zu verhindern:
    // this.privateMessages.push(messageData);
  
    this.privateMessage = '';
    this.imageUrl = null;
    this.scrollToBottom();
  }
  
 
  
 
  
  

  openDirectMessage(member: any): void {
    console.log('Öffne Direktnachricht mit:', member);
    this.memberSelected.emit(member);
  
    const currentUserId = this.userService.getCurrentUserId();
    if (currentUserId && member.id) { // Überprüfen, ob beide Werte nicht null sind
      const conversationId = this.generateConversationId(currentUserId, member.id);
      this.messageService.listenForPrivateMessages(conversationId, (messages: Message[]) => {
        this.privateMessages = messages.map((msg: Message) => ({
          ...msg,
          timestamp: msg.timestamp ? msg.timestamp.toDate() : new Date()
        }));
      });
    } else {
      console.error("Fehlende Benutzer-ID oder Empfänger-ID.");
    }
  }
  
  
  
  
  

  
  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messageList) {
        this.messageList.nativeElement.scrollTop = this.messageList.nativeElement.scrollHeight;
      }
    }, 100);
  }

  getYesterdayDate(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return formatDate(yesterday, 'dd.MM.yyyy', 'en');
  }

  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendPrivateMessage();
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

  closeProfileCard(): void {
    this.imageUrl = null;
  }




  
  
  
}

