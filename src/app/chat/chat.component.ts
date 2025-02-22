import { Component, OnInit, ViewChild,  CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatHeaderComponent } from '../chat-header/chat-header.component';
import { DevspaceComponent } from '../devspace/devspace.component';
import { EntwicklerteamComponent } from '../entwicklerteam/entwicklerteam.component';
import { InnerChannelComponent } from '../inner-channel/inner-channel.component';
import { DirectMessagesComponent } from '../direct-messages/direct-messages.component';
import { PrivateMessagesComponent } from '../private-messages/private-messages.component';
import { WelcomeScreenComponent } from '../welcome-screen/welcome-screen.component';
import { AppStateService } from '../app-state.service';
import { UserService } from '../user.service';
import { ChannelService } from '../channel.service';
import { SearchFieldComponent } from '../search-field/search-field.component';
import { ThreadComponent } from '../thread/thread.component';
import { ThreadChannelComponent } from '../thread-channel/thread-channel.component';
import { MessageService } from '../message.service';
import { ChangeDetectorRef } from '@angular/core';



interface ThreadChannelParentDoc {
  senderName?: string;
  senderAvatar?: string;
  content?: {
    text?: string;
    emojis?: any[];
  };
  timestamp?: any;
  replyCount?: number;
  channelName?: string;
  channelId?: string;
  // ... je nach Bedarf
}


