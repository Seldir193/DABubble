import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef ,SimpleChanges,OnChanges, 
  OnDestroy,    } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { UserService } from '../user.service';
import { ChannelService } from '../channel.service';
import { MessageService } from '../message.service';
import { ChangeDetectorRef } from '@angular/core'; 


@Component({
  selector: 'app-thread-channel',
  standalone: true,
  imports: [CommonModule, FormsModule, PickerModule],
  templateUrl: './thread-channel.component.html',
  styleUrls: ['./thread-channel.component.scss'],
})
export class ThreadChannelComponent implements OnInit ,OnChanges, OnDestroy {
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
  originalParentMessage: any = null; // Speichert die ursprüngliche `parentMessage`

 @Input() selectedThreadChannel: any; // 🔥 Jetzt existiert es als Input

 // Unsubscribe-Funktionen / -Referenzen
 private unsubscribeFromThreadMessages?: () => void;
 private unsubscribeFromReplyCount?: () => void;


  constructor( 
    
    private userService: UserService,
    private channelService: ChannelService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef,
    
  ) {}


  async ngOnInit(): Promise<void> {
    console.log("🧑‍💻 [ngOnInit] Initialisiere Thread (channel-based):", this.parentMessage?.id);
  
    // 1) Mindestanforderungen prüfen
    if (!this.channelId || !this.parentMessage?.id) {
      console.warn("⚠️ `channelId` oder `parentMessage.id` fehlt. Abbruch.");
      return;
    }
  
    // 2) Benutzer laden
    await this.loadCurrentUser();
  
    // 3) Thread initialisieren (Nachrichten-Abo + Emojis)
    await this.initializeThread(this.parentMessage.id);
  
    // 4) Einmalig ReplyCounts laden
    this.loadReplyCounts();
  
    // 5) Live-Abo für ReplyCounts
    this.unsubscribeFromReplyCount = this.messageService.loadReplyCountsLive(
      [this.parentMessage.id],
      "thread-channel",
      (replyCounts) => {
        const data = replyCounts[this.parentMessage.id];
        if (!data) return;
  
        console.log(
          `📊 Live-Update: ${data.count} Antworten für ThreadChannel ${this.parentMessage.id}`
        );
        this.parentMessage.replyCount = data.count;
        this.parentMessage.lastReplyTime = data.lastResponseTime || this.parentMessage.lastReplyTime;
        this.cdr.detectChanges();
      }
    );
  }
  
  private async initializeThread(threadChannelId: string): Promise<void> {
    console.log(`[initializeThread] Starte für Thread-ChannelID: ${threadChannelId}`);

    // Emojis laden
    try {
      const [emojisSent, emojisReceived] = await Promise.all([
        this.messageService.getLastUsedEmojis(threadChannelId, 'sent'),
        this.messageService.getLastUsedEmojis(threadChannelId, 'received'),
      ]);
      this.lastUsedEmojisSent = emojisSent || [];
      this.lastUsedEmojisReceived = emojisReceived || [];
    } catch (error) {
      console.error('Fehler beim Laden der Emojis:', error);
    }

    // Realtime-Subscription für Nachrichten starten
    this.setupThreadSubscription(threadChannelId);
  }


