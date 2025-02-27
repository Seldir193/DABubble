import { Component,OnInit,HostListener, ViewChild,ElementRef, EventEmitter,Output,Input} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { getAuth, onAuthStateChanged ,signOut,updateEmail,reauthenticateWithCredential,EmailAuthProvider,sendSignInLinkToEmail} from '@angular/fire/auth';
import { Firestore,doc,updateDoc } from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { UserService } from '../user.service'; // Pfad ggf. anpassen
import { ChannelService } from '../channel.service';
import { MessageService } from '../message.service';
import { MatDialog } from '@angular/material/dialog';
import { SelectResultDialogComponent } from '../search-result-dialog/search-result-dialog.component';
import { Message } from '../message.models';
import { PrivateMessagesComponent } from '../private-messages/private-messages.component';


@Component({
  selector: 'app-chat-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-header.component.html',
  styleUrl: './chat-header.component.scss'
})
export class ChatHeaderComponent  implements OnInit{
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
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
  searchQuery: string = ''; // Suchanfrage
  filteredMembers: any[] = []; // Gefundene Benutzer
  filteredChannels: any[] = []; // ✅ Gefundene Channels
  noResultsFound: boolean = false; // Falls keine Ergebnisse gefunden wurden
  recipientId: string = '';
  currentUser: any = null;
  selectedThread: any = null;

  selectedMember: any = null;
  private hasScrolledToSearchedMessage: boolean = false;


selectedThreadChannel: any = null;



  @Output() memberSelected = new EventEmitter<any>();
  @Output() channelSelected = new EventEmitter<any>();
  @Output() openPrivateChat = new EventEmitter<void>();
  @ViewChild(PrivateMessagesComponent) privateMessagesComp!: PrivateMessagesComponent;
  @Output() openThread = new EventEmitter<any>(); 
  @Input() isPrivateChat!: boolean;
  @Input() recipientName: string = '';
  @Input() recipientAvatarUrl: string = '';

  @Output() threadSelected = new EventEmitter<{ id: string, messageId: string }>();


 @Output() threadChannelSelected = new EventEmitter<any>();

 @Output() backClicked = new EventEmitter<void>();



 isDesktop = false;
 //showDesktop = false;

  
 @Input() showDesktop = false;

  inputStates: { [key: string]: boolean } = {
    name: false,
    email: false
  };

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const clickedInsideMenu = this.elementRef.nativeElement.querySelector('.menu-dropdown')?.contains(event.target);
    const clickedInsideProfile = this.elementRef.nativeElement.querySelector('.profile-card-container')?.contains(event.target);

