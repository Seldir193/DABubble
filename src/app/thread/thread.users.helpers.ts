import { ThreadComponent } from './thread.component';

export function loadAllUsersComp(comp: ThreadComponent): void {
  comp.userService
    .getAllUsers()
    .then((users) => {
      comp.allUsers = users.map((u) => ({
        id: u.id,
        name: u.name,
        avatarUrl: u.avatarUrl || 'assets/img/avatar.png',
        isOnline: u.isOnline ?? false,
      }));
    })
    .catch((err) => console.error('Error loading users:', err));
}

export async function fetchRecipientNameComp(
  comp: ThreadComponent,
  recipientId: string
): Promise<void> {
  if (!recipientId) return;
  if (comp.recipientCache.has(recipientId)) {
    comp.recipientName = comp.recipientCache.get(recipientId)!;
    return;
  }

  try {
    const user = await comp.userService.getUserById(recipientId);
    comp.recipientName = user?.name || 'Unbekannt';
    comp.recipientCache.set(recipientId, comp.recipientName);
  } catch (error) {
    comp.recipientName = 'Unbekannt';
  }
}
