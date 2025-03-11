import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef, SimpleChanges, HostListener  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { MessageService } from '../message.service';
import { UserService } from '../user.service';
import { formatDate } from '@angular/common';
import { serverTimestamp } from '@angular/fire/firestore';
import { ChangeDetectorRef } from '@angular/core'; 

import { Message} from '../message.models';

import { OverlayModule } from '@angular/cdk/overlay';
@Component({
  selector: 'app-thread',
  standalone: true,
  imports: [CommonModule, FormsModule, PickerModule, OverlayModule],
  templateUrl: './thread.component.html',
  styleUrls: ['./thread.component.scss'],
})
export class ThreadComponent implements OnInit {
  //@Input() parentMessage: any = null;
  @Input() recipientName: string = '';
  @Output() closeThread = new EventEmitter<void>();
  @ViewChild('messageList') messageList!: ElementRef;
  @Output() openThread = new EventEmitter<any>();

  isTextareaExpanded: boolean = false;
  //threadMessages: any[] = [];
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
  threadId!: string; 
  replyCount: number = 0; 



  @Input() parentMessage: Message | null = null;

  // 3) threadMessages als `Message[]` statt `any[]`
  threadMessages: Message[] = [];




  showLargeImage = false;
  largeImageUrl: string | null = null;


  isDesktop = false;

  
  allUsers: any[] = [];

  // Steuert Overlay
  showUserDropdown: boolean = false;

  private recipientCache: Map<string, string> = new Map(); // Cache für Namen
  private unsubscribeFromThreadMessages: (() => void) | null = null; // Speichert das onSnapshot-Abonnement
  private unsubscribeEmojiListener?: () => void;
  private unsubscribeReplyCount: (() => void) | null = null;

  constructor(
    private messageService: MessageService,
    private userService: UserService,
    private cdr: ChangeDetectorRef,
  ) {}

 


  async ngOnInit(): Promise<void> {
    this.checkDesktopWidth();
    // 1) Prüfe, ob `parentMessage` eine ID hat
    if (!this.parentMessage?.id) {
      console.warn('⚠️ Kein gültiges `parentMessage` übergeben. Thread kann nicht geladen werden.', this.parentMessage);
      this.closeThread.emit(); // ❌ Thread schließen, da kein gültiger Parent vorhanden ist
      return;
    }
  
    // ✅ Lokale Konstante `pm` anlegen
    const pm = this.parentMessage;
  
    // 2) CurrentUser laden
    await this.loadCurrentUser();
    if (!this.currentUser?.uid) {
      console.error("❌ `currentUser` konnte nicht geladen werden. Thread wird nicht geöffnet.");
      this.closeThread.emit(); // ❌ Falls Benutzer nicht geladen wird, Thread schließen
      return;
    }
  
    
    // 3) `threadId` aus `pm.id`
    const threadId = pm.id;
    try {
      console.log(`🔍 Lade Thread-Messages für ID: ${threadId}`);
  
      // **Paralleles Laden von Nachrichten & Emojis für bessere Performance**
      const [existingMessages, lastSentEmojis, lastReceivedEmojis] = await Promise.all([
        this.messageService.getMessagesOnce('thread', threadId),
        this.messageService.getLastUsedThreadEmojis(threadId!, 'sent'),
        this.messageService.getLastUsedThreadEmojis(threadId!, 'received')
      ]);
  
      this.lastUsedEmojisSent = lastSentEmojis;
      this.lastUsedEmojisReceived = lastReceivedEmojis;
      this.loadLastUsedThreadEmojis();
  
      if (existingMessages.length === 0) {
        console.log("🟢 Kein initialer Nachrichteneintrag notwendig.");
      }
  
      // **Live-Updates für Reply-Count & Emojis aktivieren**
      this.listenForReplyCountUpdates();
      this.listenForThreadEmojiUpdates();
  
      // **Live-Emojis laden & Nachrichten aktualisieren**
      await this.loadLastUsedEmojisLive(threadId!);
     this.loadThreadMessagesLive();
  
      // ✅ Falls `timestamp` existiert, formatiere es
      if (pm.timestamp) {
        const parentTimestamp = this.safeConvertTimestamp(pm.timestamp);
        this.formattedParentMessageDate = this.getFormattedDate(parentTimestamp);
        this.formattedMessageTime = formatDate(parentTimestamp, 'HH:mm', 'de');
      }
  
      // **Live-Updates für Reply-Counts aktivieren**
      this.unsubscribeReplyCount = this.messageService.loadReplyCountsLive(
        [pm.id!],
        'thread',
        (updatedCounts) => {
          // Hier verwenden wir `pm.id` statt `this.parentMessage.id`
          // und `pm.replyCount` statt `this.parentMessage.replyCount`.
          pm.replyCount = updatedCounts[pm.id!]?.count || 0;
          console.log("🔄 Live-Update für `replyCount`:", pm.replyCount);
        }
      );
  
    } catch (error) {
      console.error('❌ Fehler bei der Initialisierung des Threads:', error);
      this.closeThread.emit(); // ❌ Thread bei Fehlern schließen
    }
  }
  

