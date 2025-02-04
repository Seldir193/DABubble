import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { MessageService } from '../message.service';
import { UserService } from '../user.service';
import { formatDate } from '@angular/common';
import { ThreadService } from '../thread.service';

@Component({
  selector: 'app-thread',
  standalone: true,
  imports: [CommonModule, FormsModule, PickerModule],
  templateUrl: './thread.component.html',
  styleUrls: ['./thread.component.scss'],
})
export class ThreadComponent implements OnInit {
  @Input() parentMessage: any = null;
  @Input() recipientName: string = '';
  @Output() closeThread = new EventEmitter<void>();
  @ViewChild('messageList') messageList!: ElementRef;
  @Output() openThread = new EventEmitter<any>();

  isTextareaExpanded: boolean = false;
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
  yesterdayDate: Date = this.getYesterdayDate();
  currentDate: Date = new Date();


  formattedParentMessageDate: string = '';
  formattedMessageTime: string = '';


  constructor(
    private messageService: MessageService,
    private userService: UserService,
    private threadService: ThreadService
  ) {}
  // -----------------------------------------------------
  // LIFECYCLE
  // -----------------------------------------------------
  async ngOnInit(): Promise<void> {
    if (!this.parentMessage?.id) {
      console.warn('Kein gültiges `parentMessage` übergeben. Thread kann nicht geladen werden.');
      return;
    }

    const threadId = this.parentMessage.id;
    try {
      // Initialisiere den Thread in Firestore
      await this.threadService.initializeThread(threadId);

      // Lade zuletzt verwendete Emojis
      await this.loadLastUsedEmojis();

      // Lade Benutzerinformationen und Nachrichten des Threads
      await Promise.all([this.loadCurrentUser(), this.loadThreadMessages()]);
      console.log('Thread erfolgreich initialisiert.');
    } catch (error) {
      console.error('Fehler bei der Initialisierung des Threads:', error);
    }

    if (this.parentMessage?.timestamp) {
      this.formattedParentMessageDate = this.getFormattedDate(this.parentMessage.timestamp);
    }

    if (this.parentMessage?.timestamp) {
      // Berechne das Datum nur einmal
      this.formattedMessageTime = new Date(this.parentMessage.timestamp).toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }
  // -----------------------------------------------------
  // INITIALISIERUNG / LADEN
  // -----------------------------------------------------
  private async loadLastUsedEmojis(): Promise<void> {
    if (!this.parentMessage?.id) {
      console.warn('Keine gültige `parentMessage.id` vorhanden. Emojis können nicht geladen werden.');
      return;
    }

    const threadId = this.parentMessage.id;
    try {
      this.lastUsedEmojisSent = await this.threadService.getLastUsedEmojis(threadId, 'sent') || [];
      this.lastUsedEmojisReceived = await this.threadService.getLastUsedEmojis(threadId, 'received') || [];
      console.log('Zuletzt verwendete Emojis erfolgreich geladen:', {
        sent: this.lastUsedEmojisSent,
        received: this.lastUsedEmojisReceived,
      });
    } catch (error) {
      console.error(`Fehler beim Laden der zuletzt verwendeten Emojis für Thread ${threadId}:`, error);
    }
  }

  private async loadCurrentUser(): Promise<void> {
    try {
      this.currentUser = await this.userService.getCurrentUserData();
      if (!this.currentUser) {
        throw new Error('Benutzer konnte nicht geladen werden.');
      }
    } catch (err) {
      console.error('Fehler beim Laden des aktuellen Benutzers:', err);
    }
  }


  async sendThreadMessage(messageContent: string | null, imageUrl: string | null, textArea: HTMLTextAreaElement): Promise<void> {
    if (!messageContent?.trim() && !imageUrl) {
      console.warn('Leere Nachricht oder Bild. Nachricht wurde nicht gesendet.');
      return;
    }
  
    const threadMessage = this.createThreadMessage(messageContent, imageUrl);
  
    try {
      // Nachricht in Firestore speichern
      await this.threadService.addThreadReply(this.parentMessage.id, threadMessage);
  
      // Aktualisiere threadLastResponseTime in Firestore
      await this.threadService.updateThreadLastResponseTime(this.parentMessage.id);
  
      console.log('Nachricht erfolgreich gesendet:', threadMessage);
  
      // Eingabefelder zurücksetzen
      this.privateMessage = '';
      this.imageUrl = null;
  
      if (textArea) {
        this.resetTextareaHeight(textArea);
      }
  
      // Firestore-Listener übernimmt das Hinzufügen
    } catch (err) {
      console.error('Fehler beim Senden der Nachricht im Thread:', err);
    }
  }

 private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messageList) {
        this.messageList.nativeElement.scrollTop = this.messageList.nativeElement.scrollHeight;
      }
    }, 100);
  }


 private loadThreadMessages(): void {
    if (!this.parentMessage?.id) {
      console.error('Fehler: parentMessage.id ist nicht vorhanden.');
      return;
    }

    console.log('Lade Nachrichten für Thread:', this.parentMessage.id);
    this.threadService.getThreadMessages(this.parentMessage.id, (messages) => {
      if (!messages || messages.length === 0) {
        console.log('Keine Nachrichten im Thread gefunden.');
        this.threadMessages = [];
        return;
      }

      // Konvertiere Firestore Timestamps in Date, falls nötig
      this.threadMessages = messages.map((msg) => this.formatMessage(msg));
      console.log('Geladene Nachrichten:', this.threadMessages);

      this.parentMessage.replyCount = this.threadMessages.length;

      this.scrollToBottom();
    });
  }

  getFormattedDate(dateString: string | Date | undefined): string {
    if (!dateString) {
      return '';
    }
  
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return ''; // Fehlerhafte Daten ignorieren
    }
  
    // Datum "Heute" oder "Gestern" anzeigen
    if (this.isSameDay(date, this.currentDate)) {
      return 'Heute';
    }
    if (this.isSameDay(date, this.yesterdayDate)) {
      return 'Gestern';
    }
  
    // Sonst: vollständiges Datum zurückgeben
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    });
  }
  
  
 
  
 private formatMessage(msg: any): any {
  const formattedMsg = { ...msg };

  if (formattedMsg.timestamp) {
    formattedMsg.timestamp = this.threadService.convertToDate(formattedMsg.timestamp);
  } else {
    formattedMsg.timestamp = new Date(); 
  }
  return formattedMsg;
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
  
  private createThreadMessage(messageContent: string | null, imageUrl: string | null): any {
    return {
      content: {
        text: messageContent,
        image: imageUrl,
        emojis: [],
      },
      senderId: this.currentUser.id,
      senderName: this.currentUser.name,
      senderAvatar: this.currentUser.avatarUrl,
      recipientId: this.parentMessage?.senderId,
    };
  }

  // -----------------------------------------------------
  // TEXTAREA / SCROLL / EMOJIS
  // -----------------------------------------------------
  handleKeyDown(event: KeyboardEvent, textArea: HTMLTextAreaElement): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendThreadMessage(this.privateMessage, this.imageUrl, textArea);

      this.privateMessage = '';
      this.imageUrl = null;
      this.resetTextareaHeight(textArea);
    }
  }

  toggleEmojiPicker(): void {
    this.isEmojiPickerVisible = !this.isEmojiPickerVisible;
  }

  addEmoji(event: any): void {
    if (event?.emoji?.native) {
      this.privateMessage += event.emoji.native;
    }
    this.isEmojiPickerVisible = false;
  }

  onImageSelected(event: Event, textArea?: HTMLTextAreaElement): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imageUrl = e.target?.result as string;
        if (textArea) {
          this.adjustTextareaHeight(textArea);
        }
      };
      reader.readAsDataURL(file);
    }
  }
  
  adjustTextareaHeight(textArea: HTMLTextAreaElement): void {
    if (this.imageUrl) {
      textArea.style.paddingBottom = '160px';
    }
  }

  resetTextareaHeight(textArea: HTMLTextAreaElement): void {
    textArea.style.paddingBottom = '20px';
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
      this.threadService.saveLastUsedEmojis(threadId, this.lastUsedEmojisSent, 'sent');
    } else {
      if (!this.lastUsedEmojisReceived.includes(newEmoji)) {
        this.lastUsedEmojisReceived = [newEmoji, ...this.lastUsedEmojisReceived].slice(0, 2);
      }
      this.threadService.saveLastUsedEmojis(threadId, this.lastUsedEmojisReceived, 'received');
    }

    msg.isEmojiPickerVisible = false;
    this.threadService.updatePrivateMessageEmojis(threadId, msg.id, msg.content.emojis)
      .then(() => console.log('Emoji erfolgreich zur Nachricht im Thread hinzugefügt.'))
      .catch((error) => console.error('Fehler beim Hinzufügen des Emojis im Thread:', error));
  }

  // -----------------------------------------------------
  // THREAD INITIALISIEREN / SPEICHERN
  // -----------------------------------------------------
  async initializeThread(): Promise<void> {
    if (!this.parentMessage?.id) {
      console.error('Fehler: Kein gültiger parentMessage vorhanden.');
      return;
    }

    const threadId = this.parentMessage.id;
    this.threadService.getLastUsedEmojis(threadId, 'sent').then(emojisSent => {
      this.lastUsedEmojisSent = emojisSent || [];
    }).catch(error => console.error('Fehler beim Laden gesendeter Emojis im Thread:', error));

    this.threadService.getLastUsedEmojis(threadId, 'received').then(emojisReceived => {
      this.lastUsedEmojisReceived = emojisReceived || [];
    }).catch(error => console.error('Fehler beim Laden empfangener Emojis im Thread:', error));

    this.threadService.getThreadMessages(threadId, (messages: any[]) => {
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

  // -----------------------------------------------------
  // TOOLTIP (EMOJI)
  // -----------------------------------------------------
  showTooltip(event: MouseEvent, emoji: string, senderName: string): void {
    this.tooltipVisible = true;
    this.tooltipEmoji = emoji;
    this.tooltipSenderName = senderName;
    this.tooltipPosition = { x: event.clientX, y: event.clientY - 40 };
  }

  hideTooltip(): void {
    this.tooltipVisible = false;
  }

  // -----------------------------------------------------
  // BILDER / IMAGE-MODAL
  // -----------------------------------------------------
  closeProfileCard(textArea: HTMLTextAreaElement): void {
    this.imageUrl = null;
  }

  openImageModal(): void {
    this.isImageModalOpen = true;
  }

  closeImageModal(): void {
    this.isImageModalOpen = false;
  }

  addAtSymbolAndOpenDialog(): void {
    this.privateMessage += '@';
  }

  onClose(): void {
    this.closeThread.emit();
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

  async saveMessage(msg: any): Promise<void> {
    if (!this.parentMessage?.id || !msg.id) {
      console.error('Thread ID oder Nachricht ID fehlt.');
      return;
    }

    try {
      await this.threadService.updateThreadMessageContent(this.parentMessage.id, msg.id, msg.content.text);
      console.log('Nachricht erfolgreich gespeichert.');
      msg.isEditing = false;
    } catch (error) {
      console.error('Fehler beim Speichern der Nachricht:', error);
    }
  }

  startEditing(msg: any): void {
    msg.isEditing = true;
    this.originalMessage = { ...msg };
    this.showEditOptions = false;
  }

  cancelEditing(msg: any): void {
    msg.isEditing = false;
    if (this.originalMessage) {
      msg.content.text = this.originalMessage.content.text;
      this.originalMessage = null;
    }
  }
  
  openThreadEvent(msg: any): void {
    this.openThread.emit({
      ...msg, 
      timestamp: msg.timestamp, 
    });
  }
}