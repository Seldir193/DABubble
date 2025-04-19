import { ChatComponent } from './chat.component';

export function onChannelSelectedLogic(
  component: ChatComponent,
  channel: any
): void {
  if (channel) {
    handleChannelSelection(component, channel);
  } else {
    handleChannelDeselection(component);
  }
  adjustMobileViewAfterChannel(component);
}

function handleChannelSelection(component: ChatComponent, channel: any): void {
  setTeamViewDependingOnWidth(component);
  clearThreadIfSearching(component);
  applyChannelSelection(component, channel);
}

function setTeamViewDependingOnWidth(component: ChatComponent): void {
  component.previousView = component.currentMobileView;
  component.currentMobileView = 'team';
  if (window.innerWidth < 1278) {
    component.showDesktopHeader = true;
  }
}

function clearThreadIfSearching(component: ChatComponent): void {
  if (component.isThreadFromSearch) {
    component.closeThread();
  }
  component.isThreadFromSearch = false;
  component.selectedThread = null;
  component.isThreadActive = false;
  component.selectedThreadChannel = null;
}

function applyChannelSelection(component: ChatComponent, channel: any): void {
  component.isPrivateChat = false;
  component.selectedChannel = channel;
  component.selectedMember = null;
  component.isSearchActive = false;
  component.showWelcomeContainer = false;
  component.appStateService.setShowWelcomeContainer(false);
}

function handleChannelDeselection(component: ChatComponent): void {
  component.selectedChannel = null;
  component.selectedThreadChannel = null;
  component.showWelcomeContainer = true;
  component.appStateService.setShowWelcomeContainer(true);
}

function adjustMobileViewAfterChannel(component: ChatComponent): void {
  if (window.innerWidth < 1278) {
    if (component.selectedChannel) {
      component.currentMobileView = 'team';
    } else {
      component.currentMobileView = 'container';
    }
  }
}
