// dialog-utils.ts

import { EditChannelDialogComponent } from '../edit-channel-dialog/edit-channel-dialog.component';
import { ProfilDialogComponent } from '../profil-dialog/profil-dialog.component';

export function openEditChannelDialog(
  component: any,
  ch: {
    id: string;
    name: string;
    members: any[];
    description?: string;
    createdBy?: string;
  }
): void {
  if (component.textAreaRef?.nativeElement === document.activeElement) {
    component.textAreaRef.nativeElement.blur();
  }

  const ref = component.dialog.open(EditChannelDialogComponent, {
    data: {
      id: ch.id,
      name: ch.name,
      members: ch.members,
      description: ch.description || '',
      createdBy: ch.createdBy || '',
    },
    autoFocus: false,
  });

  ref.componentInstance.channelLeft.subscribe(() => {
    component.onLeaveChannel(ch);
  });

  ref.afterClosed().subscribe((result: any) => {
    if (!result) return;
    component.channelService.updateChannel(
      ch.id,
      result.name,
      result.description || ''
    );
    component.channelService.setMembers(ch.id, result.members);
  });
}

export function onOpenProfile(component: any, member: any): void {
  const ref = component.dialog.open(ProfilDialogComponent, {
    width: '400px',
    data: {
      userId: member.id,
      userName: member.name,
      userAvatarUrl: member.avatarUrl,
      userStatus: member.isOnline ? 'Aktiv' : 'Abwesend',
      userEmail: member.email,
    },
  });

  ref.afterClosed().subscribe((result: any) => {
    if (result?.openChatWith) {
      const name = member.name || 'Unbekannt';
      component.onOpenPrivateChat({ id: result.openChatWith, name });
    }
  });
}
