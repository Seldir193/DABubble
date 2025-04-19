export function parseDate(ds: string): Date | null {
  const parts = ds.split('.');
  let date: Date;
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    date = new Date(year, month, day);
  } else {
    date = new Date(ds);
  }
  return isNaN(date.getTime()) ? null : date;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

export function getYesterdayDate(): Date {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return y;
}
