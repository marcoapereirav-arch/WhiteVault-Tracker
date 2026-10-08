// WhiteVault™ — Subscription helpers.

import type { Subscription } from '../types';

// Resolve effective interval — prefers intervalValue+intervalUnit (new flexible
// flow), falls back to legacy frequency for old subscriptions.
export const resolveInterval = (sub: Subscription): { value: number; unit: 'days' | 'weeks' | 'months' | 'years' } => {
  if (sub.intervalValue && sub.intervalUnit && sub.intervalValue > 0) {
    return { value: sub.intervalValue, unit: sub.intervalUnit };
  }
  switch (sub.frequency) {
    case 'WEEKLY':    return { value: 1, unit: 'weeks' };
    case 'MONTHLY':   return { value: 1, unit: 'months' };
    case 'QUARTERLY': return { value: 3, unit: 'months' };
    case 'ANNUAL':    return { value: 1, unit: 'years' };
    default:          return { value: 1, unit: 'months' };
  }
};

// Friendly label like "Cada 2 meses" or "Mensual" (for common cases).
export const formatIntervalLabel = (sub: Subscription): string => {
  const { value, unit } = resolveInterval(sub);
  if (value === 1) {
    if (unit === 'weeks')  return 'Semanal';
    if (unit === 'months') return 'Mensual';
    if (unit === 'years')  return 'Anual';
    if (unit === 'days')   return 'Diario';
  }
  if (value === 3 && unit === 'months') return 'Trimestral';
  const noun = unit === 'days' ? (value === 1 ? 'día' : 'días')
    : unit === 'weeks' ? (value === 1 ? 'semana' : 'semanas')
    : unit === 'months' ? (value === 1 ? 'mes' : 'meses')
    : (value === 1 ? 'año' : 'años');
  return `Cada ${value} ${noun}`;
};

// Compare calendar dates in the user's timezone, not elapsed 24-hour periods.
// Date-only renewals are calendar dates already; do not shift them through UTC.
export const getSubscriptionDueInfo = (
  nextRenewal: string | undefined,
  timeZone = 'Europe/Madrid',
  now = Date.now(),
): { dayOffset: number; isOverdue: boolean; label: string; dateLabel: string } | null => {
  if (!nextRenewal || !Number.isFinite(now)) return null;
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    });
  } catch {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
    });
  }
  const calendarParts = (date: Date): number[] => {
    const parts = formatter.formatToParts(date);
    return ['year', 'month', 'day'].map((key) => Number(parts.find((p) => p.type === key)?.value));
  };
  let renewal: number[];
  if (/^\d{4}-\d{2}-\d{2}$/.test(nextRenewal)) {
    renewal = nextRenewal.split('-').map(Number);
    const check = new Date(Date.UTC(renewal[0], renewal[1] - 1, renewal[2]));
    if (check.getUTCFullYear() !== renewal[0] || check.getUTCMonth() + 1 !== renewal[1] || check.getUTCDate() !== renewal[2]) return null;
  } else {
    const date = new Date(nextRenewal);
    if (Number.isNaN(date.getTime())) return null;
    renewal = calendarParts(date);
  }
  const today = calendarParts(new Date(now));
  const dayNumber = ([year, month, day]: number[]) => Date.UTC(year, month - 1, day) / 86_400_000;
  const dayOffset = dayNumber(renewal) - dayNumber(today);
  const elapsed = -dayOffset;
  const label = dayOffset < 0
    ? `Vencida hace ${elapsed} día${elapsed === 1 ? '' : 's'}`
    : dayOffset === 0 ? 'Vence hoy'
    : dayOffset === 1 ? 'Mañana'
    : `En ${dayOffset} días`;
  const [year, month, day] = renewal;
  return {
    dayOffset,
    isOverdue: dayOffset < 0,
    label,
    dateLabel: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`,
  };
};

// Advance a subscription's nextRenewal to the next billing cycle.
// Uses UTC arithmetic to avoid timezone day-shift edge cases.
export const advanceSubscriptionRenewal = (sub: Subscription): Subscription => {
  if (!sub.nextRenewal) return sub;
  const d = new Date(sub.nextRenewal);
  if (isNaN(d.getTime())) return sub;

  const { value, unit } = resolveInterval(sub);
  switch (unit) {
    case 'days':   d.setUTCDate(d.getUTCDate() + value); break;
    case 'weeks':  d.setUTCDate(d.getUTCDate() + 7 * value); break;
    case 'months': d.setUTCMonth(d.getUTCMonth() + value); break;
    case 'years':  d.setUTCFullYear(d.getUTCFullYear() + value); break;
  }

  return {
    ...sub,
    nextRenewal: d.toISOString(),
    paymentsCount: (sub.paymentsCount ?? 0) + 1,
    lastPaidAt: new Date().toISOString(),
  };
};

// Convert a reminder (value + unit) to milliseconds for date math.
export const reminderToMs = (value?: number, unit?: 'minutes' | 'hours' | 'days'): number | null => {
  if (!value || value <= 0 || !unit) return null;
  switch (unit) {
    case 'minutes': return value * 60 * 1000;
    case 'hours':   return value * 60 * 60 * 1000;
    case 'days':    return value * 24 * 60 * 60 * 1000;
  }
};

// Subscription is overdue when active + nextRenewal in the past.
export const isSubscriptionOverdue = (sub: Subscription, now = Date.now()): boolean => {
  if (!sub.active || !sub.nextRenewal) return false;
  const t = new Date(sub.nextRenewal).getTime();
  return !isNaN(t) && t < now;
};

// Days overdue (positive number) — useful for sorting & UI.
export const daysOverdue = (sub: Subscription, now = Date.now()): number => {
  if (!sub.nextRenewal) return 0;
  const t = new Date(sub.nextRenewal).getTime();
  if (isNaN(t)) return 0;
  return Math.max(0, Math.floor((now - t) / 86_400_000));
};
