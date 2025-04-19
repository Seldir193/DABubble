// lifecycle.helpers.ts
import { SearchFieldComponent } from './search-field.component';

export async function onInitComp(comp: SearchFieldComponent): Promise<void> {
  await comp.loadCurrentUser();
  comp.loadRecipientData();
  comp.checkDesktopWidth();
  comp.updatePlaceholderText(window.innerWidth);
  comp.currentUser = await comp.userService.getCurrentUserData();
  if (comp.currentUser && comp.recipientId) comp.initializeDirectConversation();
  comp.loadAllUsers();
  comp.loadAllChannels();
}
