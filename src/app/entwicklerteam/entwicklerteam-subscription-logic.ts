import { EntwicklerteamComponent } from './entwicklerteam.component';
import { combineLatest } from 'rxjs';

export function initChannelAndUserSubscriptionsUtil(
  c: EntwicklerteamComponent
) {
  c.setChannelsUnsubscribe = c.channelService.getAllChannels((channels) => {
    c.allChannels = channels;
    c.allChannelsOriginal = [...channels];
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

export function subscribeToCurrentChannel(self: EntwicklerteamComponent): void {
  self.channelService.currentChannel.subscribe((channel) => {
    if (!channel || !channel.id) return;
    self.callUnsubscribeFromBoth();
    self.setHasInitialScrollDone(false);
    self.callInitChannel(channel);
    self.messages = [];

    const topLevelMsgs$ = self.channelService.getMessages(channel.id);
    const subCollMsgs$ = self.channelService.getChannelMessagesLive(channel.id);

    const combined$ = combineLatest([topLevelMsgs$, subCollMsgs$]).subscribe(
      ([topMsgs, subMsgs]) => {
        const combined = [...topMsgs, ...subMsgs];
        mergeMessages(self, combined);
      }
    );
    self.setUnsubscribeTopLevel(combined$);
  });
}

function mergeArraysById(
  self: EntwicklerteamComponent,
  currentMessages: any[],
  newMsgs: any[]
): any[] {
  const map = buildMapFromMessages(self, currentMessages);
  for (const n of newMsgs) {
    map.set(n.id, {
      ...n,
      content: { ...n.content, emojis: n.content?.emojis || [] },
      replyCount: n.replyCount || 0,
      threadId: n.threadId || null,
      parentId: n.parentId || null,
    });
  }
  return sortByTimestamp(self, Array.from(map.values()));
}

function buildMapFromMessages(
  self: EntwicklerteamComponent,
  messages: any[]
): Map<string, any> {
  const map = new Map<string, any>();
  for (const m of messages) {
    map.set(m.id, m);
  }
  return map;
}

function sortByTimestamp(self: EntwicklerteamComponent, msgs: any[]): any[] {
  return msgs.sort((a, b) => {
    const ta = a.timestamp?.seconds || +new Date(a.timestamp || 0);
    const tb = b.timestamp?.seconds || +new Date(b.timestamp || 0);
    return ta - tb;
  });
}

export function mergeMessages(
  self: EntwicklerteamComponent,
  newMsgs: any[]
): void {
  const merged = mergeArraysById(self, self.messages, newMsgs);
  self.messages = merged;
  self.callConnectReplyCountsToMessages(self.messages);

  if (!self.getHasInitialScrollDone()) {
    self.scrollToBottom();

    self.setHasInitialScrollDone(true);
  } else {
    const newIds = new Set(newMsgs.map((m: any) => m.id));
    const oldIds = new Set(self.messages.map((m: any) => m.id));
    const hasReallyNew = Array.from(newIds).some((id) => !oldIds.has(id));
    if (hasReallyNew) self.scrollToBottom();
  }
}
