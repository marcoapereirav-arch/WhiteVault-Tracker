// WhiteVault™ — Subscription helpers.

import { Subscription } from '../types';

// Advance a subscription's nextRenewal to the next billing cycle.
// Uses UTC arithmetic to avoid timezone day-shift edge cases.
export const advanceSubscriptionRenewal = (sub: Subscription): Subscription => {
  if (!sub.nextRenewal) return sub;
  const d = new Date(sub.nextRenewal);
  if (isNaN(d.getTime())) return sub;

  switch (sub.frequency) {
    case 'WEEKLY':
      d.setUTCDate(d.getUTCDate() + 7);
      break;
    case 'MONTHLY':
      d.setUTCMonth(d.getUTCMonth() + 1);
      break;
    case 'QUARTERLY':
      d.setUTCMonth(d.getUTCMonth() + 3);
      break;
    case 'ANNUAL':
      d.setUTCFullYear(d.getUTCFullYear() + 1);
      break;
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
