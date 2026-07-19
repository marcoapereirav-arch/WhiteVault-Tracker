import { SubAccount, Transaction, FinancialContext, GoalKind } from '../types';

// ---------------------------------------------------------------------------
// Metas y Objetivos
//
//   Meta     (SAVING)  — sube GUARDANDO. Se financia con transferencias; el
//                        dinero se queda dentro de la sub-cuenta.
//   Objetivo (PAYMENT) — sube PAGANDO. Se financia con gastos que salen hacia
//                        un tercero; la sub-cuenta no acumula saldo.
//
// Un Objetivo suma dos fuentes:
//   1. Gastos del libro mayor vinculados a la sub-cuenta (mueven saldo y cuentan
//      como gasto en métricas, porque el dinero sale de verdad).
//   2. entries[] — histórico migrado y abonos sin movimiento. Rellenan la barra
//      pero NUNCA tocan saldo ni métricas.
// Las transferencias no cuentan nunca en un Objetivo: mover dinero entre cuentas
// propias no salda nada.
// ---------------------------------------------------------------------------

export const goalKindOf = (sub: SubAccount): GoalKind | null => {
  if (!sub.target || sub.target <= 0) return null;
  return sub.goalKind ?? 'SAVING';
};

export const isPaymentGoal = (sub: SubAccount) => goalKindOf(sub) === 'PAYMENT';
export const isSavingGoal = (sub: SubAccount) => goalKindOf(sub) === 'SAVING';

/** Suma de entries (histórico + abonos). No tocan saldo ni métricas. */
export const entriesTotal = (sub: SubAccount): number =>
  (sub.entries || []).reduce((acc, e) => acc + (e.amount || 0), 0);

/** Gastos del libro mayor vinculados a esta sub-cuenta. Sólo EXPENSE. */
export const linkedPayments = (sub: SubAccount, transactions: Transaction[]): Transaction[] =>
  transactions.filter(
    (t) => t.subAccountId === sub.id && t.type === 'EXPENSE' && !t.deletedAt
  );

export const linkedTotal = (sub: SubAccount, transactions: Transaction[]): number =>
  linkedPayments(sub, transactions).reduce((acc, t) => acc + (t.amount || 0), 0);

/** Cuánto se lleva aportado. Meta = saldo dentro; Objetivo = pagos + abonos. */
export const goalPaid = (
  sub: SubAccount,
  transactions: Transaction[],
  currency: string
): number => {
  if (isPaymentGoal(sub)) return entriesTotal(sub) + linkedTotal(sub, transactions);
  return sub.balances?.[currency] ?? Object.values(sub.balances || {})[0] ?? 0;
};

export const goalRemaining = (
  sub: SubAccount,
  transactions: Transaction[],
  currency: string
): number => Math.max(0, (sub.target || 0) - goalPaid(sub, transactions, currency));

export const goalProgress = (
  sub: SubAccount,
  transactions: Transaction[],
  currency: string
): number => {
  const target = sub.target || 0;
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, (goalPaid(sub, transactions, currency) / target) * 100));
};

export const isGoalComplete = (
  sub: SubAccount,
  transactions: Transaction[],
  currency: string
): boolean => !!sub.completedAt || goalRemaining(sub, transactions, currency) <= 0.005;

/** Timeline unificada de un Objetivo: abonos + gastos vinculados, más reciente primero. */
export interface GoalMovement {
  id: string;
  date: string;
  amount: number;
  note: string;
  /** HISTORY/CREDIT no movieron saldo; LEDGER es un gasto real del tracker. */
  source: 'HISTORY' | 'CREDIT' | 'LEDGER';
  transactionId?: string;
}

export const goalMovements = (
  sub: SubAccount,
  transactions: Transaction[]
): GoalMovement[] => {
  const fromEntries: GoalMovement[] = (sub.entries || []).map((e) => ({
    id: e.id,
    date: e.date,
    amount: e.amount,
    note: e.note || (e.kind === 'CREDIT' ? 'Abono' : 'Pago'),
    source: e.kind,
  }));
  const fromLedger: GoalMovement[] = linkedPayments(sub, transactions).map((t) => ({
    id: `tx_${t.id}`,
    date: t.date,
    amount: t.amount,
    note: t.notes || 'Pago',
    source: 'LEDGER',
    transactionId: t.id,
  }));
  return [...fromEntries, ...fromLedger].sort((a, b) => b.date.localeCompare(a.date));
};

/** Todas las sub-cuentas con target, con su cuenta y espacio de origen. */
export interface GoalRef {
  sub: SubAccount;
  contextId: string;
  contextName: string;
  accountId: string;
  accountName: string;
}

export const collectGoals = (
  contexts: FinancialContext[],
  kind?: GoalKind
): GoalRef[] => {
  const out: GoalRef[] = [];
  for (const ctx of contexts) {
    for (const acc of ctx.accounts) {
      for (const sub of acc.subAccounts || []) {
        const k = goalKindOf(sub);
        if (!k) continue;
        if (kind && k !== kind) continue;
        out.push({
          sub,
          contextId: ctx.id,
          contextName: ctx.name,
          accountId: acc.id,
          accountName: acc.name,
        });
      }
    }
  }
  return out;
};

/** Cuánto falta por pagar en total. Sólo Objetivos activos. */
export interface GoalTotals {
  target: number;
  paid: number;
  remaining: number;
  count: number;
  completed: number;
}

export const paymentGoalTotals = (
  contexts: FinancialContext[],
  transactions: Transaction[],
  currency: string
): GoalTotals => {
  const all = collectGoals(contexts, 'PAYMENT');
  const totals: GoalTotals = { target: 0, paid: 0, remaining: 0, count: 0, completed: 0 };
  for (const { sub } of all) {
    if (isGoalComplete(sub, transactions, currency)) {
      totals.completed += 1;
      continue;
    }
    totals.count += 1;
    totals.target += sub.target || 0;
    totals.paid += goalPaid(sub, transactions, currency);
    totals.remaining += goalRemaining(sub, transactions, currency);
  }
  return totals;
};

/** Orden sugerido: prioridad 1..4 primero, sin prioridad al final; luego más avanzado. */
export const byPriority = (
  a: SubAccount,
  b: SubAccount,
  transactions: Transaction[],
  currency: string
): number => {
  const pa = a.priority ?? 99;
  const pb = b.priority ?? 99;
  if (pa !== pb) return pa - pb;
  return goalProgress(b, transactions, currency) - goalProgress(a, transactions, currency);
};
