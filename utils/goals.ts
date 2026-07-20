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

// ---------------------------------------------------------------------------
// ÍNDICE DE PAGOS — rendimiento
//
// Sin esto, cada llamada a goalPaid/goalRemaining/goalProgress recorría TODAS
// las transacciones. Como la lista de objetivos se ordena por progreso, y un
// sort hace ~n·log(n) comparaciones llamando a goalProgress dos veces cada una,
// salían ~200.000 recorridos de las 495 transacciones POR RENDER. Medido en un
// móvil: 596 ms de hilo principal bloqueado, con lo que los toques se quedaban
// en cola y parecía que la app no los leía (la animación de pulsado sí salía,
// porque es CSS y no necesita JavaScript).
//
// Se construye UNA vez por render y las consultas pasan a ser instantáneas.
// ---------------------------------------------------------------------------
export type PaymentIndex = Map<string, number>;

export const buildPaymentIndex = (transactions: Transaction[]): PaymentIndex => {
  const index: PaymentIndex = new Map();
  for (const t of transactions) {
    if (t.type !== 'EXPENSE' || t.deletedAt || !t.subAccountId) continue;
    index.set(t.subAccountId, (index.get(t.subAccountId) || 0) + (t.amount || 0));
  }
  return index;
};

export const linkedTotal = (
  sub: SubAccount,
  transactions: Transaction[],
  index?: PaymentIndex
): number => {
  if (index) return index.get(sub.id) || 0;
  return linkedPayments(sub, transactions).reduce((acc, t) => acc + (t.amount || 0), 0);
};

/** Cuánto se lleva aportado. Meta = saldo dentro; Objetivo = pagos + abonos. */
export const goalPaid = (
  sub: SubAccount,
  transactions: Transaction[],
  currency: string,
  index?: PaymentIndex
): number => {
  if (isPaymentGoal(sub)) return entriesTotal(sub) + linkedTotal(sub, transactions, index);
  return sub.balances?.[currency] ?? Object.values(sub.balances || {})[0] ?? 0;
};

export const goalRemaining = (
  sub: SubAccount,
  transactions: Transaction[],
  currency: string,
  index?: PaymentIndex
): number => Math.max(0, (sub.target || 0) - goalPaid(sub, transactions, currency, index));

export const goalProgress = (
  sub: SubAccount,
  transactions: Transaction[],
  currency: string,
  index?: PaymentIndex
): number => {
  const target = sub.target || 0;
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, (goalPaid(sub, transactions, currency, index) / target) * 100));
};

export const isGoalComplete = (
  sub: SubAccount,
  transactions: Transaction[],
  currency: string,
  index?: PaymentIndex
): boolean => !!sub.completedAt || goalRemaining(sub, transactions, currency, index) <= 0.005;

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
  const index = buildPaymentIndex(transactions);
  const totals: GoalTotals = { target: 0, paid: 0, remaining: 0, count: 0, completed: 0 };
  for (const { sub } of all) {
    if (isGoalComplete(sub, transactions, currency, index)) {
      totals.completed += 1;
      continue;
    }
    totals.count += 1;
    totals.target += sub.target || 0;
    totals.paid += goalPaid(sub, transactions, currency, index);
    totals.remaining += goalRemaining(sub, transactions, currency, index);
  }
  return totals;
};

/**
 * Ordena por prioridad (1..4 primero, sin prioridad al final) y luego por
 * progreso descendente.
 *
 * Calcula el progreso UNA vez por elemento antes de ordenar. Antes era un
 * comparador que llamaba a goalProgress en cada comparación: con 44 objetivos
 * eso son ~400 llamadas, cada una recorriendo las 495 transacciones. Era la
 * causa principal de los 596 ms de bloqueo.
 */
export const sortGoals = <T extends { sub: SubAccount } | SubAccount>(
  items: T[],
  transactions: Transaction[],
  currency: string,
  index?: PaymentIndex
): T[] => {
  const idx = index || buildPaymentIndex(transactions);
  const sub = (x: T): SubAccount => ('sub' in (x as any) ? (x as any).sub : x) as SubAccount;
  return items
    .map((x) => ({ x, p: sub(x).priority ?? 99, prog: goalProgress(sub(x), transactions, currency, idx) }))
    .sort((a, b) => (a.p !== b.p ? a.p - b.p : b.prog - a.prog))
    .map((d) => d.x);
};
