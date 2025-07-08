export function selectMemberWrapper(
  member: any,
  emitMember: (member: any) => void,
  closeSearch: () => void
): void {
  emitMember(member);
  closeSearch();
}

export function addRecipientWrapper(
  member: any,
  selectedRecipients: any[],
  setSearchQuery: (query: string) => void,
  setFilteredMembers: (members: any[]) => void
): void {
  const alreadySelected = selectedRecipients.some(
    (m: any) => m.id === member.id
  );
  if (!alreadySelected) {
    selectedRecipients.push(member);
  }
  setSearchQuery('');
  setFilteredMembers([]);
}

export function removeRecipientWrapper(
  member: any,
  selectedRecipients: any[]
): void {
  const index = selectedRecipients.findIndex((m: any) => m.id === member.id);
  if (index > -1) {
    selectedRecipients.splice(index, 1);
  }
}

export function addSystemMessageWrapper(
  text: string,
  privateMessages: any[]
): void {
  const sysMsg = {
    type: 'system',
    content: { text },
    timestamp: new Date(),
  };
  privateMessages.push(sysMsg);
}

export function loadAllUsersWrapper(
  userService: { getAllUsers: () => Promise<any[]> },
  setAllMembers: (members: any[]) => void
): void {
  userService
    .getAllUsers()
    .then((users: any[]) => {
      const allMembers = users.map((u: any) => ({
        id: u.id,
        name: u.name,
        avatarUrl: u.avatarUrl || 'assets/img/avatar.png',
        isOnline: u.isOnline ?? false,
      }));
      setAllMembers(allMembers);
    })
    .catch(() => {
    });
}

export function loadAllChannelsWrapper(
  channelService: { getAllChannelsOnce: () => Promise<any[]> },
  setAllChannels: (channels: any[]) => void
): void {
  channelService
    .getAllChannelsOnce()
    .then((channels: any[]) => {
      const channelList = channels.map((ch) => ({
        id: ch.id,
        name: ch.name,
        avatarUrl: 'assets/img/tag-black.png',
        type: 'channel',
      }));
      setAllChannels(channelList);
    })
    .catch(() => {
    });
}

export function addAtSymbolForWrapper(
  member: any,
  messageToAll: string,
  setMessageToAll: (msg: string) => void,
  setShowAtDropdown: (value: boolean) => void
): void {
  setMessageToAll(messageToAll + '@' + member.name + ' ');
  setShowAtDropdown(false);
}

export function toggleAtDropdownWrapper(
  dropdownState: 'hidden' | 'user' | 'channel',
  setDropdownState: (value: 'hidden' | 'user' | 'channel') => void,
  loadAllUsers: () => void,
  loadAllChannels: () => void
): void {
  switch (dropdownState) {
    case 'hidden':
      handleHiddenState(loadAllUsers, setDropdownState);
      break;
    case 'user':
      handleUserState(loadAllChannels, setDropdownState);
      break;
    case 'channel':
      handleChannelState(setDropdownState);
      break;
  }
}

function handleHiddenState(
  loadAllUsers: () => void,
  setDropdownState: (value: 'hidden' | 'user' | 'channel') => void
): void {
  loadAllUsers();
  setDropdownState('user');
}

function handleUserState(
  loadAllChannels: () => void,
  setDropdownState: (value: 'hidden' | 'user' | 'channel') => void
): void {
  loadAllChannels();
  setDropdownState('channel');
}

function handleChannelState(
  setDropdownState: (value: 'hidden' | 'user' | 'channel') => void
): void {
  setDropdownState('hidden');
}
