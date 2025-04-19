// thread.time.helpers.ts
import { ThreadComponent } from './thread.component';
import { Message } from '../message.models';
import { formatDate } from '@angular/common';

export function safeConvertTimestampComp(timestamp: any): Date {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp === 'object' && 'seconds' in timestamp) {
    return new Date(timestamp.seconds * 1000);
  }
  if (typeof timestamp === 'string') {
    const parsed = new Date(timestamp);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

export function getYesterdayDateComp(): Date {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return y;
}

export function isSameDayComp(t1: Date | string, t2: Date | string): boolean {
  if (!t1 || !t2) return false;
  const d1 = new Date(t1),
    d2 = new Date(t2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function getFormattedDateComp(
  comp: ThreadComponent,
  dateVal: string | Date | undefined
): string {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  if (isSameDayComp(d, comp.currentDate)) return 'Heute';
  if (isSameDayComp(d, getYesterdayDateComp())) return 'Gestern';
  return d.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
}

export function formatParentTimestampComp(
  comp: ThreadComponent,
  pm: Message
): void {
  if (!pm.timestamp) return;
  const ts = safeConvertTimestampComp(pm.timestamp);
  comp.formattedParentMessageDate = getFormattedDateComp(comp, ts);
  comp.formattedMessageTime = formatDate(ts, 'HH:mm', 'de');
}
