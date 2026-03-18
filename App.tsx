import React, { useState, useMemo, useEffect } from 'react';
import { AppState, FinancialContext, Transaction, Subscription, Category, Account } from './types';
import { INITIAL_STATE } from './constants';
import { Icons } from './components/Icons';
import { CashFlowChart, ExpenseBreakdown, IncomeVsExpenseChart, FinancialCalendar } from './components/Charts';
import { AccountsView } from './components/AccountsView';
import { TransactionForm, TransferForm, CategoryForm, SubAccountForm, SubscriptionForm, NewContextForm, Input as DateInput } from './components/ActionModals';
import { supabase } from './lib/supabase';
import { Auth } from './components/Auth';
import { Onboarding } from './components/Onboarding';

type View = 'DASHBOARD' | 'ACCOUNTS' | 'TRANSACTIONS' | 'SUBSCRIPTIONS' | 'CATEGORIES' | 'SETTINGS';

// Strictly Spanish Dictionary
const DICTIONARY = {
    dashboard: 'Panel Principal', accounts: 'Bóvedas y Metas', transactions: 'Libro Mayor', subscriptions: 'Suscripciones', categories: 'Categorías', settings: 'Configuración',
    netWorth: 'Patrimonio Total', quickActions: 'Acciones Rápidas', recentActivity: 'Actividad Reciente', upcomingRenewals: 'Próximas Renovaciones',
    expense: 'Gasto', income: 'Ingreso', transfer: 'Transferencia', subscription: 'Suscrip.', category: 'Categoría', subAcc: 'Sub-Cta',
    all: 'Todos', active: 'Activo', paused: 'Pausada', nextBilling: 'Prox. Cobro', businessExp: 'Expansión de Negocio',
    initializeBiz: 'Iniciar Nueva Entidad', profile: 'Identidad de Perfil', email: 'Correo Electrónico',
    totalBalance: 'Balance Total', monthlyIn: 'Ingreso Mensual', monthlyOut: 'Gasto Mensual', activeSubs: 'Suscripciones Activas'
};

const WHITEVAULT_ISOTYPE = "https://storage.googleapis.com/msgsndr/QDrKqO1suwk5VOPoTKJE/media/693880a4fb91d00b324304d7.png";

