export const loadCurrentUserHelper = async (
  userService: { getCurrentUserData: () => Promise<any> },
  updateUser: (user: any) => void
): Promise<void> => {
  return userService
    .getCurrentUserData()
    .then((user) => {
      updateUser(user);
    })
    .catch(() => {});
};

export const loadRecipientDataHelper = (
  recipientId: string,
  userService: { getUserById: (id: string) => Promise<any> },
  updateRecipientStatus: (status: string) => void,
  updateRecipientAvatar: (avatarUrl: string) => void
): void => {
  if (recipientId) {
    userService
      .getUserById(recipientId)
      .then((userData) => {
        updateRecipientStatus(userData.isOnline ? 'Aktiv' : 'Abwesend');
        updateRecipientAvatar(userData.avatarUrl || '');
      })
      .catch(() => {});
  }
};
