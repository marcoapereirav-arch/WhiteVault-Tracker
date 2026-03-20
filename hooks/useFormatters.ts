import { useCallback, useMemo } from 'react';
import { FinancialContext } from '../types';

export function useFormatters(currencyCode: string, timezone: string, contexts: FinancialContext[]) {

  const formatCurrency = useCallback((amount: number) => {
    const symbol = currencyCode === 'USD' ? '$' : (currencyCode === 'EUR' ? '€' : '$');
    const formatted = new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return currencyCode === 'EUR' ? `${formatted} ${symbol}` : `${symbol} ${formatted}`;
  }, [currencyCode]);

  const formatDateTime = useCallback((isoString: string) => {
    try {
      return new Intl.DateTimeFormat('es-ES', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
        timeZone: timezone
      }).format(new Date(isoString));
    } catch {
      return isoString;
    }
  }, [timezone]);

  const getAccountName = useCallback((ctxId: string, accId: string) => {
    const ctx = contexts.find(c => c.id === ctxId);
    const acc = ctx?.accounts.find(a => a.id === accId);
    return acc ? acc.name : '';
  }, [contexts]);

  const getSubAccountName = useCallback((ctxId: string, accId: string, subId: string) => {
    const ctx = contexts.find(c => c.id === ctxId);
    const acc = ctx?.accounts.find(a => a.id === accId);
    const sub = acc?.subAccounts.find(s => s.id === subId);
    return sub ? sub.name : '';
  }, [contexts]);

  const timezones = useMemo(() => {
    try {
      const zones = (Intl as any).supportedValuesOf('timeZone');
      return zones.map((tz: string) => {
        try {
          const date = new Date();
          const str = date.toLocaleString('en-US', { timeZone: tz, timeZoneName: 'longOffset' });
          const offsetMatch = str.match(/GMT([+-]\d{2}:\d{2})/);
          const offset = offsetMatch ? `(UTC${offsetMatch[1]})` : '(UTC+00:00)';
          return { value: tz, label: `${offset} ${tz}` };
        } catch {
          return { value: tz, label: tz };
        }
      });
    } catch {
      return [
        { value: 'UTC', label: 'UTC' },
        { value: 'America/New_York', label: 'America/New_York' }
      ];
    }
  }, []);

  return { formatCurrency, formatDateTime, getAccountName, getSubAccountName, timezones };
}
