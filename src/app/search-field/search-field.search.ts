export function onSearchInput(
  searchQuery: string,
  handleEmptySearchFn: () => void,
  handleUserSearchFn: (q: string) => void,
  handleChannelSearchFn: (q: string) => void,
  handleNoPrefixFn: () => void
): void {
  const trimmed = searchQuery.trim();
  if (!trimmed) {
    return handleEmptySearchFn();
  }
  const firstChar = trimmed.charAt(0);
  const rest = trimmed.substring(1).trim();

  if (firstChar === '@') {
    handleUserSearchFn(rest);
  } else if (firstChar === '#') {
    handleChannelSearchFn(rest);
  } else {
    handleNoPrefixFn();
  }
}

export function handleEmptySearch(
  filteredResultsRef: any[],
  noResultsFoundRef: { value: boolean }
): void {
  filteredResultsRef.length = 0;
  noResultsFoundRef.value = false;
}

export function handleNoPrefix(
  filteredResultsRef: any[],
  noResultsFoundRef: { value: boolean }
): void {
  filteredResultsRef.length = 0;
  noResultsFoundRef.value = false;
}

export function handleUserSearch(
  query: string,
  userService: any,
  currentUser: any,
  updateUserResultsFn: (users: any[]) => void,
  resetResultsOnErrorFn: () => void
): void {
  userService
    .getUsersByFirstLetter(query)
    .then((users: any[]) => {
      const filteredUsers = users.filter(
        (user: any) => user.email !== currentUser.email
      );
      updateUserResultsFn(filteredUsers);
    })
    .catch(() => resetResultsOnErrorFn());
}

export function updateUserResults(
  users: any[],
  filteredResultsRef: any[],
  noResultsFoundRef: { value: boolean }
): void {
  const mapped = users.map((u: any) => ({
    type: 'user',
    id: u.id || u.uid,
    email: u.email,
    name: u.name,
    avatarUrl: u.avatarUrl || 'assets/img/avatar.png',
  }));
  filteredResultsRef.length = 0;
  filteredResultsRef.push(...mapped);
  noResultsFoundRef.value = mapped.length === 0;
}

export function resetResultsOnError(
  filteredResultsRef: any[],
  noResultsFoundRef: { value: boolean }
): void {
  filteredResultsRef.length = 0;
  noResultsFoundRef.value = true;
}

export function handleChannelSearch(
  query: string,
  channelService: any,
  updateChannelResultsFn: (channels: any[]) => void,
  resetResultsOnErrorFn: () => void
): void {
  channelService
    .getChannelsByName(query)
    .then((channels: any[]) => updateChannelResultsFn(channels))
    .catch(() => resetResultsOnErrorFn());
}

export function updateChannelResults(
  channels: any[],
  filteredResultsRef: any[],
  noResultsFoundRef: { value: boolean }
): void {
  const mapped = channels.map((ch: any) => ({
    type: 'channel',
    id: ch.id,
    name: ch.name,
  }));
  filteredResultsRef.length = 0;
  filteredResultsRef.push(...mapped);
  noResultsFoundRef.value = mapped.length === 0;
}
