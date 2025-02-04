import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { ThreadChannelService } from '../thread-channel.service';
import { UserService } from '../user.service';


@Component({
  selector: 'app-thread-channel',
  standalone: true,
  imports: [CommonModule, FormsModule, PickerModule],
  templateUrl: './thread-channel.component.html',
  styleUrls: ['./thread-channel.component.scss'],
})
export class ThreadChannelComponent implements OnInit {
  @Input() parentMessage: any = null;
  @Input() recipientName: string = '';
  @Output() closeThread = new EventEmitter<void>();
  @Output() openThread = new EventEmitter<any>();
  @ViewChild('messageList') messageList!: ElementRef;
  @Input() channelName: string = '';
  @Input() channelId!: string;

  isTextareaExpanded: boolean = false;
  selectedChannel: { id: string; name: string; members: any[]; description?: string; createdBy?: string } | null = null;
  threadMessages: any[] = [];
  privateMessage: string = '';
  currentUser: any;
  imageUrl: string | null = null;
  isEmojiPickerVisible: boolean = false;
  isImageModalOpen: boolean = false;
  tooltipVisible: boolean = false;
  tooltipPosition = { x: 0, y: 0 };
  tooltipEmoji: string = '';
  tooltipSenderName: string = '';
  lastUsedEmojisSent: string[] = [];
  lastUsedEmojisReceived: string[] = [];
  showEditOptions: boolean = false;
  currentMessageId: string | null = null;
  originalMessage: any = null;
  messages: any[] = [];
  channelMessage: string = '';

  currentDate: Date = new Date();
  yesterdayDate: Date = this.getYesterdayDate();
 

  constructor( 
    private threadChannelService: ThreadChannelService,
    private userService: UserService
  ) {}

  

  getFormattedDate(dateString: string | Date): string {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Ungültiges Datum';
    }
  
    if (this.isSameDay(date, new Date())) {
      return 'Heute';
    } else if (this.isSameDay(date, this.getYesterdayDate())) {
      return 'Gestern';
    }
  
    return date.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' });
  }
  
  
  private getYesterdayDate(): Date {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  }
  

  isSameDay(timestamp1: Date | string, timestamp2: Date | string): boolean {
    if (!timestamp1 || !timestamp2) {
      return false;
    }
  
    const date1 = new Date(timestamp1);
    const date2 = new Date(timestamp2);
  
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  handleKeyDown(event: KeyboardEvent, textArea: HTMLTextAreaElement): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
  
      // Prüfe, ob eine Nachricht oder ein Bild vorhanden ist
      if (this.channelMessage.trim() || this.imageUrl) {
        this.sendThreadMessage(textArea); // Sende die Nachricht im Thread
      } else {
        console.warn('Keine Nachricht oder Bild vorhanden, nichts zu senden.');
      }
  
      // Setze die Textarea-Höhe zurück
      if (textArea) {
        this.resetTextareaHeight(textArea);
      }
    }
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

  closeThreadEvent(): void {
    this.closeThread.emit();
  }
  

  onImageSelected(event: Event, textArea: HTMLTextAreaElement): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imageUrl = e.target?.result as string;
        if (textArea) {
          this.adjustTextareaHeight(textArea); // Textarea vergrößern
        }
        this.isTextareaExpanded = true;
      };
      reader.readAsDataURL(file);
    }
  }
  
  sendMessage(): void {
    console.log('Nachricht gesendet:', this.channelMessage);
    this.channelMessage = ''; // Zurücksetzen des Eingabefelds
  }
  
  saveMessage(msg: any): void {
    msg.isEditing = false; // Beende den Bearbeitungsmodus
    console.log('Nachricht gespeichert:', msg);
  }
  
  cancelEditing(msg: any): void {
    msg.isEditing = false; // Setze den Bearbeitungsmodus auf `false`
    if (this.originalMessage) {
      msg.content = { ...this.originalMessage.content }; // Stelle die ursprüngliche Nachricht wieder her
      this.originalMessage = null; // Lösche die gespeicherte Originalnachricht
    }
    this.showEditOptions = false; // Schließe Bearbeitungsoptionen
  }
  
  showTooltip(event: MouseEvent, emoji: string, senderName: string): void {
    this.tooltipVisible = true;
    this.tooltipEmoji = emoji;
    this.tooltipSenderName = senderName;
    this.tooltipPosition = { x: event.clientX, y: event.clientY - 40 };
  }
  
  hideTooltip(): void {
    this.tooltipVisible = false;
  }
  
