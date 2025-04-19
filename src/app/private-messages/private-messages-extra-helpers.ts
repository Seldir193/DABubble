import { PrivateMessagesComponent } from './private-messages.component';
import firebase from 'firebase/compat/app';

export function isNearBottomUtil(
  c: PrivateMessagesComponent,
  threshold = 100
): boolean {
  const el = c.messageList?.nativeElement;
  if (!el) return false;
  const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
  return distanceToBottom <= threshold;
}

export function scrollToBottomUtil(c: PrivateMessagesComponent): void {
  if (c.isChatChangingWrapper()) {
    const lastMessage = c.messageList?.nativeElement.lastElementChild;
    if (lastMessage) {
      setTimeout(() => {
        lastMessage.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100);
    }
    return;
  }
  if (isNearBottomUtil(c)) {
    setTimeout(() => {
      if (c.messageList) {
        c.messageList.nativeElement.scrollTop =
          c.messageList.nativeElement.scrollHeight;
      }
    }, 100);
  }
}

export function getFormattedDateUtil(inputDate: Date | string | null): string {
  if (!inputDate) return '';
  const d = inputDate instanceof Date ? inputDate : new Date(inputDate);
  if (isNaN(d.getTime())) return 'Ungültiges Datum';
  const now = new Date(),
    today = new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    yest = new Date(today);
  yest.setDate(today.getDate() - 1);
  const cmp = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (cmp.getTime() === today.getTime()) return 'Heute';
  if (cmp.getTime() === yest.getTime()) return 'Gestern';
  return d.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    timeZone: 'Europe/Berlin',
  });
}

export function safeConvertTimestampUtil(timestamp: unknown): Date {
  if (!timestamp) return new Date();
  if (typeof (timestamp as any).toDate === 'function') {
    return (timestamp as firebase.firestore.Timestamp).toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  if (typeof timestamp === 'object' && 'seconds' in (timestamp as object)) {
    const ts = timestamp as { seconds: number; nanoseconds: number };
    return new Date(ts.seconds * 1000 + ts.nanoseconds / 1e6);
  }
  const parsedDate = new Date(timestamp as string | number);
  return isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
}

export function isSameDayUtil(date1: Date | null, date2: Date | null): boolean {
  if (!date1 || !date2) return false;
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
}
