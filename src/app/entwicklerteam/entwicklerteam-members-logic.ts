import { EntwicklerteamComponent } from './entwicklerteam.component';
import { AddMembersDialogComponent } from '../add-members-dialog/add-members-dialog.component';
import { MemberListDialogComponent } from '../member-list-dialog/member-list-dialog.component';
import { MemberSectionDialogComponent } from '../member-section-dialog/member-section-dialog.component';

export function onOpenAddMembersOverlay(self: EntwicklerteamComponent) {
  if (self.isDesktop) self.toggleAddMembersOverlay()
  else openAddMembersDialogMobile(self)
}

export function openAddMembersDialogMobile(self: EntwicklerteamComponent) {
  if (!self.selectedChannel) return
  self.dialog.open(AddMembersDialogComponent, {
    data: {
      channelId: self.selectedChannel.id,
      members: self.selectedChannel.members
    }
  })
}

export function openMemberListDialogMobile(self: EntwicklerteamComponent) {
  if (!self.selectedChannel) return
  const ref = self.dialog.open(MemberListDialogComponent, {
    data: {
      channelId: self.selectedChannel.id,
      members: self.selectedChannel.members
    }
  })
  ref.afterClosed().subscribe(r => handleMobileMemberListResult(self, r))
}

export function handleMobileMemberListResult(self: EntwicklerteamComponent, r: any) {
  if (!r) return
  if (r.addMembers) openAddMembersDialogMobile(self)
  else if (r.openProfile) self.onOpenProfile(r.openProfile)
  else if (r.openChatWith) {
    const name = r.openProfile?.name || 'Unbekannt'
    self.onOpenPrivateChat({ id: r.openChatWith, name })
  }
}

export function loadAllUsers(self: EntwicklerteamComponent) {
  self.userService.getAllUsers().then(users => {
    self.allUsers = users.map(u => ({
      id: u.id,
      name: u.name,
      avatarUrl: u.avatarUrl || 'assets/img/avatar.png',
      isOnline: u.isOnline ?? false
    }))
  })
}

export function filterMembersByLetter(self: EntwicklerteamComponent, letter: string) {
  self.userService.getUsersByFirstLetter(letter).then(res => {
    self.members = res
    if (self.members.length > 0) openMemberSelectionDialog(self)
  })
}

export function openMemberSelectionDialog(self: EntwicklerteamComponent) {
  const ref = self.dialog.open(MemberSectionDialogComponent, {
    width: '400px',
    data: { members: self.members }
  })
  ref.componentInstance.memberSelected.subscribe(sel =>
    handleMemberSelected(self, sel)
  )
}

export function handleMemberSelected(self: EntwicklerteamComponent, sel: { uid: string, name: string }) {
  self.selectedMember = sel
}

export function selectMember(self: EntwicklerteamComponent, member: any) {
  if (member?.uid && member?.name) {
    self.memberSelected.emit({ uid: member.uid, name: member.name })
  }
}