// Internal Component for Quick View
const AccountsQuickView = ({ contexts, filterId, currency }: { contexts: FinancialContext[], filterId: string, currency: string }) => {
    const [isOpen, setIsOpen] = useState(false);

    const format = (amount: number) => new Intl.NumberFormat('es-ES', { 
        style: 'currency', currency: currency, minimumFractionDigits: 2, maximumFractionDigits: 2 
    }).format(amount);

    const filteredContexts = filterId === 'ALL' ? contexts : contexts.filter(c => c.id === filterId);

    return (
        <div className="bg-white border border-black/5 shadow-sm overflow-hidden mb-6">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 hover:bg-stone transition-colors group"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-onyx text-white rounded-sm">
                        <Icons.Wallet className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                        <span className="block text-[10px] font-bold uppercase tracking-widest text-graphite group-hover:text-onyx transition-colors">Vista Rápida</span>
                        <span className="block text-sm font-display font-bold text-onyx">Desglose de Saldos</span>
                    </div>
                </div>
                <Icons.ChevronDown className={`w-4 h-4 text-graphite transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isOpen && (
                <div className="border-t border-black/5 bg-stone/30 p-4 animate-in slide-in-from-top-2 fade-in duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredContexts.map(ctx => (
                            <div key={ctx.id} className="bg-white border border-black/5 p-4 rounded-sm">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-alloy mb-3 border-b border-black/5 pb-1">{ctx.name}</h4>
                                <div className="space-y-3">
                                    {ctx.accounts.map(acc => (
                                        <div key={acc.id}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs font-bold text-onyx">{acc.name}</span>
                                                <span className="text-xs font-mono font-bold text-onyx">{format(acc.balance)}</span>
                                            </div>
                                            {/* Sub Accounts */}
                                            {acc.subAccounts.length > 0 && (
                                                <div className="pl-2 border-l-2 border-black/5 ml-1 space-y-1 mt-1">
                                                    {acc.subAccounts.map(sub => (
                                                        <div key={sub.id} className="flex justify-between items-center">
                                                            <span className="text-[10px] text-graphite">{sub.name}</span>
                                                            <span className="text-[10px] font-mono text-graphite">{format(sub.balance)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

function App() {
  const [session, setSession] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [currentView, setCurrentView] = useState<View>('DASHBOARD');
  const [contextFilter, setContextFilter] = useState<string>('ALL');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER'>('ALL');
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PAUSED'>('ALL');
  
  // Sidebar States
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopSidebarExpanded, setIsDesktopSidebarExpanded] = useState(false);

  const [tzSearch, setTzSearch] = useState('');
  
  // Dashboard Date Filter State
  const [dashboardDateRange, setDashboardDateRange] = useState<{ start: string, end: string, preset: string }>({
      start: new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1)).toISOString().split('T')[0], // Start of month
      end: new Date().toISOString().split('T')[0], // Today
      preset: 'THIS_MONTH'
  });
  
  // Filter visibility toggle
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Quick Actions Menu State
  const [isActionsOpen, setIsActionsOpen] = useState(false);

  // Undo & Feedback State
  const [lastDistribution, setLastDistribution] = useState<{ txIds: string[], contextId: string, amounts: {[id:string]:number} } | null>(null);
  const [recentDistributions, setRecentDistributions] = useState<{ [accountId: string]: number }>({});

  // Modal States
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | undefined>(undefined);
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>(undefined);
  
  // Name Edit State
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const nameInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchData(session.user.id);
      } else {
        setIsLoaded(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchData(session.user.id);
      } else {
        setState(INITIAL_STATE);
        setIsLoaded(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async (userId: string) => {
    try {
      const [profileRes, txRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('transactions').select('*').eq('user_id', userId)
      ]);

      if (profileRes.data) {
        const p = profileRes.data;
        const transactions = (txRes.data || []).map((t: any) => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          date: t.date,
          notes: t.notes,
          contextId: t.context_id,
          accountId: t.account_id,
          subAccountId: t.sub_account_id,
          categoryId: t.category_id,
          toContextId: t.to_context_id,
          toAccountId: t.to_account_id,
          toSubAccountId: t.to_sub_account_id
        }));

        setState({
          user: {
            name: p.name || INITIAL_STATE.user.name,
            email: p.email || INITIAL_STATE.user.email,
            currency: p.currency || INITIAL_STATE.user.currency,
            darkMode: p.dark_mode || INITIAL_STATE.user.darkMode,
            language: p.language || INITIAL_STATE.user.language,
            timezone: p.timezone || INITIAL_STATE.user.timezone,
            avatarUrl: p.avatar_url,
          },
          contexts: p.contexts || INITIAL_STATE.contexts,
          subscriptions: p.subscriptions || INITIAL_STATE.subscriptions,
          categories: p.categories || INITIAL_STATE.categories,
          transactions
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    if (!isLoaded || !session) return;
    
    const syncToSupabase = async () => {
      const uid = session.user.id;
      
      await supabase.from('profiles').upsert({
        id: uid,
        name: state.user.name,
        email: state.user.email,
        currency: state.user.currency,
        dark_mode: state.user.darkMode,
        language: state.user.language,
        timezone: state.user.timezone,
        avatar_url: state.user.avatarUrl,
        contexts: state.contexts,
        subscriptions: state.subscriptions,
        categories: state.categories,
        updated_at: new Date().toISOString()
      });

      const { data: existingTxs } = await supabase.from('transactions').select('id').eq('user_id', uid);
      const existingIds = new Set(existingTxs?.map(t => t.id) || []);
      const currentIds = new Set(state.transactions.map(t => t.id));
      
      const toDelete = [...existingIds].filter(id => !currentIds.has(id));
      if (toDelete.length > 0) {
        await supabase.from('transactions').delete().in('id', toDelete);
      }

      const toUpsert = state.transactions.map(t => ({
        id: t.id,
        user_id: uid,
        type: t.type,
        amount: t.amount,
        date: t.date,
        notes: t.notes,
        context_id: t.contextId,
        account_id: t.accountId,
        sub_account_id: t.subAccountId,
        category_id: t.categoryId,
        to_context_id: t.toContextId,
        to_account_id: t.toAccountId,
        to_sub_account_id: t.toSubAccountId
      }));

      if (toUpsert.length > 0) {
        await supabase.from('transactions').upsert(toUpsert);
      }
    };

    const timeout = setTimeout(syncToSupabase, 1000);
    return () => clearTimeout(timeout);
  }, [state, isLoaded, session]);

  const t = DICTIONARY;
  const currencyCode = state.user.currency;

  // Retrieve all supported timezones with formatting
  const timezones = useMemo(() => {
    try {
        const zones = (Intl as any).supportedValuesOf('timeZone');
        return zones.map((tz: string) => {
            try {
                // Get offset
                const date = new Date();
                const str = date.toLocaleString('en-US', { timeZone: tz, timeZoneName: 'longOffset' });
                const offsetMatch = str.match(/GMT([+-]\d{2}:\d{2})/);
                const offset = offsetMatch ? `(UTC${offsetMatch[1]})` : '(UTC+00:00)';
                return { value: tz, label: `${offset} ${tz}` };
            } catch (e) {
                return { value: tz, label: tz };
            }
        });
    } catch (e) {
        return [
            { value: 'UTC', label: 'UTC' }, 
            { value: 'America/New_York', label: 'America/New_York' }
        ]; 
    }
  }, []);

  const filteredTimezones = useMemo(() => {
      return timezones.filter((t: any) => t.label.toLowerCase().includes(tzSearch.toLowerCase()));
  }, [timezones, tzSearch]);

  // --- Helpers ---
  
  const formatCurrency = (amount: number) => {
      const symbol = currencyCode === 'USD' ? '$' : (currencyCode === 'EUR' ? '€' : '$');
      const formatted = new Intl.NumberFormat('es-ES', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
      }).format(amount);
      return currencyCode === 'EUR' ? `${formatted} ${symbol}` : `${symbol} ${formatted}`;
  };

  const formatDateTime = (isoString: string) => {
      try {
          return new Intl.DateTimeFormat('es-ES', {
              year: 'numeric', month: '2-digit', day: '2-digit',
              hour: '2-digit', minute: '2-digit',
              timeZone: state.user.timezone
          }).format(new Date(isoString));
      } catch (e) {
          return isoString;
      }
  };

  const getAccountName = (ctxId: string, accId: string) => {
      const ctx = state.contexts.find(c => c.id === ctxId);
      const acc = ctx?.accounts.find(a => a.id === accId);
      return acc ? acc.name : '';
  };

  const getSubAccountName = (ctxId: string, accId: string, subId: string) => {
      const ctx = state.contexts.find(c => c.id === ctxId);
      const acc = ctx?.accounts.find(a => a.id === accId);
      const sub = acc?.subAccounts.find(s => s.id === subId);
      return sub ? sub.name : '';
  };

  // --- Date Filter Logic ---
  const applyDatePreset = (preset: string) => {
      const today = new Date();
      let start = new Date(today);
      let end = new Date(today);

      switch (preset) {
          case 'TODAY':
              break; // Start and End are today
          case 'LAST_7':
              start.setDate(today.getDate() - 6);
              break;
          case 'LAST_15':
              start.setDate(today.getDate() - 14);
              break;
          case 'LAST_30':
              start.setDate(today.getDate() - 29);
              break;
          case 'THIS_WEEK':
              // Assuming week starts on Monday
              const day = today.getDay();
              const diff = today.getDate() - day + (day === 0 ? -6 : 1);
              start.setDate(diff);
              // End is today
              break;
          case 'THIS_MONTH':
              start = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1));
              break;
          case 'THIS_YEAR':
              start = new Date(Date.UTC(today.getFullYear(), 0, 1));
              break;
          default:
              return;
      }

      setDashboardDateRange({
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
          preset
      });
      setIsFilterOpen(false); // Close filter after selection
  };

  // --- Calculations for Dashboard ---
  const filteredTransactions = state.transactions.filter(t => 
      contextFilter === 'ALL' || t.contextId === contextFilter
  );

  // Filter transactions by Date Range for Charts
  const dashboardFilteredTransactions = useMemo(() => {
      const start = new Date(dashboardDateRange.start);
      start.setHours(0,0,0,0);
      const end = new Date(dashboardDateRange.end);
      end.setHours(23,59,59,999);

      return filteredTransactions.filter(t => {
          const tDate = new Date(t.date);
          return tDate >= start && tDate <= end;
      });
  }, [filteredTransactions, dashboardDateRange]);
  
  // Dashboard Chart Totals (recalculated based on date filter)
  const dashboardIncome = dashboardFilteredTransactions.filter(t => t.type === 'INCOME').reduce((s,t) => s + t.amount, 0);
  const dashboardExpense = dashboardFilteredTransactions.filter(t => t.type === 'EXPENSE').reduce((s,t) => s + t.amount, 0);

  const filteredContexts = state.contexts.filter(c => contextFilter === 'ALL' || c.id === contextFilter);
  
  const totalBalance = filteredContexts.reduce((acc, ctx) => {
        return acc + ctx.accounts.reduce((a, acc) => a + acc.balance + acc.subAccounts.reduce((s, sub) => s + sub.balance, 0), 0);
    }, 0);

  const monthlyIncome = filteredTransactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
  const monthlyExpense = filteredTransactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
  const activeSubsCount = state.subscriptions.filter(s => s.active && (contextFilter === 'ALL' || s.contextId === contextFilter)).length;

  // --- Actions ---

  // Profit First Logic with Undo Support
  const distributeIncome = (contextId: string, specificAmount?: number) => {
      const ctx = state.contexts.find(c => c.id === contextId);
      if (!ctx) return;

      const incomeAcc = ctx.accounts.find(a => a.type === 'INCOME');
      if (!incomeAcc) return;

      const amountToDistribute = specificAmount !== undefined ? specificAmount : incomeAcc.balance;
      if (amountToDistribute <= 0) return; 

      const newTransactions: Transaction[] = [];
      const distributionAmounts: { [accId: string]: number } = {};
      const txIds: string[] = [];
      const date = new Date().toISOString();

      const targets = ctx.accounts.filter(a => a.percentageTarget !== undefined && a.percentageTarget > 0 && a.id !== incomeAcc.id);
      
      let distributedTotal = 0;
      
      const newContexts = state.contexts.map(c => {
          if (c.id !== contextId) return c;
          
          const updatedAccounts = c.accounts.map(acc => {
              const target = targets.find(t => t.id === acc.id);
              if (target && target.percentageTarget) {
                  const splitAmount = amountToDistribute * (target.percentageTarget / 100);
                  distributedTotal += splitAmount;
                  
                  const txId = `tr_dist_${Date.now()}_${acc.id}`;
                  txIds.push(txId);
                  distributionAmounts[acc.id] = splitAmount;

                  newTransactions.push({
                      id: txId,
                      type: 'TRANSFER',
                      amount: splitAmount,
                      date,
                      notes: `Distribución Automática (${target.percentageTarget}%)`,
                      contextId: contextId,
                      accountId: incomeAcc.id,
                      toContextId: contextId,
                      toAccountId: acc.id
                  });
                  
                  return { ...acc, balance: acc.balance + splitAmount };
              }
              return acc;
          });
          
          return { ...c, accounts: updatedAccounts };
      });

      const finalContexts = newContexts.map(c => {
          if (c.id !== contextId) return c;
          return {
              ...c,
              accounts: c.accounts.map(a => 
                  a.id === incomeAcc.id ? { ...a, balance: a.balance - distributedTotal } : a
              )
          };
      });

      setState(prev => ({
          ...prev,
          contexts: finalContexts,
          transactions: [...newTransactions, ...prev.transactions]
      }));

      // Store undo data
      setLastDistribution({ txIds, contextId, amounts: distributionAmounts });
      
      // Visual feedback
      setRecentDistributions(distributionAmounts);
      setTimeout(() => setRecentDistributions({}), 5000); // Clear green text after 5s
  };

  const undoLastDistribution = () => {
      if (!lastDistribution) return;

      const { txIds, contextId, amounts } = lastDistribution;
      const ctx = state.contexts.find(c => c.id === contextId);
      if (!ctx) return;
      const incomeAcc = ctx.accounts.find(a => a.type === 'INCOME');
      if (!incomeAcc) return;

      let totalRestored = 0;

      // Revert balances
      const newContexts = state.contexts.map(c => {
          if (c.id !== contextId) return c;
          
          const updatedAccounts = c.accounts.map(acc => {
              if (amounts[acc.id]) {
                  totalRestored += amounts[acc.id];
                  return { ...acc, balance: acc.balance - amounts[acc.id] };
              }
              return acc;
          });
          
          // Add back to income
          return {
              ...c,
              accounts: updatedAccounts.map(a => 
                  a.id === incomeAcc.id ? { ...a, balance: a.balance + totalRestored } : a
              )
          };
      });

      // Remove transactions
      const newTransactions = state.transactions.filter(t => !txIds.includes(t.id));

      setState(prev => ({
          ...prev,
          contexts: newContexts,
          transactions: newTransactions
      }));

      setLastDistribution(null);
      setRecentDistributions({});
  };

  const handleUpdateAccountPercentage = (contextId: string, accountId: string, percentage: number) => {
      const newContexts = state.contexts.map(c => {
          if (c.id !== contextId) return c;
          return {
              ...c,
              accounts: c.accounts.map(a => 
                  a.id === accountId ? { ...a, percentageTarget: percentage } : a
              )
          };
      });
      setState({ ...state, contexts: newContexts });
  }

  const handleTransaction = (data: any) => {
    const newTx: Transaction = { id: `tx_${Date.now()}`, ...data };
    const newContexts = [...state.contexts];
    const ctxIdx = newContexts.findIndex(c => c.id === data.contextId);
    
    if (ctxIdx > -1) {
        const accIdx = newContexts[ctxIdx].accounts.findIndex(a => a.id === data.accountId);
        if (accIdx > -1) {
            const acc = newContexts[ctxIdx].accounts[accIdx];
            if (data.subAccountId) {
                const subIdx = acc.subAccounts.findIndex(s => s.id === data.subAccountId);
                if (subIdx > -1) acc.subAccounts[subIdx].balance += (data.type === 'INCOME' ? data.amount : -data.amount);
            } else {
                acc.balance += (data.type === 'INCOME' ? data.amount : -data.amount);
            }
        }
    }

    setState(prev => ({
        ...prev,
        transactions: [newTx, ...prev.transactions],
        contexts: newContexts
    }));

    if (data.type === 'INCOME' && data.distribute) {
        setTimeout(() => distributeIncome(data.contextId, data.amount), 50);
    }
  };

  const handleTransfer = (data: any) => {
      const newContexts = [...state.contexts];
      const updateBalance = (ctxId: string, accId: string, subId: string | undefined, amount: number) => {
          const c = newContexts.find(c => c.id === ctxId);
          const a = c?.accounts.find(a => a.id === accId);
          if (a) {
              if (subId) {
                  const s = a.subAccounts.find(s => s.id === subId);
                  if (s) s.balance += amount;
              } else {
                  a.balance += amount;
              }
          }
      };
      updateBalance(data.contextId, data.accountId, data.subAccountId, -data.amount);
      updateBalance(data.toContextId, data.toAccountId, data.toSubAccountId, data.amount);
      const newTx: Transaction = { id: `tr_${Date.now()}`, ...data };
      setState({ ...state, contexts: newContexts, transactions: [newTx, ...state.transactions] });
  };

  const handleNewSubAccount = (data: any) => {
      const newContexts = [...state.contexts];
      const ctx = newContexts.find(c => c.id === data.contextId);
      const acc = ctx?.accounts.find(a => a.id === data.accountId);
      if (acc) {
          acc.subAccounts.push({ id: `sub_${Date.now()}`, name: data.name, balance: 0, target: data.target, startDate: data.startDate });
          setState({ ...state, contexts: newContexts });
      }
  };

  const handleNewCategory = (data: any) => {
      setState({ ...state, categories: [...state.categories, { id: `c_${Date.now()}`, ...data, icon: 'Tags' }]});
  };

  const handleUpdateCategory = (data: any) => {
      const updatedCats = state.categories.map(c => c.id === data.id ? { ...c, ...data } : c);
      setState({ ...state, categories: updatedCats });
  };

  const handleNewSubscription = (data: any) => {
      setState({ ...state, subscriptions: [...state.subscriptions, { id: `s_${Date.now()}`, ...data }]});
  };

  const handleUpdateSubscription = (data: any) => {
      const updatedSubs = state.subscriptions.map(s => s.id === data.id ? { ...s, ...data } : s);
      setState({ ...state, subscriptions: updatedSubs });
  };

  const handleNewBusiness = (data: any) => {
    const newContext: FinancialContext = {
      id: `ctx_biz_${Date.now()}`,
      name: data.name,
      type: 'BUSINESS',
      accounts: [
        { id: `biz_${Date.now()}_inc`, name: 'Income', type: 'INCOME', balance: 0, subAccounts: [] },
        { id: `biz_${Date.now()}_prof`, name: 'Profit', type: 'HOLDING', balance: 0, percentageTarget: 5, subAccounts: [] },
        { id: `biz_${Date.now()}_ownr`, name: 'Owner Pay', type: 'HOLDING', balance: 0, percentageTarget: 50, subAccounts: [] },
        { id: `biz_${Date.now()}_tax`, name: 'Tax', type: 'HOLDING', balance: 0, percentageTarget: 15, subAccounts: [] },
        { id: `biz_${Date.now()}_opex`, name: 'Opex', type: 'EXPENSE', balance: 0, percentageTarget: 30, subAccounts: [] },
      ]
    };
    setState({ ...state, contexts: [...state.contexts, newContext] });
  };

  // --- Navigation Items ---
  const navItems = [
      { id: 'DASHBOARD', icon: Icons.Dashboard, label: t.dashboard },
      { id: 'ACCOUNTS', icon: Icons.Accounts, label: t.accounts },
      { id: 'TRANSACTIONS', icon: Icons.Transfer, label: t.transactions },
      { id: 'CATEGORIES', icon: Icons.Category, label: t.categories },
      { id: 'SUBSCRIPTIONS', icon: Icons.Subscription, label: t.subscriptions },
      { id: 'SETTINGS', icon: Icons.Settings, label: t.settings },
  ];

  // Helper for preset labels
  const getPresetLabel = (id: string) => {
      const map: {[key:string]: string} = {
          'TODAY': 'Hoy',
          'LAST_7': 'Últimos 7 días',
          'LAST_15': 'Últimos 15 días',
          'LAST_30': 'Últimos 30 días',
          'THIS_WEEK': 'Esta semana',
          'THIS_MONTH': 'Este mes',
          'THIS_YEAR': 'Este año',
          'CUSTOM': 'Personalizado'
      };
      return map[id] || id;
  };
  
  // Quick Actions List
  const quickActions = [
      { label: t.expense, icon: Icons.Expense, action: () => setActiveModal('EXPENSE') },
      { label: t.income, icon: Icons.Income, action: () => setActiveModal('INCOME') },
      { label: t.transfer, icon: Icons.Transfer, action: () => setActiveModal('TRANSFER') },
      { label: t.subscription, icon: Icons.Subscription, action: () => setActiveModal('SUBSCRIPTION') },
      { label: t.category, icon: Icons.Category, action: () => setActiveModal('CATEGORY') },
      { label: t.subAcc, icon: Icons.Accounts, action: () => setActiveModal('SUB_ACCOUNT') },
  ];

  // --- Navigation Toggle Logic ---
  const toggleNavigation = () => {
      if (window.innerWidth < 768) {
          setIsMobileMenuOpen(!isMobileMenuOpen);
      } else {
          setIsDesktopSidebarExpanded(!isDesktopSidebarExpanded);
      }
  };

  const [showDemoOnboarding, setShowDemoOnboarding] = useState(false);

  // --- Render ---

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-stone flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <Icons.Wallet className="w-12 h-12 text-alloy mb-4" />
          <p className="text-graphite font-bold tracking-widest uppercase text-sm">Cargando Bóveda...</p>
        </div>
      </div>
    );
  }

  if (showDemoOnboarding) {
    return (
        <Onboarding 
            onComplete={(name, avatarUrl, personalContext, addBusiness, businessContext) => {
                setShowDemoOnboarding(false);
            }}
        />
    );
  }

  if (!session) {
    return <Auth onLogin={() => {}} onDemoOnboarding={() => setShowDemoOnboarding(true)} />;
  }

  if (state.contexts.length === 0) {
    return (
        <Onboarding 
            onComplete={(name, avatarUrl, personalContext, addBusiness, businessContext) => {
                const newContexts = [personalContext];
                if (addBusiness && businessContext) {
                    newContexts.push(businessContext);
                }
                setState(s => ({
                    ...s,
                    user: { ...s.user, name, avatarUrl },
                    contexts: newContexts
                }));
            }}
        />
    );
  }

  return (
    <div className="flex h-screen overflow-hidden font-sans">
      
      {/* Desktop Sidebar (Collapsible) */}
      <aside className={`${isDesktopSidebarExpanded ? 'w-72' : 'w-20'} bg-white border-r border-black/5 hidden md:flex flex-col relative z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all duration-300`}>
          <div className="h-20 border-b border-black/5 flex items-center justify-center shrink-0">
              {isDesktopSidebarExpanded ? (
                  <h1 className="text-3xl font-display font-bold text-onyx tracking-tight">WhiteVault<span className="text-lg align-top text-alloy">™</span></h1>
              ) : (
                  <h1 className="text-3xl font-display font-bold text-onyx tracking-tight">W<span className="text-lg align-top text-alloy">™</span></h1>
              )}
          </div>
          
          <nav className="flex-1 px-4 py-8 space-y-1 overflow-y-auto">
              {navItems.map((item) => (
                  <button 
                      key={item.id}
                      onClick={() => setCurrentView(item.id as View)}
                      className={`w-full flex items-center ${isDesktopSidebarExpanded ? 'justify-start space-x-4 px-4' : 'justify-center'} py-4 border-l-2 transition-all group ${currentView === item.id ? 'border-alloy bg-stone text-onyx' : 'border-transparent text-graphite hover:bg-stone hover:text-onyx'}`}
                      title={!isDesktopSidebarExpanded ? item.label : undefined}
                  >
                      <item.icon className={`w-5 h-5 ${currentView === item.id ? 'text-alloy' : 'text-gray-400 group-hover:text-onyx'}`} />
                      {isDesktopSidebarExpanded && <span className="font-display font-medium tracking-wide text-sm">{item.label}</span>}
                  </button>
              ))}
          </nav>

          <div className={`p-6 border-t border-black/5 bg-stone flex ${isDesktopSidebarExpanded ? 'items-center gap-4' : 'flex-col items-center justify-center'} shrink-0`}>
              <div className="w-10 h-10 bg-onyx flex items-center justify-center text-white font-display font-bold text-lg overflow-hidden rounded-full shrink-0">
                  {state.user.avatarUrl ? (
                      <img src={state.user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                      state.user.name.charAt(0)
                  )}
              </div>
              {isDesktopSidebarExpanded && (
                  <div className="overflow-hidden">
                      {isEditingName ? (
                          <input
                              ref={nameInputRef}
                              type="text"
                              value={tempName}
                              onChange={(e) => setTempName(e.target.value)}
                              onBlur={() => {
                                  setIsEditingName(false);
                                  if (tempName.trim() && tempName !== state.user.name) {
                                      setState(s => ({ ...s, user: { ...s.user, name: tempName.trim() } }));
                                  }
                              }}
                              onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                      setIsEditingName(false);
                                      if (tempName.trim() && tempName !== state.user.name) {
                                          setState(s => ({ ...s, user: { ...s.user, name: tempName.trim() } }));
                                      }
                                  } else if (e.key === 'Escape') {
                                      setIsEditingName(false);
                                  }
                              }}
                              className="text-sm font-bold text-onyx font-display bg-transparent border-b border-alloy outline-none w-full"
                              autoFocus
                          />
                      ) : (
                          <p 
                              className="text-sm font-bold text-onyx font-display cursor-pointer hover:text-alloy transition-colors truncate"
                              onClick={() => {
                                  setTempName(state.user.name);
                                  setIsEditingName(true);
                              }}
                          >
                              {state.user.name}
                          </p>
                      )}
                  </div>
              )}
          </div>
      </aside>

      {/* Mobile Sidebar (Drawer) */}
      {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-onyx/50 backdrop-blur-sm md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
              <div className="w-3/4 h-full bg-white shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-black/5 flex justify-between items-center bg-stone">
                     <h1 className="text-2xl font-display font-bold text-onyx">WhiteVault<span className="text-xs text-alloy">™</span></h1>
                     <button onClick={() => setIsMobileMenuOpen(false)}><Icons.Close className="w-6 h-6 text-onyx"/></button>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => (
                        <button 
                            key={item.id}
                            onClick={() => { setCurrentView(item.id as View); setIsMobileMenuOpen(false); }}
                            className={`w-full flex items-center space-x-4 px-4 py-4 border-l-2 transition-all ${currentView === item.id ? 'border-alloy bg-stone text-onyx' : 'border-transparent text-graphite'}`}
                        >
                            <item.icon className={`w-5 h-5 ${currentView === item.id ? 'text-alloy' : 'text-gray-400'}`} />
                            <span className="font-display font-medium tracking-wide text-sm">{item.label}</span>
                        </button>
                    ))}
                </nav>
              </div>
          </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative bg-stone">
        {/* Top Header */}
        <header className="h-20 bg-white border-b border-black/5 flex items-center justify-between px-6 md:px-10 z-10 sticky top-0 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-4">
                
                {/* Trigger Button (Isotype) - Works for Mobile (Drawer) and Desktop (Sidebar Toggle) */}
                <button onClick={toggleNavigation} className="p-1 hover:opacity-80 transition-opacity">
                    <img src={WHITEVAULT_ISOTYPE} alt="Menu" className="w-7 h-7 object-contain" />
                </button>
                
                <div className="relative group">
                    <select 
                        value={contextFilter} 
                        onChange={(e) => setContextFilter(e.target.value)}
                        className="bg-transparent border-b border-black/20 py-2 pr-8 pl-0 text-sm font-display font-bold uppercase tracking-wide text-onyx focus:outline-none focus:border-alloy appearance-none cursor-pointer"
                    >
                        <option value="ALL">VISTA GLOBAL</option>
                        {state.contexts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                     <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Icons.Expense className="w-3 h-3 text-alloy" />
                    </div>
                </div>
            </div>

            {/* Quick Actions in Header */}
            <div className="flex items-center">
                 {/* Desktop: Full Button with Text */}
                 <button 
                    onClick={() => setIsActionsOpen(true)}
                    className="hidden md:flex items-center gap-2 bg-onyx text-white px-4 py-2 hover:bg-gold transition-colors shadow-sm"
                 >
                     <Icons.Plus className="w-4 h-4" />
                     <span className="font-display font-bold text-xs uppercase tracking-widest">Acciones Rápidas</span>
                 </button>

                 {/* Mobile: Compact + Button */}
                 <button 
                    onClick={() => setIsActionsOpen(true)}
                    className="md:hidden flex items-center justify-center w-8 h-8 bg-onyx text-white rounded-full shadow-md hover:bg-gold transition-colors"
                 >
                     <Icons.Plus className="w-5 h-5" />
                 </button>
             </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto relative">
            
            {/* STICKY DATE FILTER (Only for Dashboard) */}
            {currentView === 'DASHBOARD' && (
                <div className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-black/5 shadow-sm">
                    <div className="px-6 md:px-10 py-3 flex justify-between items-center">
                        <button 
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className="flex items-center gap-2 group hover:opacity-80 transition-opacity"
                        >
                            <Icons.Calendar className="w-4 h-4 text-alloy" />
                            <div className="flex flex-col items-start">
                                <span className="text-[9px] uppercase tracking-widest text-graphite font-bold">Rango de Fecha</span>
                                <div className="flex items-center gap-1">
                                    <span className="text-sm font-display font-bold text-onyx uppercase">
                                        {dashboardDateRange.preset !== 'CUSTOM' ? getPresetLabel(dashboardDateRange.preset) : 'Personalizado'}
                                    </span>
                                    <Icons.ChevronDown className={`w-3 h-3 text-graphite transition-transform ${isFilterOpen ? 'rotate-180' : 'rotate-0'}`} />
                                </div>
                            </div>
                        </button>
                        
                        <div className="hidden md:block text-[10px] text-graphite font-mono">
                            {dashboardDateRange.start} — {dashboardDateRange.end}
                        </div>
                    </div>

                    {/* Collapsible Filter Panel */}
                    {isFilterOpen && (
                        <div className="border-t border-black/5 bg-stone p-6 animate-in slide-in-from-top-2">
                             <div className="max-w-4xl mx-auto">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-graphite mb-4">Seleccionar Periodo</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                                    {['TODAY', 'LAST_7', 'LAST_15', 'LAST_30', 'THIS_WEEK', 'THIS_MONTH', 'THIS_YEAR'].map(id => (
                                        <button
                                            key={id}
                                            onClick={() => applyDatePreset(id)}
                                            className={`py-2 px-3 text-xs font-bold uppercase tracking-wider border transition-all ${dashboardDateRange.preset === id ? 'bg-onyx text-white border-onyx' : 'bg-white text-graphite border-black/10 hover:border-alloy'}`}
                                        >
                                            {getPresetLabel(id)}
                                        </button>
                                    ))}
                                </div>
                                
                                <div className="flex flex-col md:flex-row items-end gap-4 border-t border-black/5 pt-4">
                                     <div className="w-full md:w-auto">
                                         <DateInput 
                                            label="Desde"
                                            type="date" 
                                            value={dashboardDateRange.start} 
                                            onChange={(e: any) => setDashboardDateRange({...dashboardDateRange, start: e.target.value, preset: 'CUSTOM'})}
                                            className="w-full"
                                        />
                                     </div>
                                     <div className="w-full md:w-auto">
                                        <DateInput 
                                            label="Hasta"
                                            type="date" 
                                            value={dashboardDateRange.end} 
                                            onChange={(e: any) => setDashboardDateRange({...dashboardDateRange, end: e.target.value, preset: 'CUSTOM'})}
                                            className="w-full"
                                        />
                                     </div>
                                     <button 
                                        onClick={() => setIsFilterOpen(false)}
                                        className="w-full md:w-auto py-3 px-6 bg-alloy text-white font-bold uppercase tracking-widest text-xs hover:bg-gold transition-colors mb-5 md:mb-0"
                                     >
                                        Aplicar Rango
                                     </button>
                                </div>
                             </div>
                        </div>
                    )}
                </div>
            )}

            <div className="p-4 md:p-10 pb-32">
                
                {/* View Content */}
                {currentView === 'DASHBOARD' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        
                        {/* Accounts Quick View */}
                        <AccountsQuickView 
                            contexts={state.contexts} 
                            filterId={contextFilter} 
                            currency={currencyCode} 
                        />
                        
                        {/* Top Stats Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: t.totalBalance, val: totalBalance, color: 'text-onyx' },
                                { label: t.monthlyIn, val: monthlyIncome, color: 'text-green-600' },
                                { label: t.monthlyOut, val: monthlyExpense, color: 'text-red-600' },
                                { label: t.activeSubs, val: activeSubsCount, isCount: true, color: 'text-alloy' },
                            ].map((stat, i) => (
                                <div key={i} className="bg-white p-6 border border-black/5 shadow-sm hover:border-alloy transition-colors">
                                    <p className="text-[10px] text-graphite uppercase tracking-widest mb-2">{stat.label}</p>
                                    <p className={`font-display font-bold text-2xl ${stat.color}`}>
                                        {stat.isCount ? stat.val : formatCurrency(stat.val)}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Filtered Charts */}
                            <IncomeVsExpenseChart transactions={dashboardFilteredTransactions} currency={currencyCode} />
                            <ExpenseBreakdown transactions={dashboardFilteredTransactions} categories={state.categories} currency={currencyCode} />
                        </div>

                        <div className="col-span-full">
                             <CashFlowChart 
                                transactions={dashboardFilteredTransactions} 
                                categories={state.categories} 
                                currency={currencyCode}
                                incomeTotal={dashboardIncome}
                                expenseTotal={dashboardExpense}
                             />
                        </div>

                        {/* Financial Calendar (Moved to Bottom) */}
                        <div className="col-span-full">
                            <FinancialCalendar transactions={filteredTransactions} subscriptions={state.subscriptions} currency={currencyCode} />
                        </div>
                    </div>
                )}

                {currentView === 'ACCOUNTS' && (
                    <AccountsView 
                        contexts={filteredContexts} 
                        formatCurrency={formatCurrency}
                        onDistributeIncome={(ctxId) => distributeIncome(ctxId)}
                        recentDistributions={recentDistributions}
                        onUndoDistribution={undoLastDistribution}
                        canUndo={!!lastDistribution && lastDistribution.contextId === filteredContexts[0]?.id} 
                    />
                )}

                {currentView === 'CATEGORIES' && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-in fade-in">
                        {state.categories
                            .filter(c => contextFilter === 'ALL' || c.contextId === contextFilter)
                            .map(c => (
                            <div key={c.id} 
                                 onClick={() => { setSelectedCategory(c); setActiveModal('EDIT_CATEGORY'); }}
                                 className="bg-white p-6 border border-black/5 hover:border-alloy transition-colors group relative overflow-hidden cursor-pointer"
                            >
                                <div className="absolute top-0 left-0 w-1 h-full" style={{backgroundColor: c.color}}></div>
                                <div className="flex items-center justify-between mb-4 pl-3">
                                    <h3 className="font-display font-bold text-lg text-onyx">{c.name}</h3>
                                    <div className="p-2 rounded-full border border-black/5">
                                        <Icons.Category className="w-4 h-4" style={{color: c.color}} />
                                    </div>
                                </div>
                                <div className="pl-3 mb-2">
                                    <p className="text-[10px] text-graphite uppercase tracking-widest mb-1">Presupuesto</p>
                                    <p className="font-mono font-bold text-onyx">{c.budget ? formatCurrency(c.budget) : 'N/A'}</p>
                                </div>
                                <div className="pl-3 pt-2 border-t border-black/5 space-y-1">
                                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block">
                                        {state.contexts.find(ctx => ctx.id === c.contextId)?.name || 'Desconocido'}
                                    </span>
                                    {/* Explicitly show Account and Sub Account */}
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-onyx uppercase tracking-wider block truncate">
                                            Cuenta: {getAccountName(c.contextId, c.accountId || '')}
                                        </span>
                                        {c.subAccountId && (
                                            <span className="text-[10px] font-bold text-alloy uppercase tracking-wider block truncate">
                                                Sub: {getSubAccountName(c.contextId, c.accountId || '', c.subAccountId)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button onClick={() => { setSelectedCategory(undefined); setActiveModal('CATEGORY'); }} className="border-2 border-dashed border-black/10 flex flex-col items-center justify-center p-6 text-graphite hover:border-alloy hover:text-alloy transition-colors group h-full min-h-[150px]">
                            <Icons.Plus className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                            <span className="font-display font-bold text-sm uppercase tracking-widest">Nueva Categoría</span>
                        </button>
                    </div>
                )}

                {currentView === 'TRANSACTIONS' && (
                    <div className="bg-white border border-black/5 shadow-sm overflow-hidden animate-in fade-in">
                        <div className="p-6 border-b border-black/5 bg-stone flex flex-col md:flex-row justify-between items-center gap-4">
                            <h2 className="font-display font-bold text-xl uppercase tracking-widest text-onyx">{t.transactions}</h2>
                            
                            {/* Ledger Filters */}
                            <div className="flex bg-white border border-black/10">
                                {['ALL', 'INCOME', 'EXPENSE', 'TRANSFER'].map((filter) => (
                                    <button
                                        key={filter}
                                        onClick={() => setTransactionTypeFilter(filter as any)}
                                        className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${transactionTypeFilter === filter ? 'bg-onyx text-white' : 'text-graphite hover:bg-stone'}`}
                                    >
                                        {filter === 'ALL' ? t.all : (filter === 'INCOME' ? t.income : (filter === 'EXPENSE' ? t.expense : t.transfer))}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-white text-[10px] uppercase tracking-widest text-graphite font-bold border-b border-black/10">
                                    <tr>
                                        <th className="p-5">Fecha / Hora</th>
                                        <th className="p-5">Tipo</th>
                                        <th className="p-5">Descripción</th>
                                        <th className="p-5">Categoría</th>
                                        <th className="p-5 text-right">Monto</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5">
                                    {filteredTransactions
                                        .filter(t => transactionTypeFilter === 'ALL' || t.type === transactionTypeFilter)
                                        .map(t => (
                                        <tr key={t.id} className="hover:bg-stone transition-colors group">
                                            <td className="p-5 text-sm text-graphite font-mono">
                                                {formatDateTime(t.date)}
                                            </td>
                                            <td className="p-5"><span className={`text-[10px] font-bold px-2 py-1 uppercase tracking-wider border ${t.type === 'INCOME' ? 'bg-onyx text-white border-onyx' : 'bg-white text-onyx border-black/10'}`}>{t.type === 'INCOME' ? 'INGRESO' : (t.type === 'EXPENSE' ? 'GASTO' : 'TRANSF.')}</span></td>
                                            <td className="p-5 text-sm font-bold text-onyx font-display">{t.notes}</td>
                                            <td className="p-5 text-sm text-graphite flex items-center gap-2">
                                                {t.categoryId && <div className="w-2 h-2 rounded-full" style={{backgroundColor: state.categories.find(c => c.id === t.categoryId)?.color}}></div>}
                                                {t.categoryId && state.categories.find(c => c.id === t.categoryId)?.name}
                                            </td>
                                            <td className={`p-5 text-right font-mono font-bold ${t.type === 'INCOME' ? 'text-onyx' : 'text-graphite'}`}>
                                                {formatCurrency(t.amount)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {currentView === 'SUBSCRIPTIONS' && (
                    <div className="space-y-6">
                         <div className="flex gap-4 mb-4">
                            {['ALL', 'ACTIVE', 'PAUSED'].map((filter) => (
                                 <button 
                                    key={filter}
                                    onClick={() => setSubscriptionStatusFilter(filter as any)}
                                    className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border transition-all ${subscriptionStatusFilter === filter ? 'bg-onyx text-white border-onyx' : 'bg-white text-graphite border-black/10 hover:border-alloy'}`}
                                 >
                                     {filter === 'ALL' ? 'Todos' : (filter === 'ACTIVE' ? 'Activas' : 'Pausadas')}
                                 </button>
                            ))}
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
                            {state.subscriptions
                                .filter(s => contextFilter === 'ALL' || s.contextId === contextFilter)
                                .filter(s => subscriptionStatusFilter === 'ALL' || (subscriptionStatusFilter === 'ACTIVE' ? s.active : !s.active))
                                .map(s => (
                                <div key={s.id} 
                                    onClick={() => { setSelectedSubscription(s); setActiveModal('EDIT_SUBSCRIPTION'); }}
                                    className="bg-white border border-black/5 p-6 relative group hover:border-alloy transition-colors cursor-pointer"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-stone">
                                            <Icons.Subscription className="w-6 h-6 text-onyx" />
                                        </div>
                                        <div className={`px-2 py-1 text-[10px] uppercase tracking-widest font-bold ${s.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                                            {s.active ? t.active : t.paused}
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-display font-bold text-onyx mb-1">{s.name}</h3>
                                    <p className="text-xs text-graphite mb-2 uppercase tracking-wider">{s.frequency} Renewal</p>
                                    
                                    <div className="text-xs text-alloy font-bold mb-4 uppercase tracking-wider">
                                        {getAccountName(s.contextId, s.accountId || '')}
                                        {s.subAccountId && ` / ${getSubAccountName(s.contextId, s.accountId || '', s.subAccountId)}`}
                                    </div>
                                    
                                    <div className="flex justify-between items-end border-t border-black/5 pt-4">
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase tracking-wider">{t.nextBilling}</p>
                                            <p className="text-sm font-medium text-onyx">{s.nextRenewal || '-'}</p>
                                        </div>
                                        <span className="text-xl font-display font-bold text-onyx">{formatCurrency(s.amount)}</span>
                                    </div>
                                </div>
                            ))}
                            <button onClick={() => { setSelectedSubscription(undefined); setActiveModal('SUBSCRIPTION'); }} className="border-2 border-dashed border-black/10 flex flex-col items-center justify-center p-6 text-graphite hover:border-alloy hover:text-alloy transition-colors group h-full min-h-[200px]">
                                <Icons.Plus className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                                <span className="font-display font-bold text-sm uppercase tracking-widest">Añadir Suscripción</span>
                            </button>
                         </div>
                     </div>
                )}

                {currentView === 'SETTINGS' && (
                    <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
                        
                        {/* Profile Settings */}
                        <div className="bg-white border border-black/5 p-8 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-alloy"></div>
                            <h2 className="text-2xl font-display font-bold text-onyx mb-6">{t.profile}</h2>
                            
                            <div className="space-y-6">
                                <div className="flex flex-col items-start gap-4 mb-6">
                                    <div className="flex items-center gap-6">
                                        <div 
                                            className="w-20 h-20 bg-stone border-2 border-dashed border-black/20 rounded-full flex items-center justify-center overflow-hidden cursor-pointer hover:border-alloy transition-colors"
                                            onClick={() => document.getElementById('settings-avatar-upload')?.click()}
                                        >
                                            {state.user.avatarUrl ? (
                                                <img src={state.user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <Icons.Upload className="w-6 h-6 text-graphite" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-onyx mb-1">Foto de Perfil</p>
                                            <p className="text-xs text-graphite mb-2">Haz clic para cambiar tu imagen</p>
                                            <input 
                                                id="settings-avatar-upload"
                                                type="file" 
                                                accept="image/*" 
                                                className="hidden" 
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            setState({...state, user: {...state.user, avatarUrl: reader.result as string}});
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-graphite uppercase tracking-wider mb-2">Nombre</label>
                                    <input type="text" value={state.user.name} onChange={(e) => setState({...state, user: {...state.user, name: e.target.value}})} className="w-full p-3 bg-stone border border-black/5 text-onyx font-sans outline-none focus:border-alloy" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-graphite uppercase tracking-wider mb-2">{t.email}</label>
                                    <input type="email" value={session?.user?.email || state.user.email} readOnly className="w-full p-3 bg-stone border border-black/5 text-onyx font-sans opacity-70" />
                                </div>
                                <div className="pt-4 border-t border-black/5">
                                    <button 
                                        onClick={() => supabase.auth.signOut()}
                                        className="bg-red-50 text-red-600 px-6 py-3 rounded-md font-bold uppercase tracking-widest text-xs hover:bg-red-100 transition-colors"
                                    >
                                        Cerrar Sesión
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Percentage Configuration */}
                        <div className="bg-white border border-black/5 p-8 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-onyx"></div>
                            <h2 className="text-2xl font-display font-bold text-onyx mb-2">Configuración de Distribución (Profit First)</h2>
                            <p className="text-sm text-graphite mb-6">Ajusta los porcentajes de distribución automática para cada cuenta. La cuenta 'Income' siempre será el origen (100%).</p>
                            
                            <div className="space-y-8">
                                {state.contexts.map(context => (
                                    <div key={context.id} className="border-t border-black/5 pt-6 first:border-0 first:pt-0">
                                        <h3 className="font-display font-bold text-lg text-alloy uppercase tracking-widest mb-4">{context.name} ({context.type === 'BUSINESS' ? 'Negocio' : 'Personal'})</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {context.accounts.filter(a => a.type !== 'INCOME').map(account => (
                                                <div key={account.id} className="flex items-center justify-between p-3 bg-stone border border-black/5">
                                                    <span className="font-bold text-sm text-onyx">{account.name}</span>
                                                    <div className="flex items-center">
                                                        <input 
                                                            type="number" 
                                                            min="0" 
                                                            max="100"
                                                            value={account.percentageTarget || 0} 
                                                            onChange={(e) => handleUpdateAccountPercentage(context.id, account.id, Number(e.target.value))}
                                                            className="w-16 p-2 text-right bg-white border border-black/10 font-mono font-bold text-onyx outline-none focus:border-alloy"
                                                        />
                                                        <span className="ml-2 text-graphite font-bold">%</span>
                                                    </div>
                                                </div>
                                            ))}
                                            {/* Show Total Allocation */}
                                            <div className="col-span-full flex justify-end mt-2">
                                                <span className="text-xs uppercase tracking-wider font-bold text-graphite mr-2">Total Asignado:</span>
                                                <span className={`text-sm font-mono font-bold ${context.accounts.reduce((sum, a) => sum + (a.percentageTarget || 0), 0) === 100 ? 'text-green-600' : 'text-onyx'}`}>
                                                    {context.accounts.reduce((sum, a) => sum + (a.percentageTarget || 0), 0)}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white border border-black/5 p-8 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-1 h-full bg-gold"></div>
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-xl font-display font-bold text-onyx">{t.businessExp}</h3>
                                    <p className="text-sm text-graphite mt-2 max-w-md">Inicializar una nueva estructura de negocio Profit First. Esto creará un espacio de trabajo dedicado con cuentas separadas para Ingresos, Ganancias, Impuestos, Pago del Propietario y Operaciones.</p>
                                </div>
                                <Icons.Building className="w-8 h-8 text-gold opacity-50" />
                            </div>
                            <button onClick={() => setActiveModal('NEW_BIZ')} className="mt-4 px-6 py-3 border border-gold text-gold hover:bg-gold hover:text-white font-display font-bold text-xs uppercase tracking-widest transition-all">
                                {t.initializeBiz}
                            </button>
                        </div>

                        {/* Localization Settings */}
                        <div className="bg-white border border-black/5 p-8 shadow-sm relative overflow-hidden">
                             <div className="absolute top-0 left-0 w-1 h-full bg-graphite"></div>
                             <h2 className="text-2xl font-display font-bold text-onyx mb-6">Localización</h2>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                 <div>
                                    <label className="block text-xs font-bold text-graphite uppercase tracking-wider mb-2">Divisa Principal</label>
                                    <select 
                                        value={state.user.currency} 
                                        onChange={(e) => setState({...state, user: {...state.user, currency: e.target.value}})}
                                        className="w-full p-3 bg-stone border border-black/5 text-onyx font-sans outline-none focus:border-alloy"
                                    >
                                        <option value="USD">USD - Dólar Estadounidense</option>
                                        <option value="EUR">EUR - Euro</option>
                                        <option value="MXN">MXN - Peso Mexicano</option>
                                    </select>
                                 </div>
                                 <div>
                                    <label className="block text-xs font-bold text-graphite uppercase tracking-wider mb-2">Zona Horaria (Buscador)</label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            placeholder="Buscar ciudad o país..."
                                            value={tzSearch}
                                            onChange={(e) => setTzSearch(e.target.value)}
                                            className="w-full p-3 bg-stone border border-black/5 border-b-0 text-onyx font-sans outline-none focus:border-alloy placeholder:text-gray-400 text-sm"
                                        />
                                        <select 
                                            value={state.user.timezone} 
                                            onChange={(e) => setState({...state, user: {...state.user, timezone: e.target.value}})}
                                            className="w-full p-3 bg-stone border border-black/5 text-onyx font-sans outline-none focus:border-alloy"
                                            size={5} // Show multiple lines
                                        >
                                            <option value={Intl.DateTimeFormat().resolvedOptions().timeZone}>Automático (Sistema)</option>
                                            {filteredTimezones.map((tz: any) => (
                                                <option key={tz.value} value={tz.value}>{tz.label}</option>
                                            ))}
                                        </select>
                                        <p className="text-[10px] text-graphite mt-1 italic">
                                            Seleccionada: {state.user.timezone}
                                        </p>
                                    </div>
                                 </div>
                             </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </main>

       {/* Actions Modal Overlay - Moved outside main flow to ensure z-index priority over sticky headers */}
       {isActionsOpen && (
            <div className="fixed inset-0 z-50 flex items-end md:items-start justify-center md:justify-end md:p-4">
                {/* Backdrop */}
                <div 
                    className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" 
                    onClick={() => setIsActionsOpen(false)}
                ></div>
                
                {/* Menu Panel */}
                <div className="
                    relative z-50 w-full md:w-64 bg-white shadow-2xl p-4 rounded-t-2xl md:rounded-lg border border-black/10
                    animate-in slide-in-from-bottom-5 md:slide-in-from-top-2 fade-in
                    md:mt-14 md:mr-10
                ">
                    <div className="flex justify-between items-center mb-4 px-2 md:hidden">
                            <span className="text-xs font-bold uppercase tracking-widest text-graphite">Seleccionar Acción</span>
                            <button onClick={() => setIsActionsOpen(false)}><Icons.Close className="w-5 h-5 text-onyx" /></button>
                    </div>

                    <div className="grid grid-cols-2 md:flex md:flex-col gap-2 md:gap-0">
                        {quickActions.map((btn) => (
                            <button 
                                key={btn.label} 
                                onClick={() => { btn.action(); setIsActionsOpen(false); }}
                                className="flex items-center gap-3 p-3 hover:bg-stone text-left group transition-colors border border-black/5 md:border-0 rounded md:rounded-none"
                            >
                                <div className="p-2 bg-stone group-hover:bg-white rounded-full transition-colors">
                                    <btn.icon className="w-4 h-4 text-onyx group-hover:text-gold" />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-graphite group-hover:text-onyx">{btn.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}

      {/* Modals */}
      {activeModal === 'EXPENSE' && <TransactionForm type="EXPENSE" state={state} onSubmit={handleTransaction} onClose={() => setActiveModal(null)} />}
      {activeModal === 'INCOME' && <TransactionForm type="INCOME" state={state} onSubmit={handleTransaction} onClose={() => setActiveModal(null)} />}
      {activeModal === 'TRANSFER' && <TransferForm state={state} onSubmit={handleTransfer} onClose={() => setActiveModal(null)} />}
      {activeModal === 'CATEGORY' && <CategoryForm state={state} onSubmit={handleNewCategory} onClose={() => setActiveModal(null)} />}
      {activeModal === 'EDIT_CATEGORY' && selectedCategory && <CategoryForm state={state} initialData={selectedCategory} onSubmit={handleUpdateCategory} onClose={() => setActiveModal(null)} />}
      {activeModal === 'SUB_ACCOUNT' && <SubAccountForm state={state} onSubmit={handleNewSubAccount} onClose={() => setActiveModal(null)} />}
      {activeModal === 'SUBSCRIPTION' && <SubscriptionForm state={state} onSubmit={handleNewSubscription} onClose={() => setActiveModal(null)} />}
      {activeModal === 'EDIT_SUBSCRIPTION' && selectedSubscription && <SubscriptionForm state={state} initialData={selectedSubscription} onSubmit={handleUpdateSubscription} onClose={() => setActiveModal(null)} />}
      {activeModal === 'NEW_BIZ' && <NewContextForm onSubmit={handleNewBusiness} onClose={() => setActiveModal(null)} />}

    </div>
  );
}

export default App;