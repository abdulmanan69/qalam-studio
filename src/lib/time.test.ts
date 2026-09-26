import { describe, expect, it } from 'vitest';

import { formatRelativeTime, isWithinDays } from './time';

const NOW = Date.UTC(2026, 8, 27, 12, 0, 0);
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

describe('formatRelativeTime', () => {
  it('describes recent times relatively', () => {
    expect(formatRelativeTime(NOW - 10_000, NOW)).toBe('now');
    expect(formatRelativeTime(NOW - 5 * MINUTE, NOW)).toBe('5 minutes ago');
    expect(formatRelativeTime(NOW - 3 * 60 * MINUTE, NOW)).toBe('3 hours ago');
    expect(formatRelativeTime(NOW - DAY, NOW)).toBe('yesterday');
    expect(formatRelativeTime(NOW - 14 * DAY, NOW)).toBe('2 weeks ago');
  });

  it('falls back to an absolute date for old timestamps', () => {
    expect(formatRelativeTime(Date.UTC(2025, 0, 15, 12), NOW)).toBe('Jan 15, 2025');
  });
});

describe('isWithinDays', () => {
  it('includes timestamps inside the window only', () => {
    expect(isWithinDays(NOW - 6 * DAY, 7, NOW)).toBe(true);
    expect(isWithinDays(NOW - 8 * DAY, 7, NOW)).toBe(false);
    expect(isWithinDays(NOW + DAY, 7, NOW)).toBe(false);
  });
});
