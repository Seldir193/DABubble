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
 // emojis?: any[];
 // emojis?: Array<{ emoji: string; count: number }>;

} emojis: Array<{ emoji: string; count: number }>;

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

  @Input() showSearchField: boolean = false;

  imageUrl: string | ArrayBuffer | null = null;
  privateMessage: string = '';
  currentUser: any;
  privateMessages: any[] = [];
  conversationId: string | undefined;
  recipientStatus: string = '';  // Status of the recipient
  recipientAvatarUrl: string = ''; // Added recipientAvatarUrl property
  isEmojiPickerVisible: boolean = false;
  isImageModalOpen = false;
  currentDate: Date = new Date();
  yesterdayDate: Date = this.getYesterdayDate();
  isTextareaExpanded: boolean = false;
  message: string = ''; 
  lastUsedEmojisReceived: string[] = []; 
  lastUsedEmojisSent: string[] = [];
  showEditOptions: boolean = false;
  currentMessageId: string | null = null;
  originalMessage: any = null;
  tooltipVisible = false;
  tooltipPosition = { x: 0, y: 0 };
  tooltipEmoji = '';
  tooltipSenderName = '';

  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private channelService: ChannelService,
    private dialog: MatDialog,
    private messageService: MessageService,
  ) { }

  async ngOnInit(): Promise<void> {
    await this.loadCurrentUser(); 
    this.loadRecipientData();
  
    if (this.currentUser && this.recipientId) {
      this.conversationId = this.messageService.generateConversationId(this.currentUser.id, this.recipientId);
      
      // Initialisiere Konversation und stelle sicher, dass ein Konversationsdokument existiert
      await this.messageService.initializeConversation(this.conversationId);
      
      // Lade die letzten Emojis für gesendete und empfangene Nachrichten
      this.loadLastUsedEmojis();
      
      // Nachrichten für den aktuellen Chat abonnieren
      this.messageService.listenForPrivateMessages(this.conversationId, (messages: Message[]) => {
        this.privateMessages = messages.map((msg: Message) => ({
          ...msg,
          content: { ...msg.content, emojis: msg.content?.emojis || [] }
        }));
        this.scrollToBottom();
      });
    }
  }

  private async loadLastUsedEmojis(): Promise<void> {
    if (this.conversationId) {
      this.lastUsedEmojisSent = await this.messageService.getLastUsedEmojis(this.conversationId, 'sent');
      this.lastUsedEmojisReceived = await this.messageService.getLastUsedEmojis(this.conversationId, 'received');
    }
  }
  
  getFormattedDate(dateString: string): string {
    if (!dateString) {
      console.error('Ungültiges Datum erkannt:', dateString);
      return 'Ungültiges Datum';
    }
  
    // Konvertiere das Datum in ein standardisiertes Format
    const parts = dateString.split('.');
    let date: Date;
    if (parts.length === 3) {
      // Falls Format dd.MM.yyyy
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      date = new Date(year, month, day);
    } else {
      // ISO-Format oder unbekannt
      date = new Date(dateString);
    }
  
    if (isNaN(date.getTime())) {
      console.error('Ungültiges Datum erkannt:', dateString);
      return 'Ungültiges Datum';
    }
  
    if (this.isSameDay(date, new Date())) {
      return 'Heute';
    } else if (this.isSameDay(date, this.getYesterdayDate())) {
      return 'Gestern';
    }
  
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: '2-digit', month: 'long' };
    return date.toLocaleDateString('de-DE', options); // Beispiel: "Samstag, 21. Dezember"
  }
  
  private getYesterdayDate(): Date {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  }
  
 
  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  }
  
  async loadCurrentUser(): Promise<void> {
    return this.userService.getCurrentUserData()
      .then(user => {
        this.currentUser = user;
      })
      .catch(err => {
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
  
    const conversationId = this.messageService.generateConversationId(senderId, recipientId);
    const messageData = {
      content: {
        text: this.privateMessage || null,
        image: this.imageUrl || null,
        emojis: []
      },
    // date: new Date().toISOString().split('T')[0], // ISO-Datum ohne Zeit
     date: formatDate(new Date(), 'dd.MM.yyyy', 'en'),
      timestamp: new Date(),
      time: new Date().toLocaleTimeString(),
      senderId: senderId,
      senderName: this.currentUser?.name || "Unknown",
      senderAvatar: this.currentUser?.avatarUrl || ""
    };
    
    await this.messageService.sendPrivateMessage(conversationId, messageData);
  
    // Clear the message input
    this.privateMessage = '';
    this.imageUrl = null;
    if (textArea) this.resetTextareaHeight(textArea);
  
    // Reload emojis and scroll to the bottom
    await this.loadLastUsedEmojis();  // Aufruf ohne Parameter
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

  toggleEmojiPickerForMessage(msg: any): void {
    const isCurrentlyVisible = msg.isEmojiPickerVisible;
  
    // Schließe alle Emoji-Picker in `privateMessages`
    this.privateMessages.forEach((m) => m.isEmojiPickerVisible = false);
  
    // Setze den Zustand für die ausgewählte Nachricht basierend auf dem vorherigen Zustand
    msg.isEmojiPickerVisible = !isCurrentlyVisible;
  }

  addEmojiToMessage(event: any, msg: any): void {
    if (!msg.content.emojis) {
        msg.content.emojis = [];  // Initialisiere das Emoji-Array, falls es noch nicht existiert
    }
  
    const newEmoji = event.emoji.native;
    const existingEmoji = msg.content.emojis.find((e: any) => e.emoji === newEmoji);
  
    if (existingEmoji) {
        existingEmoji.count += 1;  // Erhöhe die Zählung, wenn das Emoji bereits existiert
    } else {
        msg.content.emojis.push({ emoji: newEmoji, count: 1 });  // Füge neues Emoji hinzu
    }
  
    const conversationId = this.messageService.generateConversationId(this.currentUser.id, this.recipientId);
  
    // Behandlung für gesendete Emojis
    if (msg.senderName === this.currentUser?.name) {
        if (!this.lastUsedEmojisSent.includes(newEmoji)) {
            this.lastUsedEmojisSent = [newEmoji, ...this.lastUsedEmojisSent].slice(0, 2);
        }
        this.messageService.saveLastUsedEmojis(conversationId, this.lastUsedEmojisSent, 'sent');
    } 
    // Behandlung für empfangene Emojis
    else {
        if (!this.lastUsedEmojisReceived.includes(newEmoji)) {
            this.lastUsedEmojisReceived = [newEmoji, ...this.lastUsedEmojisReceived].slice(0, 2);
        }
        this.messageService.saveLastUsedEmojis(conversationId, this.lastUsedEmojisReceived, 'received');
    }
  
    msg.isEmojiPickerVisible = false;
  
    // Emoji-Reaktionen in Firestore aktualisieren
    this.messageService.updatePrivateMessageEmojis(conversationId, msg.id, msg.content.emojis)
      .then(() => console.log('Emoji erfolgreich zur Nachricht hinzugefügt.'))
      .catch((error) => console.error('Fehler beim Hinzufügen des Emojis:', error));
  }

  async initializeConversation(): Promise<void> {
    const conversationId = this.messageService.generateConversationId(this.currentUser.id, this.recipientId);
  
    // Lade Emojis für gesendete Nachrichten
    this.messageService.getLastUsedEmojis(conversationId, 'sent').then(emojisSent => {
      this.lastUsedEmojisSent = emojisSent || [];
    }).catch(error => console.error("Fehler beim Laden gesendeter Emojis:", error));
  
    // Lade Emojis für empfangene Nachrichten
    this.messageService.getLastUsedEmojis(conversationId, 'received').then(emojisReceived => {
      this.lastUsedEmojisReceived = emojisReceived || [];
    }).catch(error => console.error("Fehler beim Laden empfangener Emojis:", error));
  
    // Nachrichten für den aktuellen Chat abonnieren
    this.messageService.listenForPrivateMessages(conversationId, (messages: Message[]) => {
      this.privateMessages = messages.map((msg: Message) => ({
        ...msg,
        content: { ...msg.content, emojis: msg.content?.emojis || [] }
      }));
      this.scrollToBottom();
    });
  }
  
toggleEditOptions(msgId: string): void {
  // Umschalten der Sichtbarkeit für das angeklickte Symbol
  if (this.currentMessageId === msgId && this.showEditOptions) {
    this.showEditOptions = false;
    this.currentMessageId = null;
  } else {
    this.showEditOptions = true;
    this.currentMessageId = msgId;
  }
}

startEditing(msg: any): void {
  msg.isEditing = true; // Bearbeitungsmodus aktivieren
  this.originalMessage = { ...msg }; // Originalnachricht speichern
  this.showEditOptions = false; // Optionen schließen
}

toggleEditMessage(msg: any): void {
  msg.isEditing = true; // Öffnet das Bearbeitungsfeld
  this.originalMessage = { ...msg }; // Speichere eine Kopie der ursprünglichen Nachricht
}

cancelEditing(msg: any): void {
  msg.isEditing = false; // Bearbeiten beenden
  if (this.originalMessage) {
    // Stelle die ursprüngliche Nachricht wieder her
    msg.content = { ...this.originalMessage.content }; // Nur Inhalt kopieren
    this.originalMessage = null; // Originalnachricht zurücksetzen
  }
  this.showEditOptions = false; // Bearbeitungsoptionen schließen
}

async saveMessage(msg: any): Promise<void> {
  if (msg?.isEditing !== undefined && this.conversationId) {
    msg.isEditing = false; // Bearbeiten beenden
    const messageId = msg.id;

    if (messageId) {
      try {
        await this.messageService.updatePrivateMessageContent(this.conversationId, messageId, msg.content);
        console.log('Nachricht erfolgreich gespeichert');
        
        // Aktualisiere die Nachricht in der lokalen Liste
        this.privateMessages = this.privateMessages.map((m) => {
          if (m.id === messageId) {
            return { ...msg, isEditing: false };
          }
          return m;
        });
      } catch (err) {
        console.error('Fehler beim Speichern der Nachricht:', err);
      }
    } else {
      console.error('Speichern fehlgeschlagen: Message ID fehlt.');
    }
  }
}

showTooltip(event: MouseEvent, emoji: string, senderName: string): void {
  this.tooltipVisible = true;
  this.tooltipEmoji = emoji;
  this.tooltipSenderName = senderName;
  // Positioniere den Tooltip direkt über dem Emoji
  this.tooltipPosition = {
    x: event.clientX ,
    y: event.clientY - 40
};
}

hideTooltip(): void {
  this.tooltipVisible = false;
}
}



















 