  private async setupThreadSubscription(threadId: string): Promise<void> {
    console.log(`📩 Starte Live-Subscription für Thread-Channel: ${threadId}`);
  
    // 1) Alte Subscription beenden (falls vorhanden)
    if (this.unsubscribeFromThreadMessages) {
      this.unsubscribeFromThreadMessages();
      this.unsubscribeFromThreadMessages = undefined;
    }
  
    // 2) Neue Subscription starten
    this.unsubscribeFromThreadMessages = this.messageService.listenForMessages(
      "thread-channel",
      threadId,
      async (messages: any[]) => {
        console.log("📥 Firestore liefert diese Nachrichten:", messages);
  
        if (!messages?.length) {
          console.log("⚠️ Keine Nachrichten im Thread gefunden.");
          this.threadMessages = [];
          return;
        }
  
        // 3) Falls `parentMessage` nicht gesetzt oder nicht passend → Nachladen
        if (!this.parentMessage || this.parentMessage.id !== threadId) {
          console.warn("⚠️ `parentMessage` nicht korrekt, versuche nachzuladen...");
  
          const parentInMessages = messages.find(msg => msg.id === threadId);
          if (parentInMessages) {
            this.parentMessage = this.formatMessage({
              ...parentInMessages,
              content: parentInMessages.content ?? { text: "🔍 Kein Text gefunden", emojis: [] }
            });
          } else {
            // Falls keine passende Nachricht in `messages`: 
            const parentDoc = await this.messageService.getMessage("thread-channel", threadId);
            if (parentDoc) {
              this.parentMessage = this.formatMessage({
                id: threadId,
                text: parentDoc.content?.text ?? "🔍 Kein Text gefunden",
                senderName: parentDoc.senderName || "Unbekannt",
                senderAvatar: parentDoc.senderAvatar || "assets/img/default-avatar.png",
                timestamp: parentDoc.timestamp ?? new Date(),
                replyCount: parentDoc.replyCount || 0,
                channelName: parentDoc.channelName || "Unbekannt",
                channelId: parentDoc.channelId || null
              });
              console.log("✅ `parentMessage` erfolgreich nachgeladen:", this.parentMessage);
            } else {
              console.error("❌ Parent-Nachricht konnte nicht geladen werden.");
            }
          }
        }
  
        // 4) threadMessages befüllen (alle außer `parentMessage`)
        this.threadMessages = messages
          .filter(msg => msg.id !== this.parentMessage?.id)
          .map(msg => this.formatMessage({
            ...msg,
            content: msg.content ?? { text: "🔍 Kein Text gefunden", emojis: [] }
          }));
  
        console.log("📥 Neue Thread-Nachrichten geladen:", this.threadMessages);
        this.cdr.detectChanges();
  
        // 5) Nach kleinem Delay nach unten scrollen
        setTimeout(() => this.scrollToBottom(), 300);
      }
    );
  }
  

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    // 1) Prüfe, ob `parentMessage` aktualisiert wurde
    if (changes['parentMessage'] && changes['parentMessage'].currentValue) {
      const newMessage = changes['parentMessage'].currentValue;
      console.log('📩 [ngOnChanges] `parentMessage` gewechselt:', newMessage);
  
      // 2) Bestehende Subscriptions beenden
      if (this.unsubscribeFromThreadMessages) {
        this.unsubscribeFromThreadMessages();
        this.unsubscribeFromThreadMessages = undefined;
      }
      if (this.unsubscribeFromReplyCount) {
        this.unsubscribeFromReplyCount();
        this.unsubscribeFromReplyCount = undefined;
      }


      if (newMessage.id === this.parentMessage?.id) {
        // -> Das IST die Parent-Nachricht (möglicherweise ein Update desselben Dokuments)
        console.log("🔄 Update `parentMessage`.");
        this.parentMessage = { 
          ...this.parentMessage, 
          ...newMessage 
          // ggf. Fields gezielt mergen
        };
      } else {
        // -> Eine andere Nachricht => Thread/Kind
        console.log("📌 Nachricht gehört zu `threadMessages`.");
        this.threadMessages.push(newMessage);
      }
      
  
      // 4) Thread neu laden, wenn wir eine valide Thread-Startnachricht haben
      if (this.parentMessage?.id && this.channelId) {
        await this.loadCurrentUser();
        await this.initializeThread(this.parentMessage.id);  // Startet Subscription + Emojis
  
        this.loadReplyCounts(); // Einmaliger Count
  
        // 4a) Live-ReplyCount-Updates
        this.unsubscribeFromReplyCount = this.messageService.loadReplyCountsLive(
          [this.parentMessage.id],
          'thread-channel',
          (replyCounts) => {
            const data = replyCounts[this.parentMessage.id];
            if (!data) return;
  
            console.log(
              `📊 Live-Update: ${data.count} Antworten für ThreadChannel ${this.parentMessage.id}`
            );
            this.parentMessage.replyCount = data.count;
            this.parentMessage.lastReplyTime = data.lastResponseTime || this.parentMessage.lastReplyTime;
            this.cdr.detectChanges();
          }
        );
      }
  
      this.cdr.detectChanges();
    }
  }
  
  ngOnDestroy(): void {
    // Listener beenden
    if (this.unsubscribeFromThreadMessages) {
      this.unsubscribeFromThreadMessages();
    }
    if (this.unsubscribeFromReplyCount) {
      this.unsubscribeFromReplyCount();
    }
  }

  // -----------------------------------
  // 3) REPLY-COUNT
  // -----------------------------------
  loadReplyCounts(): void {
    if (!this.parentMessage?.id) {
      console.warn('⚠️ Kein Thread ausgewählt. Reply-Counts können nicht geladen werden.');
      return;
    }

    console.log('🔄 Lade Reply-Counts für ThreadChannel:', this.parentMessage.id);

    this.messageService
      .getReplyCountsForMessages([this.parentMessage.id], 'thread-channel')
      .then((replyCounts) => {
        const replyCountData = replyCounts[this.parentMessage.id];
        if (replyCountData) {
          this.parentMessage.replyCount = replyCountData.count;
          this.parentMessage.lastReplyTime = replyCountData.lastResponseTime || this.parentMessage.lastReplyTime;

          console.log(`✅ Reply-Count aktualisiert: ${this.parentMessage.replyCount}`);
          this.cdr.detectChanges();
        }
      })
      .catch((error) => {
        console.error('❌ Fehler beim Laden der Reply-Counts:', error);
      });
  }
 // -----------------------------------
  // 5) HILFSFUNKTIONEN
  // -----------------------------------
  private formatMessage(msg: any): any {
    const formattedMsg = { ...msg };
    if (formattedMsg.timestamp) {
      formattedMsg.timestamp = this.messageService.convertToDate(formattedMsg.timestamp);
    } else {
      formattedMsg.timestamp = new Date();
    }
    return formattedMsg;
  }

  private async loadCurrentUser(): Promise<void> {
    console.log("🚀 Lade aktuellen Benutzer...");
    try {
      this.currentUser = await this.userService.getCurrentUserData();
      if (!this.currentUser) {
        throw new Error("Benutzer konnte nicht aus Firestore geladen werden.");
      }
      console.log("✅ Benutzer erfolgreich geladen:", this.currentUser);
    } catch (error) {
      console.error("❌ Fehler beim Laden des Benutzers:", error);
      this.currentUser = null;
    }
  }




  // -----------------------------------
  // 4) SENDEN EINER NACHRICHT
  // -----------------------------------
  async sendThreadMessage(textArea: HTMLTextAreaElement): Promise<void> {
    if (!this.channelMessage.trim()) {
      console.warn('⚠️ Nachricht ist leer.');
      return;
    }

    if (!this.currentUser) {
      await this.loadCurrentUser();
      if (!this.currentUser) {
        console.error('❌ Benutzer konnte nicht geladen werden!');
        return;
      }
    }

    if (!this.parentMessage?.id) {
      console.error('❌ `parentMessage.id` fehlt!');
      return;
    }

    console.log('📩 Nachricht wird gesendet (thread-channel) mit:', {
      senderId: this.currentUser.id,
      senderName: this.currentUser.name,
      threadChannelId: this.parentMessage.id,
    });

    // => type:'thread-channel', 
    // => 'threadChannelId' = this.parentMessage.id (Elternnachricht) 
    // => parentId = this.parentMessage.id (optional, falls du es willst)
    const message = {
      type: 'thread-channel' as const,
      content: { text: this.channelMessage },
      senderId: this.currentUser.id,
      senderName: this.currentUser.name,
      senderAvatar: this.currentUser.avatarUrl,
      threadChannelId: this.parentMessage.id,
      parentId: this.parentMessage.id,
    };

    try {
      const newMessageId = await this.messageService.sendMessage(message);
      console.log(`✅ Nachricht erfolgreich gesendet mit ID: ${newMessageId}`);

      // Firestore ist asynchron => replyCount manuell erhöhen
      this.parentMessage.replyCount = (this.parentMessage.replyCount || 0) + 1;

      this.cdr.detectChanges();
      this.channelMessage = '';
      if (textArea) {
        this.resetTextareaHeight(textArea);
      }
      this.scrollToBottom();
    } catch (error) {
      console.error('❌ Fehler beim Senden der Nachricht:', error);
    }
  }

 

































 
  
