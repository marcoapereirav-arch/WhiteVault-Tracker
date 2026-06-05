// WhiteVault™ — Subscription helpers.

import { Subscription } from '../types';

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
