import { Component, OnInit ,CUSTOM_ELEMENTS_SCHEMA,ViewChild, ElementRef,Input, EventEmitter, Output , SimpleChanges, OnChanges} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { HostListener } from '@angular/core';
import { ChannelService } from '../channel.service';
import { MemberListDialogComponent } from '../member-list-dialog/member-list-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { AddMembersDialogComponent } from '../add-members-dialog/add-members-dialog.component';
import { EditChannelDialogComponent } from '../edit-channel-dialog/edit-channel-dialog.component';
import { UserService } from '../user.service'; 
import { formatDate } from '@angular/common';  
import { AddMemberSelectorComponent } from '../add-member-selector/add-member-selector.component';
import { MemberSectionDialogComponent } from '../member-section-dialog/member-section-dialog.component';

import { MessageService } from '../message.service';

export interface MessageContent {
  text?: string;
  image?: string | ArrayBuffer | null;
  emojis?: any[];
}

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
}




@Component({
  selector: 'app-entwicklerteam',
  standalone: true,
  imports: [CommonModule,FormsModule,PickerModule],
  templateUrl: './entwicklerteam.component.html',
  styleUrls: ['./entwicklerteam.component.scss'] ,
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class EntwicklerteamComponent implements OnInit {
  @ViewChild('messageList') messageList!: ElementRef;
  @Output() memberSelected = new EventEmitter<{ uid: string, name: string }>();
  @Input() selectedChannel: { id: string; name: string; members: any[]; description?: string; createdBy?: string } | null = null;
  @Input() recipientName: string = '';
  @Input() recipientId: string = '';
  @Input() showSearchField: boolean = false;
  @Output() openThread = new EventEmitter<any>();
  @Input() threadData: any = null; // Daten vom Thread
  parentMessage: any = null; // Speichert die ursprüngliche Nachricht
  threadMessages: any[] = []; 
  channelMessage: string = ''; // Wenn `channelMessage` verwendet wird
  message: string = '';
  isEmojiPickerVisible: boolean = false;
  imageUrl: string | ArrayBuffer | null | undefined = null;  
  isTextareaExpanded: boolean = false;
  isImageModalOpen = false;
  channels: { id: string; name: string; members: any[]; description?: string; createdBy?: string  } [] = [];
  messages: {id: string;
        type: string, 
        content: MessageContent,
        senderName: string,
        senderAvatar: string, 
        time: string, date: string; 
        timestamp?: Date ; 
        replyCount?:  number;
        isEditing?: boolean ,
         
        threadId?: string; // ✅ ID des Threads, zu dem diese Nachricht gehört
        parentId?: string; // ✅ ID der Hauptnachricht (erste Nachricht im Thread)
          //lastReplyTime?: string,
        lastReplyTime?: string | Date;
       
        threadLastResponseTime?: string | Date | null; 
         // threadLastResponseTime?: string,
        replies?: any[];
        isTimeFixed?: boolean;
        isHighlighted?: boolean; 
        isEmojiPickerVisible?: boolean;  }[] = [];      
  currentUser: any;  
  currentDate: string = formatDate(new Date(), 'dd.MM.yyyy', 'en');
  yesterDayDate: Date = this.getYesterdayDate();
  originalMessage: any = null;
  showEditOptions: boolean = false;
  currentMessageId: string | null = null;
  newMessage: string = '';
  selectedMember: any = null;  
  privateMessage: string = '';  
  filteredMembers: any[] = [];
  searchLetter: string = '';
  members: any[] = [];
  lastUsedEmojisSent: string[] = [];  
  lastUsedEmojisReceived: string[] = [];  
  showWelcomeContainer: boolean = false; 
  tooltipVisible = false;
  tooltipPosition = { x: 0, y: 0 };
  tooltipEmoji = '';
  tooltipSenderName = '';
  selectedThreadChannel: any = null;

  

  private unsubscribeFromThreadMessages: (() => void) | null = null;
  private unsubscribeLiveReplyCounts: (() => void) | null = null; // Für Listener
  private unsubscribeFromThreadDetails: (() => void) | null = null

  private replyCountsUnsubscribe: (() => void) | null = null;

  constructor(private channelService: ChannelService,
    private dialog: MatDialog,
    private userService: UserService,
    private messageService: MessageService,
 
 ){}
  @Input() isEditingChannel: boolean = false;
  @Output() channelSelected = new EventEmitter<void>();
  @Output() channelLeft = new EventEmitter<void>();




  getFormattedDate(dateString: string): string {
    if (!dateString) {
      console.error('Ungültiges Datum erkannt:', dateString);
      return 'Ungültiges Datum';
    }
  
    // Konvertiere das Datum in ein standardisiertes Format
    const parts = dateString.split('.');
    let date: Date;
    if (parts.length === 3) {
      // Falls Format dd.MM.yyyy
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      date = new Date(year, month, day);
    } else {
      // ISO-Format oder unbekannt
      date = new Date(dateString);
    }
  
    if (isNaN(date.getTime())) {
      console.error('Ungültiges Datum erkannt:', dateString);
      return 'Ungültiges Datum';
    }
  
    if (this.isSameDay(date, new Date())) {
      return 'Heute';
    } else if (this.isSameDay(date, this.getYesterdayDate())) {
      return 'Gestern';
    }
  
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: '2-digit', month: 'long' };
    return date.toLocaleDateString('de-DE', options); // Beispiel: "Samstag, 21. Dezember"
  }




  



private getYesterdayDate(): Date {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday;
}

private isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
}

  onImageSelected(event: Event, textArea: HTMLTextAreaElement): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imageUrl = e.target?.result;  
        this.adjustTextareaHeight(textArea); 
        this.isTextareaExpanded = true; // Markiere, dass die Textarea erweitert wurde
      };
      reader.readAsDataURL(file);
    }
  }

  closeProfileCard(textArea: HTMLTextAreaElement): void {
    this.imageUrl = null;  
    this.isTextareaExpanded = false; 
    this.resetTextareaHeight(textArea);  
  }

  adjustTextareaHeight(textArea: HTMLTextAreaElement): void {
    if (this.imageUrl) {
      textArea.style.paddingBottom = `${160}px`; 
    }
  }
  
  resetTextareaHeight(textArea: HTMLTextAreaElement): void {
    textArea.style.paddingBottom = '20px'; 
  }

  toggleEmojiPicker(): void {
    this.isEmojiPickerVisible = !this.isEmojiPickerVisible; 
    console.log('Emoji Picker Sichtbarkeit:', this.isEmojiPickerVisible); 
  }

  addEmoji(event: any): void {
    console.log("Emoji ausgewählt:", event); 
    if (event && event.emoji && event.emoji.native) {
      this.message += event.emoji.native;
    } else {
      console.error('Emoji Event Fehler:', event);
    }
    this.isEmojiPickerVisible = false; // Emoji Picker schließen
  }

  toggleEmojiPickerForMessage(msg: any): void {
    const isCurrentlyVisible = msg.isEmojiPickerVisible;  // Merke dir den aktuellen Zustand
    this.messages.forEach(m => m.isEmojiPickerVisible = false);
    msg.isEmojiPickerVisible = !isCurrentlyVisible;
  }

  addEmojiToMessage(event: any, msg: any): void {
    if (!msg.content.emojis) {
      msg.content.emojis = [];  // Initialisiere das Emoji-Array, falls es noch nicht existiert
    }
  
    if (event && event.emoji && event.emoji.native) {
      const newEmoji = event.emoji.native;
      const existingEmoji = msg.content.emojis.find((e: any) => e.emoji === newEmoji);
  
      if (existingEmoji) {
        existingEmoji.count += 1;  // Erhöhe die Zählung, wenn das Emoji bereits existiert
      } else {
        msg.content.emojis.push({ emoji: newEmoji, count: 1 });  // Füge neues Emoji hinzu
      }
  
      if (msg.senderName === this.currentUser?.name) {
        // Nachricht wurde gesendet -> Verwalte Emojis für gesendete Nachrichten
        if (!this.lastUsedEmojisSent.includes(newEmoji)) {
          // Emoji hinzufügen, nur wenn es nicht vorhanden ist
          this.lastUsedEmojisSent = [newEmoji, ...this.lastUsedEmojisSent].slice(0, 2);
        }
        if (this.selectedChannel?.id) {
          this.channelService.saveLastUsedEmojis(this.selectedChannel.id, this.lastUsedEmojisSent, 'sent');
        }
      } else {
        // Nachricht wurde empfangen -> Verwalte Emojis für empfangene Nachrichten
        if (!this.lastUsedEmojisReceived.includes(newEmoji)) {
          // Emoji hinzufügen, nur wenn es nicht vorhanden ist
          this.lastUsedEmojisReceived = [newEmoji, ...this.lastUsedEmojisReceived].slice(0, 2);
        }
        if (this.selectedChannel?.id) {
          this.channelService.saveLastUsedEmojis(this.selectedChannel.id, this.lastUsedEmojisReceived, 'received');
        }
      }
    }
  
    msg.isEmojiPickerVisible = false;  // Emoji-Picker schließen
  
    // Nachricht aktualisieren
    if (this.selectedChannel?.id) {
      this.channelService.updateMessage(this.selectedChannel.id, msg.id, msg.content)
        .then(() => {
          console.log('Nachricht erfolgreich aktualisiert.');
        })
        .catch((error) => {
          console.error('Fehler beim Aktualisieren der Nachricht:', error);
        });
    } else {
      console.error('Channel ID ist undefined, Nachricht kann nicht aktualisiert werden.');
    }
  }
  
  sendMessage(textArea: HTMLTextAreaElement): void {

    if (this.message.trim() || this.imageUrl) {
      const newMessage = {
          type: this.imageUrl && this.message.trim() ? 'text_and_image' : (this.imageUrl ? 'image' : 'text'),
          content: {
          text: this.message.trim() || null,
          image: this.imageUrl || null,
          emojis: [] 
        },
      date: formatDate(new Date(), 'dd.MM.yyyy', 'en'),
      timestamp: new Date(),
      time: new Date().toLocaleTimeString(), 
    
      //time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      senderName: this.currentUser.name,
      senderAvatar: this.currentUser.avatarUrl,
      isEmojiPickerVisible: false
      };
      this.addMessage(newMessage);
      this.message = ''; // Nachricht zurücksetzen
      this.imageUrl = null; // Bild zurücksetzen
      this.resetTextareaHeight(textArea);
      this.scrollToBottom();
    }
  }

  getFormattedTime(timeString: string): string {
    if (!timeString) return '—';
  
    // Falls die Zeit als `hh:mm:ss` gespeichert wurde, nur `hh:mm` nehmen
    return timeString.split(':').slice(0, 2).join(':');
  }
  
  
  openChannel(channel: any): void {
    console.log('Channel ausgewählt:', channel);
    this.channelService.changeChannel(channel); // Den neuen Channel setzen
  }
  
  ngOnInit(): void {
    this.loadCurrentUser();
    this.channelService.currentChannel.subscribe(channel => {
      if (channel) {
        if (!channel.id) {
          console.error('Fehlende ID im Channel:', channel);
        } else if (!channel.createdBy) {
          channel.createdBy = '';
        }
       
        this.channels = [{
          id: channel.id,
          name: channel.name,
          members: channel.members,
          description: channel.description,
          createdBy: channel.createdBy
        }];

        this.channels = this.channels.map(ch => 
          ch.id === channel.id ? { ...ch, members: channel.members, name: channel.name } : ch
        );
  
        this.selectedChannel = channel;

        this.watchReplyCountsForMessages(this.messages);
  
        this.channelService.getLastUsedEmojis(channel.id, 'sent').then(emojisSent => {
          this.lastUsedEmojisSent = emojisSent || [];
        });
  
        // Letzte Emojis für empfangene Nachrichten laden
        this.channelService.getLastUsedEmojis(channel.id, 'received').then(emojisReceived => {
          this.lastUsedEmojisReceived = emojisReceived || [];
        });

         // Nachrichten für den aktuellen Channel abonnieren und in Echtzeit empfangen
         this.channelService.getMessages(channel.id).subscribe(messages => {
          // Initialisiere die emojis als leeres Array, falls nicht vorhanden
          this.messages = messages.map(msg => ({
            ...msg,
           
            content: { ...msg.content, emojis: msg.content?.emojis || [] },
            replyCount: msg.replyCount || 0,
            threadId: msg.threadId || null, // ✅ `threadId` sicherstellen
            parentId: msg.parentId || null  
          }));
          

          this.messages.forEach(msg => {
            const threadId = msg.threadId || msg.parentId || msg.id; // ✅ Falls `parentId` fehlt, nutze `msg.id`
            if (threadId) {
              this.messageService.loadReplyCountsLive([threadId], "thread-channel", (replyCounts) => {
                const { count, lastResponseTime } = replyCounts[threadId] || { count: 0, lastResponseTime: null };
                msg.replyCount = count;
                msg.threadLastResponseTime = lastResponseTime || msg.threadLastResponseTime;
              
                if (msg.threadLastResponseTime) {
                  msg.lastReplyTime = new Date(msg.threadLastResponseTime);
                }
              });
            }
          });
          this.scrollToBottom(); // Automatisch nach unten scrollen
        }, error => {
          console.error('Fehler beim Laden der Nachrichten:', error);
        });
      }

      if (this.selectedChannel) {
       
      }
    });
   
  }












  getFormattedThreadLastResponseTime(msg: any): string {
    let responseTime = msg.lastReplyTime ?? msg.timestamp;
  
    if (responseTime?.seconds) {
      responseTime = new Date(responseTime.seconds * 1000);
    }
  
    if (responseTime) {
      //return responseTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return responseTime.toLocaleTimeString();
    } else { 
      return '—';
    }
  }

  convertFirestoreTimestampToDate(timestamp: any): Date | null {
    if (!timestamp) return null;
    
    if (timestamp.toDate) {
      return timestamp.toDate(); // ✅ Firestore-Timestamp zu JavaScript-Date konvertieren
    }
  
    if (timestamp instanceof Date) {
      return timestamp; // ✅ Falls schon `Date`, einfach zurückgeben
    }
  
    return null;
  }
  

  
  scrollToBottom(): void {
    try {
      setTimeout(() => {
        if (this.messageList?.nativeElement) {
          this.messageList.nativeElement.scrollTop = this.messageList.nativeElement.scrollHeight;
        }
      }, 100); // Eine kleine Verzögerung, um sicherzustellen, dass das DOM fertig gerendert ist
    } catch (err) {
      console.error('Fehler beim Scrollen:', err);
    }
  }

  loadCurrentUser(): void {
    this.userService.getCurrentUserData().then(user => {
      this.currentUser = user;
    }).catch(err => {
      console.error('Fehler beim Laden des aktuellen Benutzers:', err);
    });
  }

  receiveNewTeam(name: string, members: any[]): void {
    const newChannelId = Math.random().toString(36).substring(2, 15); // Generiere eine eindeutige ID für den neuen Channel
    const createdBy = this.currentUser?.name || ''; // Setze den aktuellen Benutzer als Ersteller
  
    // Überschreibe die Channel-Liste mit dem neuen Channel inklusive ID und createdBy
    this.channels = [{ id: newChannelId, name, members, createdBy }];
    console.log('EntwicklerteamComponent: Neuer Channel hinzugefügt:', this.channels);
  }
  
  openEditChannelDialog(channel: { id: string; name: string; members: any[]; description?: string; createdBy?: string }): void {
    const dialogRef = this.dialog.open(EditChannelDialogComponent, {
      data: {
        id: channel.id,
        name: channel.name,
        members: channel.members,
        description: channel.description || '',
        createdBy: channel.createdBy || ''
      }
    });

    dialogRef.componentInstance.channelLeft.subscribe(() => {
      this.onLeaveChannel(channel);  // Diese Methode zeigt den welcome-container an
    });
  
  
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Aktualisiere den Channel mit der neuen Beschreibung und dem neuen Namen
        this.channelService.updateChannel(channel.id, result.name, result.description || '');
        // Optional: Stelle sicher, dass Änderungen an den Mitgliedern auch gespeichert werden
        this.channelService.setMembers(channel.id, result.members);
      }
    });
  }
  
  openAddMembersDialog(channel: { id: string; name: string; members: any[]; description?: string; createdBy?: string }): void {
    const dialogRef = this.dialog.open(AddMembersDialogComponent, {
      data: { members: channel.members }
    });
  
    dialogRef.afterClosed().subscribe((updatedMembers: any[] | undefined) => {
      if (updatedMembers && updatedMembers.length > 0) {
        const uniqueMembers = updatedMembers.filter(member =>
          !channel.members.some(m => m.name === member.name)
        );
        channel.members = [...channel.members, ...uniqueMembers]; // Füge neue Mitglieder hinzu
        console.log('Aktualisierte Mitgliederliste:', channel.members);
  
        // Setze die Mitglieder im ChannelService, um sie zu speichern
        this.channelService.setMembers(channel.id, channel.members);
      }
    });
  }
  
  openMembersDialog(channel: { id: string; name: string; members: any[]; description?: string; createdBy?: string }): void {
    const dialogRef = this.dialog.open(MemberListDialogComponent, {
      data: { channelId: channel.id, channelName: channel.name, members: channel.members }
    });
  
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.members) {
        channel.members = result.members; // Aktualisiere die Mitglieder des Channels
  
        // Setze die Mitglieder im ChannelService, um sie zu speichern
        this.channelService.setMembers(channel.id, result.members);
  
        // Aktualisiere die lokale channels-Liste
        this.channels = this.channels.map(ch => ch.id === channel.id ? { ...ch, members: result.members } : ch);
      }
    });
  }
  
  openImageModal() {
    this.isImageModalOpen = true;
  }

  closeImageModal() {
    this.isImageModalOpen = false;
  }

  @HostListener('document:keydown.escape', ['$event'])
    onEscapePress(event: KeyboardEvent) {
  this.closeImageModal();
}


