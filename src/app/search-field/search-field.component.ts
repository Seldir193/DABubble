import { Component, Output, EventEmitter, HostListener } from '@angular/core';
import { UserService } from '../user.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';


import { ViewChild, ElementRef, Input,SimpleChanges  } from '@angular/core';
import { ChannelService } from '../channel.service';
import { MatDialog } from '@angular/material/dialog';
import { formatDate } from '@angular/common';
import { AddMemberSelectorComponent } from '../add-member-selector/add-member-selector.component';
import { Message } from '../message.models';
import { MessageService } from '../message.service';
import { ActivatedRoute} from '@angular/router';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { Router } from '@angular/router';
import { OverlayModule } from '@angular/cdk/overlay';

export interface MessageContent {
  text?: string;
  image?: string | ArrayBuffer | null;


} emojis: Array<{ emoji: string; count: number }>;

interface EmojiItem {
  emoji: string;
  count: number;
}

@Component({
  selector: 'app-search-field',
  standalone: true,
  imports: [CommonModule, FormsModule,PickerModule,OverlayModule],
  templateUrl: './search-field.component.html',
  styleUrls: ['./search-field.component.scss'],
})
export class SearchFieldComponent {
  @Output() close = new EventEmitter<void>();
  @Output() memberSelected = new EventEmitter<any>(); // Event, um das ausgewählte Mitglied zu übergeben
  searchQuery: string = '';
  filteredMembers: any[] = [];
  noResultsFound: boolean = false; // Neues Feld für die Fehlermeldung


  @ViewChild('messageList') messageList!: ElementRef;
  @Input() recipientName: string = '';
  @Input() recipientId: string = '';
  //@Output() memberSelected = new EventEmitter<any>();

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

 
  selectedRecipients: any[] = [];
  messageToAll: string = '';

  // Falls du neu hinzugefügte User in einem separaten Array speichern willst:
  systemMessages: any[] = [];


