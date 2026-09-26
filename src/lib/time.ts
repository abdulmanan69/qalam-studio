const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/**
 * Localized relative time ("5 minutes ago", "yesterday") using Intl.
 * Falls back to an absolute date for anything older than four weeks.
 */
export function formatRelativeTime(timestamp: number, now: number = Date.now(), locale = 'en'): string {
  const diff = timestamp - now;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (abs < MINUTE) return rtf.format(0, 'second');
  if (abs < HOUR) return rtf.format(Math.round(diff / MINUTE), 'minute');
  if (abs < DAY) return rtf.format(Math.round(diff / HOUR), 'hour');
  if (abs < WEEK) return rtf.format(Math.round(diff / DAY), 'day');
  if (abs < 4 * WEEK) return rtf.format(Math.round(diff / WEEK), 'week');
  return formatDate(timestamp, locale);
}

/** Localized medium date, e.g. "Sep 27, 2026". */
export function formatDate(timestamp: number, locale = 'en'): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(timestamp);
}

/** Localized date + short time, e.g. "Sep 27, 2026, 4:05 PM". */
export function formatDateTime(timestamp: number, locale = 'en'): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp);
}

/** True if `timestamp` falls within the last `days` days relative to `now`. */
export function isWithinDays(timestamp: number, days: number, now: number = Date.now()): boolean {
  return now - timestamp <= days * DAY && timestamp <= now;
}