handleKeyDown(event: KeyboardEvent, textArea: HTMLTextAreaElement): void {
  if (event.key === 'Enter' && !event.shiftKey) {
    // Verhindere den normalen Zeilenumbruch in der Textarea
    event.preventDefault();
    // Rufe die sendMessage-Funktion auf
    this.sendMessage(textArea);
  }
}

addMessage(message: any): void {
  if (this.selectedChannel) {
    this.channelService.addMessage(this.selectedChannel.id, message)
      .then((docRefId) => {
        // ID zur Nachricht hinzufügen, nachdem sie erfolgreich hinzugefügt wurde
        message.id = docRefId; 
        this.messages.push(message); // Nachricht in die lokale Liste aufnehmen
        this.scrollToBottom();
      })
      .catch((error) => {
        console.error('Fehler beim Hinzufügen der Nachricht:', error);
      });
  }
}


toggleEditMessage(msg: any): void {
  msg.isEditing = true; // Öffnet das Bearbeitungsfeld
  this.originalMessage = { ...msg }; // Speichere eine Kopie der ursprünglichen Nachricht
}



cancelEditing(msg: any): void {
  msg.isEditing = false; // Bearbeiten beenden
  if (this.originalMessage) {
    // Stelle die ursprüngliche Nachricht wieder her
    msg.content = { ...this.originalMessage.content }; // Nur Inhalt kopieren
    this.originalMessage = null; // Originalnachricht zurücksetzen
  }
 
  this.showEditOptions = false; // Bearbeitungsoptionen schließen
}



