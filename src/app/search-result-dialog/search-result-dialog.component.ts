import { Component, Inject, OnInit, Output, EventEmitter,Input } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ChannelService } from '../channel.service';
import { UserService } from '../user.service';
import { CommonModule } from '@angular/common';
import { MessageService } from '../message.service';
import { getAuth } from 'firebase/auth';
import { ChangeDetectorRef } from '@angular/core'; 

@Component({
  selector: 'app-select-result-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './search-result-dialog.component.html',
  styleUrls: ['./search-result-dialog.component.scss']
})
export class SelectResultDialogComponent implements OnInit {
  @Output() resultSelected = new EventEmitter<any>();
  @Output() navigateToMessage = new EventEmitter<any>(); // ✅ Neuer Event-Emitter
  results: any[] = [];
  channelMessages: any[] = [];
  privateMessages: any[] = []; 
  replyCount: number = 0;  // 🔥 Antwortanzahl wird gespeichert
  parentMessage: any = {}; 


  @Input() selectedChannel: any;
  @Output() openThread = new EventEmitter<any>();
  @Output() threadSelected = new EventEmitter<any>();
  @Output() threadChannelSelected = new EventEmitter<any>();

  private hasScrolledToSearchedMessage: boolean = false;

  constructor(
    private channelService: ChannelService,
    private userService: UserService,
    private messageService: MessageService, 
    private cdr: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public data: { results: any[] },
    public dialogRef: MatDialogRef<SelectResultDialogComponent>
  ) {
    this.data.results = this.data.results || [];
  }

  ngOnInit(): void {
    console.log("📩 Ergebnisse im Dialog:", this.data.results);
    this.userService.getAllUsersRealTime((users) => {
      this.updateResultStatus(users);
    });

    this.data.results = this.data.results.map(result => {
      if (result.timestamp && result.timestamp.seconds) {
        return {
          ...result,
          formattedTimestamp: new Date(result.timestamp.seconds * 1000) 
        };
      }
      return result;
    });
  }

  updateResultStatus(users: any[] | undefined): void {
    if (!users || !Array.isArray(users)) {
      console.error("Fehler: 'users' ist undefined oder kein Array", users);
      return;
    }

    if (!this.data || !this.data.results || !Array.isArray(this.data.results)) {
      console.error("Fehler: 'this.data.results' ist undefined oder kein Array", this.data);
      this.data = { results: [] };
      return;
    }

    this.data.results = this.data.results.map(result => {
      if (result.hasOwnProperty('isOnline')) { 
        const userFromFirestore = users.find((u: any) => u.id === result.id);
        return { ...result, isOnline: userFromFirestore?.isOnline ?? false };
      }
      return result;
    });

    console.log('Suchergebnisse in Echtzeit aktualisiert:', this.data.results);
  }

  selectResult(result: any): void {
    const auth = getAuth();
    const currentUser = auth.currentUser;
  
    if (!currentUser) {
      console.error("❌ Kein Benutzer eingeloggt.");
      return;
    }
  
    // Falls es ein `private-message` ist, rechne conversationId + Empfänger aus
    if (result.type === "private-message") {
      const currentUserId = currentUser.uid;
      const chatPartnerId = (result.senderId === currentUserId) 
        ? result.recipientId 
        : result.senderId;
  
      result = {
        ...result,
        recipientName: result.recipientName || "Lade Name...",
        recipientId: chatPartnerId,
        conversationId: result.conversationId || `${currentUserId}_${chatPartnerId}`
      };
  
      // Falls der Name fehlt, aus Firestore laden
      if (!result.recipientName || result.recipientName === "Lade Name...") {
        this.userService.getUserById(chatPartnerId).then(user => {
          result.recipientName = user?.name || "Unbekannt";
          console.log("📩 Empfängername aktualisiert:", result.recipientName);
          this.navigateToMessage.emit(result);
          this.dialogRef.close();
        });
        return; // Abbrechen, da wir den Namen asynchron geladen haben
      }
    }
  
    console.log("🔍 `selectResult` sendet:", result);
  
    // Gemeinsame Daten
    const threadData = {
      ...result,
      senderId: result.senderId,
      senderName: result.senderName,
      conversationId: result.conversationId
    };
  
    switch (result.type) {
      case 'user':
        this.handleUserSelection(result, currentUser.uid);
        break;
  
      case 'channel':
       
        this.loadChannelMessages(result.id);
        this.dialogRef.close(result);
        break;
  
      case 'message':
      case 'private-message':
        // => Direkt navigieren (z. B. private Chat oder message)
        this.navigateToMessage.emit(result);
        this.dialogRef.close();
        break;
  
      case 'thread':
        // => Normales Thread-Event
        this.navigateToMessage.emit(threadData);
        this.dialogRef.close();
        this.handleThreadNavigation(threadData);
        break;
  
      case 'thread-channel':
        // => ThreadChannel
        this.navigateToMessage.emit(result);
        this.threadChannelSelected.emit(result);
        this.dialogRef.close();
        this.handleThreadChannelNavigation(result);
        break;
  
      default:
        console.warn('⚠️ Unbekannter Ergebnis-Typ:', result.type);
    }
  }
  