toggleEditOptions(msgId: string): void {
  if (this.currentMessageId === msgId && this.showEditOptions) {
    this.showEditOptions = false;
    this.currentMessageId = null;
  } else {
    this.showEditOptions = true;
    this.currentMessageId = msgId;
  }
}

startEditing(msg: any): void {
  msg.isEditing = true; // Aktiviere den Bearbeitungsmodus
  this.originalMessage = { ...msg }; // Speichere die ursprüngliche Nachricht
}

openImageModal(): void {
  this.isImageModalOpen = true;
}

closeImageModal(): void {
  this.isImageModalOpen = false;
}

addAtSymbolAndOpenDialog(): void {
  this.channelMessage += '@'; // Füge das "@"-Symbol hinzu
  console.log('Dialog zur Auswahl eines Mitglieds geöffnet');
}

async initializeThread(): Promise<void> {
  if (!this.parentMessage?.id) {
    console.error('Fehler: Kein gültiger parentMessage vorhanden.');
    return;
  }

  const threadId = this.parentMessage.id;
  this.threadChannelService.getLastUsedEmojis(this.channelId,threadId, 'sent').then(emojisSent => {
    this.lastUsedEmojisSent = emojisSent || [];
  }).catch(error => console.error('Fehler beim Laden gesendeter Emojis im Thread:', error));

  this.threadChannelService.getLastUsedEmojis(this.channelId,threadId, 'received').then(emojisReceived => {
    this.lastUsedEmojisReceived = emojisReceived || [];
  }).catch(error => console.error('Fehler beim Laden empfangener Emojis im Thread:', error));
 
  this.threadChannelService.getThreadMessages(this.channelId,threadId, (messages: any[]) => {
    this.threadMessages = messages.map((message: any) => {
      const updatedMsg = {
        ...message,
        content: { ...message.content, emojis: message.content?.emojis || [] }
      };
      return this.formatMessage(updatedMsg); // Nur konvertieren -> Date, KEIN timestampFormatted

    });
    this.scrollToBottom();
  });
}

private formatMessage(msg: any): any {
  const formattedMsg = { ...msg };

  // Stelle sicher, dass der Timestamp ein gültiges Date-Objekt ist
  if (formattedMsg.timestamp) {
    formattedMsg.timestamp = this.threadChannelService.convertToDate(formattedMsg.timestamp);
  } else {
    formattedMsg.timestamp = new Date(); // Fallback auf aktuelles Datum, wenn kein Timestamp vorhanden ist
  }

  return formattedMsg;
}

private async loadLastUsedEmojis(channelId: string, threadId: string): Promise<void> {
  try {
    this.lastUsedEmojisSent = await this.threadChannelService.getLastUsedEmojis(channelId, threadId, 'sent');
    this.lastUsedEmojisReceived = await this.threadChannelService.getLastUsedEmojis(channelId, threadId, 'received');
  } catch (error) {
    console.error('Fehler beim Laden der letzten Emojis:', error);
  }
}





async sendThreadMessage(textArea: HTMLTextAreaElement): Promise<void> {
  if (!this.channelMessage.trim() && !this.imageUrl) {
    console.warn('Nachricht oder Bild ist leer.');
    return;
  }

  const message = {
    content: {
      text: this.channelMessage || null,
      image: this.imageUrl || null,
      emojis: [],
    },
    senderId: this.currentUser.id,
    senderName: this.currentUser.name,
    senderAvatar: this.currentUser.avatarUrl,
    recipientId: this.parentMessage?.senderId || this.currentUser.id || 'unknown',
    timestamp: new Date(),
  };

  try {
    await this.threadChannelService.addThreadReply(this.channelId, this.parentMessage.id, message);
    this.channelMessage = '';
    this.imageUrl = null;

 if (textArea) {
    this.resetTextareaHeight(textArea); // Sofort zurücksetzen
  }

    this.scrollToBottom();
  } catch (error) {
    console.error('Fehler beim Senden der Nachricht:', error);
  }
}