  showAtDropdown: boolean = false; // Steuert Sichtbarkeit des Dropdown
  allMembers: any[] = [];     
  isDesktop = false;

  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private channelService: ChannelService,
    private dialog: MatDialog,
    private messageService: MessageService,
    private router: Router
  ) { }

  
  async ngOnInit(): Promise<void> {
    await this.loadCurrentUser();
    this.loadRecipientData();
    this.checkDesktopWidth();
    this.currentUser = await this.userService.getCurrentUserData();


    if (this.currentUser && this.recipientId) {
      this.conversationId = this.messageService.generateConversationId(
        this.currentUser.id,
        this.recipientId
      );
  
      // statt this.messageService.getPrivateMessages(...) => getMessagesOnce('private', ...)
      this.messageService.getMessagesOnce('private', this.conversationId)
        .then((messages: Message[]) => {
          this.privateMessages = messages.map((msg) => ({
            ...msg,
            content: { ...msg.content, emojis: msg.content?.emojis || [] }
          }));
          this.scrollToBottom();
        })
        .catch(error => {
          console.error("❌ Fehler beim Abrufen der privaten Nachrichten:", error);
        });
  
      // Lade die letzten Emojis
      this.loadLastUsedEmojis();
    }
  }

  @HostListener('window:resize')
   onResize() {
     this.checkDesktopWidth();
   }
 
   checkDesktopWidth() {
     this.isDesktop = window.innerWidth >= 1278;
   }
 



  private async loadLastUsedEmojis(): Promise<void> {
    if (!this.conversationId) return;
  
    try {
      const messages = await this.messageService.getMessagesOnce('private', this.conversationId);
      const lastMessages = messages.slice(-10);
  
      this.lastUsedEmojisSent = [];
      this.lastUsedEmojisReceived = [];
  
      // Tipp: Definiere in deinem Projekt eine Schnittstelle:
      // interface EmojiItem { emoji: string; count: number }
      // Dann kannst du e: EmojiItem schreiben statt e: { emoji: string, count: number }
  
      lastMessages.forEach((msg: Message) => {
        if (msg.content?.emojis) {
          if (msg.senderId === this.currentUser.id) {
            this.lastUsedEmojisSent.push(
              ...msg.content.emojis.map((e: { emoji: string; count: number }) => e.emoji)
            );
          } else {
            this.lastUsedEmojisReceived.push(
              ...msg.content.emojis.map((e: { emoji: string; count: number }) => e.emoji)
            );
          }
        }
      });
  
      this.lastUsedEmojisSent = [...new Set(this.lastUsedEmojisSent)].slice(0, 5);
      this.lastUsedEmojisReceived = [...new Set(this.lastUsedEmojisReceived)].slice(0, 5);
    } catch (error) {
      console.error("❌ Fehler beim Laden der letzten Emojis:", error);
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
  
      // Neue Methode: getMessagesOnce('private', ...)
      this.messageService.getMessagesOnce('private', conversationId)
        .then((messages: Message[]) => {
          this.privateMessages = messages.map((msg: Message) => ({
            ...msg,
            // Falls timestamp nicht immer Date ist, wandeln wir es hier um:
            timestamp: msg.timestamp instanceof Date
              ? msg.timestamp
              : new Date(),
          }));
          this.scrollToBottom();
        })
        .catch(error => {
          console.error("❌ Fehler beim Abrufen der privaten Nachrichten:", error);
        });
    } else {
      console.error("❌ Fehlende Benutzer-ID oder Empfänger-ID beim Laden der Nachrichten");
    }
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
    
      this.messageToAll += event.emoji.native;
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
      this.sendMessageToAll(textArea);
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
   
  this.messageToAll += '@';
  }
  

  toggleEmojiPickerForMessage(msg: any): void {
    const isCurrentlyVisible = msg.isEmojiPickerVisible;
  
    // Schließe alle Emoji-Picker in `privateMessages`
    this.privateMessages.forEach((m) => m.isEmojiPickerVisible = false);
  
    // Setze den Zustand für die ausgewählte Nachricht basierend auf dem vorherigen Zustand
    msg.isEmojiPickerVisible = !isCurrentlyVisible;
  }


  ngOnChanges(changes: SimpleChanges): void {
    if (changes['recipientId'] && !changes['recipientId'].isFirstChange()) {
      this.loadRecipientData();
      this.loadPrivateMessages();
    }
  }
  
  generateConversationId(userId1: string, userId2: string): string {
    return [userId1, userId2].sort().join('_'); // Alphabetisch sortieren und verbinden
  }

  addEmojiToMessage(event: any, msg: any): void {
    if (!msg.content.emojis) {
      msg.content.emojis = [];
    }
  
    const newEmoji = event.emoji.native;
    const existingEmoji = msg.content.emojis.find((e: any) => e.emoji === newEmoji);
  
    if (existingEmoji) {
      existingEmoji.count += 1;
    } else {
      msg.content.emojis.push({ emoji: newEmoji, count: 1 });
    }
  
    // Aktualisiere die Liste der letzten Emojis
    if (msg.senderName === this.currentUser?.name) {
      if (!this.lastUsedEmojisSent.includes(newEmoji)) {
        this.lastUsedEmojisSent = [newEmoji, ...this.lastUsedEmojisSent].slice(0, 2);
      }
    } else {
      if (!this.lastUsedEmojisReceived.includes(newEmoji)) {
        this.lastUsedEmojisReceived = [newEmoji, ...this.lastUsedEmojisReceived].slice(0, 2);
      }
    }
  
    msg.isEmojiPickerVisible = false;
  
    // Neu: updateMessage(...) anstatt updatePrivateMessageEmojis(...)
    this.messageService.updateMessage(msg.id, {
      'content.emojis': msg.content.emojis
    })
    .then(() => console.log('✅ Emoji erfolgreich zur Nachricht hinzugefügt.'))
    .catch((error) => console.error('❌ Fehler beim Hinzufügen des Emojis:', error));
  }

  async saveMessage(msg: any): Promise<void> {
    if (msg?.isEditing !== undefined) {
      msg.isEditing = false; // Bearbeiten beenden
      const messageId = msg.id;
  
      if (messageId) {
        try {
          // Anstelle von `updatePrivateMessageContent(...)` rufst du jetzt `updateMessage(...)` auf
          await this.messageService.updateMessage(messageId, {
            content: msg.content
          });
          console.log('✅ Nachricht erfolgreich gespeichert.');
  
          // ✅ Aktualisiere die Nachricht in der lokalen Liste
          this.privateMessages = this.privateMessages.map((m) =>
            m.id === messageId ? { ...msg, isEditing: false } : m
          );
        } catch (err) {
          console.error('❌ Fehler beim Speichern der Nachricht:', err);
        }
      } else {
        console.error('❌ Speichern fehlgeschlagen: Message ID fehlt.');
      }
    }
  }
  

 