@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    ChatHeaderComponent,
    DevspaceComponent,
    EntwicklerteamComponent,
    InnerChannelComponent,
    DirectMessagesComponent,
    PrivateMessagesComponent,
    WelcomeScreenComponent,
    SearchFieldComponent,
    ThreadComponent,
    ThreadChannelComponent
  ],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ChatComponent implements OnInit {
  isPrivateMessage: boolean = false; // Flag für private Nachrichtenansicht
  selectedMemberId: string = ''; // ID des ausgewählten Mitglieds für private Nachrichten
  selectedMemberName: string = ''; // Name des ausgewählten Mitglieds
  isEditingChannel: boolean = false; // Status für den Channel-Bearbeitungsmodus
  isPrivateChat: boolean = false;
  selectedMember: any = null; // Speichert das ausgewählte Mitglied
  showWelcomeContainer: boolean = false;
  selectedChannel: any = null; // Speichert den ausgewählten Kanal
  isSearchActive: boolean = false;
  selectedThread: any = null; 
  selectedThreadChannel: any = null; // Für Channel Threads
  isWorkspaceVisible: boolean = true;
  isThreadFromSearch: boolean = false; 
  isThreadChannelFromSearch: boolean = false;
  isThreadActive: boolean = false;
  threadData: any = null;


  private recipientCache: Map<string, string> = new Map(); // Cache für Namen


  @ViewChild(ChatComponent) chatComponent!: ChatComponent;
  @ViewChild(EntwicklerteamComponent) entwicklerteam!: EntwicklerteamComponent;

  constructor(
    private appStateService: AppStateService,
    private userService: UserService,
    private channelService: ChannelService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef 
  ) {}

  ngOnInit(): void {
    this.showWelcomeContainer = this.appStateService.getShowWelcomeContainer();
 }



 async openThreadChannelFromSearch(result: any): Promise<void> {
  console.log("🔍 Öffne Thread-Channel aus Suche:", result);

  // 1) Ggf. alten Thread schließen & UI-Status anpassen
  if (this.selectedThread) {
    this.closeThread();
  }
  this.isThreadChannelFromSearch = true;
  this.isPrivateChat = false;
  this.isSearchActive = false;
  this.showWelcomeContainer = false;
  this.selectedChannel = null;
  this.selectedMember = null;

  // 2) threadChannelId ermitteln
  const threadChannelId = result.threadChannelId || result.parentId || result.id;
  if (!threadChannelId) {
    console.error("❌ Kein gültiger `threadChannelId` gefunden:", result);
    return;
  }

  // 3) Hauptnachricht (parentDoc) laden & auf Interface casten
  const parentDoc = (await this.messageService.getMessage(
    "thread-channel",
    threadChannelId
  )) as ThreadChannelParentDoc | null;

  console.log("📩 Geladene Hauptnachricht:", parentDoc);
  if (!parentDoc) {
    console.warn("⚠️ Kein Parent-Dokument gefunden für:", threadChannelId);
  }

  // 4) Channel-Name nachladen, falls channelId existiert, aber channelName fehlt
  let channelName = parentDoc?.channelName || "Unbekannt";
  if (!parentDoc?.channelName && parentDoc?.channelId) {
    const channelData = await this.channelService.getChannelById(parentDoc.channelId);
    channelName = channelData?.name || "Unbekannt";
  }

  // 5) Kind-Nachrichten laden (falls du die Antworten schon in ChatComponent brauchst)
  const childMessages = await this.messageService.getMessagesOnce(
    "thread-channel",
    threadChannelId
  );
  console.log("📥 Geladene Kind-Nachrichten:", childMessages);

  // 5a) Fallbacks für childMessages
  const formattedMessages = (childMessages || []).map((msg) => ({
    ...msg,
    content: msg.content ?? { text: "Kein Text", emojis: [] },
    timestamp: msg.timestamp || new Date(),
  }));

  // 6) Fallbacks für parentDoc
  //    Nimm ggf. Daten aus `result`, falls in `parentDoc` etwas fehlt
  const parentMessage = {
    id: threadChannelId,
    text: parentDoc?.content?.text ?? result?.content?.text ?? "Kein Text",
    senderName: parentDoc?.senderName || result.senderName || "Unbekannt",
    senderAvatar: parentDoc?.senderAvatar || result.senderAvatar || "assets/img/default-avatar.png",
    timestamp: parentDoc?.timestamp || result.timestamp || new Date(),
    replyCount: parentDoc?.replyCount || result.replyCount || 0,
    channelName,
    channelId: parentDoc?.channelId || null,
    // Falls du Emojis in der Hauptnachricht brauchst
    content: parentDoc?.content ?? { text: "Kein Text", emojis: [] },
  };

  // 7) selectedThreadChannel: Hauptnachricht + Antworten
  this.selectedThreadChannel = {
    ...result,
    parentMessage,
    messages: formattedMessages,
  };

  // 7a) Falls `result` eine Einzelnachricht ist (z.B. Suche) und NICHT das Hauptdoc
  if (result.id !== threadChannelId) {
    const fallbackContent = result.content ?? { text: "Kein Text", emojis: [] };
    const fallbackTimestamp = result.timestamp || new Date();
    this.selectedThreadChannel.messages.push({
      ...result,
      content: fallbackContent,
      timestamp: fallbackTimestamp,
    });
  }

  console.log("✅ `selectedThreadChannel` (inkl. Antworten):", this.selectedThreadChannel);
}

async openThreadFromSearch(message: any): Promise<void> {
  console.log("🔍 Thread aus Suche geöffnet:", message);

  this.closeThreadChannel();
  // Beende ggf. Private Chat + Welcome Screen
  this.isPrivateChat = false;
  this.showWelcomeContainer = false;
  this.selectedChannel = null;

  this.selectedMember = null;

  // *** NEU: threadId statt parentId. 
  // (Falls Firestore-Kind-Nachrichten "threadId = <Eltern>" haben.)
  const threadId = message.threadId 
    || message.parentId  // Fallback
    || message.id;

  // Empfänger-Name ermitteln (falls du private Threads hast o.ä.)
  let recipientName = message.recipientName || message.senderName;
  if (!recipientName && message.recipientId) {
    console.log("📡 Lade Empfängername aus Firestore...");
    recipientName = await this.fetchRecipientName(message.recipientId);
  }

  // Setze selectedThread
  this.selectedThread = {
    ...message,
    recipientName: recipientName || "Unbekannt",
    recipientId: message.recipientId || message.senderId,
    threadId: threadId // Falls du es im Template brauchst
  };

  this.isThreadActive = true;
  this.isThreadFromSearch = true;
  console.log("✅ Thread erfolgreich geöffnet mit Empfänger:", this.selectedThread.recipientName);
}


  toggleWorkspace(): void {
    this.isWorkspaceVisible = !this.isWorkspaceVisible;
  }

  onChannelSelected(channel: any): void {
    if (channel) {
      if (this.isThreadFromSearch) {
        this.closeThread();
      }
      this.isThreadChannelFromSearch = false; 

       this.selectedThread = null; // 🛑 Thread explizit zurücksetzen
       this.isThreadActive = false;
       this.isThreadFromSearch = false;

      this.selectedThreadChannel = null; 
      this.isPrivateChat = false; // Wechsel zu Kanalansicht
      this.selectedChannel = channel; // Setze den aktuellen Kanal
      this.selectedMember = null; // Setze das ausgewählte Mitglied zurück
      this.isSearchActive = false; // Deaktiviert das Suchfeld
      this.showWelcomeContainer = false; // Blende den Welcome-Screen aus
      this.appStateService.setShowWelcomeContainer(false);
    } else {
      this.selectedChannel = null; // Kein Kanal ausgewählt
      this.showWelcomeContainer = true; // Zeige den Welcome-Screen an
      this.appStateService.setShowWelcomeContainer(true);
    }
  }

  onMemberSelected(member: any): void {
    if (!member || !member.id) {
      console.error("❌ Kein gültiges Mitglied ausgewählt:", member);
      return;
    }

    if (this.isThreadFromSearch) {
      this.closeThread();
    }

    if (this.selectedThreadChannel) {
      this.closeThreadChannel();
    }

    this.isPrivateChat = true; // Wechsel zu Private-Chat-Modus
    this.selectedMember = member; // Speichere das ausgewählte Mitglied
    
    this.selectedChannel = null; // Setze den ausgewählten Kanal zurück
    this.isSearchActive = false; // Deaktiviert das Suchfeld
    this.showWelcomeContainer = false;

    if (this.selectedThread) {
      this.selectedThread = null; // Schließe bestehenden Thread
    }
  }

  handleMemberSelected(event: { uid: string, name: string }): void {
    console.log('Mitglied empfangen:', event);
    this.selectedMemberId = event.uid;
    this.selectedMemberName = event.name;
    this.isPrivateMessage = true; // Umschalten auf die private Nachrichtenansicht
  }

  stopPrivateMessage(): void {
    this.isPrivateMessage = false;
    this.selectedMemberId = '';
    this.selectedMemberName = '';
  }

  handleEditChannelChange(isEditing: boolean): void {
    this.isPrivateChat = false;
    this.selectedMember = null;
    console.log('Channel-Modus aktiviert');
  }

  openSearchField(searchQuery?: string): void {
    this.isSearchActive = true; // Aktiviert das Suchfeld
    this.isPrivateChat = false;
    this.selectedChannel = null;
    this.showWelcomeContainer = false;

    if (searchQuery) {
      console.log('Search initiated with query:', searchQuery);
    } else {
      console.log('Search field activated.');
    }
  }

  closeSearchField(): void {
    this.isSearchActive = false; // Deaktiviert das Suchfeld
    if (!this.selectedChannel && !this.isPrivateChat) {
      this.showWelcomeContainer = true;
    }
  }

  handleMemberSelection(member: any): void {
    console.log('Mitglied ausgewählt:', member);
    this.isSearchActive = false; // Schließt das Suchfeld
    this.isPrivateChat = true; // Aktiviert die private Nachrichtenansicht
    this.selectedChannel = null; // Deaktiviert den Kanal
    this.selectedMember = member; // Speichert das ausgewählte Mitglied
  }



  openThreadChannel(threadData: any): void {
    console.log("🔍 openThreadChannel() in ChatComponent:", threadData);
  
    // => Hier packst du `threadData` in `selectedThreadChannel`
    this.selectedThreadChannel = threadData;
  }




  closeThreadChannel(): void {
    console.log("❌ Thread-Channel schließen");
    this.selectedThreadChannel = null;
    this.isThreadChannelFromSearch = false;

    if (this.selectedChannel) {
      console.log('Zurück zum Kanal-Chat');
    } else {
      this.showWelcomeContainer = true;
    }
  }
  

  onCloseSearch(): void {
    console.log("🔍 Suchmodus beendet");
    this.isSearchActive = false; // ✅ Hier wird es verwaltet
}

private scrollToMessage(messageId: string, retries = 5): void {
  setTimeout(() => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('highlight');
      setTimeout(() => element.classList.remove('highlight'), 2000);
    } else if (retries > 0) {
      this.scrollToMessage(messageId, retries - 1);
    }
  }, 300);
}


