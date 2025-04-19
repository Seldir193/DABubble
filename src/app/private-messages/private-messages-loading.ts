import { PrivateMessagesComponent } from './private-messages.component';

export function loadRecipientDataUtil(c: PrivateMessagesComponent): void {
  if (!c.recipientId) return;
  c.userService
    .getUserById(c.recipientId)
    .then((userData) => {
      if (userData) {
        c.recipientName = userData.name;
        c.recipientAvatarUrl = userData.avatarUrl || '';
        c.recipientStatus = userData.isOnline ? 'Aktiv' : 'Abwesend';
      }
    })
    .catch(() => {});
}

export function loadAllUsersUtil(c: PrivateMessagesComponent): void {
  c.userService
    .getAllUsers()
    .then((users) => {
      c.allUsers = users.map((u) => ({
        id: u.id,
        name: u.name,
        avatarUrl: u.avatarUrl || 'assets/img/avatar.png',
        isOnline: u.isOnline ?? false,
      }));
    })
    .catch(() => {});
}

export async function loadPrivateMessagesUtil(
  c: PrivateMessagesComponent
): Promise<void> {
  if (!c.currentUser?.id || !c.recipientId) return;
  const cId = c.messageService.generateConversationId(
    c.currentUser.id,
    c.recipientId
  );

  c.clearPrivateMessagesUnsubscribe();

  const unsub = c.messageService.getPrivateMessagesLive(cId, (msgs) =>
    c.handleMessagesLiveWrapper(msgs)
  );

  c.setPrivateMessagesUnsubscribe(unsub);
}
