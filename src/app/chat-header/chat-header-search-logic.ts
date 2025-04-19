import { ChatHeaderComponent } from './chat-header.component';

export function onSearchChangeLogic(component: ChatHeaderComponent): void {
  const trimmed = component.searchQuery.trim();

  if (trimmed.length === 0) {
    component.dropdownOpen = false;
    component.searchResults = [];
    return;
  }

  if (trimmed === '@' || trimmed === '#') {
    handleSingleCharSearchLogic(component, trimmed);
    return;
  }

  if (trimmed.length < 0) {
    component.filteredChannels = [];
    component.filteredMembers = [];
    component.dropdownOpen = false;
    return;
  }

  runFullTextSearchLogic(component);
}

export function handleSingleCharSearchLogic(
  component: ChatHeaderComponent,
  query: string
): void {
  if (query === '@') {
    doAtSearchLogic(component);
  } else if (query === '#') {
    doHashSearchLogic(component);
  }
}

export function doAtSearchLogic(component: ChatHeaderComponent): void {
  component.userService.getAllUsers().then((users) => {
    const mapped = users.map((u: any) => ({
      id: u.id,
      name: u.name,
      avatarUrl: u.avatarUrl || 'assets/default-avatar.png',
      isOnline: u.isOnline ?? false,
      type: 'user',
    }));
    component.openSearchDialog(mapped, 'user');
  });
}

export function doHashSearchLogic(component: ChatHeaderComponent): void {
  component.channelService.getAllChannelsOnce().then((chs: any[]) => {
    const mapped = chs.map((ch) => ({
      id: ch.id,
      name: ch.name,
      type: 'channel',
    }));
    component.openSearchDialog(mapped, 'channel');
  });
}

export function runFullTextSearchLogic(component: ChatHeaderComponent): void {
  component.filteredChannels = [];
  component.filteredMembers = [];
  component.noResultsFound = false;

  fetchSearchDataLogic(component)
    .then(
      ([
        channels,
        users,
        privateMsgs,
        threadMsgs,
        threadChMsgs,
        channelMsgs,
      ]) => {
        handleSearchResultsLogic(
          component,
          channels,
          users,
          privateMsgs,
          threadMsgs,
          threadChMsgs,
          channelMsgs
        );
      }
    )
    .catch(() => {});
}

export function fetchSearchDataLogic(
  component: ChatHeaderComponent
): Promise<any[]> {
  return Promise.all([
    component.channelService.getChannelsByName(component.searchQuery),
    component.userService.getUsersByFirstLetter(component.searchQuery),
    component.messageService.getMessagesOnce('private'),
    component.messageService.getMessagesOnce('thread'),
    component.messageService.getMessagesOnce('thread-channel'),
    component.messageService.getChannelMessagesOnce(),
  ]);
}

export async function handleSearchResultsLogic(
  component: ChatHeaderComponent,
  channels: any[],
  users: any[],
  privateMsgs: any[],
  threadMsgs: any[],
  threadChMsgs: any[],
  channelMsgs: any[]
): Promise<void> {
  component.filteredChannels = mapChannelsLogic(channels);
  component.filteredMembers = mapUsersLogic(users);
  const privList = filterPrivateMessagesLogic(component, privateMsgs);
  await fillPrivateMessageNames(component, privList);
  const thrList = filterThreadMessagesLogic(component, threadMsgs);
  const thrChList = await filterThreadChannelMessagesLogic(component, threadChMsgs);
  const chList = await filterChannelMessagesLogic(component, channelMsgs);
  combineAndOpenResultsLogic(component, chList, privList, thrList, thrChList);
}

async function fillPrivateMessageNames(component: ChatHeaderComponent, list: any[]) {
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


export function mapChannelsLogic(list: any[]): any[] {
  return list.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    type: 'channel',
  }));
}

export function filterPrivateMessagesLogic(
  component: ChatHeaderComponent,
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

export function mapUsersLogic(list: any[]): any[] {
  return list.map((u) => ({
    id: u.id || u.uid,
    name: u.name,
    avatarUrl: u.avatarUrl || 'assets/default-avatar.png',
    isOnline: u.isOnline ?? false,
    type: 'user',
  }));
}

export function filterThreadMessagesLogic(
  component: ChatHeaderComponent,
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

export async function filterThreadChannelMessagesLogic(
  component: ChatHeaderComponent,
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

export async function filterChannelMessagesLogic(
  component: ChatHeaderComponent,
  list: any[]
): Promise<any[]> {
  const userChannels = await component.channelService.getAllChannelsOnce();
  const userChannelIds = new Set(userChannels.map((ch) => ch.id));
  return list
    .filter(
      (m) =>
        m.content?.text
          ?.toLowerCase()
          .includes(component.searchQuery.toLowerCase()) &&
        userChannelIds.has(m.channelId)
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

export function combineAndOpenResultsLogic(
  component: ChatHeaderComponent,
  chList: any[],
  privList: any[],
  thrList: any[],
  thrChList: any[]
): void {
  const combined = [
    ...component.filteredChannels,
    ...component.filteredMembers,
    ...chList,
    ...privList,
    ...thrList,
    ...thrChList,
  ];

  const deduped = Array.from(
    new Map(combined.map((obj) => [obj.id, obj])).values()
  );
  deduplicateAndOpenDialogLogic(component, deduped);
}

export function deduplicateAndOpenDialogLogic(
  component: ChatHeaderComponent,
  results: any[]
): void {
  if (!results || results.length === 0) {
    component.noResultsFound = true;
    component.dropdownOpen = false;
    return;
  }
  component.noResultsFound = false;
  component.searchResults = results;
  component.dropdownOpen = true;
}
