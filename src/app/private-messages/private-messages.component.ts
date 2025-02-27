import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, ViewChild, ElementRef, Input, EventEmitter, Output,OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { ChannelService } from '../channel.service';
import { UserService } from '../user.service';
import { MatDialog } from '@angular/material/dialog';
import { formatDate } from '@angular/common';

import { Message } from '../message.models';
import { MessageService } from '../message.service';
import { ActivatedRoute, Router } from '@angular/router';

import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { Timestamp } from 'firebase/firestore';


import { OverlayModule } from '@angular/cdk/overlay';
export interface MessageContent {
  text?: string;
  image?: string | ArrayBuffer | null;
 
}  emojis: Array<{ emoji: string; count: number }>;

@Component({
  selector: 'app-private-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, PickerModule, OverlayModule],
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
  @Output() openThread = new EventEmitter<any>();
  @Input() threadData: any = null; // Daten vom Thread

 

  parentMessage: any = null; // ✅ Speichert die übergeordnete Nachricht für den Thread
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
  selectedThread: any = null;
  latestTimestamp: Date | null = null;
  selectedMember: any = null; 



  allUsers: any[] = [];

  // Steuert Overlay
  showUserDropdown: boolean = false;

  private replyCache: Map<string, any[]> = new Map(); 
  private unsubscribeFromThreadMessages: (() => void) | null = null;
  private unsubscribeLiveReplyCounts: (() => void) | null = null; // Für Listener
  private unsubscribeFromThreadDetails: (() => void) | null = null;
  private unsubscribeEmojiListener?: () => void;

  private unsubscribeFromPrivateMessages: (() => void) | null = null; 

  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private channelService: ChannelService,
    private dialog: MatDialog,
    private messageService: MessageService
    
  ) {}

 

  async ngOnInit(): Promise<void> {
    await this.loadCurrentUser();
    this.loadRecipientData();

    if (this.currentUser?.id && this.recipientId) {
      this.conversationId = this.messageService.generateConversationId(
        this.currentUser.id,
        this.recipientId
      );
  
      this.setupMessageListener();
      this.listenForEmojiUpdates();
      this.loadLastUsedEmojis();
      this.startLiveReplyCountUpdates();
      this.startDateUpdater();
    }
  }



  private startDateUpdater(): void {
    setInterval(() => {
      console.log("🔄 Überprüfe, ob sich das Datum geändert hat...");
      this.updateMessageDates();
    }, 60000); // Alle 60 Sekunden (1 Minute)
  }
  
  private updateMessageDates(): void {
    const updatedMessages = this.privateMessages.map(msg => ({
      ...msg,
      formattedDate: this.getFormattedDate(msg.timestamp) // 🔥 Datum wird neu berechnet
    }));
  
    this.privateMessages = [...updatedMessages]; // 🔥 UI-Update für Change Detection
  
    console.log("📅 Datum wurde neu berechnet:", this.privateMessages);
  }
  
  private setupMessageListener(): void {
    if (this.unsubscribeFromThreadMessages) {
      this.unsubscribeFromThreadMessages();
    }
  
    this.unsubscribeFromThreadMessages = this.messageService.listenMessages(
      'private',
      this.conversationId!,
      (rawMessages) => {
        this.processIncomingMessages(rawMessages);
        this.scrollToBottom();
      }
    );
  }



async loadPrivateMessages(): Promise<void> {
  if (!this.currentUser?.id || !this.recipientId) return;

  const conversationId = this.messageService.generateConversationId(
    this.currentUser.id,
    this.recipientId
  );

  // 🔥 **Alten Listener beenden, bevor ein neuer gestartet wird**
  if (this.unsubscribeFromPrivateMessages) {
    this.unsubscribeFromPrivateMessages();
  }

  console.log("📡 Starte Live-Listener für privateMessages:", conversationId);

  this.unsubscribeFromPrivateMessages = this.messageService.getPrivateMessagesLive(
    conversationId,
    (messages) => {
      console.log("📩 Neue Live-Nachrichten erhalten:", messages);

      // 🔥 **Stelle sicher, dass jede Nachricht ein sicheres Timestamp-Format hat**
      this.privateMessages = messages.map(msg => {
        const timestampDate = this.safeConvertTimestamp(msg.timestamp);
        const lastResponseTime = msg.lastResponseTime 
          ? this.safeConvertTimestamp(msg.lastResponseTime)
          : timestampDate; // Falls `lastResponseTime` fehlt, nutze `timestamp`

        return {
          ...msg,
          timestamp: timestampDate,
          lastResponseTime, // ✅ Direkt setzen, damit Angular `date: 'HH:mm'` erkennt
          formattedDate: this.getFormattedDate(timestampDate),
          content: { 
            ...msg.content, 
            emojis: msg.content?.emojis || []
          }
        };
      });

      this.scrollToBottom(); // Automatisch zum neuesten Chat scrollen
    }
  );
}



ngOnChanges(changes: SimpleChanges): void {
  if (changes['recipientId'] && !changes['recipientId'].isFirstChange()) {
    console.log('🔄 Empfänger gewechselt:', changes['recipientId'].currentValue);

    this.cleanupListeners();
    this.loadRecipientData();
    this.loadPrivateMessages();
    this.startLiveReplyCountUpdates();
  }

  if (changes['threadData']?.currentValue) {
    const newThreadData = changes['threadData'].currentValue;
    console.log('🔄 Thread-Daten aktualisiert:', newThreadData);
    
    // 🔥 6. Zeitstempel formatieren
    if (newThreadData.timestamp) {
      console.log('⏳ Letzte Antwort:', 
        this.getFormattedDate(newThreadData.timestamp),
        formatDate(newThreadData.timestamp, 'HH:mm', 'de')
      );
    }
  }
}
  
  

  // 🔥 7. Zentralisierte Listener-Bereinigung
  private cleanupListeners(): void {
    if (this.unsubscribeLiveReplyCounts) {
      this.unsubscribeLiveReplyCounts();
      this.unsubscribeLiveReplyCounts = null;
    }
    if (this.unsubscribeFromThreadMessages) {
      this.unsubscribeFromThreadMessages();
      this.unsubscribeFromThreadMessages = null;
    }
  }

  ngOnDestroy(): void {
    // 1. Beende alle Nachrichten-Listener
    if (this.unsubscribeFromThreadMessages) {
      this.unsubscribeFromThreadMessages();
      this.unsubscribeFromThreadMessages = null;
      console.log("🛑 Thread-Nachrichten-Listener gestoppt");
    }
  
    // 2. Beende Thread-Detail-Listener
    if (this.unsubscribeFromThreadDetails) {
      this.unsubscribeFromThreadDetails();
      this.unsubscribeFromThreadDetails = null;
      console.log("🛑 Thread-Detail-Listener gestoppt");
    }
  
    // 3. Beende Emoji-Listener
    if (this.unsubscribeEmojiListener) {
      this.unsubscribeEmojiListener();
     // this.unsubscribeEmojiListener = null;
      //this.unsubscribeEmojiListener = undefined;
      console.log("🛑 Live-Emoji-Listener gestoppt");
    }
  
    // 4. Beende Antwortzähler-Listener (neu hinzugefügt)
    if (this.unsubscribeLiveReplyCounts) {
      this.unsubscribeLiveReplyCounts();
      this.unsubscribeLiveReplyCounts = null;
      console.log("🛑 Antwortzähler-Listener gestoppt");
    }

    if (this.unsubscribeFromPrivateMessages) {
      this.unsubscribeFromPrivateMessages();
      console.log("🛑 Live-Listener für privateMessages gestoppt.");
    }
  
    // 5. Optional: Leere den Antwort-Cache
    this.replyCache.clear();
  }
  
  openThreadEvent(msg: any): void {
    this.parentMessage = msg;
    const threadId = msg.threadId || msg.id;
  
    // 🛑 Falls ein alter Listener läuft, stoppen
    if (this.unsubscribeFromThreadMessages) {
      this.unsubscribeFromThreadMessages();
      this.unsubscribeFromThreadMessages = null;
    }
  
    // 🔍 **Prüfen, ob Antworten bereits im Cache gespeichert sind**
    if (this.replyCache.has(threadId)) {
      console.log(`♻️ Antworten aus Cache für Thread ${threadId} geladen`);
      msg.replies = this.replyCache.get(threadId) || [];
      this.openThread.emit(msg);
      return;
    }
  
    // 🚀 Falls nicht im Cache → Thread aus Firestore neu laden
    this.loadThread(threadId, msg);
  }
  
private loadThread(threadId: string, msg: any): void {
  console.log(`🧵 Lade Thread für Nachricht ${threadId}`);

  if (this.unsubscribeFromThreadMessages) {
    this.unsubscribeFromThreadMessages();
  }

  this.unsubscribeFromThreadMessages = this.messageService.listenMessages(
    'thread',
    threadId,
    (messages) => {
      console.log(`📩 Live-Update für Thread ${threadId}:`, messages);

      // 🔥 Konvertiere den Timestamp hier
      const lastResponseTime = messages.length > 0 
        ? this.safeConvertTimestamp(messages[messages.length - 1].timestamp)
        : null;

      this.privateMessages = this.privateMessages.map(message => {
        if (message.id === msg.id) {
          // 🔥 Erstelle ein NEUES Objekt für Change Detection
          return {
            ...message,
            replies: [...messages], // Neue Array-Referenz
            replyCount: messages.length,
            lastResponseTime: lastResponseTime // Korrekter Property-Name
          };
        }
        return message;
      });

      this.openThread.emit(msg);
    }
  );
}

startLiveReplyCountUpdates(): void {
  if (this.unsubscribeLiveReplyCounts) {
    this.unsubscribeLiveReplyCounts();
  }

  const messageIds = this.privateMessages.map(m => m.id);
  if (messageIds.length === 0) return;

  this.unsubscribeLiveReplyCounts = this.messageService.loadReplyCountsLive(
    messageIds,
    'private',
    (partialCounts) => {
      this.privateMessages = this.privateMessages.map(msg => {
        const data = partialCounts[msg.id];
        if (!data) return msg;

        // 🔥 Korrekte Property-Zuordnung und Timestamp-Konvertierung
        return {
          ...msg,
          replyCount: data.count,
          lastResponseTime: data.lastResponseTime 
            ? this.safeConvertTimestamp(data.lastResponseTime)
            : null
        };
      });
    }
  );
}

  loadRecipientData(): void {
    if (!this.recipientId) {
      console.warn("⚠️ Kein Empfänger ausgewählt.");
      return;
    }
  
    this.userService.getUserById(this.recipientId).then(userData => {
      if (userData) {
        this.recipientName = userData.name; // ✅ Empfängername setzen
        this.recipientAvatarUrl = userData.avatarUrl || '';
        this.recipientStatus = userData.isOnline ? 'Aktiv' : 'Abwesend'; // ✅ Status setzen
        console.log("✅ Empfänger geladen:", this.recipientName, this.recipientAvatarUrl, this.recipientStatus);
      } else {
        console.warn("⚠️ Empfänger nicht gefunden:", this.recipientId);
      }
    }).catch(error => {
      console.error("❌ Fehler beim Laden des Empfängers:", error);
    });
  }
  

  async addEmojiToMessage(event: any, msg: any): Promise<void> {
    if (!msg.content.emojis) {
      msg.content.emojis = [];
    }
  
    const newEmoji = event.emoji.native;
    const existingEmoji = msg.content.emojis.find((e: any) => e.emoji === newEmoji);
  
    if (this.conversationId) {
      const emojiType = msg.senderId === this.currentUser?.id ? 'sent' : 'received';
      
      this.messageService.saveLastUsedEmojis(
        this.conversationId,
        [newEmoji], // 🔥 Wichtig: Als Array übergeben
        emojiType
      ).catch(error => console.error('Emoji-Speicherung fehlgeschlagen:', error));
    }
  
    if (existingEmoji) {
      existingEmoji.count += 1;
    } else {
      msg.content.emojis.push({ emoji: newEmoji, count: 1 });
    }
  
    // 🔥 **Nur `content.emojis` aktualisieren, andere Felder NICHT überschreiben!**
    try {
      await this.messageService.updateMessage(msg.id, {
        'content.emojis': msg.content.emojis
      });
  
      console.log('✅ Emoji erfolgreich zur Nachricht hinzugefügt.');
  
      // 🔥 **Lokales UI-Update ohne Firestore-Neuladen**
      this.privateMessages = this.privateMessages.map(m =>
        m.id === msg.id
          ? { ...m, content: { ...m.content, emojis: msg.content.emojis } }
          : m
      );

    } catch (error) {
      console.error('❌ Fehler beim Aktualisieren der Nachricht mit Emoji:', error);
    }
  }

private listenForEmojiUpdates(): void {
  if (!this.conversationId) return;

  this.unsubscribeEmojiListener = this.messageService.listenForEmojiUpdates(
    this.conversationId,
    (sentEmojis, receivedEmojis) => {
      this.lastUsedEmojisSent = sentEmojis; // Aktualisiere gesendete Emojis
      this.lastUsedEmojisReceived = receivedEmojis; // Aktualisiere empfangene Emojis
      console.log("🔥 Live-Emoji-Update empfangen:", sentEmojis, receivedEmojis);
    }
  );
}

async initializeConversation(): Promise<void> {
  if (!this.conversationId) return;

  try {
    // 1. Validierung der Benutzerdaten
    if (!this.currentUser?.id || !this.recipientId) {
      throw new Error('Current user or recipient ID missing');
    }

    // 2. Konversations-ID generieren
    this.conversationId = this.messageService.generateConversationId(
      this.currentUser.id,
      this.recipientId
    );

    // 3. Letzte Emojis laden
    [this.lastUsedEmojisSent, this.lastUsedEmojisReceived] = await Promise.all([
      this.messageService.getLastUsedEmojis(this.conversationId, 'sent'),
      this.messageService.getLastUsedEmojis(this.conversationId, 'received')
    ]);

    // 4. Echtzeit-Listener für Emojis starten
    this.listenForEmojiUpdates();

    // 5. Initiale Nachrichten laden
    const initialMessages = await this.messageService.getMessagesOnce('private', this.conversationId);
    this.privateMessages = initialMessages.map(msg => this.enrichMessageData(msg));

    // 6. Live-Listener für Nachrichten starten
    this.unsubscribeFromThreadMessages = this.messageService.listenMessages(
      'private',
      this.conversationId,
      (rawMessages) => {
        this.privateMessages = rawMessages.map(msg => this.enrichMessageData(msg));
        this.scrollToBottom();
      }
    );

    console.log('✅ Konversation erfolgreich initialisiert');
  } catch (error) {
    console.error('❌ Fehler bei der Initialisierung:', error);
    // Optional: Fehlerbehandlung für UI
  }
}

private enrichMessageData(msg: Message): Message {
  return {
    ...msg,
    content: {
      ...msg.content,
      emojis: msg.content?.emojis || []
    },
    formattedDate: this.getFormattedDate(msg.timestamp)
  };
}

private async loadLastUsedEmojis(): Promise<void> {
  if (!this.currentUser || !this.recipientId) {
    console.warn("⚠️ Kein gültiger Chat – Emojis werden nicht geladen.");
    return;
  }

  try {
    const conversationId = this.messageService.generateConversationId(
      this.currentUser.id,
      this.recipientId
    );

    // 🔥 Emojis aus Firestore laden
    const [lastSent, lastReceived] = await Promise.all([
      this.messageService.getLastUsedEmojis(conversationId, 'sent'),
      this.messageService.getLastUsedEmojis(conversationId, 'received')
    ]);

    console.log("📥 Geladene PrivateMessage-Emojis Sent:", lastSent);
    console.log("📥 Geladene PrivateMessage-Emojis Received:", lastReceived);

    // 🔥 UI-Update (Verhindert leeres Array!)
    this.lastUsedEmojisSent = lastSent || [];
    this.lastUsedEmojisReceived = lastReceived || [];

    // 🔥 Stelle sicher, dass `listenForEmojiUpdates()` aktiv ist
    this.listenForEmojiUpdates();

  } catch (error) {
    console.error("❌ Fehler beim Laden der letzten Emojis für Private Messages:", error);
  }
}


  async sendPrivateMessage(textArea: HTMLTextAreaElement): Promise<void> {
    const senderId = this.userService.getCurrentUserId();
    if (!senderId || !this.recipientId) {
      console.error("❌ Sender oder Empfänger fehlt.");
      return;
    }
  
    const conversationId = this.messageService.generateConversationId(senderId, this.recipientId);
  
    let senderName = this.currentUser?.name || "Unknown";
    let senderAvatar = this.currentUser?.avatarUrl || "assets/default-avatar.png"; // Fallback falls kein Avatar vorhanden
  
    if (!senderName) {
      try {
        const userData = await this.userService.getUserById(senderId);
        senderName = userData?.name || "Unknown";
        senderAvatar = userData?.avatarUrl || "assets/default-avatar.png";
      } catch (error) {
        console.error("❌ Fehler beim Laden des Sender-Namens:", error);
      }
    }
  
    // 🔥 Aktuelles Datum berechnen
    const timestamp = new Date();
    const formattedDate = this.getFormattedDate(timestamp);
  
    // 🔥 Prüfen, ob ein neuer Datums-Separator notwendig ist
    let showDateSeparator = false;
    if (this.privateMessages.length > 0) {
      const lastMessage = this.privateMessages[this.privateMessages.length - 1];
      showDateSeparator = !this.isSameDay(lastMessage.timestamp, timestamp);
    } else {
      showDateSeparator = true; // Falls es die erste Nachricht ist, soll ein Datum erscheinen
    }
  
    // 🔥 Temporäre Nachricht für sofortige UI-Anzeige
    const tempMessageId = `temp-${Math.random().toString(36).substr(2, 9)}`;
    const tempMessageData = {
      id: tempMessageId,
      content: {
        text: this.privateMessage || "",
        image: typeof this.imageUrl === "string" ? this.imageUrl : "",
        emojis: []
      },
      timestamp,
      formattedDate,  // ✅ Setzt das formatierte Datum
      showDateSeparator, // ✅ Falls ein neuer Tag begonnen hat, zeigen wir das Datum an
      time: formatDate(timestamp, 'HH:mm', 'de'),
      senderId,
      senderName,
      senderAvatar,
      conversationId
    };
  
    // 1️⃣ Nachricht sofort in der UI anzeigen
    this.privateMessages = [...this.privateMessages, tempMessageData];
    this.scrollToBottom();
  
    try {
      // 2️⃣ Nachricht in Firestore speichern
      const firestoreId = await this.messageService.sendMessage({
        type: "private",
        conversationId,
        content: {
          text: this.privateMessage || "",
          image: typeof this.imageUrl === "string" ? this.imageUrl : "",
          emojis: []
        },
        senderId,
        senderName,  // ✅ Jetzt akzeptiert
        senderAvatar, // ✅ Jetzt akzeptiert
        recipientId: this.recipientId,
      });
  
      console.log("✅ Nachricht erfolgreich in Firestore gespeichert:", firestoreId);
  
      // 3️⃣ Temporäre Nachricht durch Firestore-Version ersetzen
      this.privateMessages = this.privateMessages.map((msg) =>
        msg.id === tempMessageId ? { ...msg, id: firestoreId } : msg
      );

     
      // 4️⃣ Letzte verwendete Emojis speichern
      const savedMessage = await this.messageService.getMessage("private", firestoreId);
      if (conversationId && savedMessage?.content?.emojis?.length )   {
        const emojisInMessage = savedMessage.content.emojis.map((e: { emoji: string }) => e.emoji);
        await this.messageService.saveLastUsedEmojis(conversationId, emojisInMessage, "sent");
      }

  

      await this.loadLastUsedEmojis();  // 🔥 Emojis werden sofort geladen



     // this.lastUsedEmojisSent = await this.messageService.getLastUsedEmojis(conversationId, 'sent');
   // this.lastUsedEmojisReceived = await this.messageService.getLastUsedEmojis(conversationId, 'received');
    this.listenForEmojiUpdates(); 
  
    } catch (error) {
      console.error("❌ Fehler beim Senden der Nachricht:", error);
    }
  
    // 5️⃣ Eingabefelder leeren
    this.privateMessage = "";
    this.imageUrl = null;
    if (textArea) this.resetTextareaHeight(textArea);
  
    // 6️⃣ Letzte verwendete Emojis neu laden
   // this.loadLastUsedEmojis();
    await this.loadLastUsedEmojis();

  
    // 7️⃣ Automatische Aktualisierung des Datums für alle Nachrichten (damit "Heute" → "Gestern" wird)
    this.updateMessageDates();
  }
  
getFormattedDate(inputDate: Date | string | null): string {
  if (!inputDate) return '';

  // 1. Konvertiere zu Date-Objekt
  const date = inputDate instanceof Date ? inputDate : new Date(inputDate);
  if (isNaN(date.getTime())) return 'Ungültiges Datum';

  // 2. Aktuelles Datum mit Zeitzone berücksichtigen
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  // 3. Vergleichsdatum erstellen (ohne Uhrzeit)
  const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  // 4. Automatische Anpassung des Datums
  if (compareDate.getTime() === today.getTime()) {
      return 'Heute';
  } else if (compareDate.getTime() === yesterday.getTime()) {
      return 'Gestern';
  } else {
      return date.toLocaleDateString('de-DE', { 
          weekday: 'long', 
          day: '2-digit', 
          month: 'long',
          timeZone: 'Europe/Berlin' 
      });
  }
}

private processIncomingMessages(rawMessages: Message[]): void {
  let prevDate: Date | null = null;

  const updatedMessages = rawMessages.map((msg, index) => {
      // 🔥 Konvertiere Timestamp sicher
      const timestampDate = this.safeConvertTimestamp(msg.timestamp);

      // 🔥 Prüfe, ob ein neuer Separator gesetzt werden muss
      const showDateSeparator = index === 0 || !this.isSameDay(prevDate, timestampDate);
      prevDate = timestampDate;

      return {
          ...msg,
          timestamp: timestampDate,
          lastResponseTime: msg.lastResponseTime ? this.safeConvertTimestamp(msg.lastResponseTime) : timestampDate,
          formattedDate: this.getFormattedDate(timestampDate),
          showDateSeparator, // ✅ Hier wird entschieden, ob ein neuer Separator nötig ist
          time: formatDate(timestampDate, 'HH:mm', 'de'),
          content: { 
              ...msg.content, 
              emojis: msg.content?.emojis?.slice() || []
          },
          replyCount: msg.replyCount ?? 0
      };
  });
  // 🔥 Immutable Update für Change Detection
  this.privateMessages = [...updatedMessages];
  console.log("📩 Nachrichten mit aktualisierten Datums-Separatoren:", this.privateMessages);
  this.updateLiveReplyCounts(updatedMessages);
}


private updateLiveReplyCounts(messages: Message[]): void {
  const messageIds = messages
    .map(m => m.id)
    .filter((id): id is string => id !== undefined);

  if (messageIds.length === 0) return;

  this.unsubscribeLiveReplyCounts = this.messageService.loadReplyCountsLive(
    messageIds,
    'private',
    (partialCounts) => {
      for (const [msgId, data] of Object.entries(partialCounts)) {
        const msgIndex = this.privateMessages.findIndex(m => m.id === msgId);
        if (msgIndex !== -1) {
          this.privateMessages[msgIndex] = {
            ...this.privateMessages[msgIndex],
            replyCount: data.count,
           

            // ✅ timestamp und time bleiben stabil
            timestamp: this.privateMessages[msgIndex].timestamp,
            time: this.privateMessages[msgIndex].time
          };
        }
      }
      console.log("🔄 Live-Update der Reply-Anzahlen (privateMessages):", this.privateMessages);
    }
  );
}






async loadReplyCounts(): Promise<void> {
  const messageIds = this.privateMessages.map(m => m.id);
  if (messageIds.length === 0) return;

  try {
    const replyCounts = await this.messageService.getReplyCountsForMessages(messageIds, "private");
    this.privateMessages = this.privateMessages.map(msg => ({
      ...msg,
      replyCount: replyCounts[msg.id] ?? 0
    }));
  } catch (err) {
    console.error("❌ Fehler beim Laden der Antwortanzahlen:", err);
  }
}

async saveMessage(msg: any): Promise<void> {
  if (msg?.isEditing !== undefined) {
    msg.isEditing = false; // Bearbeiten beenden
    const messageId = msg.id;

    if (messageId) {
      try {
        // Wir rufen jetzt unsere neue universelle Methode auf:
        await this.messageService.updateMessage(messageId, {
          content: msg.content
        });
        console.log('✅ Nachricht erfolgreich gespeichert.');

        // Nachricht in der lokalen Liste aktualisieren
        this.privateMessages = this.privateMessages.map(m =>
          m.id === messageId
            ? { ...msg, isEditing: false }
            : m
        );
      } catch (err) {
        console.error('❌ Fehler beim Speichern der Nachricht:', err);
      }
    } else {
      console.error('❌ Speichern fehlgeschlagen: Message ID fehlt.');
    }
  }
}

private isSameDay(date1: Date | null, date2: Date | null): boolean {
  if (!date1 || !date2) return false;
  
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
}

private safeConvertTimestamp(timestamp: unknown): Date {
  // 1. Fall: Kein Timestamp vorhanden
  if (!timestamp) return new Date();

  // 2. Fall: Firestore Timestamp-Objekt
  if (typeof (timestamp as any).toDate === 'function') {
    return (timestamp as firebase.firestore.Timestamp).toDate();
  }

  // 3. Fall: JavaScript Date-Objekt
  if (timestamp instanceof Date) {
    return timestamp;
  }

  // 4. Fall: Rohes Firestore-Format {seconds: number, nanoseconds: number}
  if (typeof timestamp === 'object' && 'seconds' in timestamp!) {
    const ts = timestamp as { seconds: number; nanoseconds: number };
    return new Date(ts.seconds * 1000 + ts.nanoseconds / 1e6);
  }

  // 5. Fall: String oder number
  const parsedDate = new Date(timestamp as string | number);
  return isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
}

private getYesterdayDate(): Date {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday;
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
  
    // Schließe alle Emoji-Picker in privateMessages
    this.privateMessages.forEach((m) => m.isEmojiPickerVisible = false);
  
    // Setze den Zustand für die ausgewählte Nachricht basierend auf dem vorherigen Zustand
    msg.isEmojiPickerVisible = !isCurrentlyVisible;
  }

  generateConversationId(userId1: string, userId2: string): string {
    return [userId1, userId2].sort().join('_'); // Alphabetisch sortieren und verbinden
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
  //this.originalMessage = { ...msg }; // Originalnachricht speichern

  this.originalMessage = JSON.parse(JSON.stringify(msg)); // Tiefkopie der Originalnachricht speichern
  this.showEditOptions = false; // Optionen schließen
}

toggleEditMessage(msg: any): void {
  msg.isEditing = true; // Öffnet das Bearbeitungsfeld
  this.originalMessage = { ...msg }; // Speichere eine Kopie der ursprünglichen Nachricht
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

