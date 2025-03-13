import { Component, Inject, OnInit, EventEmitter, Output, HostListener } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChannelService } from '../channel.service';
import { UserService } from '../user.service'; 
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { AddMembersDialogComponent } from '../add-members-dialog/add-members-dialog.component';



import { AddMembersDialogMobileComponent } from '../add-members-dialog-mobile/add-members-dialog-mobile.component'; 

@Component({
  selector: 'app-edit-channel-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-channel-dialog.component.html',
  styleUrls: ['./edit-channel-dialog.component.scss']
})

export class EditChannelDialogComponent implements OnInit {
  @Output() channelLeft = new EventEmitter<string>(); // Event für das Verlassen des Channels
  channelName: string = '';
  description: string = '';
  createdBy: string = '';
  members: any[] = [];
  isEditingName: boolean = false;
  isEditingDescription: boolean = false;
  editedChannelName: string = '';
  editedDescription: string = '';

  isDesktop = false;


  @Output() openAddMembersOverlay = new EventEmitter<void>();

  //filteredMembers: any[] = [];


  constructor(
    public dialogRef: MatDialogRef<EditChannelDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { id: string; name: string; members: any[]; description: string; createdBy: string },
    private channelService: ChannelService,
    private userService: UserService ,
    private dialog: MatDialog,
    private bottomSheet: MatBottomSheet

  ) {
    this.channelName = data.name;
    this.members = data.members;
    this.description = data.description;
    this.createdBy = data.createdBy || 'Unbekannt';
  }

  ngOnInit(): void {
    this.checkIfDesktop();

    // Hole den aktuellen Channel aus dem Service
    this.channelService.currentChannels.subscribe(channels => {
      const currentChannel = channels.find(channel => channel.name === this.channelName);
     //const currentChannel = channels.find(channel => channel.id === this.data.id);

      if (currentChannel) {
        this.channelName = currentChannel.name;
        this.description = currentChannel.description || '';
        this.members = currentChannel.members || [];
        //this.members = [...(currentChannel.members || [])];
        this.createdBy = currentChannel.createdBy || ''; 

        this.userService.getCurrentUserData().then(userData => {
          if (userData && userData.name) {
            this.createdBy = userData.name; // Setze den Benutzernamen als Ersteller des Channels
          }
        }).catch(err => {
          console.error('Fehler beim Abrufen des Benutzers:', err);
        });
      }
    });
  }

  
  checkIfDesktop() {
    this.isDesktop = window.innerWidth >= 1278;
  }


    @HostListener('window:resize', ['$event'])
    onResize() {
      this.checkIfDesktop();
    }




 

  

  onSave(): void {
    // Falls der Channel-Name oder die Beschreibung bearbeitet wurde, speichere die Änderungen
    const updatedChannel = {
      name: this.editedChannelName.trim() ? this.editedChannelName : this.channelName,
      members: this.members, // Behalte die Mitglieder bei
      description: this.editedDescription.trim() ? this.editedDescription : this.description,
      createdBy: this.createdBy
    };
  
    // Rufe den ChannelService auf, um den Channel in Firestore zu aktualisieren
    this.channelService.updateChannel(this.data.id, updatedChannel.name, updatedChannel.description);
    // Schließe den Dialog und übergib den aktualisierten Channel
    this.dialogRef.close(updatedChannel);
  }


  saveChannelName(): void {
    if (this.editedChannelName.trim()) {
      this.channelService.updateChannel(this.data.id, this.editedChannelName, this.description);
      this.channelName = this.editedChannelName; // Aktualisiere den Channel-Namen
    }
    this.isEditingName = false;
  }
  
  saveDescription(): void {
    if (this.editedDescription.trim()) {
      this.channelService.updateChannel(this.data.id, this.channelName, this.editedDescription);
      this.description = this.editedDescription; // Aktualisiere die Beschreibung
    }
    this.isEditingDescription = false;
  }

  toggleEditingName(): void {
    this.isEditingName = !this.isEditingName;
    if (!this.isEditingName) {
      this.saveChannelName(); // Speichere den Namen, wenn die Bearbeitung beendet wird
    }
  }
 


  toggleEditingDescription(): void {
    this.isEditingDescription = !this.isEditingDescription;
    if (!this.isEditingDescription) {
      this.saveDescription(); // Speichere die Beschreibung, wenn die Bearbeitung beendet wird
    }
  }
  
  onCancel(): void {
    this.dialogRef.close();
  }
  onLeaveChannel(): void {
    this.userService.getCurrentUserData().then((userData) => {
      if (userData && userData.uid) {
        this.channelService.leaveChannel(this.data.id, userData.uid).then(() => {
          console.log('Channel erfolgreich verlassen');
          this.channelLeft.emit();  // Event auslösen, um das Verlassen zu signalisieren
          this.dialogRef.close();   // Dialog schließen
        }).catch(error => {
          console.error('Fehler beim Verlassen des Channels:', error);
        });
      }
    });
  }







  async openAddMembersMobile() {
    console.log('VOR BottomSheet: Aktuelle Mitglieder:', this.members);
  
    try {
      // 🔥 Alle Benutzer laden
      const allUsers = await this.userService.getAllUsers();
      console.log('🔍 Alle Benutzer aus Firestore:', allUsers);
  
      // 🔥 Bereits vorhandene Mitglieder aus der Auswahl entfernen
      const filteredUsers = allUsers.filter(user => 
        !this.members.some(member => member.uid === user.uid)
      );
  
      console.log('✅ Gefilterte Mitgliederliste für Auswahl:', filteredUsers);
  
      if (!this.data || !this.data.id) {
        console.error('❌ FEHLER: `this.data.id` ist undefined oder null!', this.data);
        return;
      }
  
      const bottomSheetData = {
        channelId: this.data.id,
        members: [...this.members],  // Kopie übergeben
        filteredMembers: filteredUsers // ✅ Gefilterte Mitglieder übergeben
      };
  
      console.log('✅ Übergabe an BottomSheet:', bottomSheetData);
  
      const sheetRef = this.bottomSheet.open(AddMembersDialogMobileComponent, {
        panelClass: 'my-custom-panel',
        data: bottomSheetData

      });
  
      sheetRef.afterDismissed().subscribe((result) => {
        console.log('AddMembersDialog (mobile) closed =>', result);
  
        if (Array.isArray(result)) {
          console.log('NACH BottomSheet: Zurückgegebene Mitglieder:', result);
  
          // 🔥 Alte + neue Mitglieder zusammenführen
          this.members = [...this.members, ...result.filter(m => 
            !this.members.some(existing => existing.uid === m.uid)
          )];
  
          console.log('🔥 NEUE Mitgliederliste nach Merge:', this.members);
  
          // 🔥 Speichere die aktualisierte Mitgliederliste in Firestore
          this.channelService.setMembers(this.data.id, this.members)
            .then(() => console.log('🔥 Mitglieder erfolgreich in Firestore gespeichert:', this.members))
            .catch(err => console.error('❌ Fehler beim Speichern in Firestore:', err));
        }
      });
    } catch (error) {
      console.error('❌ Fehler beim Laden der Benutzer:', error);
    }
  }
  






}