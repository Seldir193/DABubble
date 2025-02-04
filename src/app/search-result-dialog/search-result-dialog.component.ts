









import { Component, Inject, OnInit, Output, EventEmitter } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ChannelService } from '../channel.service';
import { UserService } from '../user.service';
import { CommonModule } from '@angular/common';
import { MessageService } from '../message.service';
import { getAuth } from 'firebase/auth';

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

  constructor(
    private channelService: ChannelService,
    private userService: UserService,
    private messageService: MessageService, 
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


  

  //selectResult(result: any): void {
    selectResult(result: { id: string; type: string }): void {
      const auth = getAuth();
      const currentUser = auth.currentUser;
    
      if (!currentUser) {
        console.error("❌ Kein Benutzer eingeloggt.");
        return;
      }
    
      if (result.type === 'user') {
        this.messageService.getPrivateMessages(currentUser.uid, result.id)
          .then(messages => {
            this.privateMessages = messages;
            console.log("📩 Private Nachrichten:", messages);
            this.dialogRef.close(result);
          })
          .catch(error => {
            console.error("❌ Fehler beim Abrufen der privaten Nachrichten:", error);
          });
    
      } else if (result.type === 'channel') {
        this.loadChannelMessages(result.id);
        this.dialogRef.close(result);
    
      } else if (result.type === 'message' || result.type === 'private-message') {
        this.navigateToMessage.emit(result); // ✅ Event für Navigation auslösen
        this.dialogRef.close();
      }
    }
    


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
