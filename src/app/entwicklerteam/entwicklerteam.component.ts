import { Component, OnInit ,CUSTOM_ELEMENTS_SCHEMA  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { HostListener } from '@angular/core';




@Component({
  selector: 'app-entwicklerteam',
  standalone: true,
  imports: [CommonModule,FormsModule,PickerModule],
  templateUrl: './entwicklerteam.component.html',
  styleUrls: ['./entwicklerteam.component.scss'] ,
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class EntwicklerteamComponent implements OnInit {

  message: string = '';
  isEmojiPickerVisible: boolean = false;
  imageUrl: string | ArrayBuffer | null | undefined = null;  // Typ mit undefined erweitert
  isTextareaExpanded: boolean = false;

  
  isImageModalOpen = false;
  

 
  onImageSelected(event: Event, textArea: HTMLTextAreaElement): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imageUrl = e.target?.result;  // Das neue Bild ersetzt das alte
        if (!this.isTextareaExpanded) {
          this.adjustTextareaHeight(textArea); // Textarea-Höhe anpassen
          this.isTextareaExpanded = true; // Markiere, dass das Textarea bereits vergrößert wurde
        }
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
      //textArea.style.height = `${textArea.scrollHeight + 110}px`; // Vergrößere die Höhe basierend auf der Bildgröße
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

  sendMessage(): void {
    console.log("Message sent: ", this.message);
    // Nachricht senden
  }

  ngOnInit(): void {
      
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



}


