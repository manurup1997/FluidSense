import type { SummaryPeriod } from '../types';
import { subHours, startOfDay } from 'date-fns';

export interface PeriodRange {
  start: Date;
  end: Date;
  label: string;
}

const SHIFT_START_HOUR = 7; // 07:00 day shift start, 19:00 night shift start

export function getPeriodRange(period: SummaryPeriod, now: Date, custom?: { start: Date; end: Date }): PeriodRange {
  switch (period) {
    case '6h':
      return { start: subHours(now, 6), end: now, label: 'Last 6 hours' };
    case '12h':
      return { start: subHours(now, 12), end: now, label: 'Last 12 hours' };
    case '24h':
      return { start: subHours(now, 24), end: now, label: 'Last 24 hours' };
    case 'since_midnight':
      return { start: startOfDay(now), end: now, label: 'Today since midnight' };
    case 'shift': {
      const hour = now.getHours();
      const isDayShift = hour >= SHIFT_START_HOUR && hour < 19;
      const start = new Date(now);
      if (isDayShift) start.setHours(SHIFT_START_HOUR, 0, 0, 0);
      else if (hour >= 19) start.setHours(19, 0, 0, 0);
      else { start.setDate(start.getDate() - 1); start.setHours(19, 0, 0, 0); }
      return { start, end: now, label: isDayShift ? 'Current shift (day)' : 'Current shift (night)' };
    }
    case 'custom':
      return { start: custom?.start ?? subHours(now, 24), end: custom?.end ?? now, label: 'Custom range' };
    default:
      return { start: subHours(now, 24), end: now, label: 'Last 24 hours' };
  }
}

export const PERIOD_OPTIONS: { value: SummaryPeriod; label: string }[] = [
  { value: '24h', label: 'Last 24 hours' },
  { value: 'shift', label: 'Current shift' },
  { value: '6h', label: 'Last 6 hours' },
  { value: '12h', label: 'Last 12 hours' },
  { value: 'since_midnight', label: 'Today since midnight' },
  { value: 'custom', label: 'Custom range' },
];
