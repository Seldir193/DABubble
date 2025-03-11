
//import { Component } from '@angular/core';


import { Component, EventEmitter, Output, ElementRef,HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MessageService } from '../message.service';
import { UserService } from '../user.service';
import { ChannelService } from '../channel.service';
import { SelectResultDialogComponent } from '../search-result-dialog/search-result-dialog.component';
import { MatDialog } from '@angular/material/dialog';

import { Firestore } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { Message } from '../message.models';





import { ViewChild,Input} from '@angular/core';

import { PrivateMessagesComponent } from '../private-messages/private-messages.component';
@Component({
  selector: 'app-devspace',
  standalone: true,
  imports: [CommonModule,FormsModule],
  templateUrl: './devspace.component.html',
  styleUrls: ['./devspace.component.scss']  // korrigiere "styleUrl" zu "styleUrls"
})
export class DevspaceComponent  {
  isDesktop = false;
  searchQuery = '';
  filteredChannels: any[] = [];
  filteredMembers: any[] = [];
  noResultsFound = false;


  @Output() searchTriggered = new EventEmitter<string>();






    
    menuOpen = false;
    userName: string = '';
    profileOpen = false; 
    userStatus: string = 'Aktiv'; // Standardstatus
    inactivityTimeout: any; // Variable für den Inaktivitäts-Time
    editableUserName: string = '';
    editableUserEmail: string = '';
    errorMessage: string = '';
    successMessage: string = '';
    userAvatarUrl: string = 'assets/img/avatar.png';
    userEmail: string = '';
    isEditingProfile: boolean = false;
    isDialogOpen = false; // Variable zur Verhinderung doppelter Dialoge
  
    recipientId: string = '';
    currentUser: any = null;
    selectedThread: any = null;
  
    selectedMember: any = null;
    private hasScrolledToSearchedMessage: boolean = false;
  
  
  selectedThreadChannel: any = null;
  
    @Output() memberSelected = new EventEmitter<any>();
    @Output() channelSelected = new EventEmitter<any>();
    @Output() openPrivateChat = new EventEmitter<void>();
  
    @Output() openThread = new EventEmitter<any>(); 
 
  
    @Output() threadSelected = new EventEmitter<{ id: string, messageId: string }>();
  
  
   @Output() threadChannelSelected = new EventEmitter<any>();
  
  
  
    









   @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  


  @ViewChild(PrivateMessagesComponent) privateMessagesComp!: PrivateMessagesComponent;

  @Input() isPrivateChat!: boolean;
  @Input() recipientName: string = '';
  @Input() recipientAvatarUrl: string = '';


  


  inputStates: { [key: string]: boolean } = {
    name: false,
    email: false
  };









    constructor(private router: Router,
      private firestore: Firestore,
      private elementRef: ElementRef,
      private userService: UserService, 
      private channelService: ChannelService, 
      private messageService: MessageService,
      private dialog: MatDialog) {}







ngOnInit() {
    this.checkScreenSize();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: UIEvent) {
    this.checkScreenSize();
  }

  private checkScreenSize(): void {
    const width = window.innerWidth;
    // Ab 1080px => Desktop
    this.isDesktop = width >= 1278;
  }




  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const clickedInsideMenu = this.elementRef.nativeElement.querySelector('.menu-dropdown')?.contains(event.target);
    const clickedInsideProfile = this.elementRef.nativeElement.querySelector('.profile-card-container')?.contains(event.target);