  @HostListener('window:resize')
   onResize() {
     this.checkDesktopWidth();
   }
 
   checkDesktopWidth() {
     this.isDesktop = window.innerWidth >= 1278;
   }
 





  

  async sendThreadMessage(
    messageContent: string | null,
    imageUrl: string | null,
    textArea: HTMLTextAreaElement
  ): Promise<void> {
    console.log("📩 `sendThreadMessage()` gestartet...");
  
    if (!messageContent?.trim() && !imageUrl) {
      console.warn('⚠️ Leere Nachricht oder Bild. Nachricht wurde nicht gesendet.');
      return;
    }
  
    // 🔍 Sicherstellen, dass `currentUser` geladen ist
    if (!this.currentUser) {
      console.warn("🔄 `currentUser` nicht vorhanden – lade ihn nach...");
      await this.loadCurrentUser();
    }
  
    if (!this.currentUser || !this.currentUser.uid) {
      console.error('❌ Fehler: `currentUser` konnte nicht geladen werden. Nachricht wird nicht gesendet.');
      return;
    }
  
    console.log("👤 `currentUser` geladen:", this.currentUser);
  
    // 🔍 `parentMessage` debuggen
    console.log("📝 `parentMessage` vor Erstellung der Nachricht:", this.parentMessage);
  
    // ❌ Prüfen, ob `parentMessage` eine gültige ID hat
    if (!this.parentMessage || !this.parentMessage.id) {
      console.error("❌ Fehler: `parentMessage.id` fehlt! Nachricht wird nicht gesendet.");
      return;
    }
  
    // ❌ Prüfen, ob `threadId` fehlt
    if (!this.parentMessage.threadId) {
      console.warn("⚠️ `threadId` fehlt! Setze `parentMessage.id` als `threadId`.");
      this.parentMessage.threadId = this.parentMessage.id;
    }
    console.log("🛠 `threadId` gesetzt auf:", this.parentMessage.threadId);

    // 🔥 **Thread-Nachricht erstellen**
    const threadMessage = this.createThreadMessage(messageContent, imageUrl);
    
    if (!threadMessage) {
      console.error("❌ Fehler beim Erstellen der Thread-Nachricht.");
      return;
    }
  
    console.log("📨 Sende Nachricht an Firestore:", threadMessage);
  
    try {
      // 🔥 **Nachricht in Firestore speichern**
      const messageId = await this.messageService.sendMessage(threadMessage);
      console.log('✅ Nachricht erfolgreich gesendet:', messageId);
  
      // 🔥 **`lastResponseTime` für den Thread aktualisieren**
      await this.messageService.updateMessage(this.parentMessage.id, {
        lastResponseTime: serverTimestamp(),
      });
  
      // 🔥 **Antwortzähler aktualisieren**
      await this.messageService.updateReplyCount(this.parentMessage.id, "thread");
  
      // 🔍 Letzte Emojis für den Thread abrufen
      [this.lastUsedEmojisSent, this.lastUsedEmojisReceived] = await Promise.all([
        this.messageService.getLastUsedThreadEmojis(this.parentMessage.id, 'sent'),
        this.messageService.getLastUsedThreadEmojis(this.parentMessage.id, 'received')
      ]);
  
      // 🔍 Live-Emoji-Updates starten
      this.listenForThreadEmojiUpdates();
  
      // 🔄 **UI zurücksetzen**
      this.privateMessage = '';
      this.imageUrl = null;
      if (textArea) {
        this.resetTextareaHeight(textArea);
      }
  
    } catch (err) {
      console.error('❌ Fehler beim Senden der Nachricht im Thread:', err);
    }
  }
  
