import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef ,SimpleChanges,OnChanges, HostListener,
  OnDestroy,    } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { UserService } from '../user.service';
import { ChannelService } from '../channel.service';
import { MessageService } from '../message.service';
import { ChangeDetectorRef } from '@angular/core'; 

import { Message} from '../message.models';
import { OverlayModule } from '@angular/cdk/overlay';

@Component({
  selector: 'app-thread-channel',
  standalone: true,
  imports: [CommonModule, FormsModule, PickerModule, OverlayModule],
  templateUrl: './thread-channel.component.html',
  styleUrls: ['./thread-channel.component.scss'],
})
export class ThreadChannelComponent implements OnInit ,OnChanges, OnDestroy {
  //@Input() parentMessage: any = null;
  @Input() parentMessage: Message | null = null;


  @Input() recipientName: string = '';
  @Output() closeThread = new EventEmitter<void>();
  @Output() openThread = new EventEmitter<any>();
  @ViewChild('messageList') messageList!: ElementRef;
  @Input() channelName: string = '';
  @Input() channelId!: string;

  isTextareaExpanded: boolean = false;
  selectedChannel: { id: string; name: string; members: any[]; description?: string; createdBy?: string } | null = null;
 // threadMessages: any[] = [];
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
  originalParentMessage: any = null; 
  

  threadMessages: Message[] = [];
  
  

  showLargeImage = false;
  largeImageUrl: string | null = null;

  isDesktop = false;

  
  allUsers: any[] = [];

  // Steuert Overlay
  showUserDropdown: boolean = false;

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
    this.checkDesktopWidth();
    console.log("🧑‍💻 [ngOnInit] Initialisiere Thread (channel-based):", this.parentMessage?.id);
  
    // 1) Mindestanforderungen prüfen
    if (!this.channelId || !this.parentMessage?.id) {
      console.warn("⚠️ `channelId` oder `parentMessage.id` fehlt. Abbruch.");
      return;
    }
  
    const parentId = this.parentMessage.id;

    // 2) Benutzer laden
    await this.loadCurrentUser();
  
    // 3) Thread initialisieren (Nachrichten-Abo + Emojis)
   // await this.initializeThread(this.parentMessage.id);

   await this.initializeThread(parentId);
  
    // 4) Einmalig ReplyCounts laden
    this.loadReplyCounts();
  
