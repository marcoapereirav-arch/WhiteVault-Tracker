import { AppState } from '../types';

/**
 * Migrate legacy state that uses `balance: number` on accounts/subaccounts
 * to the new `balances: Record<string, number>` format.
 * Also adds `currency` field to transactions and subscriptions that lack it.
 */
export const migrateState = (state: AppState): AppState => {
  const baseCurrency = state.user.currency || 'USD';

  const contexts = state.contexts.map(ctx => ({
    ...ctx,
    accounts: ctx.accounts.map(acc => {
      // Migrate account balance
      const accAny = acc as any;
      let balances = acc.balances;
      if (!balances || typeof balances !== 'object' || Array.isArray(balances)) {
        const legacyBalance = typeof accAny.balance === 'number' ? accAny.balance : 0;
        balances = legacyBalance !== 0 ? { [baseCurrency]: legacyBalance } : {};
      }

      // Migrate sub-account balances
      const subAccounts = acc.subAccounts.map(sub => {
        const subAny = sub as any;
        let subBalances = sub.balances;
        if (!subBalances || typeof subBalances !== 'object' || Array.isArray(subBalances)) {
          const legacyBalance = typeof subAny.balance === 'number' ? subAny.balance : 0;
          subBalances = legacyBalance !== 0 ? { [baseCurrency]: legacyBalance } : {};
        }
        const { balance: _sb, ...subRest } = subAny;
        return { ...subRest, balances: subBalances };
      });

      // AUTO-LIMPIEZA de Objetivos: un Objetivo (PAYMENT) es un contador de deuda,
      // no un bucket de dinero, así que su saldo debe ser 0. Si arrastra un saldo
      // (p.ej. -100 de un pago hecho con la versión antigua), se mueve al saldo
      // PROPIO de la cuenta para que el total no cambie y el contador quede limpio.
      // Es idempotente: una vez a 0, no vuelve a tocar nada.
      const cleanBalances: Record<string, number> = { ...(balances as Record<string, number>) };
      const cleanedSubs = subAccounts.map(sub => {
        if ((sub as any).goalKind !== 'PAYMENT') return sub;
        const sb = (sub.balances || {}) as Record<string, number>;
        const hasMoney = Object.values(sb).some(v => Math.abs(v) > 0.0000001);
        if (!hasMoney) return sub;
        for (const [cur, v] of Object.entries(sb)) {
          if (v) cleanBalances[cur] = Number(((cleanBalances[cur] || 0) + v).toFixed(10));
        }
        return { ...sub, balances: {} };
      });

      const { balance: _ab, ...accRest } = accAny;
      return { ...accRest, balances: cleanBalances, subAccounts: cleanedSubs };
    })
  }));

  const transactions = state.transactions.map(t => ({
    ...t,
    currency: (t as any).currency || baseCurrency
  }));

  const subscriptions = state.subscriptions.map(s => ({
    ...s,
    currency: (s as any).currency || baseCurrency
  }));

  return { ...state, contexts, transactions, subscriptions };
};