async ngOnInit(): Promise<void> {
  if (!this.channelId || !this.parentMessage?.id) {
    console.error('Kein gültiges `channelId` oder `parentMessage` verfügbar.');
    return;
  }

  try {
    const threadId = this.parentMessage.id;
    await this.threadChannelService.initializeThread(this.channelId, threadId);

    await this.loadCurrentUser();
    if (!this.currentUser) {
      console.error('Benutzer konnte nicht geladen werden.');
      return;
    }

    await this.loadLastUsedEmojis(this.channelId, threadId);
    this.loadThreadMessages(this.channelId, threadId);
  } catch (error) {
    console.error('Fehler bei der Initialisierung:', error);
  }
}

private loadThreadMessages(channelId: string, threadId: string): void {
  console.log(`Lade Nachrichten für Thread: ${threadId} im Channel: ${channelId}`);
  this.threadChannelService.getThreadMessages(channelId, threadId, (messages) => {
    if (!messages || messages.length === 0) {
      console.log('Keine Nachrichten im Thread gefunden.');
      this.threadMessages = [];
      return;
    }

    this.threadMessages = messages.map((msg) => this.formatMessage(msg));
    console.log('Geladene und formatierte Nachrichten:', this.threadMessages);
    this.scrollToBottom();
  });
}

  private async loadCurrentUser(): Promise<void> {
    try {
      this.currentUser = await this.userService.getCurrentUserData();
    } catch (error) {
      console.error('Fehler beim Laden des Benutzers:', error);
    }
  }

  toggleEmojiPickerForMessage(msg: any): void {
    const isCurrentlyVisible = msg.isEmojiPickerVisible;
    this.threadMessages.forEach((m) => (m.isEmojiPickerVisible = false));
    msg.isEmojiPickerVisible = !isCurrentlyVisible;
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
  
    const threadId = this.parentMessage?.id;
    if (msg.senderName === this.currentUser?.name) {
      if (!this.lastUsedEmojisSent.includes(newEmoji)) {
        this.lastUsedEmojisSent = [newEmoji, ...this.lastUsedEmojisSent].slice(0, 2);
      }
      this.threadChannelService.saveLastUsedEmojis(this.channelId, threadId, this.lastUsedEmojisSent, 'sent');
    } else {
      if (!this.lastUsedEmojisReceived.includes(newEmoji)) {
        this.lastUsedEmojisReceived = [newEmoji, ...this.lastUsedEmojisReceived].slice(0, 2);
      }
      this.threadChannelService.saveLastUsedEmojis(this.channelId, threadId, this.lastUsedEmojisReceived, 'received');
    }
  
    msg.isEmojiPickerVisible = false;
    this.threadChannelService.updatePrivateMessageEmojis(this.channelId, threadId, msg.id, msg.content.emojis)
      .then(() => console.log('Emoji erfolgreich zur Nachricht im Thread hinzugefügt.'))
      .catch((error) => console.error('Fehler beim Hinzufügen des Emojis im Thread:', error));
  }
  
  toggleEmojiPicker(): void {
    this.isEmojiPickerVisible = !this.isEmojiPickerVisible;
  }

  addEmoji(event: any): void {
    if (event?.emoji?.native) {
      this.channelMessage += event.emoji.native; // Emoji zur Nachricht hinzufügen
    }
    this.isEmojiPickerVisible = false; // Emoji-Picker schließen
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messageList) {
        this.messageList.nativeElement.scrollTop = this.messageList.nativeElement.scrollHeight;
      }
    }, 100);
  }

  onClose(): void {
    this.closeThread.emit();
  }
}
