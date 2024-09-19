import { Component } from '@angular/core';
import { ChatHeaderComponent } from '../chat-header/chat-header.component';


@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [ChatHeaderComponent],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss'
})
export class ChatComponent {

}
