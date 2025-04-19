import { ChatHeaderComponent } from './chat-header.component';

export function resetInactivityTimerLogic(component: ChatHeaderComponent): void {
  if (component.inactivityTimeout) {
    clearTimeout(component.inactivityTimeout);
  }
  component.userStatus = 'Aktiv';
  component.inactivityTimeout = setTimeout(() => {
    component.userStatus = 'Abwesend';
  }, 600000);
}

export function onMouseMoveLogic(component: ChatHeaderComponent): void {
  resetInactivityTimerLogic(component);
}

export function onKeyDownLogic(component: ChatHeaderComponent): void {
  resetInactivityTimerLogic(component);
}