  private createThreadMessage(messageContent: string | null, imageUrl: string | null): any {
    console.log("🛠 Erstelle Thread-Nachricht...");
  
    if (!this.currentUser || !this.currentUser.uid) {
      console.error("❌ Fehler: `currentUser` ist nicht verfügbar.");
      return null;
    }
  
    if (!this.parentMessage || !this.parentMessage.id) {
      console.error("❌ Fehler: `parentMessage` oder `parentMessage.id` fehlt!");
      return null;
    }
  
    const threadMessage = {
      type: 'thread',  
      threadId: this.parentMessage.id,  
      parentId: this.parentMessage.id,  
      content: {
        text: messageContent || "",   
        image: imageUrl ?? "",  
        emojis: []
      },
      senderId: this.currentUser.uid,
      senderName: this.currentUser.name ?? "Unbekannt",
      senderAvatar: this.currentUser.avatarUrl || 'assets/default-avatar.png',
      recipientId: this.parentMessage.senderId || null,
      timestamp: serverTimestamp(),
      isReply: true,
      lastReplyTime: serverTimestamp(),
     
    };
  
    console.log("📄 Thread-Nachricht erstellt:", threadMessage);
    return threadMessage;
  }  


 
  

  openThreadEvent(msg: Message): void {
    console.log("📥 `openThreadEvent()` aufgerufen mit Nachricht:", msg);
  
    // 1) Check, ob Nachricht & Nachricht-ID vorhanden ist
    if (!msg || !msg.id) {
      console.error("❌ Fehler: Ungültige Nachricht zum Öffnen des Threads", msg);
      return;
    }
  
    // 2) Kopiere `msg` in `parentMessage`
    this.parentMessage = { ...msg };
  
    // 3) Lokale Konstante anlegen => garantiert nicht null
    const pm = this.parentMessage;
    if (!pm.id) {
      console.error("❌ `pm.id` fehlt – Thread kann nicht geöffnet werden.");
      return;
    }
  
    // 4) threadId setzen
    this.threadId = pm.id;
    console.log("🔍 Setze `parentMessage.id` als `threadId`:", pm.id);
  
    // 5) Falls `timestamp` existiert => formatieren
    if (pm.timestamp) {
      const parentTimestamp = this.safeConvertTimestamp(pm.timestamp);
      this.formattedParentMessageDate = this.getFormattedDate(parentTimestamp);
      this.formattedMessageTime = formatDate(parentTimestamp, 'HH:mm', 'de');
    }
  
    // 6) `openThread`-Event abfeuern => erweiterte Daten mitgeben
    this.openThread.emit({
      ...pm,
      threadId: pm.id,
      parentId: pm.parentId ?? pm.id,
      timestamp: pm.timestamp,
    });
  
    // 7) Thread-Nachrichten laden
    this.loadThreadMessagesLive();
  }
  

 private loadThreadMessagesLive(): void {
    if (!this.parentMessage?.id) {
      console.error('❌ Fehler: `parentMessage.id` ist nicht vorhanden.');
      return;
    }
  
    console.log('📩 Starte Live-Update für Thread:', this.parentMessage.id);
  
    if (this.unsubscribeFromThreadMessages) {
      this.unsubscribeFromThreadMessages();
    }
  
    this.unsubscribeFromThreadMessages = this.messageService.listenMessages(
      'thread',
      this.parentMessage.id,
      (messages) => {
        console.log("🔄 Live-Nachrichten empfangen für Thread:", messages);
        if (messages.length === 0) {
          console.warn("⚠️ Keine Nachrichten gefunden!");
        }
  
        this.threadMessages = messages.map((msg) => this.formatMessage(msg));
        this.scrollToBottom();
      }
    );
  }