private waitForMessageToRender(messageId: string, retries = 5): void {
  if (retries === 0) {
    console.warn(`⚠️ Nachricht nicht gefunden nach mehreren Versuchen: ${messageId}`);
    return;
  }

  setTimeout(() => {
    const messageElement = document.getElementById(`message-${messageId}`);

    if (messageElement) {
      console.log(`📜 Scrolle zur Nachricht: ${messageId}`);
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

      messageElement.classList.add('highlight');
      setTimeout(() => messageElement.classList.remove('highlight'), 2000);
    } else {
      console.warn(`⚠️ Nachricht nicht gefunden (${retries} Versuche übrig), erneuter Versuch...`);
      this.waitForMessageToRender(messageId, retries - 1);
    }
  }, 300);
}

private async loadLastUsedEmojis(threadId: string): Promise<void> {
  try {
    this.lastUsedEmojisSent = await this.messageService.getLastUsedEmojis(threadId, 'sent');
    this.lastUsedEmojisReceived = await this.messageService.getLastUsedEmojis(threadId, 'received');
  } catch (error) {
    console.error('Fehler beim Laden der letzten Emojis:', error);
  }
}

highlightMessage(messageId: string, retries = 5): void {
  setTimeout(() => {
    const messageElement = document.getElementById(`message-${messageId}`);
  
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageElement.classList.add('highlight');
  
      setTimeout(() => messageElement.classList.remove('highlight'), 2000);
    } else if (retries > 0) {
      console.warn(`⚠️ Nachricht nicht gefunden (${retries} Versuche übrig), erneuter Versuch...`);
      this.highlightMessage(messageId, retries - 1);
    }
  }, 500);
}

