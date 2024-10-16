import { Component, OnInit ,CUSTOM_ELEMENTS_SCHEMA,ViewChild, ElementRef,Input, EventEmitter, Output} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { HostListener } from '@angular/core';
import { ChannelService } from '../channel.service';
import { MemberListDialogComponent } from '../member-list-dialog/member-list-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { AddMembersDialogComponent } from '../add-members-dialog/add-members-dialog.component';
import { EditChannelDialogComponent } from '../edit-channel-dialog/edit-channel-dialog.component';
import { UserService } from '../user.service'; // Importiere den UserService
import { formatDate } from '@angular/common';  // Korrekte Import-Anweisung für formatDate
import { AddMemberSelectorComponent } from '../add-member-selector/add-member-selector.component';
import { MemberSectionDialogComponent } from '../member-section-dialog/member-section-dialog.component';

export interface MessageContent {
  text?: string;
  image?: string | ArrayBuffer | null;
  emojis?: any[];
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
  @ViewChild('messageList') messageList!: ElementRef; // Zugriff auf den Nachrichten-Containe
  @Output() memberSelected = new EventEmitter<{ uid: string, name: string }>();
 
   
  message: string = '';
  isEmojiPickerVisible: boolean = false;
  
  imageUrl: string | ArrayBuffer | null | undefined = null;  // Typ mit undefined erweitert
  isTextareaExpanded: boolean = false;
  isImageModalOpen = false;

  


   channels: { id: string; name: string; members: any[]; description?: string; createdBy?: string  } [] = [];
   @Input() selectedChannel: { id: string; name: string; members: any[]; description?: string; createdBy?: string } | null = null;
  messages: {id: string;  type: string, content: MessageContent, senderName: string, senderAvatar: string, time: string, date: string; isEditing?: boolean ,isEmojiPickerVisible?: boolean;  }[] = [];
  currentUser: any;  
  currentDate: string = formatDate(new Date(), 'dd.MM.yyyy', 'en');
  yesterdayDate: string = this.getYesterdayDate();
  originalMessage: any = null;

  showEditOptions: boolean = false;
currentMessageId: string | null = null;


newMessage: string = '';
  


selectedMember: any = null;  // Speichere das ausgewählte Mitglied
  privateMessage: string = '';  // Für die private Nachricht



  filteredMembers: any[] = [];
  searchLetter: string = '';
  members: any[] = [];

  //lastUsedEmojis: string[] = [];

  lastUsedEmojisSent: string[] = [];  // Emojis für gesendete Nachrichten
lastUsedEmojisReceived: string[] = [];  // Emojis für empfangene Nachrichten



  constructor(private channelService: ChannelService,private dialog: MatDialog,private userService: UserService){}
  @Input() isEditingChannel: boolean = false;
  @Output() channelSelected = new EventEmitter<void>();

  
  getYesterdayDate(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return formatDate(yesterday, 'dd.MM.yyyy', 'en');
  }

  isToday(date: string): boolean {
    return date === this.currentDate;
  }

  isYesterday(date: string): boolean {
    return date === this.yesterdayDate;
  }