    // Wenn außerhalb des Menüs und der Profilkarte geklickt wird, schließen
  
  }
     
        









  onEditSquareClick(): void {
    const searchQuery = ''; // Optional: Initialisiere mit einem leeren Wert oder einem Beispielwert wie 'J'
    this.searchTriggered.emit(searchQuery); // Löst das Event aus und übergibt den Suchwert
    console.log('Edit square clicked, search triggered with query:', searchQuery);
  }
 
  








  




  onSearchEnter(): void {
    const trimmedQuery = this.searchQuery.trim();
  
    // 1) Wenn genau "@", lade alle Benutzer
    if (trimmedQuery === '@') {
      console.log("👥 Lade alle Benutzer, da nur '@' eingegeben wurde.");
      this.userService.getAllUsers().then(users => {
        // Mappe die Users auf das Format, das dein Dialog braucht
        const allUsersResults = users.map(u => ({
          id: u.id,
          name: u.name,
          avatarUrl: u.avatarUrl || 'assets/default-avatar.png',
          isOnline: u.isOnline ?? false,
          type: 'user'
        }));
        // Dialog öffnen
        this.openSearchDialog(allUsersResults, 'user');
      }).catch(error => {
        console.error("❌ Fehler beim Laden aller Benutzer:", error);
      });
      return; // WICHTIG: Brich hier ab, damit deine "normale" Suche nicht mehr ausgeführt wird.
    }
  
    // 2) Wenn genau "#", lade alle Channels
    if (trimmedQuery === '#') {
      console.log("📡 Lade alle Channels, da nur '#' eingegeben wurde.");
      this.channelService.getAllChannelsOnce().then(channels => {
        const allChannelResults = channels.map(ch => ({
          id: ch.id,
          name: ch.name,
          type: 'channel'
        }));
        this.openSearchDialog(allChannelResults, 'channel');
      }).catch(error => {
        console.error("❌ Fehler beim Laden aller Channels:", error);
      });
      return;
    }
  
    // 3) Deine bestehende Logik für Eingaben ab 3 Zeichen
    if (trimmedQuery.length < 3) {
      this.filteredChannels = [];
      this.filteredMembers = [];
      this.noResultsFound = false;
      return;
    }
  
    // Zurücksetzen alter Suchergebnisse
    this.filteredChannels = [];
    this.filteredMembers = [];
    this.noResultsFound = false;
  
    console.log("🔍 Starte parallele Suche für:", this.searchQuery);
  
    // Parallele Abfragen:
    Promise.all([
      this.channelService.getChannelsByName(this.searchQuery),   // Kanäle nach Name
      this.userService.getUsersByFirstLetter(this.searchQuery),  // Benutzer nach Name
      this.messageService.getMessagesOnce('private'),            // Private Nachrichten
      this.messageService.getMessagesOnce('thread'),             // Thread-Nachrichten
      this.messageService.getMessagesOnce('thread-channel'),     // Thread-Channel-Nachrichten
      this.messageService.getChannelMessagesOnce()               // NEU: Kanalnachrichten (Einmal-Abfrage)
    ])
    .then(([channels, users, privateMessages, threadMessages, threadChannelMsgs, channelMsgs]) => {
  
      // ---------------------------
      // 1) Channels
      // ---------------------------
      this.filteredChannels = channels.map(channel => ({
        id: channel.id,
        name: channel.name,
        description: channel.description,
        type: 'channel'
      }));
  
      // ---------------------------
      // 2) Benutzer (Members)
      // ---------------------------
      this.filteredMembers = users.map(user => ({
        id: user.id || user.uid,
        name: user.name,
        avatarUrl: user.avatarUrl || 'assets/default-avatar.png',
        isOnline: user.isOnline ?? false,
        type: 'user'
      }));
  
      // ---------------------------
      // 3) Private Nachrichten
      // ---------------------------
      const filteredPrivateMessages = privateMessages
        .filter(msg =>
          msg.content?.text?.toLowerCase().includes(this.searchQuery.toLowerCase())
        )
        .map(msg => ({
          id: msg.id,
          text: msg.content?.text || '⚠️ Kein Text',
          timestamp: msg.timestamp,
          type: 'private-message',
          senderId: msg.senderId,
          recipientId: msg.recipientId,
          conversationId: msg.conversationId || null
        }));
  
      // ---------------------------
      // 4) Thread-Nachrichten
      // ---------------------------
      const filteredThreadMessages = threadMessages
        .filter(msg =>
          msg.content?.text?.toLowerCase().includes(this.searchQuery.toLowerCase())
        )
        .map(msg => ({
          id: msg.id,
          text: msg.content?.text || '',
          timestamp: msg.timestamp,
          type: 'thread',
          threadId: msg.threadId || msg.parentId || msg.id,
          parentId: msg.parentId ?? msg.threadId ?? msg.id,
          senderId: msg.senderId,
          senderName: msg.senderName || "❌ Unbekannt"
        }));
  
      // ---------------------------
      // 5) Thread-Channel-Nachrichten
      // ---------------------------
      const filteredThreadChannelMessages = threadChannelMsgs
        .filter(msg =>
          msg.content?.text?.toLowerCase().includes(this.searchQuery.toLowerCase())
        )
        .map(msg => ({
          id: msg.id,
          text: msg.content?.text || '',
          timestamp: msg.timestamp,
          type: 'thread-channel',
          threadChannelId: msg.threadChannelId || msg.threadId || msg.parentId || msg.id,
          senderId: msg.senderId,
          senderName: msg.senderName || "❌ Unbekannt"
        }));
  
      // ---------------------------
      // 6) Kanalnachrichten (NEU)
      // ---------------------------
      const filteredChannelMessages = channelMsgs
        .filter(msg =>
          msg.content?.text?.toLowerCase().includes(this.searchQuery.toLowerCase())
        )
        .map(msg => ({
          id: msg.id,
          text: msg.content?.text || '',
          timestamp: msg.timestamp,
          type: 'message',
          channelId: msg.channelId || null,
          senderId: msg.senderId || null
        }));
  
      // ---------------------------
      // ALLES ZUSAMMENFÜHREN
      // ---------------------------
      const combined = [
        ...this.filteredChannels,
        ...this.filteredMembers,
        ...filteredChannelMessages,
        ...filteredPrivateMessages,
        ...filteredThreadMessages,
        ...filteredThreadChannelMessages
      ];
  
      // ---------------------------
      // Optionale Duplikat-Entfernung
      // ---------------------------
      const deduplicated = Array.from(
        new Map(combined.map(obj => [obj.id, obj])).values()
      );
  
      // Dialog öffnen
      this.openSearchDialog(deduplicated, 'mixed');
    })
    .catch(error => {
      console.error("❌ Fehler bei der Suche:", error);
    });
  }
  




















  

    // ----------------------------------------------------------------------------
  // openMessage(...) => navigiere zu passendem Chat/Thread
  // ----------------------------------------------------------------------------
  openMessage(message: any): void {
    if (!message || !message.id) {
      console.error("❌ Fehler: Ungültige Nachricht erhalten", message);
      return;
    }
  
    console.log("📩 Navigiere zur Nachricht:", message);
    this.hasScrolledToSearchedMessage = false; 
  
    // (1) Normale Kanalnachricht
    if (message.channelId) {
      this.channelService.getChannelById(message.channelId).then(channel => {
        if (channel) {
          console.log("📡 Channel gefunden, öffne:", channel);
          this.selectChannel(channel);
  
          setTimeout(() => {
            this.channelService.getMessages(message.channelId).subscribe((msgs) => {
              this.scrollToMessageIfExists(msgs, message.id);
            });
          }, 800);
        } else {
          console.warn("⚠️ Channel existiert nicht oder wurde gelöscht:", message.channelId);
        }
      }).catch(error => {
        console.error("❌ Fehler beim Laden des Channels:", error);
      });
  
    // (2) Private Nachricht
    } else if (message.conversationId) {
      console.log("📩 Private Nachricht gefunden:", message);
      const currentUserId = this.userService.getCurrentUserId();
      const chatPartnerId = (message.senderId === currentUserId)
        ? message.recipientId
        : message.senderId;
      console.log(`🔄 Öffne privaten Chat mit: ${chatPartnerId}`);
  
      this.memberSelected.emit({ 
        id: chatPartnerId, 
        name: message.recipientName || "❌ UNBEKANNT IN `openMessage`!"
      });
  
      setTimeout(() => {
        this.messageService.getPrivateMessagesLive(message.conversationId, (msgs) => {
          if (!this.hasScrolledToSearchedMessage) {
            const foundMessage = msgs.find(m => m.id === message.id);
            if (foundMessage) {
              console.log("📜 Scrolle zu privater Nachricht:", foundMessage.id);
              this.scrollToMessage(foundMessage.id);
              this.hasScrolledToSearchedMessage = true;
            } else {
              console.error("❌ Private Nachricht nicht gefunden!");
            }
          }
        });
      }, 800);
  
    // (3) Thread-Channel Nachricht
    } else if (message.type === "thread-channel") {
      console.log("📩 Thread-Channel Nachricht gefunden:", message);
  
      // Falls "threadChannelId" fehlt, nimm parentId oder message.id
      if (!message.threadChannelId) {
        console.warn("⚠️ `threadChannelId` fehlt! Setze `threadChannelId = parentId`:", message.parentId);
        message.threadChannelId = message.parentId ?? message.id;
      }
  
      console.log("🧵 Öffne Thread-Channel mit `threadChannelId`:", message.threadChannelId);
  
      // => `threadChannelSelected` => "openThreadChannelFromSearch()" in ChatComponent?
      this.threadChannelSelected.emit(message);
  
      //  Live-Listening
      setTimeout(() => {
        this.messageService.listenForMessages("thread-channel", message.threadChannelId, (msgs) => {
          if (!this.hasScrolledToSearchedMessage) {
            const foundMessage = msgs.find(m => m.id === message.id);
            if (foundMessage) {
              console.log("📜 Scrolle zu Thread-Channel-Nachricht:", foundMessage.id);
              this.scrollToMessage(foundMessage.id);
              this.hasScrolledToSearchedMessage = true;
            } else {
              console.error("❌ Thread-Channel-Nachricht nicht gefunden!");
            }
          }
        });
      }, 800);
  
    // (4) Normale Thread-Nachricht
    } else if (message.threadId || message.parentId) {
      console.log("📩 Thread-Nachricht gefunden:", message);
  
      if (!message.threadId) {
        console.warn("⚠️ `threadId` fehlt! Setze `threadId = parentId`:", message.parentId);
        message.threadId = message.parentId ?? message.id;
      }
  
      console.log("🧵 Öffne Thread mit `threadId`:", message.threadId);
  
      // => threadSelected => "openThreadFromSearch()" in ChatComponent?
      const fullThreadData = {
        ...message,
        threadId: message.threadId,
        messageId: message.id,
        parentId: message.parentId || message.threadId,
        parentName: message.parentName || "❌ Unbekannt",
        id: message.threadId,
      };
  
      console.log("📩 DEBUG: `fullThreadData`:", fullThreadData);
      this.threadSelected.emit(fullThreadData);
  
      setTimeout(() => {
        this.selectedThread = message;
        console.log("🧵 Thread geöffnet:", message);
  
        this.messageService.getThreadMessagesLive(message.threadId, (msgs) => {
          if (!this.hasScrolledToSearchedMessage) {
            const foundMessage = msgs.find(m => m.id === message.id);
            if (foundMessage) {
              console.log("📜 Scrolle zu Thread-Nachricht:", foundMessage.id);
              this.scrollToMessage(foundMessage.id);
              this.hasScrolledToSearchedMessage = true;
            } else {
              console.error("❌ Thread-Nachricht nicht gefunden!");
            }
          }
        });
      }, 800);
    }
  }



    
    openSearchDialog(results: any[], type: 'channel' | 'user' | 'message' | 'private-message' | 'thread' | 'thread-channel' | 'mixed'): void {
      if (this.isDialogOpen) {
        console.warn("⚠️ Ein Such-Dialog ist bereits geöffnet!");
        return;
      }
      if (this.searchQuery.trim() === '') {
        console.warn("⚠️ Keine gültige Suchanfrage – Dialog wird nicht geöffnet.");
        return;
      }

      if (!results || results.length === 0) {
        // Nichts gefunden => Kein Dialog
        return;
      }
    
      this.isDialogOpen = true; 
    
      const dialogRef = this.dialog.open(SelectResultDialogComponent, {
        width: '400px',
        data: { results, type },
      });
    
      // => navigateToMessage => openMessage(...)
      dialogRef.componentInstance.navigateToMessage?.subscribe((message) => {
        console.log("📩 Nachricht wurde im Dialog ausgewählt:", message);
        this.openMessage(message);
      });
    
      dialogRef.afterClosed().subscribe(selectedItem => {
        this.isDialogOpen = false;
        this.searchQuery = '';
    
        if (selectedItem) {
          switch (selectedItem.type) {
            case 'channel':
              this.selectChannel(selectedItem);
              break;
            case 'user':
              this.selectMember(selectedItem);
              break;
            case 'thread':
              console.log("🧵 Thread-Nachricht gefunden:", selectedItem);
              this.forwardOpenThread(selectedItem);
              setTimeout(() => {
                this.scrollToMessage(selectedItem.id);
              }, 800);
              break;
            case 'thread-channel':
              console.log("📩 Thread-Channel-Nachricht gefunden:", selectedItem);
              this.selectThreadChannel(selectedItem);
              break;
            default:
              console.warn("⚠️ Unbekannter Typ im Such-Dialog:", selectedItem);
          }
        }
      });
    }


      // ----------------------------------------------------------------------------
      // Hilfsmethoden 
      // ----------------------------------------------------------------------------
      selectThread(thread: { id: string, messageId: string }): void {
        console.log("🧵 Thread-Event ausgelöst für:", thread);
        this.threadSelected.emit(thread);
      }
      
      selectMember(member: any): void {
        console.log('👤 Mitglied ausgewählt:', member);
        this.memberSelected.emit(member);
      }
      
      forwardOpenThread(message: any): void {
        console.log('📩 Thread-Event weitergeleitet:', message);
        this.openThread.emit(message);
      }
      
      selectChannel(channel: any): void {
        console.log('📡 Channel ausgewählt:', channel);
        this.channelService.changeChannel(channel);
        this.channelSelected.emit(channel);
      }
      
      selectThreadChannel(threadChannel: any): void {
        console.log("📩 `threadChannelSelected` wird ausgelöst:", threadChannel);
        this.selectedThreadChannel = threadChannel;
        this.threadChannelSelected.emit(threadChannel);
      }
    
    
      scrollToMessageIfExists(messages: Message[], messageId: string, retries = 5): void {
        const foundMessage = messages.find(m => m.id === messageId);
        if (!foundMessage) {
          console.error("❌ Nachricht nicht gefunden:", messageId);
          return;
        }
        setTimeout(() => {
          this.scrollToMessage(messageId, retries);
        }, 500);
      }
      
      scrollToMessage(messageId: string, retries = 10): void {
        if (this.hasScrolledToSearchedMessage) return;
      
        setTimeout(() => {
          const messageElement = document.getElementById(`message-${messageId}`);
          if (messageElement) {
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            messageElement.classList.add('highlight');
            setTimeout(() => { messageElement.classList.remove('highlight'); }, 2000);
            this.hasScrolledToSearchedMessage = true;
          } else if (retries > 0) {
            console.warn(`⚠️ Nachricht nicht gefunden (${retries} Versuche übrig)`);
            this.scrollToMessage(messageId, retries - 1);
          }
        }, 700);
      }
      
      highlightMessage(messageId: string, retries = 5): void {
        setTimeout(() => {
          const messageElement = document.getElementById(`message-${messageId}`);
          if (messageElement) {
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            messageElement.classList.add('highlight');
            setTimeout(() => messageElement.classList.remove('highlight'), 2000);
          } else if (retries > 0) {
            console.warn(`⚠️ Nachricht nicht gefunden (${retries} Versuche übrig)`);
            this.highlightMessage(messageId, retries - 1);
          }
        }, 500);
      }
 
}