  ngOnChanges(changes: SimpleChanges): void {
    if (changes['parentMessage'] && changes['parentMessage'].currentValue) {
      console.log("📩 DEBUG: `parentMessage` in `thread.ts` erhalten:", changes['parentMessage'].currentValue);
  
      const parentMessage = changes['parentMessage'].currentValue;
  
      // ❌ Falls `threadId` fehlt, setzen wir sie aus `parentMessage.id`
      if (!parentMessage.threadId) {
        console.warn("⚠️ `threadId` fehlt! Setze `parentMessage.id` als `threadId`.");
        parentMessage.threadId = parentMessage.id;
      }
  
      // ✅ `parentMessage` korrekt setzen und sicherstellen, dass `text` immer vorhanden ist
      this.parentMessage = {
        ...parentMessage,
        content: {
          text: parentMessage.content?.text || parentMessage.text || "⚠️ Kein Text gefunden!",
          image: parentMessage.content?.image || null,
          emojis: parentMessage.content?.emojis || []
        }
      };
  
      if (!this.recipientName) {
        this.recipientName = parentMessage.recipientName || "Lade...";
        if (this.recipientName === "Lade...") {
          // ⚠️ HIER minimale Änderung: 
          // Statt direkt `this.fetchRecipientName(parentMessage.recipientId)`, 
          // erst prüfen, ob es ein `string` ist:
          if (typeof parentMessage.recipientId === 'string') {
            this.fetchRecipientName(parentMessage.recipientId);
          } else {
            console.warn("⚠️ `parentMessage.recipientId` ist kein String oder fehlt.");
          }
        }
      }
  
      this.threadId = this.parentMessage?.id || '';
  
      // 🔥 Falls `timestamp` existiert, formatieren wir es
      if (this.parentMessage?.timestamp) {
        const parentTimestamp = this.safeConvertTimestamp(this.parentMessage.timestamp);
        this.formattedParentMessageDate = this.getFormattedDate(parentTimestamp);
        this.formattedMessageTime = formatDate(parentTimestamp, 'HH:mm', 'de');
      }
  
     // console.log("📩 DEBUG: `parentMessage.content.text` nach Fix:", this.parentMessage.content.text);
      // **🚀 Jetzt sicherstellen, dass `parentMessage` wirklich die ERSTE private Nachricht ist**

      const pm = this.parentMessage;
if (!pm || !pm.id) {
  console.warn("⚠️ parentMessage fehlt oder hat keine ID!");
  return;
}
this.loadOriginalPrivateMessage(pm.id);
     // this.loadOriginalPrivateMessage(this.parentMessage.id);
      this.listenForReplyCountUpdates();
      // **Live-Updates starten**
      this.loadThreadMessagesLive();
      this.loadLastUsedThreadEmojis();
      this.listenForThreadEmojiUpdates();
  
    } else {
      console.warn("⚠️ `ngOnChanges` wurde aufgerufen, aber `parentMessage` ist `null` oder leer!");
    }
  }
  


  

  


  private listenForReplyCountUpdates(): void {
    // 1) Lokale Konstante + Null-Check
    const pm = this.parentMessage;
    if (!pm) {
      console.error("❌ Fehler: `parentMessage` ist null/undefined!");
      return;
    }
    if (!pm.id) {
      console.error("❌ Fehler: `parentMessage.id` fehlt! Live-Updates werden nicht gestartet.");
      return;
    }
  
    console.log("🔄 Starte Live-Listener für `replyCount` in Thread:", pm.id);
  
    // 2) Live-Subscription
    //    => Non-Null Assertion `pm.id!` => sagst TS: "id ist kein undefined"
    this.unsubscribeReplyCount = this.messageService.loadReplyCountsLive(
      [pm.id!],
      'thread',
      (updatedCounts) => {
        console.log("🔥 Live-Update empfangen für `replyCount`:", updatedCounts);
  
        // 3) Prüfen, ob updatedCounts[pm.id!] existiert
        if (!updatedCounts[pm.id!]) {
          console.warn(`⚠️ Keine Reply-Daten für Thread ${pm.id}`);
          return;
        }
  
        // 4) replyCount aktualisieren
        this.replyCount = updatedCounts[pm.id!].count || 0;
        // Optional: pm.replyCount
        pm.replyCount = this.replyCount;
  
        console.log("🔄 Neuer replyCount:", this.replyCount);
        // => Kein detectChanges() => Chat springt nicht
        
        
      
      }
    );
  }
  
  



  
  