  onImageSelected(event: Event, textArea: HTMLTextAreaElement): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imageUrl = e.target?.result;  // Füge das neue Bild hinzu
        this.adjustTextareaHeight(textArea); // Textarea-Höhe immer anpassen
        this.isTextareaExpanded = true; // Markiere, dass die Textarea erweitert wurde
      };
      reader.readAsDataURL(file);
    }
  }

  closeProfileCard(textArea: HTMLTextAreaElement): void {
    this.imageUrl = null;  // Entfernt das Bild
    this.isTextareaExpanded = false; 
    this.resetTextareaHeight(textArea);  // Textarea-Höhe wird zurückgesetzt
  }

  adjustTextareaHeight(textArea: HTMLTextAreaElement): void {
    if (this.imageUrl) {
      //textArea.style.height = ${textArea.scrollHeight + 110}px; // Vergrößere die Höhe basierend auf der Bildgröße
      textArea.style.paddingBottom = `${160}px`; 
    }
  }
  
  // Textarea-Größe auf ursprüngliche Höhe zurücksetzen
  resetTextareaHeight(textArea: HTMLTextAreaElement): void {
    //textArea.style.height = '145px';  // Zurücksetzen auf die ursprüngliche Höhe
    textArea.style.paddingBottom = '20px'; 
  }

  toggleEmojiPicker(): void {
    this.isEmojiPickerVisible = !this.isEmojiPickerVisible; // Umschalten der Sichtbarkeit
    console.log('Emoji Picker Sichtbarkeit:', this.isEmojiPickerVisible); // Zum Debuggen in der Konsole

  }


  addEmoji(event: any): void {
    console.log("Emoji ausgewählt:", event); // Debug-Nachricht
    if (event && event.emoji && event.emoji.native) {
      this.message += event.emoji.native;
    } else {
      console.error('Emoji Event Fehler:', event);
    }
    this.isEmojiPickerVisible = false; // Emoji Picker schließen
  }




  


 
  
  toggleEmojiPickerForMessage(msg: any): void {
    const isCurrentlyVisible = msg.isEmojiPickerVisible;  // Merke dir den aktuellen Zustand
    
    // Schließe alle Emoji-Picker
    this.messages.forEach(m => m.isEmojiPickerVisible = false);
  
    // Setze den Zustand für die ausgewählte Nachricht basierend auf dem vorherigen Zustand
    msg.isEmojiPickerVisible = !isCurrentlyVisible;
  }
  
  addEmojiToMessage(event: any, msg: any): void {
    if (!msg.content.emojis) {
      msg.content.emojis = [];  // Initialisiere das Emoji-Array, falls es noch nicht existiert
    }
  
    if (event && event.emoji && event.emoji.native) {
      const existingEmoji = msg.content.emojis.find((e: any) => e.emoji === event.emoji.native);
  
      if (existingEmoji) {
        existingEmoji.count += 1;  // Erhöhe die Zählung, wenn das Emoji bereits existiert
      } else {
        msg.content.emojis.push({ emoji: event.emoji.native, count: 1 });  // Füge neues Emoji hinzu
      }
  
      // Unterschiedliche Behandlung je nachdem, ob es eine gesendete oder empfangene Nachricht ist
      if (msg.senderName === this.currentUser?.name) {
        // Nachricht wurde gesendet -> Verwalte Emojis für gesendete Nachrichten
        this.lastUsedEmojisSent = [event.emoji.native, ...this.lastUsedEmojisSent].slice(0, 2);
        if (this.selectedChannel?.id) {
          this.channelService.saveLastUsedEmojis(this.selectedChannel.id, this.lastUsedEmojisSent, 'sent');  // Speichere Emojis für gesendete Nachrichten
        }
      } else {
        // Nachricht wurde empfangen -> Verwalte Emojis für empfangene Nachrichten
        this.lastUsedEmojisReceived = [event.emoji.native, ...this.lastUsedEmojisReceived].slice(0, 2);
        if (this.selectedChannel?.id) {
          this.channelService.saveLastUsedEmojis(this.selectedChannel.id, this.lastUsedEmojisReceived, 'received');  // Speichere Emojis für empfangene Nachrichten
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
    const currentTime = new Date().toLocaleTimeString();
    const msgDate = formatDate(new Date(), 'dd.MM.yyyy', 'en');
  
    if (this.message.trim() || this.imageUrl) {
      const newMessage = {
        type: this.imageUrl && this.message.trim() ? 'text_and_image' : (this.imageUrl ? 'image' : 'text'),
        content: {
          text: this.message.trim() || null,
          image: this.imageUrl || null,
          emojis: [] 
        },
        senderName: this.currentUser.name,
        senderAvatar: this.currentUser.avatarUrl,
        time: currentTime,
        date: msgDate,
        isEmojiPickerVisible: false
      };
  
      this.addMessage(newMessage);
      this.message = ''; // Nachricht zurücksetzen
      this.imageUrl = null; // Bild zurücksetzen
      this.resetTextareaHeight(textArea);
      this.scrollToBottom();
    }
  }
  
 

  

  

  openChannel(channel: any): void {
    console.log('Channel ausgewählt:', channel);
    this.channelService.changeChannel(channel); // Den neuen Channel setzen
  }
  
  





  ngOnInit(): void {
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
  
        this.selectedChannel = channel;
  
        // Letzte Emojis für gesendete Nachrichten laden
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
            content: { ...msg.content, emojis: msg.content?.emojis || [] }
          }));
  
          this.scrollToBottom(); // Automatisch nach unten scrollen
        }, error => {
          console.error('Fehler beim Laden der Nachrichten:', error);
        });
      }
    });
    this.loadCurrentUser();
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
  this.originalMessage = { ...msg }; // Originalnachricht speichern
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


// Öffne den Dialog zur Mitgliederauswahl
 // Überwache die Eingabe im Input-Feld
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

}