toggleEmojiPickerForMessage(msg: any): void {
  const isCurrentlyVisible = msg.isEmojiPickerVisible;
  this.threadMessages.forEach((m) => (m.isEmojiPickerVisible = false));
  msg.isEmojiPickerVisible = !isCurrentlyVisible;
}

convertTimestamp(timestamp: any): Date {
  if (!timestamp) return new Date(); // Falls kein Timestamp existiert, gib aktuelles Datum zurück
  if (timestamp.toDate) return timestamp.toDate(); // Firestore-Timestamp -> Date
  if (timestamp instanceof Date) return timestamp; // Falls es bereits ein Date ist, gib es zurück
  return new Date(timestamp); // Falls es eine Zahl ist (Millisekunden seit 1970), umwandeln
}

async addEmojiToMessage(event: any, msg: any): Promise<void> {
  if (!msg.content.emojis) {
    msg.content.emojis = [];
  }

  const newEmoji = event.emoji.native;
  const existingEmoji = msg.content.emojis.find((e: { emoji: string }) => e.emoji === newEmoji);

  if (existingEmoji) {
    existingEmoji.count += 1;
  } else {
    msg.content.emojis.push({ emoji: newEmoji, count: 1 });
  }

  const threadId = this.parentMessage?.id;
  const isSentMessage = msg.senderId === this.currentUser?.id;
  const type = isSentMessage ? 'sent' : 'received';

  await this.updateLastUsedEmojis(newEmoji, type);  // 🔥 Hier aktualisieren wir je nach Nachrichtentyp!

  try {
    await this.messageService.updateMessage(msg.id, {
      content: {
        ...msg.content,
        emojis: msg.content.emojis,
      },
    });
    console.log(`✅ Emoji erfolgreich zur Nachricht hinzugefügt: ${newEmoji} (Type: ${type})`);

    await this.updateLastUsedEmojis(newEmoji, type);
  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren der Nachricht mit Emoji:', error);
  }
}

private async updateLastUsedEmojis(emoji: string, type: 'sent' | 'received'): Promise<void> {
  const targetArray = type === 'sent' ? this.lastUsedEmojisSent : this.lastUsedEmojisReceived;

  // Füge das Emoji nur hinzu, wenn es noch nicht in der Liste ist
  if (!targetArray.includes(emoji)) {
    targetArray.unshift(emoji);

    // Halte die Liste auf maximal 5 Einträge
    if (targetArray.length > 5) {
      targetArray.pop();
    }

    try {
      await this.messageService.saveLastUsedThreadEmojis(this.parentMessage?.id, targetArray, type);
      console.log(`✅ Zuletzt verwendete Emojis (${type}) aktualisiert:`, targetArray);

      // 🔥 Falls es sich um empfangene Emojis handelt, sofort updaten
     
    } catch (error) {
      console.error(`❌ Fehler beim Speichern der zuletzt verwendeten Emojis (${type}):`, error);
    }
  }
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

scrollToBottom(): void {
  try {
    setTimeout(() => {
      if (this.messageList?.nativeElement) {
        this.messageList.nativeElement.scrollTop = this.messageList.nativeElement.scrollHeight;
      }
    }, 500); // 🔥 Verzögerung von 500ms, damit alle Nachrichten geladen sind
  } catch (err) {
    console.error('❌ Fehler beim Scrollen:', err);
  }
}

onClose(): void {
  this.closeThread.emit();
}

getFormattedTime(timestamp: any): string {
  let date: Date = this.convertTimestamp(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); // ⏳ Nur Stunden & Minuten
}

getFormattedDate(timestamp: any): string {
  if (!timestamp) {
    console.warn('⚠️ Kein Timestamp vorhanden für getFormattedDate:', timestamp);
    return 'Kein Datum';
  }

  let date: Date;

  // ✅ Prüfen, ob es sich um einen Firestore-Timestamp handelt
  if (typeof timestamp === 'object' && 'seconds' in timestamp) {
    date = new Date(timestamp.seconds * 1000);
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    date = new Date(timestamp);
  }

  if (isNaN(date.getTime())) {
    console.error('❌ Ungültiges Datum erkannt:', timestamp);
    return 'Ungültiges Datum';
  }

  // ✅ Falls das Datum von heute ist → "Heute"
  if (this.isSameDay(date, new Date())) {
    return 'Heute';
  }

  // ✅ Falls das Datum von gestern ist → "Gestern"
  if (this.isSameDay(date, this.getYesterdayDate())) {
    return 'Gestern';
  }

  // ✅ Falls älter → normales Datum in Format "4. Februar 2025"
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
}

public isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
}

// ✅ Funktion zum Abrufen des gestrigen Datums
private getYesterdayDate(): Date {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday;
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
//this.originalMessage = { ...msg }; // Speichere die ursprüngliche Nachricht

this.originalMessage = JSON.parse(JSON.stringify(msg)); // Tiefkopie der Originalnachricht speichern
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
}