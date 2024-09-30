import { Component  } from '@angular/core';
import { ChatHeaderComponent } from '../chat-header/chat-header.component';
import { CommonModule } from '@angular/common';
import { DevspaceComponent } from '../devspace/devspace.component';
import { EntwicklerteamComponent } from '../entwicklerteam/entwicklerteam.component';
import { InnerChannelComponent } from '../inner-channel/inner-channel.component';
import { DirectMessagesComponent } from "../direct-messages/direct-messages.component";


@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [ChatHeaderComponent, CommonModule, DevspaceComponent, EntwicklerteamComponent, InnerChannelComponent, DirectMessagesComponent],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss'
})
export class ChatComponent    {

  
 
  
}