  private handleThreadChannelNavigation(result: any) {
    const threadChannelId = result.threadChannelId || result.parentId || result.id;
    if (!threadChannelId) {
      console.error("❌ Kein gültiger `threadChannelId` gefunden:", result);
      return;
    }
  
    console.log("✅ Verwende `threadChannelId`:", threadChannelId);
  
    // Nachrichten einmalig laden
    this.messageService.getMessagesOnce('thread-channel', threadChannelId)
      .then(messages => {
        const foundMessage = messages.find(m => m.id === result.id);
  
        if (!foundMessage) {
          console.warn("❌ Nachricht nicht gefunden:", result.id);
          return;
        }
  
        // Prüfe Felder
        if (!foundMessage.senderName || !foundMessage.senderAvatar || !foundMessage.content?.text || !foundMessage.timestamp) {
          this.messageService.getMessage('thread-channel', foundMessage.id).then((fullMsg) => {
            if (fullMsg) {
              const merged = { ...foundMessage, ...fullMsg };
              console.log("✅ Vollständige Daten:", merged);
  
              // Weiterverarbeiten oder State setzen
              // z.B. this.selectedThreadChannel = merged;
              // oder this.threadChannelSelected.emit(merged);
            } else {
              console.error("❌ Volle Daten nicht gefunden!");
            }
          });
        } else {
          // Direkt weiterverarbeiten
          console.log("✅ Thread-Channel-Nachricht vollständig:", foundMessage);
          // z.B. this.selectedThreadChannel = foundMessage;
          // oder this.threadChannelSelected.emit(foundMessage);
        }
      })
      .catch((error) => console.error("Fehler:", error));
  }
  
  // ----------------------------------------------------------------------------
  // THREAD: Verwende `threadId = result.threadId`
  // ----------------------------------------------------------------------------
  private handleThreadNavigation(result: any) {
    const threadId = result.threadId 
      || result.parentId 
      || result.id;
  
    if (!threadId) {
      console.error("❌ Kein gültiger `threadId` gefunden:", result);
      return;
    }
  
    console.log("✅ Verwende `threadId`:", threadId);
  
    // => hole MessagesOnce('thread', threadId)
    this.messageService.getMessagesOnce('thread', threadId)
      .then((messages) => {
        const foundMessage = messages.find(m => m.id === result.id);
  
        if (!foundMessage) {
          console.warn("❌ Nachricht nicht gefunden:", result.id);
          return;
        }
  
        // Prüfen, ob Felder fehlen
        if (!foundMessage.senderName || !foundMessage.senderAvatar || !foundMessage.content?.text || !foundMessage.timestamp) {
          this.messageService.getMessage('thread', foundMessage.id).then((fullMsg) => {
            if (fullMsg) {
              const merged = { ...foundMessage, ...fullMsg };
              this.threadSelected.emit({
                id: threadId,
                messageId: result.id,
                messageData: merged
              });
            } else {
              console.error("❌ Volle Daten nicht gefunden!");
            }
          });
        } else {
          this.threadSelected.emit({
            id: threadId,
            messageId: result.id,
            messageData: foundMessage
          });
        }
      })
      .catch((e) => console.error("Fehler:", e));
  }
  
  // ----------------------------------------------------------------------------
  // SCROLLEN
  // ----------------------------------------------------------------------------
  scrollToMessage(messageId: string, retries = 15): void {
    setTimeout(() => {
      const element = document.getElementById(`message-${messageId}`);
  
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('highlight');
        setTimeout(() => element.classList.remove('highlight'), 2000);
      } else if (retries > 0) {
        console.warn(`⚠️ Nachricht nicht gefunden (${retries} Versuche übrig)`);
        this.scrollToMessage(messageId, retries - 1);
      }
    }, 300);
  }
  
  // ----------------------------------------------------------------------------
  // PRIVATE USER-SELECTION
  // ----------------------------------------------------------------------------
  private handleUserSelection(result: any, currentUserId: string) {
    const conversationId = this.messageService.generateConversationId(currentUserId, result.id);
  
    this.messageService.getMessagesOnce('private', conversationId)
      .then((messages) => {
        this.privateMessages = messages;
        this.dialogRef.close(result);
      })
      .catch((error) => {
        console.error("❌ Fehler beim Laden privater Nachrichten:", error);
      });
  }
  
  // ----------------------------------------------------------------------------
  // CHANNEL MESSAGES
  // ----------------------------------------------------------------------------
  loadChannelMessages(channelId: string): void {
    this.channelService.getMessages(channelId).subscribe(messages => {
      this.channelMessages = messages;
      console.log("📩 Channel-Nachrichten geladen:", messages);
    }, error => {
      console.error("Fehler beim Laden der Channel-Nachrichten:", error);
    });
  }
  
  cancel(): void {
    this.dialogRef.close();
  }
  
}