openThread(message: any): void {
  console.log("🔍 openThread() called with:", message);

  this.selectedThreadChannel = null; 

  

  this.isThreadFromSearch = false; 
  // Wenn von der Startseite geöffnet
  if (!this.selectedChannel && !this.isPrivateChat) {
    this.handleThreadFromSearch(message);
    return;
  }

  // Existierende Logik
  if (this.selectedThread?.id === message.id) {
    console.log('⚠️ Thread already open:', message);
    return;
  }

  this.selectedThread = null;

  this.selectedThread = {
    ...message,
    recipientName: message.recipientName || message.senderName || "Unbekannt"
  };

  setTimeout(() => {
    this.selectedThread = message;
    console.log("✅ Thread opened:", message);

    setTimeout(() => {
      const threadComponent = document.querySelector('app-thread') as any;
      if (threadComponent?.highlightThreadMessage) {
        threadComponent.highlightThreadMessage(message.id);
      }
    }, 300);
  }, 50);




}










openThreadFromPrivateMessage(message: any): void {
  console.log("🔍 Thread von privater Nachricht geöffnet:", message);
  // ✅ Thread neben Private-Container anzeigen (Private Messages bleiben sichtbar)
  this.selectedThread = message;
  this.isThreadActive = true; // Thread sichtbar halten
  this.isThreadFromSearch = false; 
  console.log("✅ Thread erfolgreich geöffnet (neben Private Chat):", message);
}