    // 5) Live-Abo für ReplyCounts
    this.unsubscribeFromReplyCount = this.messageService.loadReplyCountsLive(
      [this.parentMessage.id],
      "thread-channel",
      (replyCounts) => {
       // const data = replyCounts[this.parentMessage.id];
        const data = replyCounts[parentId];
        if (!data) return;
  
        console.log(
          `📊 Live-Update: ${data.count} Antworten für ThreadChannel ${this.parentMessage!.id}`
        );
        this.parentMessage!.replyCount = data.count;
        this.parentMessage!.lastReplyTime = data.lastResponseTime || this.parentMessage!.lastReplyTime;
        this.cdr.detectChanges();
      }
    );
  }




  

  @HostListener('window:resize')
   onResize() {
     this.checkDesktopWidth();
   }
 
   checkDesktopWidth() {
     this.isDesktop = window.innerWidth >= 1278;
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
    // 1) Prüfe, ob `parentMessage` geändert wurde
    if (changes['parentMessage'] && changes['parentMessage'].currentValue) {
      const newMessage = changes['parentMessage'].currentValue;
      console.log('📩 [ngOnChanges] `parentMessage` gewechselt:', newMessage);
  
      // 2) Vorherige Subscriptions beenden
      if (this.unsubscribeFromThreadMessages) {
        this.unsubscribeFromThreadMessages();
        this.unsubscribeFromThreadMessages = undefined;
      }
      if (this.unsubscribeFromReplyCount) {
        this.unsubscribeFromReplyCount();
        this.unsubscribeFromReplyCount = undefined;
      }
  
      // 3) Mergen vs. Neue Nachricht
      if (newMessage.id === this.parentMessage?.id) {
        // -> Es ist dieselbe Parent-Nachricht, evtl. nur aktualisierte Felder
        console.log('🔄 Update `parentMessage`.');
        this.parentMessage = {
          ...this.parentMessage,
          ...newMessage
        };
      } else {
        // -> Eine andere Nachricht => Gehört zu threadMessages
        console.log('📌 Nachricht gehört zu `threadMessages`.');
        this.threadMessages.push(newMessage);
      }
  
      // 4) Nur fortfahren, wenn wir tatsächlich eine gültige parentMessage haben
      const pMsg = this.parentMessage;
      if (!pMsg || !pMsg.id || !this.channelId) {
        console.warn('⚠️ Fehlende Daten: parentMessage oder channelId ist leer. Abbruch.');
        this.cdr.detectChanges();
        return;
      }
  
      // Benutzer laden
      await this.loadCurrentUser();
  
      // Thread initialisieren (Nachrichten-Abo + Emojis)
      await this.initializeThread(pMsg.id);
  
      // Einmalige ReplyCounts laden
      this.loadReplyCounts();
  
      // 5) Live-ReplyCount-Updates
      this.unsubscribeFromReplyCount = this.messageService.loadReplyCountsLive(
        [pMsg.id],
        'thread-channel',
        (replyCounts) => {
          const data = replyCounts[pMsg.id || ''];
          if (!data) return;
  
          console.log(`📊 Live-Update: ${data.count} Antworten für ThreadChannel ${pMsg.id}`);
          // In-Place Update an `pMsg`
          pMsg.replyCount = data.count;
          pMsg.lastReplyTime = data.lastResponseTime || pMsg.lastReplyTime;
  
          this.cdr.detectChanges();
        }
      );
  
      // 6) Abschließendes detectChanges
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

  loadReplyCounts(): void {
    // 1) Lokale Variable anlegen
    const pMsg = this.parentMessage;
  
    // 2) Null / Undefined Check
    //    => TypeScript erkennt dann, dass pMsg NICHT null ist
    if (!pMsg || !pMsg.id) {
      console.warn('⚠️ Kein Thread ausgewählt oder ID fehlt. Reply-Counts können nicht geladen werden.');
      return;
    }
  
    console.log('🔄 Lade Reply-Counts für ThreadChannel:', pMsg.id);
  
    // 3) Firestore/Service-Aufruf
    this.messageService
      .getReplyCountsForMessages([pMsg.id], 'thread-channel')
      .then((replyCounts) => {
        // 4) Index-Access nur mit pMsg.id, das nicht null ist
        const replyCountData = replyCounts[pMsg.id!];
        if (!replyCountData) return;
  
        // 5) In-place Update
        pMsg.replyCount = replyCountData.count;
        pMsg.lastReplyTime = replyCountData.lastResponseTime || pMsg.lastReplyTime;
  
        console.log(`✅ Reply-Count aktualisiert: ${pMsg.replyCount}`);
        this.cdr.detectChanges();
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



  async sendThreadMessage(textArea: HTMLTextAreaElement): Promise<void> {
    // 1) Wenn weder Text noch Bild:
    if (!this.channelMessage.trim() && !this.imageUrl) {
      console.warn('⚠️ Nachricht ist leer (kein Text und kein Bild).');
      return;
    }
  
    // 2) User laden (falls nötig)
    if (!this.currentUser) {
      await this.loadCurrentUser();
      if (!this.currentUser) {
        console.error('❌ Benutzer konnte nicht geladen werden!');
        return;
      }
    }
  
    // 3) parentMessage.id prüfen
    if (!this.parentMessage?.id) {
      console.error('❌ Kein parentMessage.id vorhanden!');
      return;
    }
  
    console.log('📩 Sende Thread-Nachricht an:', this.parentMessage.id);
  
    // 4) content-Objekt bilden
    const content = {
      text: this.channelMessage,      // oder this.channelMessage.trim()
      image: this.imageUrl || null,   // Bild aus Preview (DataURL oder ArrayBuffer)
      emojis: []                      // Falls du Emojis rein willst
    };
  
    // 5) message-Objekt für Firestore
    const message = {
      type: 'thread-channel' as const,
      content, 
      senderId: this.currentUser.id,
      senderName: this.currentUser.name,
      senderAvatar: this.currentUser.avatarUrl,
      threadChannelId: this.parentMessage.id,
      parentId: this.parentMessage.id
      // ... falls du weitere Felder brauchst
    };
  
    try {
      // 6) Abschicken (z. B. via messageService)
      const newMessageId = await this.messageService.sendMessage(message);
      console.log(`✅ Nachricht gesendet, ID: ${newMessageId}`);
  
      // Optional: Manuell replyCount anheben
      // this.parentMessage.replyCount = (this.parentMessage.replyCount || 0) + 1;
  
      // 7) Eingabe zurücksetzen
      this.channelMessage = '';
      this.imageUrl = null;
  
      // 8) TextArea-Größe zurücksetzen + Scroll
      if (textArea) {
        this.resetTextareaHeight(textArea);
      }
      this.scrollToBottom();
  
    } catch (error) {
      console.error('❌ Fehler beim Senden der Thread-Nachricht:', error);
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






addEmojiToMessage(event: any, msg: any): void {
  // A) Stelle sicher, dass msg.content.emojis existiert
  if (!msg.content.emojis) {
    msg.content.emojis = [];
  }

  // B) Prüfe, ob wir ein valides Emoji-Event haben
  if (event?.emoji?.native) {
    const newEmoji = event.emoji.native;

    // 1) Zuerst aktualisieren wir die Emojis im Nachricht-Objekt
    const existingEmoji = msg.content.emojis.find(
      (e: any) => e.emoji === newEmoji
    );

    if (existingEmoji) {
      // Erhöhe count, wenn Emoji schon vorhanden
      existingEmoji.count += 1;
    } else {
      // Falls schon 2 Emojis existieren, lösche das älteste
    
      if (msg.content.emojis.length < 13) {
        msg.content.emojis.push({ emoji: newEmoji, count: 1 });

      }
      // Neues Emoji hinzufügen
     // msg.content.emojis.push({ emoji: newEmoji, count: 1 });
    }

    // 2) lastUsedEmojis je nach gesendeter oder empfangener Nachricht
    if (msg.senderName === this.currentUser?.name) {
      // -> "sent"
      this.lastUsedEmojisSent = this.updateLastUsedEmojis(
        this.lastUsedEmojisSent,
        newEmoji
      );

      if (this.selectedChannel?.id) {
        this.channelService.saveLastUsedEmojis(
          this.selectedChannel.id,
          this.lastUsedEmojisSent,
          'sent'
        );
      }
    } else {
      // -> "received"
      this.lastUsedEmojisReceived = this.updateLastUsedEmojis(
        this.lastUsedEmojisReceived,
        newEmoji
      );

      if (this.selectedChannel?.id) {
        this.channelService.saveLastUsedEmojis(
          this.selectedChannel.id,
          this.lastUsedEmojisReceived,
          'received'
        );
      }
    }
  }

  // C) Emoji-Picker schließen
  msg.isEmojiPickerVisible = false;

  this.messageService.updateMessage(msg.id, {
    // wir übergeben nur das, was Firestore updaten soll
    content: {
      ...msg.content,  // ggf. emojis oder text
    }
  }).then(() => {
    console.log('Nachricht erfolgreich aktualisiert (Thread).');
  }).catch((error) => {
    console.error('Fehler beim Aktualisieren der Nachricht:', error);
  });
}

// ---------------------------------------------------------
// Hilfsfunktion, um ein Emoji immer an die erste Stelle 
// zu setzen und max. 2 zu speichern
// ---------------------------------------------------------
private updateLastUsedEmojis(emojiArray: string[], newEmoji: string): string[] {
  // Falls das Emoji schon existiert, vorher entfernen
  emojiArray = emojiArray.filter(e => e !== newEmoji);

  // Als erstes Element einfügen
 // emojiArray.unshift(newEmoji);

  // Array auf max. 2 Einträge begrenzen
  return emojiArray.slice(0, 2);
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



async saveMessage(msg: any): Promise<void> {
  // Überprüfen, ob die Thread-ID und die Nachricht-ID vorhanden sind
  if (!this.parentMessage?.id || !msg.id) {
    console.error('❌ Thread ID oder Nachricht ID fehlt.');
    return;
  }

  try {
    // Nachricht in Firestore aktualisieren
    await this.messageService.updateMessage(msg.id, {
      content: {
        text: msg.content.text,
        // Behalte vorhandene Felder wie `image` und `emojis` bei
        ...(msg.content.image && { image: msg.content.image }),
        ...(msg.content.emojis && { emojis: msg.content.emojis }),
      },
    });

    console.log('✅ Nachricht erfolgreich gespeichert.');

    // Bearbeitungsmodus deaktivieren
    msg.isEditing = false;
  } catch (error) {
    console.error('❌ Fehler beim Speichern der Nachricht:', error);
  }
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









toggleUserDropdown(): void {
  // Wenn wir das erste Mal öffnen, Nutzer laden
  if (!this.showUserDropdown) {
    this.loadAllUsers();
  }
  this.showUserDropdown = !this.showUserDropdown;
}

 // Nutzer laden (oder du nutzt dein eigenes getAllUsers,...)
 loadAllUsers(): void {
  this.userService.getAllUsers()
    .then(users => {
      this.allUsers = users.map(u => ({
        id: u.id,
        //email: u.email,
        name: u.name,
        avatarUrl: u.avatarUrl || 'assets/img/avatar.png'
      }));
    })
    .catch(err => console.error('Fehler beim Laden der Nutzer:', err));
}



  // Beim Klick auf einen Nutzer im Dropdown
  addUserSymbol(member: any) {
    // Füge in privateMessage ein @Name ein
    // => Oder user.email, je nachdem was du brauchst
    //this.privateMessage += ` @${member.name} `;

    this.channelMessage  += ` @${member.name} `; 
    // Overlay schließen
    this.showUserDropdown = false;
  }
































closePopup(msg: any) {
  // Nur wenn das Popup offen ist => schließen
  if (msg.showAllEmojisList) {
    msg.showAllEmojisList = false;
    msg.expanded = false; // optional, falls du das auch einklappen möchtest
  }
}





  toggleEmojiPopup(msg: any) {
    // Falls die Property noch nicht existiert, initialisieren
    if (msg.showAllEmojisList === undefined) {
      msg.showAllEmojisList = false;
    }

    // Umschalten
    msg.showAllEmojisList = !msg.showAllEmojisList;

    // Wenn wir schließen (false), dann einklappen zurücksetzen
    if (!msg.showAllEmojisList) {
      msg.expanded = false;
    } else {
      // Wenn wir öffnen und `expanded` gar nicht existiert
      if (msg.expanded === undefined) {
        msg.expanded = false;
      }
    }
  }




  onEmojiPlusInPopup(msg: any) {
    // z.B. Logik, um ein neues Emoji hinzuzufügen
    // oder den Emoji-Picker zu öffnen
    console.log('Plus in popup geklickt, msg=', msg);
  }



  openLargeImage(imageData: string | ArrayBuffer) {
    if (typeof imageData !== 'string') {
      // Konvertiere das ArrayBuffer zu einem String (DataURL) oder blob URL
      return; // Oder handle es anders
    }
    this.largeImageUrl = imageData;
    this.showLargeImage = true;
  }
  

  // Methode zum Schließen
  closeLargeImage() {
    this.showLargeImage = false;
    this.largeImageUrl = null;
  }
}