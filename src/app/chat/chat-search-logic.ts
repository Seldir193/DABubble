// chat-search-logic.ts

import { ChatComponent } from './chat.component';

/**
 * Replaces openSearchField(searchQuery?: string) from ChatComponent.
 */
export function openSearchFieldLogic(
  component: ChatComponent,
  searchQuery?: string
): void {
  resetThreadsForSearch(component);
  setupSearchView(component);
  activateSearchMode(component);

  component.isSearchActive = true;
  component.updateContainerVisibility();

  if (searchQuery) {
    // handle the query if needed
  }
}

/**
 * Matches the old resetThreadsForSearch().
 */
function resetThreadsForSearch(component: ChatComponent): void {
  component.selectedThread = null;
  component.selectedThreadChannel = null;
}

/**
 * Matches the old setupSearchView().
 */
function setupSearchView(component: ChatComponent): void {
  component.previousView = component.currentMobileView;
  component.currentMobileView = 'search';

  if (window.innerWidth < 1278) {
    component.showDesktopHeader = true;
    if (component.forcedMobileActive) {
      component.oldDesktopView = 'search';
      component.oldIsSearchActive = true;
    }
  } else {
    component.showDesktopHeader = false;
  }
}

/**
 * Matches the old activateSearchMode().
 */
function activateSearchMode(component: ChatComponent): void {
  component.isSearchActive = true;
  component.isPrivateChat = false;
  component.selectedChannel = null;
  component.showWelcomeContainer = false;
}
