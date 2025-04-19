// chat-member-logic.ts

import { ChatComponent } from './chat.component';

/**
 * Replaces the original onMemberSelected(...) method in ChatComponent.
 */
export function onMemberSelectedLogic(component: ChatComponent, member: any): void {
  if (!member || !member.id) {
    return;
  }
  resetThreadIfNeeded(component);
  component.isPrivateChat = true;
  component.selectedMember = member;
  handleMobileViewForMember(component);

  component.selectedChannel = null;
  component.isSearchActive = false;
  component.showWelcomeContainer = false;

  if (component.selectedThread) {
    component.selectedThread = null;
  }
}

/**
 * Closes any open thread or thread channel when a member is selected.
 * Matches the old resetThreadIfNeeded().
 */
function resetThreadIfNeeded(component: ChatComponent): void {
  if (component.isThreadFromSearch) {
    component.closeThread();
  }
  if (component.selectedThreadChannel) {
    component.closeThreadChannel();
  }
}

/**
 * Adapts view for mobile when a member is selected.
 * Matches the old handleMobileViewForMember().
 */
function handleMobileViewForMember(component: ChatComponent): void {
  if (window.innerWidth < 1278) {
    component.previousView = component.currentMobileView;
    component.currentMobileView = 'private';
    component.showDesktopHeader = true;
  } else {
    component.previousView = component.currentMobileView;
    component.currentMobileView = 'private';
  }
}
