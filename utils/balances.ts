import { FinancialContext } from '../types';

/** Get the balance for a specific currency, defaults to 0 */
export const getBalance = (balances: Record<string, number>, currency: string): number => {
  return balances[currency] || 0;
};

/** Returns a new balances record with the amount added to the given currency */
export const addToBalance = (balances: Record<string, number>, currency: string, amount: number): Record<string, number> => {
  return { ...balances, [currency]: (balances[currency] || 0) + amount };
};

/** Returns a new balances record with the amount subtracted from the given currency */
export const subtractFromBalance = (balances: Record<string, number>, currency: string, amount: number): Record<string, number> => {
  return { ...balances, [currency]: (balances[currency] || 0) - amount };
};

/** Returns an array of currency codes that have a non-zero balance */
export const getActiveCurrencies = (balances: Record<string, number>): string[] => {
  return Object.keys(balances).filter(c => balances[c] !== 0);
};

/** Aggregate all account and sub-account balances across contexts, grouped by currency */
export const getTotalsByCurrency = (contexts: FinancialContext[]): Record<string, number> => {
  const totals: Record<string, number> = {};
  for (const ctx of contexts) {
    for (const acc of ctx.accounts) {
      for (const [cur, amt] of Object.entries(acc.balances)) {
        totals[cur] = (totals[cur] || 0) + amt;
      }
      for (const sub of acc.subAccounts) {
        for (const [cur, amt] of Object.entries(sub.balances)) {
          totals[cur] = (totals[cur] || 0) + amt;
        }
      }
    }
  }
  return totals;
};

/** Convert a balances record into an array of { currency, amount } entries for display */
export const balanceEntries = (balances: Record<string, number>): { currency: string; amount: number }[] => {
  return Object.entries(balances)
    .filter(([, amount]) => amount !== 0)
    .map(([currency, amount]) => ({ currency, amount }));
};
