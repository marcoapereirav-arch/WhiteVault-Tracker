export type ContextType = 'PERSONAL' | 'BUSINESS';

// Dos formas de tener un target en una sub-cuenta:
//   SAVING  ("Meta")     — sube GUARDANDO. El dinero entra vía transferencia y se
//                          queda dentro. Progreso = saldo de la sub-cuenta / target.
//   PAYMENT ("Objetivo") — sube PAGANDO. El dinero sale como gasto hacia un tercero.
//                          Progreso = (gastos vinculados + abonos) / target.
export type GoalKind = 'SAVING' | 'PAYMENT';

// Movimiento de un Objetivo que NO es una transacción del libro mayor: ni mueve
// saldo ni entra en métricas. Dos casos:
//   HISTORY — pagos anteriores al tracker (migrados). El dinero salió en su día.
//   CREDIT  — abono sin movimiento: la deuda baja sin que salga dinero, p.ej. una
//             compensación con alguien que a su vez te debe.
export interface GoalEntry {
  id: string;
  date: string;   // ISO
  amount: number;
  note?: string;
  kind: 'HISTORY' | 'CREDIT';
}

export interface SubAccount {
  id: string;
  name: string;
  balances: Record<string, number>;
  target?: number;        // Si está, la sub-cuenta tiene barra de progreso
  goalKind?: GoalKind;    // Sin valor + target => SAVING (comportamiento legacy)
  priority?: number | null;   // 1..4 — para ordenar cuál atacar antes
  entries?: GoalEntry[];      // Solo Objetivos
  completedAt?: string | null; // ISO cuando llegó al 100% — se archiva
  startDate: string;
}

export interface Account {
  id: string;
  name: string; // e.g., Income, Profit, Owner Pay, Needs, etc.
  type: 'INCOME' | 'EXPENSE' | 'HOLDING'; // Holding is for distribution accounts
  balances: Record<string, number>;
  percentageTarget?: number; // For Profit First logic (e.g., 5, 50, 15, 30)
  subAccounts: SubAccount[];
}

export interface FinancialContext {
  id: string;
  name: string; // "Personal", "Business 1", "Business 2"
  type: ContextType;
  accounts: Account[];
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  budget?: number;
  contextId: string;
  accountId?: string;    // New: Link to Account
  subAccountId?: string; // New: Link to SubAccount (Optional)
}

export interface Transaction {
  id: string;
  // ADJUSTMENT = reconciliation entry; corrects an account balance without
  // counting as income/expense in metrics or charts. amount is signed.
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'ADJUSTMENT';
  amount: number;
  date: string; // ISO string with Time
  notes?: string;
  comments?: string; // Optional extra notes/comments
  contextId: string;
  accountId: string;
  subAccountId?: string;
  categoryId?: string;
  currency: string;
  // For transfers
  toContextId?: string;
  toAccountId?: string;
  toSubAccountId?: string;
  // Soft delete — null/undefined = active, ISO timestamp = deleted at that time
  deletedAt?: string | null;
  // If this transaction was created via subscription quick-pay, links back
  // to the subscription so we can show payment history.
  linkedSubscriptionId?: string | null;
}

export interface TransactionAudit {
  id: string;
  transactionId: string;
  userId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE';
  dataBefore?: any;
  dataAfter?: any;
  performedAt: string;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  currency: string;
  // Legacy fixed frequency — kept for backward compatibility with old subs.
  // New flow uses intervalValue + intervalUnit (every N days/weeks/months/years).
  frequency: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  intervalValue?: number;                                  // e.g. 2 for "every 2 months"
  intervalUnit?: 'days' | 'weeks' | 'months' | 'years';
  nextRenewal: string;
  contextId: string;
  accountId: string;
  subAccountId?: string;
  categoryId?: string;
  paymentMethod: string;
  cardLastFour?: string;
  active: boolean;
  // Notification reminder (per-subscription, set in the subscription form)
  reminderValue?: number;
  reminderUnit?: 'minutes' | 'hours' | 'days';
  // Payment history (incremented every time a subscription is "paid" from a tx)
  paymentsCount?: number;
  lastPaidAt?: string; // ISO timestamp
  // Whether to send "overdue" notifications when nextRenewal has passed without payment
  notifyIfOverdue?: boolean; // default true
}

export interface AppState {
  contexts: FinancialContext[];
  transactions: Transaction[];
  subscriptions: Subscription[];
  categories: Category[];
  user: {
    name: string;
    email: string;
    currency: string;
    darkMode: boolean;
    language: 'ES' | 'EN';
    timezone: string; // New: Timezone support
    avatarUrl?: string;
  };
}