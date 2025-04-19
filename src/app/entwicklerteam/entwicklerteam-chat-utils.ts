// entwicklerteam-chat-utils.ts
import { filterMembersByLetter } from './entwicklerteam-members-logic';

import { removeAllInvalidMentionsWithSpaces } from './entwicklerteam-dropdown-logic';

export function addUserSymbol(component: any, member: any): void {
  let txt = component.message;
  txt = removeAllInvalidMentionsWithSpaces(
    txt,
    component.allUsersOriginal,
    component.allChannelsOriginal
  );

  if (txt.endsWith('@')) {
    txt = txt.slice(0, -1);
  }

  txt += ` @${member.name} `;
  component.message = txt;
  component.onCloseDropdown();
}

export function selectChannel(component: any, channel: any): void {
  let txt = component.message;
  txt = removeAllInvalidMentionsWithSpaces(
    txt,
    component.allUsersOriginal,
    component.allChannelsOriginal
  );

  if (txt.endsWith('#')) {
    txt = txt.slice(0, -1);
  }

  txt += ` #${channel.name} `;
  component.message = txt;
  component.onCloseDropdown();
}

export function onMessageInput(component: any, e: Event): void {
  const val = (e.target as HTMLInputElement).value;
  if (!val) return;
  const lastChar = val.charAt(val.length - 1);
  if (/[a-zA-Z]/.test(lastChar)) {
    filterMembersByLetter(component, lastChar);
  }
}

export function onLeaveChannel(component: any, channel: any): void {
  component.userService.getCurrentUserData().then((ud: any) => {
    if (!ud?.uid || !channel.id) return;
    component.channelService.leaveChannel(channel.id, ud.uid).then(() => {
      channel.members = channel.members.filter((m: any) => m.uid !== ud.uid);
      component.channels = component.channels.map((c: any) =>
        c.id === channel.id ? { ...c, members: channel.members } : c
      );
      component.selectedChannel = null;
      component.showWelcomeContainer = true;
      component.channelLeft.emit();
    });
  });
}

export function openLargeImage(
  component: any,
  imageData: string | ArrayBuffer
): void {
  if (typeof imageData !== 'string') return;
  component.largeImageUrl = imageData;
  component.showLargeImage = true;
}

export function closeLargeImage(component: any): void {
  component.showLargeImage = false;
  component.largeImageUrl = null;
}
