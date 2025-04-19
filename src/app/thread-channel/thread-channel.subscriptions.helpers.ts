import { ThreadChannelComponent } from './thread-channel.component';

export async function ngOnInitHelper(
  component: ThreadChannelComponent
): Promise<void> {
  component.checkDesktopWidth();
  if (!component.channelId || !component.parentMessage?.id) return;

  const parentId = component.parentMessage.id;
  await component.loadCurrentUser();
  await component.initializeThread(parentId);
  component.loadReplyCounts();

  subscribeReplyCountHelper(component, parentId);
  subscribeChannelsHelper(component);
  subscribeUsersHelper(component);
  subscribeParentMessageHelper(component);
}

// 1) Reply-Count-Abonnement
export function subscribeReplyCountHelper(
  component: ThreadChannelComponent,
  parentId: string
): void {
  if (!component.parentMessage?.id) return;
  component.unsubscribeFromReplyCount =
    component.messageService.loadReplyCountsLive(
      [component.parentMessage.id],
      'thread-channel',
      (replyCounts) => {
        const data = replyCounts[parentId];
        if (!data) return;
        component.parentMessage!.replyCount = data.count;
        component.parentMessage!.lastReplyTime =
          data.lastResponseTime || component.parentMessage!.lastReplyTime;
        component.cdr.detectChanges();
      }
    );
}

// 2) Channels-Abonnement
export function subscribeChannelsHelper(
  component: ThreadChannelComponent
): void {
  component.unsubscribeChannels = component.channelService.getAllChannels(
    (channels) => {
      component.allChannels = channels;
      component.allChannelsOriginal = [...channels];
    }
  );
}

// 3) Users-Abonnement
export function subscribeUsersHelper(component: ThreadChannelComponent): void {
  component.unsubscribeUsers = component.userService.getAllUsersLive(
    (users) => {
      component.allUsers = users;
      component.allUsersOriginal = [...users];
      users.forEach((u) => {
        component.userMap[u.id] = {
          name: u.name || 'Unbekannt',
          avatarUrl: u.avatarUrl || 'assets/img/avatar.png',
        };
      });
    }
  );
}

// 4) Parent-Message-Abonnement
export function subscribeParentMessageHelper(
  component: ThreadChannelComponent
): void {
  if (!component.parentMessage?.id) return;
  component.unsubscribeParent = component.messageService.listenForThreadDetails(
    component.parentMessage.id,
    (docData) => {
      if (docData) {
        component.parentMessage = {
          ...component.parentMessage,
          ...docData,
        };
      }
    }
  );
}










