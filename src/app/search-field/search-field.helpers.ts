export function parseDateString(dateString: string): Date {
  const parts = dateString.split('.');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date(dateString);
}

export function getYesterdayDate(): Date {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday;
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
}

export function getFormattedDate(dateString: string): string {
  if (!dateString) return 'Ungültiges Datum';
  const date = parseDateString(dateString);
  if (isNaN(date.getTime())) return 'Ungültiges Datum';
  if (isSameDay(date, new Date())) return 'Heute';
  if (isSameDay(date, getYesterdayDate())) return 'Gestern';

  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  };
  return date.toLocaleDateString('de-DE', options);
}