handleThreadFromSearch(result: any): void {
  console.log('🔥 Thread aus Suche öffnen:', result);

  // ✅ Prüfe den alten Wert von selectedMember
  console.log('🔍 Vorheriger selectedMember:', this.selectedMember);

  // ✅ Privaten Chat aktivieren
  this.isPrivateChat = true;

  // 🔥 Stelle sicher, dass `selectedMember` korrekt bleibt!
  console.log("🔍 Suche - selectedMember vor Änderung:", this.selectedMember);

  this.selectedMember = {
    id: result.senderId || this.selectedMember?.id || '',
    name: result.senderName || this.selectedMember?.name || 'Ubekannt',
    avatar: result.senderAvatar || this.selectedMember?.avatar || 'assets/img/default-avatar.png',
    conversationId: result.conversationId || this.selectedMember?.conversationId
  };

  console.log('✅ Neuer selectedMember:', this.selectedMember);

  // ✅ Thread-Daten setzen
  this.selectedThread = {
    ...result,
    recipientId: result.senderId,
    recipientName: result.senderName
  };

  // ✅ Nachrichten neu laden
  this.messageService.getMessagesOnce('private', result.conversationId)
    .then(() => {
      setTimeout(() => {
        this.scrollToMessage(result.id);
      }, 500);
    });
}



private async fetchRecipientName(recipientId: string): Promise<string> {
    if (!recipientId) return "Unbekannt";

    // 🔥 Prüfe zuerst den Cache, bevor Firestore aufgerufen wird
    if (this.recipientCache.has(recipientId)) {
        console.log("✅ Name aus Cache geladen:", this.recipientCache.get(recipientId));
        return this.recipientCache.get(recipientId)!;
    }

    try {
        const user = await this.userService.getUserById(recipientId);
        const recipientName = user?.name || "Unbekannt";

        // ✅ Speichere den Namen im Cache
        this.recipientCache.set(recipientId, recipientName);
        console.log("✅ Name aus Firestore geladen und gespeichert:", recipientName);

        return recipientName;
    } catch (error) {
        console.error("❌ Fehler beim Abrufen des Empfängernamens:", error);
        return "Unbekannt";
    }
}


closeThread(): void {
  console.log("❌ Thread schließen");
  this.selectedThread = null; // Schließe den Thread-Bereich
  this.isThreadActive = false;
  this.isThreadFromSearch = false; // Zurücksetzen, falls vorher über Suche geöffnet
  this.selectedThreadChannel = null;

  if (this.isPrivateChat && this.selectedMember) {
    console.log('🔙 Zurück zum privaten Chat');
    
  } else if (this.selectedChannel) {
    console.log('🔙 Zurück zum Kanal-Chat');
  } else {
    this.showWelcomeContainer = true; // Zeige den Welcome-Screen an, falls kein Kontext existiert
  }
}
}