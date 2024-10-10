import { Component, OnInit ,CUSTOM_ELEMENTS_SCHEMA,ViewChild, ElementRef } from '@angular/core';
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


export interface MessageContent {
  text?: string;
  image?: string | ArrayBuffer | null;
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
  message: string = '';
  isEmojiPickerVisible: boolean = false;
  imageUrl: string | ArrayBuffer | null | undefined = null;  // Typ mit undefined erweitert
  isTextareaExpanded: boolean = false;
  isImageModalOpen = false;
  //channels: { name: string; members: any[] }[] = [];
  //channels: { id: string, name: string, members: any[], description?: string, createdBy?: string }[] = [];
  channels: { id: string; name: string; members: any[]; description?: string; createdBy?: string  }[] = [];

 // selectedChannel: { name: string; members: any[] } | null = null;

  selectedChannel: { id: string; name: string; members: any[]; description?: string; createdBy?: string } | null = null;

  messages: { type: string, content: MessageContent, senderName: string, senderAvatar: string, time: string, date: string; isEditing?: boolean  }[] = [];
  currentUser: any;  
  currentDate: string = formatDate(new Date(), 'dd.MM.yyyy', 'en');

 

  constructor(private channelService: ChannelService,private dialog: MatDialog,private userService: UserService){}


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
  
  addAtSymbol(): void {
    this.message += '@';
  }

  addEmoji(event: any): void {
    if (event.emoji && event.emoji.native) {
      this.message += event.emoji.native;
    } else {
      console.error('Emoji Event Fehler:', event);
    }
    this.isEmojiPickerVisible = false;
  }

  ngOnInit(): void {
    this.channelService.currentChannel.subscribe(channel => {
      if (channel) {
        if (!channel.id) {
          console.error('Fehlende ID im Channel:', channel);
        } else if (!channel.createdBy) {
          // Setze einen Standardwert für createdBy, wenn er fehlt
          channel.createdBy = '';
        }
  
        // Setze die Channels-Liste und füge die ID und createdBy hinzu
        this.channels = [{
          id: channel.id,
          name: channel.name,
          members: channel.members,
          description: channel.description,
          createdBy: channel.createdBy
        }];
        this.selectedChannel = channel;
  
        // Nachrichten für den aktuellen Channel laden
        this.loadMessages(channel.id);
      }
    });
  
    this.loadCurrentUser();
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

scrollToBottom(): void {
  try {
    setTimeout(() => {
      this.messageList.nativeElement.scrollTop = this.messageList.nativeElement.scrollHeight;
    }, 50); // 50ms Timeout, um sicherzustellen, dass das DOM fertig gerendert ist
  } catch (err) {
    console.error('Fehler beim Scrollen:', err);
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
        image: this.imageUrl || null
      },
      senderName: this.currentUser.name,
      senderAvatar: this.currentUser.avatarUrl,
      time: currentTime,
      date: msgDate
    };

    this.addMessage(newMessage);
    this.message = ''; // Nachricht zurücksetzen
    this.imageUrl = null; // Bild zurücksetzen
    this.resetTextareaHeight(textArea);
    this.scrollToBottom();
  }
}







loadMessages(channelId: string): void {
  this.channelService.getMessages(channelId).then((messages) => {
    // Sortiere die Nachrichten nach Datum und Uhrzeit
    this.messages = messages.sort((a, b) => {
      const dateA = new Date(a.date + ' ' + a.time);
      const dateB = new Date(b.date + ' ' + b.time);
      return dateA.getTime() - dateB.getTime();
    });
  }).catch((error) => {
    console.error('Fehler beim Laden der Nachrichten:', error);
  });
}


addMessage(message: any): void {
  if (this.selectedChannel) {
    this.messages.push(message);
    this.channelService.addMessage(this.selectedChannel.id, message);
  }
}

handleKeyDown(event: KeyboardEvent, textArea: HTMLTextAreaElement): void {
  if (event.key === 'Enter' && !event.shiftKey) {
    // Verhindere den normalen Zeilenumbruch in der Textarea
    event.preventDefault();
    // Rufe die sendMessage-Funktion auf
    this.sendMessage(textArea);
  }
}







toggleEditMessage(msg: any): void {
  msg.isEditing = true; // Öffnet das Bearbeitungsfeld
}

saveMessage(msg: any): void {
  if (msg?.isEditing !== undefined) {
    msg.isEditing = false; // Exit edit mode
    // Save edited message to the backend
    const messageId = msg.id; // Make sure each message has a unique 'id'
    if (messageId) {
      this.channelService.updateMessage(this.selectedChannel?.id!, messageId, msg.content)
        .then(() => {
          console.log('Nachricht erfolgreich gespeichert');
        })
        .catch(err => {
          console.error('Fehler beim Speichern der Nachricht:', err);
        });
    }
  }
}

cancelEditing(msg: any): void {
  msg.isEditing = false; // Abbrechen und Bearbeiten beenden
  if (this.selectedChannel) {
    this.loadMessages(this.selectedChannel.id);
  }
}

}