  private safeConvertTimestamp(timestamp: any): Date {
    if (!timestamp) return new Date();
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp === 'object' && 'seconds' in timestamp) return new Date(timestamp.seconds * 1000);
    if (typeof timestamp === 'string') {
        const parsedDate = new Date(timestamp);
        if (!isNaN(parsedDate.getTime())) return parsedDate;
    }
    console.warn('⚠️ Ungültiger Timestamp:', timestamp);
    return new Date();
  }

  async initializeThread(): Promise<void> {
    if (!this.threadId) {
      console.warn("⚠️ Kein gültiger `threadId` vorhanden. Initialisierung wird abgebrochen.");
      return;
    }
  
    try {
      console.log(`🔍 Starte Initialisierung des Threads: ${this.threadId}`);
  
      // **Paralleles Laden der Emojis & Nachrichten für bessere Performance**
      const [lastSentEmojis, lastReceivedEmojis, threadMessages] = await Promise.all([
        this.messageService.getLastUsedThreadEmojis(this.threadId, 'sent'),
        this.messageService.getLastUsedThreadEmojis(this.threadId, 'received'),
        this.messageService.getMessagesOnce('thread', this.threadId)
      ]);
  
      this.lastUsedEmojisSent = lastSentEmojis || [];
      this.lastUsedEmojisReceived = lastReceivedEmojis || [];
  
      // **Thread-Nachrichten verarbeiten**
      this.threadMessages = threadMessages.map(msg => ({
        ...msg,
        content: { ...msg.content, emojis: msg.content?.emojis || [] }
      }));
  
      console.log(`✅ Thread erfolgreich initialisiert mit ${this.threadMessages.length} Nachrichten`);
  
      // **Live-Updates für Emojis aktivieren**
      this.listenForThreadEmojiUpdates();
  
      // **Live-Updates für Nachrichten aktivieren**
      this.loadThreadMessagesLive();
  
    } catch (error) {
      console.error('❌ Fehler bei der Thread-Initialisierung:', error);
    }
  }
  
  private listenForThreadEmojiUpdates(): void {
    if (!this.parentMessage?.id) return;  // Sicherstellen, dass die `threadId` existiert.
  
    if (this.unsubscribeEmojiListener) {
      this.unsubscribeEmojiListener();
    }
  
    this.unsubscribeEmojiListener = this.messageService.listenForThreadEmojiUpdates(
      this.parentMessage.id,
      (updatedEmojisSent, updatedEmojisReceived) => {
        this.lastUsedEmojisSent = updatedEmojisSent.slice(-2);  // Zeige nur die letzten 2 gesendeten Emojis
        this.lastUsedEmojisReceived = updatedEmojisReceived.slice(-2);  // Zeige nur die letzten 2 empfangenen Emojis
  
        console.log("🔥 Live-Emoji-Update im Thread empfangen:");
        console.log("👉 Gesendet:", this.lastUsedEmojisSent);
        console.log("👉 Empfangen:", this.lastUsedEmojisReceived);
      }
    );
  }

  private async loadCurrentUser(): Promise<void> {
    try {
      // Direkt vom UserService laden:
      this.currentUser = await this.userService.getCurrentUserData();
      
      if (!this.currentUser || !this.currentUser.uid) {
        console.error("❌ `currentUser` ist null oder `uid` fehlt!", this.currentUser);
        throw new Error("Benutzerdaten sind ungültig oder `uid` fehlt.");
      }
      
      console.log("✅ `currentUser` erfolgreich geladen:", this.currentUser);
    } catch (err) {
      console.error("❌ Fehler beim Laden des aktuellen Benutzers:", err);
      this.currentUser = null;
    }
  }
  // Falls du diese Methode in deinem ThreadService hast, die nur delegiert:
async getCurrentUserData(): Promise<any> {
  return await this.userService.getCurrentUserData();
}

private async loadLastUsedEmojisLive(threadId: string): Promise<void> {
  this.messageService.listenForEmojiUpdates(threadId, (sentEmojis, receivedEmojis) => {
    this.lastUsedEmojisSent = sentEmojis;
    this.lastUsedEmojisReceived = receivedEmojis;
  });
}










