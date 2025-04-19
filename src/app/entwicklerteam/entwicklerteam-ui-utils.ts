// entwicklerteam-ui-utils.ts
export function onSelfClickUtil(component: any, event: MouseEvent): void {
    event.stopPropagation();
  }
  
  export function checkDesktopWidthUtil(component: any): void {
    component.isDesktop = window.innerWidth >= 1278;
  }
  
  export function loadCurrentUserUtil(component: any): void {
    component.userService.getCurrentUserData().then((user: any) => {
      component.currentUser = user;
    });
  }
  
  export function toggleOverlayUtil(component: any): void {
    component.isOverlayOpen = !component.isOverlayOpen;
  }
  
  export function closeOverlayUtil(component: any): void {
    component.isOverlayOpen = false;
  }
  
  export function toggleAddMembersOverlayUtil(component: any): void {
    component.isOverlayOpen = false;
    component.isAddMembersOverlayOpen = true;
  }
  
  export function closeAddMembersOverlayUtil(component: any): void {
    component.isAddMembersOverlayOpen = false;
  }
  
  export function onOpenPrivateChatUtil(component: any, payload: { id: string; name: string }): void {
    component.openPrivateChatFromEntwicklerteam.emit(payload);
  }
  
  export function addEmojiUtil(component: any, ev: any): void {
    if (ev?.emoji?.native) component.message += ev.emoji.native;
  }
  
  export function toggleEmojiPickerUtil(component: any, event: MouseEvent): void {
    event.stopPropagation();
    if (!component.isEmojiPickerVisible) {
      component.dropdownState = 'hidden';
      component.cycleStep = 1;
    }
    component.isEmojiPickerVisible = !component.isEmojiPickerVisible;
  }
  
  export function onEmojiPickerClickUtil(component: any, e: MouseEvent): void {
    e.stopPropagation();
  }
  
  export function toggleEmojiPickerForMessageUtil(component: any, msg: any): void {
    const visible = msg.isEmojiPickerVisible;
    component.messages.forEach((m: any) => (m.isEmojiPickerVisible = false));
    msg.isEmojiPickerVisible = !visible;
  }
  
  export function openChannelUtil(component: any, ch: any): void {
    component.channelService.changeChannel(ch);
  }
  
  export function receiveNewTeamUtil(component: any, name: string, members: any[]): void {
    const newId = Math.random().toString(36).substring(2, 15);
    const createdBy = component.currentUser?.name || '';
    component.channels = [{ id: newId, name, members, createdBy }];
  }
  
  export function openImageModalUtil(component: any): void {
    component.isImageModalOpen = true;
  }
  
  export function closeImageModalUtil(component: any): void {
    component.isImageModalOpen = false;
  }
  
  export function sendPrivateMessageUtil(component: any): void {
    if (!component.privateMessage.trim() || !component.selectedMember) return;
    component.privateMessage = '';
  }
  
  export function closeThreadChannelUtil(_: any): void {
  }
  
  export function changeChannelUtil(_: any, _newChannel: any): void {
  }
  
  export function trackByMsgIdUtil(_: any, __: number, msg: any): any {
    return msg.id;
  }
  