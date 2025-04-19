import { ThreadChannelComponent } from './thread-channel.component';

export function formatMessageHelper(
  component: ThreadChannelComponent,
  msg: any
): any {
  const formattedMsg = { ...msg };
  if (formattedMsg.timestamp) {
    formattedMsg.timestamp = component.messageService.convertToDate(
      formattedMsg.timestamp
    );
  } else {
    formattedMsg.timestamp = new Date();
  }
  return formattedMsg;
}

export function getFormattedTimeHelper(
  component: ThreadChannelComponent,
  timestamp: any
): string {
  const date: Date = convertTimestampDateHelper(component, timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function getFormattedDateHelper(
  component: ThreadChannelComponent,
  timestamp: any
): string {
  if (!timestamp) return 'Kein Datum';
  const date = toDateHelper(timestamp);
  if (isNaN(date.getTime())) return 'Ungültiges Datum';
  if (isSameDayHelper(date, new Date())) return 'Heute';
  if (isSameDayHelper(date, getYesterdayDateHelper())) return 'Gestern';
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function convertTimestampDateHelper(
  component: ThreadChannelComponent,
  timestamp: any
): Date {
  return toDateHelper(timestamp);
}

export function toDateHelper(timestamp: any): Date {
  if (typeof timestamp === 'object' && 'seconds' in timestamp) {
    return new Date(timestamp.seconds * 1000);
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return new Date(timestamp);
}

export function isSameDayHelper(date1: Date, date2: Date): boolean {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
}

export function getYesterdayDateHelper(): Date {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday;
}
