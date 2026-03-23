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
  cardLastFour?: string; // Last 4 digits of payment card
  active: boolean;
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