    // Wenn außerhalb des Menüs und der Profilkarte geklickt wird, schließen
    if (!clickedInsideMenu && !clickedInsideProfile) {
      this.closeMenu();
      this.closeProfileCard();
    }
  }

  @HostListener('document:mousemove') onMouseMove() {
    this.resetInactivityTimer();
  }

  @HostListener('document:keydown') onKeyDown() {
    this.resetInactivityTimer();
  }
  



  @HostListener('window:resize', ['$event'])
  onResize() {
    if (window.innerWidth >= 1800) {
      // Sobald Breite >= 1800px => ausblenden
      //this.showDesktop = false;
    }
  }





  constructor(private router: Router,
    private firestore: Firestore,
    private elementRef: ElementRef,
    private userService: UserService, 
    private channelService: ChannelService, 
    private messageService: MessageService,
    private dialog: MatDialog) {}


  ngOnInit(): void {
    this.listenForAuthChanges();
    this.resetInactivityTimer();
    this.loadUserData();

    this.isDesktop = window.innerWidth >= 1079;
  }



  onBackClick(): void {
   // this.showDesktop = false;
    // Einfach nur das Event aussenden. 
    // Den eigentlichen Zustand ändert der Parent.
    this.backClicked.emit();
  }

  onAvatarClick(): void {
    this.fileInput.nativeElement.click();
  }
  // Methode zum Zurücksetzen des Inaktivitäts-Timers
  resetInactivityTimer() {
    // Falls bereits ein Timeout läuft, lösche es
    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout);
    }

    // Setze den Benutzerstatus wieder auf 'Aktiv'
    this.userStatus = 'Aktiv';

    // Starte einen neuen Timer für 10 Minuten (600000 ms)
    this.inactivityTimeout = setTimeout(() => {
      this.userStatus = 'Abwesend'; // Status auf 'Abwesend' setzen nach 10 Minuten
    },600000); // 10 Minuten (600000 Millisekunden)
  }

  onInputFocus(inputId: string) {
    console.log(`Fokus auf Eingabefeld: ${inputId}`);
    this.inputStates[inputId] = true;
  }
  
  onInputBlur(inputId: string, inputValue: string) {
    console.log(`Fokus verlassen von: ${inputId}, Wert: ${inputValue}`);
    if (inputValue.trim() === '') {
      this.inputStates[inputId] = false;
    } else {
      this.inputStates[inputId] = true;
    }
  }

  stopPropagation(event: Event) {
    event.stopPropagation();
  }
  
  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu() {
    this.menuOpen = false;
  }

  logoutAndCloseMenu() {
    this.closeMenu();
    this.logout();
  }

  openProfileCard() {
   this.profileOpen = true;
   this.isEditingProfile = false;
  }

  closeProfileCard() {
    this.profileOpen = false;
  }

  openSettingCard(){
    this.isEditingProfile = true;

    this.editableUserName = this.userName;
    this.editableUserEmail = this.userEmail;
  }

  isValidEmail(email: string): boolean {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  }

  async saveProfileChanges(): Promise<void> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
  
      if (!user) {
        throw new Error('Kein Benutzer angemeldet.');
      }
  
      // Prüfen, ob der Name geändert wurde
      if (this.editableUserName && this.editableUserName !== this.userName) {
        await this.userService.updateUserName(this.editableUserName);
        this.userName = this.editableUserName;
      }
  
      // Prüfen, ob die E-Mail geändert wurde
      if (this.editableUserEmail && this.editableUserEmail !== this.userEmail) {
        if (!this.isValidEmail(this.editableUserEmail)) {
          this.errorMessage = 'Bitte geben Sie eine gültige E-Mail-Adresse ein.';
          return;
        }
  
        const password = prompt('Bitte geben Sie Ihr Passwort ein, um die E-Mail zu ändern:');
        
        if (password) {
          try {
            // Reauthentifizierung mit dem aktuellen Passwort
            const credential = EmailAuthProvider.credential(user.email!, password);
            await reauthenticateWithCredential(user, credential);
  
            // **Hier die E-Mail in Firebase aktualisieren**
            await updateEmail(user, this.editableUserEmail);
            console.log('E-Mail-Adresse erfolgreich geändert');
  
            // **Schritt 4: E-Mail in Firestore aktualisieren**
            await this.userService.updateUserEmail(this.editableUserEmail); // Firestore-E-Mail aktualisieren
  
            // Speichere die neue E-Mail im localStorage
            localStorage.setItem('newEmail', this.editableUserEmail);
  
            this.successMessage = 'Ihre E-Mail-Adresse wurde erfolgreich geändert.';
          } catch (error) {
            console.error('Fehler bei der Reauthentifizierung oder der E-Mail-Änderung:', error);
            this.errorMessage = 'Fehler bei der Änderung der E-Mail. Bitte versuchen Sie es erneut.';
          }
        } else {
          this.errorMessage = 'Passwort erforderlich, um die E-Mail zu ändern.';
        }
      }
    } catch (error: any) {
      console.error('Fehler beim Speichern der Profiländerungen:', error);
      this.errorMessage = error.message || 'Fehler beim Speichern der Profiländerungen.';
    }
  }
  
  cancelEditing() {
    this.isEditingProfile = false;
    this.editableUserName = this.userName;
    this.editableUserEmail = this.userEmail;
    this.resetInputBorders();
  }

