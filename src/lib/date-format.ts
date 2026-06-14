const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAYS_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function toUtcDate(iso: string): Date {
  return new Date(iso);
}

function formatUtcTime(date: Date): string {
  const hours = date.getUTCHours();
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const hour12 = hours % 12 || 12;
  const suffix = hours < 12 ? "AM" : "PM";
  return `${hour12}:${minutes} ${suffix} UTC`;
}

export function utcDateKey(iso: string): string {
  return toUtcDate(iso).toISOString().slice(0, 10);
}

export function formatMatchDateTime(iso: string): string {
  const date = toUtcDate(iso);
  return `${MONTHS_SHORT[date.getUTCMonth()]} ${date.getUTCDate()} · ${formatUtcTime(date)}`;
}

export function formatMatchDay(dateKey: string): string {
  const date = toUtcDate(`${dateKey}T00:00:00.000Z`);
  return `${WEEKDAYS_LONG[date.getUTCDay()]} · ${MONTHS_LONG[date.getUTCMonth()]} ${date.getUTCDate()}`;
}

export function formatSnapshotDateTime(iso: string): string {
  const date = toUtcDate(iso);
  return `${MONTHS_SHORT[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}, ${formatUtcTime(date)}`;
}
