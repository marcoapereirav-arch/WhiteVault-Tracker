import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getSubscriptionDueInfo, getSubscriptionPaymentSummary } from './subscriptions.ts';
import type { Subscription } from '../types.ts';

const now = Date.parse('2026-10-08T11:00:00Z');

test('past renewals show their actual calendar date and elapsed days', () => {
  assert.deepEqual(getSubscriptionDueInfo('2026-10-01T00:00:00Z', 'Europe/Madrid', now), {
    dayOffset: -7, isOverdue: true, label: 'Vencida hace 7 días', dateLabel: '01/10/2026',
  });
  assert.equal(getSubscriptionDueInfo('2026-10-07', 'Europe/Madrid', now)?.label, 'Vencida hace 1 día');
});

test('today, tomorrow and later renewals stay distinct', () => {
  assert.equal(getSubscriptionDueInfo('2026-10-08', 'Europe/Madrid', now)?.label, 'Vence hoy');
  assert.equal(getSubscriptionDueInfo('2026-10-09', 'Europe/Madrid', now)?.label, 'Mañana');
  assert.equal(getSubscriptionDueInfo('2026-10-10', 'Europe/Madrid', now)?.label, 'En 2 días');
});

test('crossing Madrid midnight counts one calendar day even after 30 minutes', () => {
  const due = getSubscriptionDueInfo('2026-10-07T21:45:00Z', 'Europe/Madrid', Date.parse('2026-10-07T22:15:00Z'));
  assert.equal(due?.label, 'Vencida hace 1 día');
  assert.equal(due?.dateLabel, '07/10/2026');
});

test('timestamp dates respect Madrid while date-only values keep their date', () => {
  assert.equal(getSubscriptionDueInfo('2026-10-08T23:00:00Z', 'Europe/Madrid', now)?.label, 'Mañana');
  const due = getSubscriptionDueInfo('2026-10-08', 'America/Los_Angeles', now);
  assert.equal(due?.dateLabel, '08/10/2026');
  assert.equal(due?.label, 'Vence hoy');
});

test('23-hour and 25-hour daylight-saving days count as one day', () => {
  const spring = getSubscriptionDueInfo('2026-03-28T23:30:00Z', 'Europe/Madrid', Date.parse('2026-03-29T22:30:00Z'));
  assert.equal(spring?.label, 'Vencida hace 1 día');
  const autumn = getSubscriptionDueInfo('2026-10-25T23:15:00Z', 'Europe/Madrid', Date.parse('2026-10-24T22:15:00Z'));
  assert.equal(autumn?.label, 'Mañana');
});

test('missing/invalid dates do not become today, and invalid timezones use Madrid', () => {
  assert.equal(getSubscriptionDueInfo(undefined, 'Europe/Madrid', now), null);
  assert.equal(getSubscriptionDueInfo('invalid', 'Europe/Madrid', now), null);
  assert.equal(getSubscriptionDueInfo('2026-02-30', 'Europe/Madrid', now), null);
  assert.equal(getSubscriptionDueInfo('2026-10-08', 'invalid/timezone', now)?.label, 'Vence hoy');
});

const sub = (id: string, amount: number, nextRenewal: string, currency = 'EUR', contextId = 'personal', active = true) =>
  ({ id, amount, nextRenewal, currency, contextId, active } as Subscription);

test('payment totals separate overdue, today through day seven, and excluded renewals', () => {
  const summary = getSubscriptionPaymentSummary([
    sub('past', 9.99, '2026-10-07'), sub('today', 16.99, '2026-10-08'),
    sub('day7', 9.99, '2026-10-15'), sub('day8', 99, '2026-10-16'),
    sub('paused', 100, '2026-10-07', 'EUR', 'personal', false),
    sub('invalid', 100, 'invalid'), sub('usd', 20, '2026-10-10', 'USD'),
  ], { now });
  assert.deepEqual(summary.overdue.map(s => s.id), ['past']);
  assert.deepEqual(summary.upcoming.map(s => s.id), ['today', 'usd', 'day7']);
  assert.deepEqual(summary.overdueTotals, { EUR: 9.99 });
  assert.deepEqual(summary.upcomingTotals, { EUR: 26.98, USD: 20 });
});

test('space and currency filters apply to both lists and totals', () => {
  const rows = [sub('personal', 20, '2026-10-07'), sub('business', 30, '2026-10-07', 'EUR', 'business'),
    sub('usd', 40, '2026-10-07', 'USD', 'business'), sub('next', 50, '2026-10-09', 'EUR', 'business')];
  const summary = getSubscriptionPaymentSummary(rows, { contextId: 'business', currency: 'EUR', now });
  assert.deepEqual(summary.overdue.map(s => s.id), ['business']);
  assert.deepEqual(summary.overdueTotals, { EUR: 30 });
  assert.deepEqual(summary.upcomingTotals, { EUR: 50 });
});

test('overdue totals include every subscription beyond the five-row dashboard preview', () => {
  const rows = Array.from({ length: 9 }, (_, i) => sub(String(i), 0.1, '2026-10-01'));
  assert.deepEqual(getSubscriptionPaymentSummary(rows, { now }).overdueTotals, { EUR: 0.9 });
  assert.deepEqual(getSubscriptionPaymentSummary([], { now }).upcomingTotals, {});
});
