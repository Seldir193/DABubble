import { PrivateMessagesComponent } from './private-messages.component';

export async function ngOnInitUtil(c: PrivateMessagesComponent): Promise<void> {
  await c.loadCurrentUser();
  c.loadRecipientData();
  c.checkDesktopWidth();
  c['setupRecipientListener']();
  c['initPrivateConversation']();
  c['initChannelAndUserSubscriptions']();

  setTimeout(() => c['focusTextArea'](), 0);
}

export function initPrivateConversationUtil(c: PrivateMessagesComponent) {
  if (!c.currentUser?.id || !c.recipientId) return;
  c.conversationId = c.messageService.generateConversationId(
    c.currentUser.id,
    c.recipientId
  );
  c['setupMessageListener']();

  c.listenForEmojiUpdatesUtilWrapper();
  c.loadLastUsedEmojisWrapper();
  c.startLiveReplyCountUpdates();
}


export function initChannelAndUserSubscriptionsUtil(c: PrivateMessagesComponent) {
  c.setChannelsUnsubscribe = c.channelService.getAllChannels((ch) => {
    c.allChannels = ch;
    c.allChannelsOriginal = [...ch]; 

  });

  c.setUsersUnsubscribe = c.userService.getAllUsersLive((users) => {
   
    c.allUsers = users;
    c.allUsersOriginal = [...users]; 


    users.forEach((u) => {
      c.userMap[u.id] = {
        name: u.name || 'Unbekannt',
        avatarUrl: u.avatarUrl || 'assets/img/avatar.png',
      };
    });

  });
}


export function onResizeUtil(c: PrivateMessagesComponent) {
  c.checkDesktopWidth();
}

export function onDocumentClickUtil(
  c: PrivateMessagesComponent,
  e: MouseEvent
) {
  if (c.dropdownState !== 'hidden') {
    c.dropdownState = 'hidden';
    c.cycleStep = 1;
  }
  if (c.isEmojiPickerVisible) {
    c.isEmojiPickerVisible = false;
  }
}

export function onSelfClickUtil(e: MouseEvent) {
  e.stopPropagation();
}

export function checkDesktopWidthUtil(c: PrivateMessagesComponent) {
  c.isDesktop = window.innerWidth >= 1278;
}
