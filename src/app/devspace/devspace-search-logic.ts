import { DevspaceComponent } from './devspace.component';

export function runFullTextSearch(self: DevspaceComponent, query: string) {
  Promise.all([
    self.channelService.getChannelsByName(query),
    self.userService.getUsersByFirstLetter(query),
    self.messageService.getMessagesOnce('private'),
    self.messageService.getMessagesOnce('thread'),
    self.messageService.getMessagesOnce('thread-channel'),
    self.messageService.getChannelMessagesOnce(),
  ])
    .then(([ch, us, pm, tm, tcm, cm]) =>
      handleSearchResults(self, ch, us, pm, tm, tcm, cm)
    )
    .catch(() => {});
}

async function handleSearchResults(
  self: DevspaceComponent,
  channels: any[],
  users: any[],
  priv: any[],
  thr: any[],
  thrCh: any[],
  chMsgs: any[]
): Promise<void> {
  mapChannelsAndUsers(self, channels, users);
  const privList = filterPrivateMsgs(self, priv);
  const thrList = filterThreadMsgs(self, thr);
  await fillPrivateMessageNames(self, privList);
  const thrChList = await filterThreadChannelMsgs(self, thrCh);
  const chList = filterChannelMsgs(self, chMsgs);
  combineSearchResults(self, chList, privList, thrList, thrChList);
}

async function fillPrivateMessageNames(
  component: DevspaceComponent,
  list: any[]
) {
  for (const pm of list) {
    if (!pm.senderName && pm.senderId) {
      try {
        const data = await component.userService.getUserById(pm.senderId);
        pm.senderName = data?.name || 'Unbekannt';
      } catch {}
    }
    if (!pm.recipientName && pm.recipientId) {
      try {
        const data = await component.userService.getUserById(pm.recipientId);
        pm.recipientName = data?.name || 'Unbekannt';
      } catch {}
    }
  }
}

function mapChannelsAndUsers(
  self: DevspaceComponent,
  channels: any[],
  users: any[]
) {
  const relevantChannels = channels.filter((c) =>
    c.members?.some((m: any) => m.uid === self.currentUser?.uid)
  );

  self.filteredChannels = relevantChannels.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    type: 'channel',
  }));

  self.filteredMembers = users.map((u) => ({
    id: u.id || u.uid,
    name: u.name,
    avatarUrl: u.avatarUrl || 'assets/default-avatar.png',
    isOnline: u.isOnline ?? false,
    type: 'user',
  }));
}

export function filterPrivateMsgs(
  component: DevspaceComponent,
  list: any[]
): any[] {
  const currentUserId = component.userService.getCurrentUserId();

  return list
    .filter((m) => {
      const textMatches = m.content?.text
        ?.toLowerCase()
        .includes(component.searchQuery.toLowerCase());
      const userIsSenderOrRecipient =
        m.senderId === currentUserId || m.recipientId === currentUserId;
      return textMatches && userIsSenderOrRecipient;
    })
    .map((m) => ({
      id: m.id,
      text: m.content?.text || '⚠️ Kein Text',
      timestamp: m.timestamp,
      type: 'private-message',
      senderId: m.senderId,
      recipientId: m.recipientId,
      conversationId: m.conversationId || null,
    }));
}

export function filterThreadMsgs(
  component: DevspaceComponent,
  list: any[]
): any[] {
  const currentUserId = component.userService.getCurrentUserId();

  return list
    .filter((m) => {
      const textMatches = m.content?.text
        ?.toLowerCase()
        .includes(component.searchQuery.toLowerCase());
      const userIsSenderOrRecipient =
        m.senderId === currentUserId || m.recipientId === currentUserId;
      return textMatches && userIsSenderOrRecipient;
    })
    .map((m) => ({
      id: m.id,
      text: m.content?.text || '',
      timestamp: m.timestamp,
      type: 'thread',
      threadId: m.threadId || m.parentId || m.id,
      parentId: m.parentId ?? m.threadId ?? m.id,
      senderId: m.senderId,
      senderName: m.senderName || '❌ Unbekannt',
    }));
}

export async function filterThreadChannelMsgs(
  component: DevspaceComponent,
  list: any[]
): Promise<any[]> {
  const channels = await component.channelService.getAllChannelsOnce();
  const userChannelIds = new Set(channels.map((ch) => ch.id));
  const result: any[] = [];

  for (const msg of list) {
    const cId = await component.messageService.findChannelIdIfMissing(msg);
    const textMatches = msg.content?.text
      ?.toLowerCase()
      .includes(component.searchQuery.toLowerCase());

    if (cId && userChannelIds.has(cId) && textMatches) {
      result.push({
        id: msg.id,
        text: msg.content?.text || '',
        timestamp: msg.timestamp,
        type: 'thread-channel',
        threadChannelId:
          msg.threadChannelId || msg.threadId || msg.parentId || msg.id,
        senderId: msg.senderId,
        senderName: msg.senderName || '❌ Unbekannt',
      });
    }
  }
  return result;
}

function filterChannelMsgs(self: DevspaceComponent, list: any[]): any[] {
  return list
    .filter((m) =>
      m.content?.text?.toLowerCase().includes(self.searchQuery.toLowerCase())
    )
    .map((m) => ({
      id: m.id,
      text: m.content?.text || '',
      timestamp: m.timestamp,
      type: 'message',
      channelId: m.channelId || null,
      senderId: m.senderId || null,
    }));
}

function combineSearchResults(
  self: DevspaceComponent,
  cList: any[],
  pList: any[],
  tList: any[],
  tChList: any[]
) {
  const combined = [
    ...self.filteredChannels,
    ...self.filteredMembers,
    ...cList,
    ...pList,
    ...tList,
    ...tChList,
  ];
  const deduped = Array.from(
    new Map(combined.map((obj) => [obj.id, obj])).values()
  );
  deduplicateAndOpenDialog(self, deduped);
}

function deduplicateAndOpenDialog(self: DevspaceComponent, results: any[]) {
  if (!results || results.length === 0) {
    self.noResultsFound = true;
    self.dropdownOpen = false;
    return;
  }
  self.noResultsFound = false;
  self.searchResults = results;
  self.dropdownOpen = true;
}
