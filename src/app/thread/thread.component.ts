import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef, SimpleChanges  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { MessageService } from '../message.service';
import { UserService } from '../user.service';
import { formatDate } from '@angular/common';
import { serverTimestamp } from '@angular/fire/firestore';
import { ChangeDetectorRef } from '@angular/core'; 

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
  threadId!: string; 
  replyCount: number = 0; 
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
    if (!this.parentMessage?.id) {
        console.warn('⚠️ Kein gültiges `parentMessage` übergeben. Thread kann nicht geladen werden.', this.parentMessage);
        this.closeThread.emit(); // ❌ Thread schließen, da kein gültiger Parent vorhanden ist
        return;
    }

    await this.loadCurrentUser();
    if (!this.currentUser) {
        console.error("❌ `currentUser` konnte nicht geladen werden. Thread wird nicht geöffnet.");
        this.closeThread.emit(); // ❌ Falls Benutzer nicht geladen wird, Thread schließen
        return;
    }
  
    const threadId = this.parentMessage.id;
    try {
        console.log(`🔍 Lade Thread-Messages für ID: ${threadId}`);
  
        // **Paralleles Laden von Nachrichten & Emojis für bessere Performance**
        const [existingMessages, lastSentEmojis, lastReceivedEmojis] = await Promise.all([
            this.messageService.getMessagesOnce('thread', threadId),
            this.messageService.getLastUsedThreadEmojis(threadId, 'sent'),
            this.messageService.getLastUsedThreadEmojis(threadId, 'received')
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
        await this.loadLastUsedEmojisLive(threadId);
        this.loadThreadMessagesLive();
  
        // ✅ Falls `timestamp` existiert, formatiere es
        if (this.parentMessage?.timestamp) {
            const parentTimestamp = this.safeConvertTimestamp(this.parentMessage.timestamp);
            this.formattedParentMessageDate = this.getFormattedDate(parentTimestamp);
            this.formattedMessageTime = formatDate(parentTimestamp, 'HH:mm', 'de');
        }
  
        // **Live-Updates für Reply-Counts aktivieren**
        this.unsubscribeReplyCount = this.messageService.loadReplyCountsLive(
            [this.parentMessage.id],
            'thread',
            (updatedCounts) => {
                this.parentMessage.replyCount = updatedCounts[this.parentMessage.id]?.count || 0;
                console.log("🔄 Live-Update für `replyCount`:", this.parentMessage.replyCount);
            }
        );
  
    } catch (error) {
        console.error('❌ Fehler bei der Initialisierung des Threads:', error);
        this.closeThread.emit(); // ❌ Thread bei Fehlern schließen
    }
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


  openThreadEvent(msg: any): void {
    console.log("📥 `openThreadEvent()` aufgerufen mit Nachricht:", msg);
  
    if (!msg || !msg.id) {
      console.error("❌ Fehler: Ungültige Nachricht zum Öffnen des Threads", msg);
      return;
    }
  
    this.parentMessage = { ...msg };
    this.threadId = this.parentMessage.id; // Setzt `threadId` explizit
    console.log("🔍 Setze `parentMessage.id` als `threadId`:", this.parentMessage.id);

    if (this.parentMessage?.timestamp) {
      const parentTimestamp = this.safeConvertTimestamp(this.parentMessage.timestamp);
      this.formattedParentMessageDate = this.getFormattedDate(parentTimestamp);
      this.formattedMessageTime = formatDate(parentTimestamp, 'HH:mm', 'de');
  }
    this.openThread.emit({
      ...this.parentMessage,
      threadId: this.parentMessage.id,
      parentId: this.parentMessage.parentId ?? this.parentMessage.id,
      timestamp: this.parentMessage.timestamp, 
    });
  
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
                this.fetchRecipientName(parentMessage.recipientId);
            }
        }
      
        this.threadId = this.parentMessage?.id || '';

        // 🔥 Falls `timestamp` existiert, formatieren wir es
        if (this.parentMessage?.timestamp) {
            const parentTimestamp = this.safeConvertTimestamp(this.parentMessage.timestamp);
            this.formattedParentMessageDate = this.getFormattedDate(parentTimestamp);
            this.formattedMessageTime = formatDate(parentTimestamp, 'HH:mm', 'de');
        }

        console.log("📩 DEBUG: `parentMessage.content.text` nach Fix:", this.parentMessage.content.text);
        // **🚀 Jetzt sicherstellen, dass `parentMessage` wirklich die ERSTE private Nachricht ist**
        this.loadOriginalPrivateMessage(this.parentMessage.id);
        // **Live-Updates starten**
        this.loadThreadMessagesLive();
        this.loadLastUsedThreadEmojis();
        this.listenForThreadEmojiUpdates();
    } else {
        console.warn("⚠️ `ngOnChanges` wurde aufgerufen, aber `parentMessage` ist `null` oder leer!");
    }
  }

  private listenForReplyCountUpdates(): void {
    if (!this.parentMessage?.id) {
      console.error("❌ Fehler: `parentMessage.id` fehlt! Live-Updates für Reply-Count werden nicht gestartet.");
      return;
    }
  
    console.log("🔄 Starte Live-Listener für `replyCount` in Thread:", this.parentMessage.id);
  
    this.unsubscribeReplyCount = this.messageService.loadReplyCountsLive(
      [this.parentMessage.id],
      'thread',
      (updatedCounts) => {
        console.log("🔥 Live-Update empfangen für `replyCount`:", updatedCounts);
  
        if (!updatedCounts[this.parentMessage.id]) {
          console.warn(`⚠️ Keine Reply-Daten für Thread ${this.parentMessage.id}`);
          return;
        }
  
        // 💥 replyCount in eigener Property
        this.replyCount = updatedCounts[this.parentMessage.id].count || 0;
        // Optional: zusätzlich parentMessage.replyCount, falls es woanders genutzt wird
        this.parentMessage.replyCount = this.replyCount;
  
        console.log("🔄 Neuer replyCount:", this.replyCount);
        this.cdr.detectChanges(); // <-- UI-Update erzwingen!
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
}