public async addEmojiToMessage(event: any, msg: any): Promise<void> {
  // 1) Stelle sicher, dass msg.content.emojis existiert
  if (!msg.content.emojis) {
    msg.content.emojis = [];
  }

  // 2) Prüfen, ob überhaupt ein Emoji-Event vorliegt
  if (!event?.emoji?.native) {
    return;
  }
  const newEmoji = event.emoji.native;

  // 3) Emoji schon vorhanden?
  const existingEmoji = msg.content.emojis.find((e: any) => e.emoji === newEmoji);

  if (existingEmoji) {
    // Erhöhe count, wenn es schon existiert
    existingEmoji.count += 1;
  } else {
    // Maximal 13 Emojis
    if (msg.content.emojis.length < 13) {
      msg.content.emojis.push({ emoji: newEmoji, count: 1 });
    }
  }

  // 4) lastUsedEmojis je nach gesendeter oder empfangener Nachricht
  //    (Unterschied: 'sent' vs. 'received')
  const isSentMessage = msg.senderId === this.currentUser?.id; 
  const type = isSentMessage ? 'sent' : 'received';

  // => Lokale Array-Updates ( UI-Logik ), z.B.:
  if (type === 'sent') {
    this.lastUsedEmojisSent = this.updateLastUsedEmojis(this.lastUsedEmojisSent, newEmoji);
    // Thread-spezifische Methode zum Speichern, z. B.:
    if (this.parentMessage?.id) {
      await this.messageService.saveLastUsedThreadEmojis(this.parentMessage.id, this.lastUsedEmojisSent, 'sent');
    }
  } else {
    this.lastUsedEmojisReceived = this.updateLastUsedEmojis(this.lastUsedEmojisReceived, newEmoji);
    if (this.parentMessage?.id) {
      await this.messageService.saveLastUsedThreadEmojis(this.parentMessage.id, this.lastUsedEmojisReceived, 'received');
    }
  }

  // 5) Emoji-Picker schließen
  msg.isEmojiPickerVisible = false;

  // 6) Firestore: Thread-Nachricht aktualisieren
  //    => 'msg.id' = ID der Thread-Nachricht
  try {
    await this.messageService.updateMessage(msg.id, {
      content: {
        ...msg.content
      }
    });
    console.log(`✅ Emoji erfolgreich zur Thread-Nachricht hinzugefügt: ${newEmoji} (Type: ${type})`);
  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren der Thread-Nachricht:', error);
  }
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










  ngOnDestroy(): void {
    if (this.unsubscribeFromThreadMessages) {
      this.unsubscribeFromThreadMessages();
    }
    if (this.unsubscribeEmojiListener) {
      this.unsubscribeEmojiListener();
      console.log("🛑 Live-Emoji-Listener gestoppt.");
  }
  if (this.unsubscribeReplyCount) {
    this.unsubscribeReplyCount();
    console.log("🛑 Live-Reply-Count-Listener gestoppt.");
  }
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

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messageList) {
        this.messageList.nativeElement.scrollTop = this.messageList.nativeElement.scrollHeight;
      }
    }, 100);
  }

  getFormattedDate(dateString: string | Date | undefined): string {
    if (!dateString) {
      return '';
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return '';
    }
    if (this.isSameDay(date, this.currentDate)) {
      return 'Heute';
    }
    if (this.isSameDay(date, this.getYesterdayDate())) {
      return 'Gestern';
    }
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    });
  }

  private formatMessage(msg: any): any {
    return {
      ...msg,
      timestamp: msg.timestamp ? this.messageService.convertToDate(msg.timestamp) : new Date(),
    };
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

  highlightThreadMessage(messageId: string, retries = 5): void {
    setTimeout(() => {
      const messageElement = document.getElementById(`message-${messageId}`);
  
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        messageElement.classList.add('highlight');
  
        setTimeout(() => messageElement.classList.remove('highlight'), 2000);
      } else if (retries > 0) {
        console.warn(`⚠️ Thread-Nachricht nicht gefunden (${retries} Versuche übrig), erneuter Versuch...`);
        this.highlightThreadMessage(messageId, retries - 1);
      }
    }, 500);
  }
  