saveMessage(msg: any): void {
  if (msg?.isEditing !== undefined) {
    msg.isEditing = false; // Bearbeiten beenden
    const messageId = msg.id; // Ensure each message has a unique 'id'

    // Debug-Ausgaben, um zu sehen, welche Werte fehlen
    console.log('Speichern gestartet. Message ID:', messageId);
    console.log('Aktueller Channel:', this.selectedChannel);

    if (messageId && this.selectedChannel) {
      this.channelService.updateMessage(this.selectedChannel.id, messageId, msg.content)
        .then(() => {
          console.log('Nachricht erfolgreich gespeichert');
          // Aktualisiere die Nachricht in der lokalen Liste
          this.messages = this.messages.map((m) => {
            if (m.id === messageId) {
              return { ...msg, isEditing: false }; // Update the message with new content and set `isEditing` to false
            }
            return m;
          });
        })
        .catch(err => {
          console.error('Fehler beim Speichern der Nachricht:', err);
        });
    } else {
      console.error('Speichern fehlgeschlagen: Message ID oder Channel ID fehlt.');
    }
  }
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

addAtSymbolAndOpenDialog(): void {
  // Fügt zuerst das "@"-Symbol zur Nachricht hinzu
  this.message += '@';

  // Öffnet dann das Dialogfenster, um Mitglieder auszuwählen
  const dialogRef = this.dialog.open(AddMemberSelectorComponent, {
    data: {
      members: this.selectedChannel?.members
    }
  });

  dialogRef.afterClosed().subscribe(selectedMember => {
    if (selectedMember) {
      // Avatar und Name des Mitglieds zum Text hinzufügen
      this.message += ` ${selectedMember.name}  `;
    }
  });
}

sendPrivateMessage(): void {
  if (this.privateMessage.trim() && this.selectedMember) {
    console.log('Private Nachricht an:', this.selectedMember.name);
    console.log('Nachricht:', this.privateMessage);

    // Hier kannst du die Nachricht an das ausgewählte Mitglied senden
    this.privateMessage = '';  // Leere die Nachricht nach dem Senden
  }
}

// Filtere Mitglieder basierend auf dem eingegebenen Buchstaben
filterMembers(): void {
  if (this.searchLetter.trim() !== '') {
    this.userService.getUsersByFirstLetter(this.searchLetter)
      .then((data) => {
        this.filteredMembers = data;
        if (this.filteredMembers.length > 0) {
          this.openMemberSelectionDialog();  // Öffne den Dialog mit den gefilterten Mitgliedern
        }
      })
      .catch((error) => {
        console.error('Fehler beim Filtern der Mitglieder:', error);
      });
  }
}

openMemberSelectionDialog(): void {
  const dialogRef = this.dialog.open(MemberSectionDialogComponent, {
    width: '400px',
    data: { members: this.filteredMembers }
  });

  dialogRef.componentInstance.memberSelected.subscribe((selectedMember) => {
    this.handleMemberSelected(selectedMember);
  });

  dialogRef.afterClosed().subscribe(() => {
    console.log('Dialog zur Auswahl von Mitgliedern geschlossen.');
  });
}

handleMemberSelected(member: { uid: string, name: string }): void {
  console.log('Mitglied empfangen:', member);
  this.selectedMember = member; // Setze das ausgewählte Mitglied
}

 onMessageInput(event: Event): void {
  const inputValue = (event.target as HTMLInputElement).value;

  if (inputValue.length > 0) {
    const lastChar = inputValue.charAt(inputValue.length - 1);

    // Überprüfe, ob der letzte eingegebene Charakter ein Buchstabe ist
    if (/[a-zA-Z]/.test(lastChar)) {
      this.searchLetter = lastChar;  // Speichere den Buchstaben
      this.filterMembers();  // Filtere Mitglieder basierend auf dem Buchstaben
    }
  }
}


selectMember(member: any): void {
  console.log('Ausgewähltes Mitglied:', member);  // Ausgabe in der Konsole
  if (member && member.uid && member.name) {
    this.memberSelected.emit({ uid: member.uid, name: member.name });
  }
}

onLeaveChannel(channel: any): void {
  this.userService.getCurrentUserData().then((userData) => {
    if (userData && userData.uid && channel.id) {
      this.channelService.leaveChannel(channel.id, userData.uid).then(() => {
        console.log('Benutzer hat den Channel verlassen.');

        // Entferne den Benutzer aus der Mitgliederliste des Channels
        channel.members = channel.members.filter((member: any) => member.uid !== userData.uid);

        // Aktualisiere die gesamte channels-Liste, um Angular zu zwingen, die Änderung zu erkennen
        this.channels = this.channels.map(ch => ch.id === channel.id ? { ...ch, members: channel.members } : ch);

        // Optional: Zeige den `welcome-container`, wenn der Channel verlassen wurde
        this.selectedChannel = null;  // Setze den aktiven Channel zurück
        this.showWelcomeContainer = true;  // Zeige den Welcome-Screen an
       
        this.channelLeft.emit(); 
      }).catch(error => {
        console.error('Fehler beim Verlassen des Channels:', error);
      });
    }
  }).catch(error => {
    console.error('Fehler beim Abrufen des Benutzers:', error);
  });
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

private loadCurrentChannelMessages(): void {
  if (!this.selectedChannel?.id) {
    console.error('❌ Kein Kanal ausgewählt. Nachrichten können nicht geladen werden.');
    return;
  }

  console.log(`📥 Lade Nachrichten für Channel: ${this.selectedChannel.id}`);

  this.channelService.getMessages(this.selectedChannel.id).subscribe((messages) => {
    this.messages = messages.map((msg) => {
      if (msg.timestamp && typeof msg.timestamp.toDate === 'function') {
        msg.timestamp = msg.timestamp.toDate(); // 🔥 Firestore-Timestamp in Date umwandeln
      }
      return {
        ...msg,
        replyCount: msg.replyCount || 0,
        content: { ...msg.content, emojis: msg.content?.emojis || [] },
      };
    });

    // 🚀 Live-Update-Listener erneut starten
    this.scrollToBottom();
  }, (error) => {
    console.error('❌ Fehler beim Laden der Nachrichten für den aktuellen Kanal:', error);
  });
}












async openThreadEvent(msg: any): Promise<void> {
  console.log("📂 [EntwicklerteamComponent] Öffne Thread-Channel per Event. Nachricht:", msg);

  // 1) Validierung
  if (!msg?.id) {
    console.error("❌ Keine gültige Nachricht-ID gefunden.");
    return;
  }

  // 2) Alte Subscriptions beenden
  if (this.unsubscribeFromThreadMessages) {
    this.unsubscribeFromThreadMessages();
    this.unsubscribeFromThreadMessages = null;
  }
  if (this.unsubscribeFromThreadDetails) {
    this.unsubscribeFromThreadDetails();
    this.unsubscribeFromThreadDetails = null;
  }

  // 3) threadChannelId
  const threadChannelId = msg.threadChannelId || msg.parentId || msg.id;
  console.log("⚙️ threadChannelId:", threadChannelId);

  // 4) Hauptnachricht aus Firestore laden und casten
  const parentDoc = (await this.messageService.getMessage("thread-channel", threadChannelId)) as ThreadChannelParentDoc | null;
  console.log("📩 Geladene Hauptnachricht (parentDoc):", parentDoc);

  if (!parentDoc) {
    console.warn("⚠️ Kein Parent-Dokument gefunden für:", threadChannelId);
  }

  // 5) Channel-Name nachladen, falls parentDoc.channelId existiert
  let channelName = parentDoc?.channelName || "Unbekannt";
  if (!parentDoc?.channelName && parentDoc?.channelId) {
    const channelData = await this.channelService.getChannelById(parentDoc.channelId);
    channelName = channelData?.name || "Unbekannt";
  }

  // 6) Kind-Nachrichten laden (falls du sie hier schon brauchst)
  const childMessages = await this.messageService.getMessagesOnce("thread-channel", threadChannelId);
  console.log("📥 Geladene Kind-Nachrichten:", childMessages);

  // 6a) Fallbacks für childMessages
  const formattedMessages = (childMessages || []).map((msgItem) => ({
    ...msgItem,
    content: msgItem.content ?? { text: "Kein Text", emojis: [] },
    timestamp: msgItem.timestamp || new Date(),
  }));

 
   // 7) Fallbacks für parentDoc – kombiniere ggf. mit `msg`-Daten
   const parent = parentDoc || {};

   const parentMessage = {
     id: threadChannelId,
     text: (parent.content?.text ?? msg.text) || "Kein Text",
     senderName: parent.senderName || msg.senderName || "Unbekannt",
     senderAvatar: parent.senderAvatar || msg.senderAvatar || "assets/img/default-avatar.png",
     timestamp: parent.timestamp || msg.timestamp || new Date(),
     replyCount: parent.replyCount || msg.replyCount || 0,
     channelName,
     channelId: parent.channelId || null,
     content: parent.content ?? msg.content ?? { text: "Kein Text", emojis: [] },
   };
 
   

  
    // 8) Erzeuge das finale Daten-Objekt (Thread-Channel)
    const threadChannelData = {
      parentMessage,
      messages: formattedMessages,
    };
  
    // 8a) Falls `msg` != Parent-Dokument, füge die Einzelnachricht noch hinzu
    if (msg.id !== threadChannelId) {
      const fallbackContent = msg.content ?? { text: "Kein Text", emojis: [] };
      const fallbackTimestamp = msg.timestamp || new Date();
      threadChannelData.messages.push({
        ...msg,
        content: fallbackContent,
        timestamp: fallbackTimestamp,
      });
    }

  console.log("✅ [EntwicklerteamComponent] Thread-Objekt (inkl. Channel-Name):", threadChannelData);

  // 9) Starte Live-Subscription, wenn du das hier haben willst
  this.unsubscribeFromThreadMessages = this.messageService.listenForMessages(
    "thread-channel",
    threadChannelId,
    (updatedMessages: any[]) => {
      console.log("🔄 Neue Firestore-Nachrichten:", updatedMessages);
      // ... updaten von threadChannelData.messages oder so ...
    }
  );

  // 9a) Live-ReplyCount
  this.messageService.loadReplyCountsLive([threadChannelId], "thread-channel", (replyCounts) => {
    const { count, lastResponseTime } = replyCounts[threadChannelId] || { count: 0, lastResponseTime: null };
    parentMessage.replyCount = count;
    parentMessage.timestamp = lastResponseTime || parentMessage.timestamp;
    console.log("🆙 ReplyCount aktualisiert:", count);
  });

  // 10) Falls du Thread-Details brauchst
  if (this.messageService.listenForThreadDetails) {
    this.unsubscribeFromThreadDetails = this.messageService.listenForThreadDetails(threadChannelId, (threadData) => {
      console.log("🗂 Thread-Details empfangen:", threadData);
      // ... verarbeiten ...
    });
  }

  // 11) Emitte das fertige Objekt nach oben
  this.openThread.emit(threadChannelData);
}




ngOnChanges(changes: SimpleChanges): void {
  if (changes['selectedChannel'] && !changes['selectedChannel'].isFirstChange()) {
    console.log('Channel hat sich geändert:', changes['selectedChannel'].currentValue);

    // Entferne bestehende Listener, falls vorhanden
    if (this.unsubscribeLiveReplyCounts) {
      this.unsubscribeLiveReplyCounts();
    }
    this.loadCurrentChannelMessages();
   
    
  }

  if (changes['threadData'] && changes['threadData'].currentValue) {
    const newThreadData = changes['threadData'].currentValue;
    console.log('Thread-Daten aktualisiert (Entwicklerteam):', newThreadData);

    if (newThreadData.timestamp) {
      console.log('Letzte Antwort-Zeit des Threads:', newThreadData.timestamp);
    }
  }
}



















closeThreadChannel(): void {
  this.selectedThreadChannel = null; // Thread zurücksetzen
  console.log('Thread-Channel wurde geschlossen');
}


  changeChannel(newChannel: any): void {
    this.selectedThreadChannel = null; // Thread zurücksetzen, wenn Channel gewechselt wird
    console.log('Channel gewechselt:', newChannel);
  }



ngOnDestroy(): void {
  if (this.unsubscribeLiveReplyCounts) {
    console.log('🛑 Entferne Live-Reply-Listener');
    this.unsubscribeLiveReplyCounts();
  }
  
  if (this.unsubscribeFromThreadDetails) {
    console.log('🛑 Entferne Thread-Details-Listener');
    this.unsubscribeFromThreadDetails();
  }
  
  if (this.unsubscribeFromThreadMessages) {
    console.log('🛑 Entferne Thread-Nachrichten-Listener');
    this.unsubscribeFromThreadMessages();
  }
}

trackByMsgId(index: number, msg: any) {
  return msg.id; // oder eine andere eindeutige ID
}


highlightMessage(messageId: string): void {
  const messageElement = document.getElementById(`message-${messageId}`);
  if (messageElement) {
    messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // ✅ Nachrichten-Array aktualisieren
    this.messages = this.messages.map(msg => ({
      ...msg,
      isHighlighted: msg.id === messageId
    }));

    // ⏳ Nach 2 Sekunden Highlight entfernen
    setTimeout(() => {
      this.messages = this.messages.map(msg => ({
        ...msg,
        isHighlighted: false
      }));
    }, 2000);
  }
}



























private watchReplyCountsForMessages(messages: any[]): void {
  // Vorherigen Listener beenden, falls noch aktiv
  if (this.replyCountsUnsubscribe) {
    this.replyCountsUnsubscribe();
    this.replyCountsUnsubscribe = null;
  }

  // Alle IDs einsammeln
  const threadIds = messages.map(msg => msg.id).filter((id: string) => !!id);
  if (threadIds.length === 0) {
    console.log('ℹ️ Keine Nachrichten, daher kein Live-Abo für ReplyCounts nötig.');
    return;
  }

  // Jetzt genau EINMAL `loadReplyCountsLive` aufrufen:
  this.replyCountsUnsubscribe = this.messageService.loadReplyCountsLive(
    threadIds,
    'thread-channel',
    (replyCounts) => {
      // Callback wird bei jeder Änderung getriggert.
      // Pro Nachricht den aktuellen Stand aktualisieren:
      this.messages = this.messages.map(msg => {
        const data = replyCounts[msg.id];
        if (data) {
          return {
            ...msg,
            replyCount: data.count,
            threadLastResponseTime: data.lastResponseTime,
            // Falls du den Zeitstempel anzeigen willst:
            lastReplyTime: data.lastResponseTime || msg.lastReplyTime
          };
        }
        return msg;
      });
      console.log('🔄 Live-Reply-Updates erfolgreich aktualisiert:', replyCounts);
    }
  );
}
}




















































