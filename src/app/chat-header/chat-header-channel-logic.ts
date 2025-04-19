import { ChatHeaderComponent } from './chat-header.component';



export function openChannelMessage(self: ChatHeaderComponent, message: any): void {
  self.channelService.getChannelById(message.channelId).then((channel) => {
    if (channel) {
      selectChannel(self, channel);
      setTimeout(() => {
        self.channelService.getMessages(message.channelId).subscribe((msgs) => {
          self.scrollToMessageIfExists(msgs, message.id);
        });
      }, 800);
    }
  });
}
export function selectChannel(self: ChatHeaderComponent, channel: any): void {
  self.channelService.changeChannel(channel);
  self.channelSelected.emit(channel);
}
