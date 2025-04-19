// entwicklerteam-message-ui-logic.ts
import { EntwicklerteamComponent } from './entwicklerteam.component';

export function highlightMessage(self: EntwicklerteamComponent, id: string): void {
  const el = document.getElementById(`message-${id}`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });

  self.messages = self.messages.map((m) => ({
    ...m,
    isHighlighted: m.id === id
  }));

  setTimeout(() => {
    self.messages = self.messages.map((m) => ({
      ...m,
      isHighlighted: false
    }));
  }, 2000);
}

export function closePopup(self: EntwicklerteamComponent, msg: any): void {
  if (msg.showAllEmojisList) {
    msg.showAllEmojisList = false;
    msg.expanded = false;
  }
}

export function toggleEmojiPopup(self: EntwicklerteamComponent, msg: any): void {
  if (msg.showAllEmojisList === undefined) {
    msg.showAllEmojisList = false;
  }
  msg.showAllEmojisList = !msg.showAllEmojisList;

  if (!msg.showAllEmojisList) msg.expanded = false;
  else if (msg.expanded === undefined) msg.expanded = false;
}
