export type ContextType = 'PERSONAL' | 'BUSINESS';

export interface SubAccount {
  id: string;
  name: string;
  balances: Record<string, number>;
  target?: number; // If set, it's a goal
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
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
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
  frequency: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
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