resetInputBorders() {
    this.inputStates = {
      'name': false,
      'email': false
    };
  }

  async loadUserData() {
    try {
      const userData = await this.userService.getCurrentUserData();
      this.userName = userData.name;
      this.userEmail = userData.email;
      this.userAvatarUrl = userData.avatarUrl;
    } catch (error: any) {
      console.error('Fehler beim Laden der Benutzerdaten:', error);
      this.errorMessage = error.message || 'Fehler beim Laden der Benutzerdaten.';
    }
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files ? input.files[0] : null;
  
    if (!file) {
      this.errorMessage = 'Keine Datei ausgewählt.';
      return;
    }
  
    if (!file.type.startsWith('image/')) {
      this.errorMessage = 'Bitte wählen Sie eine Bilddatei aus.';
      return;
    }
  
    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage = 'Die Datei ist zu groß. Bitte wählen Sie eine Datei, die kleiner als 5 MB ist.';
      return;
    }
  
    this.errorMessage = '';
  
    const reader = new FileReader();
    reader.onload = async () => {
      const imageDataUrl = reader.result as string;
      try {
        // Aktualisiere die Avatar-URL in Firestore
        await this.userService.updateUserAvatar(imageDataUrl);
        this.userAvatarUrl = imageDataUrl;
        this.successMessage = 'Profilbild erfolgreich aktualisiert!';
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      } catch (error: any) {
        console.error('Fehler beim Aktualisieren des Profilbildes:', error);
        this.errorMessage = error.message || 'Fehler beim Aktualisieren des Profilbildes.';
      }
    };
    reader.readAsDataURL(file);
  }
  
  listenForAuthChanges() {
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      if (user) {
        // Der Benutzer ist authentifiziert
        this.loadUserData();
      } else {
        // Kein Benutzer authentifiziert
        this.userName = 'Guest';
        this.userAvatarUrl = 'assets/img/avatar.png';
      }
    }, (error) => {
      console.error('Fehler bei der Authentifizierung:', error);
      this.errorMessage = 'Fehler bei der Überprüfung des Authentifizierungsstatus.';
    });
  }
  
  async logout() {
    const auth = getAuth();
    const user = auth.currentUser; // Speichere den Benutzer vor dem Abmelden
  
    if (user) {
      try {
        const userDocRef = doc(this.firestore, 'users', user.uid);
  
        // Setze den Benutzer auf offline, bevor du ihn abmeldest
        await updateDoc(userDocRef, { isOnline: false });
  
        // Benutzer abmelden
        await signOut(auth);
        console.log('Benutzer wurde erfolgreich abgemeldet und als offline markiert.');
  
        // Weiterleitung zur Login-Seite oder eine andere Seite
        this.router.navigate(['/login']);
        
      } catch (error) {
        console.error('Fehler beim Abmelden oder beim Setzen des Offline-Status:', error);
      }
    } else {
      console.error('Kein Benutzer angemeldet.');
    }
  }



  onSearchInput(): void {
    if (this.searchQuery.trim().length < 3) {
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
  
    // Paralleler Abruf: Channels, Benutzer, private, thread, thread-channel
    Promise.all([
      this.channelService.getChannelsByName(this.searchQuery),
      this.userService.getUsersByFirstLetter(this.searchQuery),
      this.messageService.getMessagesOnce('private'),
      this.messageService.getMessagesOnce('thread'),
      this.messageService.getMessagesOnce('thread-channel'), 
    ]).then(([channels, users, privateMessages, threadMessages, threadChannelMessages]) => {
      
      // 1) Channels
      this.filteredChannels = channels.map(channel => ({
        //id: channel.id,
       // name: channel.name,
       ...channel,   
        type: 'channel'
      }));
  
      // 2) Benutzer
      this.filteredMembers = users.map(user => ({
        id: user.id || user.uid,
        name: user.name,
        avatarUrl: user.avatarUrl || 'assets/default-avatar.png',
        isOnline: user.isOnline ?? false,
        type: 'user'
      }));
  
      // Firestore-Live-Abfrage aller messages (Kanalnachrichten)
      this.channelService.getAllMessagesLive((messages) => {
        // (a) Gefilterte Kanalnachrichten
        const filteredChannelMessages = messages
          .filter(msg => msg.content?.text?.toLowerCase().includes(this.searchQuery.toLowerCase()))
          .map(msg => ({
            id: msg.id,
            text: msg.content.text,
            timestamp: msg.timestamp,
            type: 'message',
            channelId: msg.channelId || null,
            senderId: msg.senderId || null
          }));
  
        // (b) Gefilterte privateMessages (bereits von this.messageService)
        const filteredPrivateMessages = privateMessages
          .filter(msg => msg.content?.text?.toLowerCase().includes(this.searchQuery.toLowerCase()))
          .map(msg => ({
            id: msg.id || null,
            text: msg.content?.text || '⚠️ Kein Text',
            timestamp: msg.timestamp,
            type: 'private-message',
            senderId: msg.senderId,
            recipientId: msg.recipientId,
            conversationId: msg.conversationId || null
          }));
  
        // (c) Gefilterte ThreadMessages
        const filteredThreadMessages = threadMessages
          .filter(msg => msg.content?.text?.toLowerCase().includes(this.searchQuery.toLowerCase()))
          .map(msg => ({
            id: msg.id,
            text: msg.content?.text || '',
            timestamp: msg.timestamp,
            type: 'thread',
            // Wichtig: "threadId" = msg.threadId
            // Fallback: parentId oder msg.id
            threadId: msg.threadId || msg.parentId || msg.id,
            parentId: msg.parentId ?? msg.threadId ?? msg.id,
            senderId: msg.senderId,
            senderName: msg.senderName || "❌ Unbekannt",
            senderAvatar: msg.senderAvatar || 'assets/default-avatar.png'
          }));
  
        // (d) Gefilterte Thread-Channel-Messages
        const filteredThreadChannelMessages = threadChannelMessages
          .filter(msg => msg.content?.text?.toLowerCase().includes(this.searchQuery.toLowerCase()))
          .map(msg => ({
            id: msg.id,
            text: msg.content?.text || '',
            timestamp: msg.timestamp,
            type: 'thread-channel',
            // Wichtig: "threadChannelId" = msg.threadChannelId
            // Fallback: threadId, parentId oder msg.id
            threadChannelId: msg.threadChannelId || msg.threadId || msg.parentId || msg.id,
            senderId: msg.senderId,
            senderName: msg.senderName || "❌ Unbekannt",
            senderAvatar: msg.senderAvatar || 'assets/default-avatar.png',
          }));
  
        console.log("🔎 Suchergebnisse geladen!", {
          channels: this.filteredChannels,
          users: this.filteredMembers,
          channelMessages: filteredChannelMessages,
          privateMessages: filteredPrivateMessages,
          threadMessages: filteredThreadMessages,
          threadChannelMessages: filteredThreadChannelMessages
        });
  
        // => "mixed" => wir zeigen alles in einem Dialog
        this.openSearchDialog(
          [
            ...this.filteredChannels,
            ...this.filteredMembers,
            ...filteredChannelMessages,
            ...filteredPrivateMessages,
            ...filteredThreadMessages,
            ...filteredThreadChannelMessages
          ],
          'mixed'
        );
      });
    }).catch(error => {
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