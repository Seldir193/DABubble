// date-format-utils.ts
import { parseDate, isSameDay, getYesterdayDate } from './date-utils';

export function getFormattedDate(ds: string): string {
  if (!ds) return 'Ungültiges Datum';
  const d = parseDate(ds);
  if (!d) return 'Ungültiges Datum';
  if (isSameDay(d, new Date())) return 'Heute';
  if (isSameDay(d, getYesterdayDate())) return 'Gestern';
  const opt: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  };
  return d.toLocaleDateString('de-DE', opt);
}

export function getFormattedTime(timeString: string): string {
  if (!timeString) return '—';
  return timeString.split(':').slice(0, 2).join(':');
}

export function convertFirestoreTimestampToDate(ts: any): Date | null {
  if (!ts) return null;
  if (ts.toDate) return ts.toDate();
  if (ts instanceof Date) return ts;
  return null;
}

export function getFormattedThreadLastResponseTime(msg: any): string {
  let r = msg.lastReplyTime ?? msg.timestamp;
  if (r?.seconds) r = new Date(r.seconds * 1000);
  return r ? r.toLocaleTimeString() : '—';
}