async initializeConversation(): Promise<void> {
  // 1) Prüfe, ob Empfänger & aktueller Benutzer existieren
  if (!this.currentUser || !this.recipientId) {
    console.error("❌ Fehler: Empfänger oder aktueller Benutzer nicht gefunden.");
    return;
  }

  // 2) conversationId erzeugen
  const conversationId = this.messageService.generateConversationId(
    this.currentUser.id,
    this.recipientId
  );

  // 3) Emojis aus den letzten 10 Nachrichten laden (getMessagesOnce('private', ...))
  try {
    const messages: Message[] = await this.messageService.getMessagesOnce('private', conversationId);
    const lastMessages = messages.slice(-10);

    this.lastUsedEmojisSent = [];
    this.lastUsedEmojisReceived = [];

    // Typisiere msg als Message
    lastMessages.forEach((msg: Message) => {
      // Falls msg.content.emojis existiert
      if (msg.content?.emojis) {
        // Typisiere e als EmojiItem (oder any) in .map()
        if (msg.senderId === this.currentUser.id) {
          this.lastUsedEmojisSent.push(
            ...msg.content.emojis.map((e: EmojiItem) => e.emoji)
          );
        } else {
          this.lastUsedEmojisReceived.push(
            ...msg.content.emojis.map((e: EmojiItem) => e.emoji)
          );
        }
      }
    });

    // Doppelte entfernen + auf max. 5 begrenzen
    this.lastUsedEmojisSent = [...new Set(this.lastUsedEmojisSent)].slice(0, 5);
    this.lastUsedEmojisReceived = [...new Set(this.lastUsedEmojisReceived)].slice(0, 5);

  } catch (error: any) {
    console.error("❌ Fehler beim Laden der letzten Emojis:", error);
  }

  // 4) Nachrichten einmalig laden und in privateMessages speichern
  this.messageService.getMessagesOnce('private', conversationId)
    .then((messages: Message[]) => {
      this.privateMessages = messages.map((msg: Message) => ({
        ...msg,
        // Falls msg.content.emojis fehlen könnte, fallback zu []
        content: { ...msg.content, emojis: msg.content?.emojis || [] }
      }));
      this.scrollToBottom();
    })
    .catch((error: any) => {
      console.error("❌ Fehler beim Abrufen der privaten Nachrichten:", error);
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



selectMember(member: any): void {
  console.log('Mitglied ausgewählt:', member);
  this.memberSelected.emit(member); // Mitglied weitergeben
  this.closeSearch(); // Schließe das Suchfeld nach der Auswahl
}

closeSearch(): void {
  this.close.emit();
}

















onSearchInput(): void {
  if (this.searchQuery.trim()) {
    this.userService.getUsersByFirstLetter(this.searchQuery).then(users => {
      this.filteredMembers = users.map(user => ({
        id: user.id || user.uid,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl || 'assets/img/avatar.png',
      }));
      this.noResultsFound = users.length === 0;
    }).catch(() => {
      console.error('Fehler beim Abrufen der Benutzer.');
      this.filteredMembers = [];
      this.noResultsFound = true;
    });
  } else {
    this.filteredMembers = [];
    this.noResultsFound = false;
  }
}










async sendMessageToAll(textArea: HTMLTextAreaElement): Promise<void> {
  if (!this.messageToAll.trim() && !this.imageUrl) {
    return; // Keine Nachricht und kein Bild => nicht senden
  }

  if (!this.currentUser?.id) {
    console.error('Kein aktueller Benutzer vorhanden.');
    return;
  }

  // Schleife über alle ausgewählten Empfänger
  for (const recipient of this.selectedRecipients) {
    const conversationId = this.messageService.generateConversationId(
      this.currentUser.id,
      recipient.id
    );

    const messageData = {
      type: 'private' as const,
      conversationId,
      content: {
        text: this.messageToAll.trim(),
        image: (typeof this.imageUrl === 'string' ? this.imageUrl : ''),
        emojis: []
      },
      date: formatDate(new Date(), 'dd.MM.yyyy', 'en'),
      timestamp: new Date(),
      time: new Date().toLocaleTimeString(),
      senderId: this.currentUser.id,
      senderName: this.currentUser.name || 'Unbekannt',
      senderAvatar: this.currentUser.avatarUrl || '',
      recipientId: recipient.id
    };

    try {
      await this.messageService.sendMessage(messageData);
      console.log(`✅ Nachricht (inkl. Bild/Emoji) an ${recipient.name || recipient.email} gesendet.`);
    } catch (error) {
      console.error('❌ Fehler beim Senden der Nachricht:', error);
    }
  }

  // Felder leeren
  this.messageToAll = '';
  this.imageUrl = null;
 // textArea.style.height = 'auto';

  if (textArea) this.resetTextareaHeight(textArea);


  // Emoji-Picker schließen
  this.isEmojiPickerVisible = false;

  // ggf. Scroll ans Ende
  this.scrollToBottom();
}


addRecipient(member: any) {
  // Prüfen, ob dieser Benutzer schon ausgewählt ist
  const alreadySelected = this.selectedRecipients.some(
    (m) => m.id === member.id
  );
  if (!alreadySelected) {
    this.selectedRecipients.push(member);
 // Hier kommt die Systemnachricht:
 const systemMessage = {
  type: 'system',
  content: {
    text: `Benutzer ${member.email} hinzugefügt.`
  },
  timestamp: new Date()
};

// ... in dein privateMessages-Array pushen
//this.privateMessages.push(systemMessage);
   
  }

  // Dropdown schließen, Suche zurücksetzen (optional)
  this.searchQuery = '';
  this.filteredMembers = [];
}





removeRecipient(member: any) {
  const index = this.selectedRecipients.findIndex(m => m.id === member.id);
  if (index > -1) {
    this.selectedRecipients.splice(index, 1);
  }
}



// =============== SCROLLEN + SYSTEMMESSAGE (optional) ===============



addSystemMessage(text: string) {
  const sysMsg = {
    type: 'system',
    content: { text },
    timestamp: new Date(),
  };
  // hier in dein privateMessages oder systemMessages pushen
  this.privateMessages.push(sysMsg);
}





















toggleAtDropdown(): void {
  // Wenn wir das Dropdown zum ersten Mal öffnen, laden wir Benutzer
  if (!this.showAtDropdown) {
    this.loadAllUsers();
  }
  this.showAtDropdown = !this.showAtDropdown;
}

// Nutzer laden (oder du nutzt dein eigenes getAllUsers,...)
loadAllUsers(): void {
  this.userService.getAllUsers()
    .then(users => {
      this.allMembers = users.map(u => ({
        id: u.id,
        //email: u.email,
        name: u.name,
        avatarUrl: u.avatarUrl || 'assets/img/avatar.png'
      }));
    })
    .catch(err => console.error('Fehler beim Laden der Nutzer:', err));
}

// Beim Klick auf einen User in der Dropdown-Liste
addAtSymbolFor(member: any): void {
  
  this.messageToAll += '@' + member.name + ' ';
  this.showAtDropdown = false; // Dropdown schließen
}

}