private async fetchRecipientName(recipientId: string): Promise<void> {
    if (!recipientId) return;

    // 🔥 Prüfe zuerst den Cache, bevor Firestore aufgerufen wird
    if (this.recipientCache.has(recipientId)) {
        this.recipientName = this.recipientCache.get(recipientId)!;
        console.log("✅ Name aus Cache geladen:", this.recipientName);
        return;
    }

    try {
        const user = await this.userService.getUserById(recipientId);
        this.recipientName = user?.name || "Unbekannt";

        // ✅ Speichere den Namen im Cache
        this.recipientCache.set(recipientId, this.recipientName);
        console.log("✅ Name aus Firestore geladen und gespeichert:", this.recipientName);
    } catch (error) {
        console.error("❌ Fehler beim Abrufen des Empfängernamens:", error);
        this.recipientName = "Unbekannt";
    }
}

private async loadOriginalPrivateMessage(threadId: string): Promise<void> {
  try {
      console.log(`🔍 Lade Original-PrivateMessage für Thread: ${threadId}`);

      const originalMessage = await this.messageService.getMessage('private', threadId);
      
      if (originalMessage) {
          console.log("✅ Original PrivateMessage gefunden:", originalMessage);

          this.parentMessage = {
              ...originalMessage,
              content: {
                text: originalMessage.content?.text || "⚠️ Kein Text gefunden!",


                  image: originalMessage.content?.image || null,
                  emojis: originalMessage.content?.emojis || []
              }
          };

          // 🔥 `timestamp` neu formatieren, falls vorhanden
          if (this.parentMessage.timestamp) {
              const parentTimestamp = this.safeConvertTimestamp(this.parentMessage.timestamp);
              this.formattedParentMessageDate = this.getFormattedDate(parentTimestamp);
              this.formattedMessageTime = formatDate(parentTimestamp, 'HH:mm', 'de');
          }

          console.log("📩 DEBUG: Original `parentMessage` nach Korrektur:", this.parentMessage);
      } else {
          console.warn("⚠️ Keine Original-PrivateMessage gefunden. Nutze Standard-`parentMessage`.");
      }
  } catch (error) {
      console.error("❌ Fehler beim Laden der Original-PrivateMessage:", error);
  }
}

  private async loadLastUsedThreadEmojis(): Promise<void> {
    if (!this.parentMessage?.id) {
      console.warn("⚠️ Kein `threadId` vorhanden – Emojis werden nicht geladen.");
      return;
    }
  
    try {
      const [lastSent, lastReceived] = await Promise.all([
        this.messageService.getLastUsedThreadEmojis(this.parentMessage.id, 'sent'),
        this.messageService.getLastUsedThreadEmojis(this.parentMessage.id, 'received')
      ]);
  
      console.log("📥 Geladene Thread-Emojis Sent:", lastSent);
      console.log("📥 Geladene Thread-Emojis Received:", lastReceived);
  
      this.lastUsedEmojisSent = lastSent || [];
      this.lastUsedEmojisReceived = lastReceived || [];
  
      // 🔥 Stelle sicher, dass `listenForThreadEmojiUpdates()` aktiv ist
      this.listenForThreadEmojiUpdates();
  
    } catch (error) {
      console.error("❌ Fehler beim Laden der letzten Emojis für Threads:", error);
    }
  }
  
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

showTooltip(event: MouseEvent, emoji: string, senderName: string): void {
  this.tooltipVisible = true;
  this.tooltipEmoji = emoji;
  this.tooltipSenderName = senderName;
  this.tooltipPosition = { x: event.clientX, y: event.clientY - 40 };
}

hideTooltip(): void {
  this.tooltipVisible = false;
}

closeProfileCard(textArea: HTMLTextAreaElement): void {
  this.imageUrl = null;
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
    this.privateMessage += ` @${member.name} `;
    // Overlay schließen
    this.showUserDropdown = false;
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
/** ✅ Nachricht im Thread bearbeiten **/
startEditing(msg: any): void {
  msg.isEditing = true;
 // this.originalMessage = { ...msg };
  this.originalMessage = JSON.parse(JSON.stringify(msg)); 
  this.showEditOptions = false;
}

cancelEditing(msg: any): void {
  if (this.originalMessage) {
    // Stelle die ursprüngliche Nachricht wieder her
    msg.content.text = this.originalMessage.content.text; // Nur den Text wiederherstellen
    this.originalMessage = null; // Originalnachricht zurücksetzen
  }
  msg.isEditing = false; // Bearbeiten beenden
  this.showEditOptions = false; // Bearbeitungsoptionen schließen
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

