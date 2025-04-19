import { ChatComponent } from './chat.component';

export function enterForcedMobileMode(self: ChatComponent): void {
  self.forcedMobileActive = true;
  self.oldDesktopView = self.currentMobileView;
  self.oldIsSearchActive = self.isSearchActive;
  self.oldIsWorkspaceVisible = self.isWorkspaceVisible;
  self.currentMobileView = 'container';
}

export function exitForcedMobileMode(self: ChatComponent): void {
  self.forcedMobileActive = false;
  if (self.oldDesktopView === 'search') {
    self.currentMobileView = 'search';
    self.showDesktopHeader = true;
  } else {
    self.currentMobileView = self.oldDesktopView;
    self.isSearchActive = self.oldIsSearchActive;
    self.showDesktopHeader = false;
  }
  self.isWorkspaceVisible = self.oldIsWorkspaceVisible;
}
