import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { AppState, FinancialContext, Transaction, Subscription, Category, Account, SubAccount, GoalEntry } from './types';
import { INITIAL_STATE, CURRENCIES } from './constants';
import { Icons } from './components/Icons';
import { TransactionForm, TransferForm, CategoryForm, SubAccountForm, SubscriptionForm, NewContextForm, AdjustBalanceForm } from './components/ActionModals';
import { supabase } from './lib/supabase';
import { Auth } from './components/Auth';
import { Onboarding } from './components/Onboarding';
import { getBalance, addToBalance, subtractFromBalance, getTotalsByCurrency, balanceEntries } from './utils/balances';
import { migrateState } from './utils/migration';
import { collectGoals, goalRemaining, isPaymentGoal, paymentGoalTotals } from './utils/goals';
import {
  MobileShell,
  MobileHeader,
  HeaderButton,
  BottomTabBar,
  DesktopSidebar,
  TabItem,
  FabSheet,
  BottomSheet,
  ToastProvider,
  useToast,
  haptic,
  PullToRefresh,
  pressProps,
} from './components/Mobile';
import {
  MobileDashboard,
  MobileAccounts,
  MobileTransactions,
  MobileSubscriptions,
  MobileCategories,
  MobileSettings,
  ContextSwitcher,
} from './components/MobileViews';
import {
  TransactionDetailSheet,
  SubscriptionDetailSheet,
  CategoryHistorySheet,
  DashboardSummarySheet,
  DeleteConfirmSheet,
  PasswordSetupSheet,
  AccountHistorySheet,
  TrashSheet,
  ChartDrillSheet,
} from './components/MobileDetails';
import { ManageSubAccountSheet, GoalCreditSheet, GoalArchiveSheet } from './components/GoalSheets';
import { GoalsOverview } from './components/GoalsOverview';
import { registerServiceWorker, purgarCachesViejas, isPushSupported, getPermissionState, getCurrentSubscription, subscribeToPush } from './lib/push';
import { advanceSubscriptionRenewal } from './utils/subscriptions';
import { UpdatePopup, APP_VERSION } from './components/UpdatePopup';
import { TouchDiag } from './components/TouchDiag';
import { BrandLoader } from './components/BrandLoader';

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


function App() {
  // Diagnóstico de toques: app.whitevault.cc/?diag=1
  // Sirve para medir en el dispositivo real si el toque aterriza donde se ve el
  // botón. No requiere sesión y no toca ningún dato.
  if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('diag') === '1') {
    return <TouchDiag />;
  }

  const [session, setSession] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasFetchedData, setHasFetchedData] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [isAccountPaused, setIsAccountPaused] = useState(false);
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [currentView, setCurrentView] = useState<View>('DASHBOARD');
  // Per-view context filters — each section keeps its own selection so
  // filtering in Subscriptions doesn't bleed into Bóvedas, etc.
  const [dashboardContextFilter, setDashboardContextFilter] = useState<string>('ALL');
  const [accountsContextFilter, setAccountsContextFilter] = useState<string>('ALL');
  const [transactionsContextFilter, setTransactionsContextFilter] = useState<string>('ALL');
  const [subscriptionsContextFilter, setSubscriptionsContextFilter] = useState<string>('ALL');
  const [categoriesContextFilter, setCategoriesContextFilter] = useState<string>('ALL');

  // Per-view currency filter (default 'ALL' = show every currency)
  const [dashboardCurrencyFilter, setDashboardCurrencyFilter] = useState<string>('ALL');
  const [transactionsCurrencyFilter, setTransactionsCurrencyFilter] = useState<string>('ALL');
  const [subscriptionsCurrencyFilter, setSubscriptionsCurrencyFilter] = useState<string>('ALL');
  const [categoriesCurrencyFilter, setCategoriesCurrencyFilter] = useState<string>('ALL');

  // Resolver — returns the filter for the currently active view.
  const contextFilter = (() => {
    switch (currentView) {
      case 'DASHBOARD':     return dashboardContextFilter;
      case 'ACCOUNTS':      return accountsContextFilter;
      case 'TRANSACTIONS':  return transactionsContextFilter;
      case 'SUBSCRIPTIONS': return subscriptionsContextFilter;
      case 'CATEGORIES':    return categoriesContextFilter;
      default:              return 'ALL';
    }
  })();
  const setContextFilter = (id: string) => {
    switch (currentView) {
      case 'DASHBOARD':     return setDashboardContextFilter(id);
      case 'ACCOUNTS':      return setAccountsContextFilter(id);
      case 'TRANSACTIONS':  return setTransactionsContextFilter(id);
      case 'SUBSCRIPTIONS': return setSubscriptionsContextFilter(id);
      case 'CATEGORIES':    return setCategoriesContextFilter(id);
    }
  };
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER'>('ALL');
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PAUSED'>('ACTIVE');
  
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
  const [lastDistribution, setLastDistribution] = useState<{ txIds: string[], contextId: string, currency: string, amounts: {[id:string]:number} } | null>(null);
  const [recentDistributions, setRecentDistributions] = useState<{ [accountId: string]: number }>({});

  // Modal States
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | undefined>(undefined);
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>(undefined);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | undefined>(undefined);
  const [dashboardSummaryType, setDashboardSummaryType] = useState<string | null>(null);
  const [subAccountPreselect, setSubAccountPreselect] = useState<{ contextId: string, accountId: string } | null>(null);
  const [bulkSelectedTxIds, setBulkSelectedTxIds] = useState<Set<string>>(new Set());
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [contextToDelete, setContextToDelete] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  // Password Change State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  
  // Settings Search State
  const [currencySearch, setCurrencySearch] = useState('');
  
  // Name Edit State
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const nameInputRef = React.useRef<HTMLInputElement>(null);

  // Indicadores del último movimiento, junto a la cuenta o sub-cuenta afectada.
  // Duran hasta el siguiente movimiento o hasta cerrar la app (no caducan solos).
  // Key: `${accountId}:${subAccountId ?? ''}`
  type RecentTxIndicator = { amount: number; currency: string; kind: 'INCOME' | 'EXPENSE' | 'TRANSFER_OUT' | 'TRANSFER_IN' };
  const [recentTxByAccount, setRecentTxByAccount] = useState<Record<string, RecentTxIndicator>>({});
  const flashRecent = React.useCallback((entries: { accountId: string; subAccountId?: string; amount: number; currency: string; kind: RecentTxIndicator['kind'] }[]) => {
      const map: Record<string, RecentTxIndicator> = {};
      entries.forEach((e) => {
          const key = `${e.accountId}:${e.subAccountId ?? ''}`;
          map[key] = { amount: e.amount, currency: e.currency, kind: e.kind };
      });
      // Sin temporizador a propósito: el indicador de lo que acabas de mover se
      // queda a la vista hasta que registras el siguiente movimiento (esta misma
      // llamada reemplaza el mapa entero) o hasta que cierras la app, porque es
      // estado en memoria. Antes se borraba solo a los 30 s y daba tiempo a nada.
      setRecentTxByAccount(map);
      // Los badges verdes de una distribución son el otro sistema de indicadores.
      // Sin caducidad propia se quedarían pegados junto a movimientos posteriores
      // que no tienen nada que ver, así que al llegar uno nuevo se limpian.
      setRecentDistributions({});
  }, []);

  // Un indicador sólo tiene sentido mientras exista el movimiento que representa.
  // Al borrar, restaurar o editar una transacción se retira, porque si no queda
  // un "+50 €" señalando un saldo que ya no lo incluye.
  const clearRecentIndicators = React.useCallback(() => {
      setRecentTxByAccount({});
      setRecentDistributions({});
  }, []);

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
        const userCurrency = p.currency || INITIAL_STATE.user.currency;
        const contexts = p.contexts || [];
        const transactions = (txRes.data || []).map((t: any) => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          date: t.date,
          notes: t.notes,
          currency: t.currency || userCurrency,
          contextId: t.context_id,
          accountId: t.account_id,
          subAccountId: t.sub_account_id,
          categoryId: t.category_id,
          toContextId: t.to_context_id,
          toAccountId: t.to_account_id,
          toSubAccountId: t.to_sub_account_id,
          deletedAt: t.deleted_at,
          linkedSubscriptionId: t.linked_subscription_id,
        }));

        // Check if account is paused
        if (p.active === false) {
          setIsAccountPaused(true);
        } else {
          setIsAccountPaused(false);
        }

        if (contexts.length === 0) {
          setNeedsOnboarding(true);
        } else {
          setNeedsOnboarding(false);
        }

        // Resolve timezone with safe fallback chain: db → browser → UTC
        const browserTz = (() => {
          try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return ''; }
        })();
        const resolvedTz = p.timezone && p.timezone !== 'UTC' ? p.timezone
          : (browserTz && browserTz !== 'UTC') ? browserTz
          : (p.timezone || 'UTC');

        setState(migrateState({
          user: {
            name: p.name || INITIAL_STATE.user.name,
            email: p.email || INITIAL_STATE.user.email,
            currency: userCurrency,
            darkMode: p.dark_mode || INITIAL_STATE.user.darkMode,
            language: p.language || INITIAL_STATE.user.language,
            timezone: resolvedTz,
            avatarUrl: p.avatar_url,
          },
          contexts,
          subscriptions: p.subscriptions || INITIAL_STATE.subscriptions,
          categories: p.categories || INITIAL_STATE.categories,
          transactions
        }));
      } else {
        setNeedsOnboarding(true);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setHasFetchedData(true);
      setIsLoaded(true);
    }
  };

  // Sync state to Supabase
  const syncToSupabase = React.useCallback(async () => {
    if (!isLoaded || !session || !hasFetchedData) return;
    const uid = session.user.id;

    try {
      const { error: profileError } = await supabase.from('profiles').upsert({
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
      if (profileError) console.error('Sync profiles error:', profileError);

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
        currency: t.currency,
        context_id: t.contextId,
        account_id: t.accountId,
        sub_account_id: t.subAccountId,
        category_id: t.categoryId,
        to_context_id: t.toContextId,
        to_account_id: t.toAccountId,
        to_sub_account_id: t.toSubAccountId,
        deleted_at: t.deletedAt ?? null,
        linked_subscription_id: t.linkedSubscriptionId ?? null,
      }));

      if (toUpsert.length > 0) {
        const { error: txError } = await supabase.from('transactions').upsert(toUpsert);
        if (txError) console.error('Sync transactions error:', txError);
      }
    } catch (err) {
      console.error('Sync error:', err);
    }
  }, [state, isLoaded, session, hasFetchedData]);

  // Debounced sync on state changes
  useEffect(() => {
    if (!isLoaded || !session || !hasFetchedData) return;
    const timeout = setTimeout(syncToSupabase, 500);
    return () => clearTimeout(timeout);
  }, [state, isLoaded, session, hasFetchedData, syncToSupabase]);

  // Un Objetivo que llega a 0 restante se marca completado solo y se archiva.
  //
  // Sólo marca, NUNCA desmarca. Un objetivo puede estar saldado sin haberlo
  // pagado entero — si te perdonan la deuda, la das por cerrada con 0 € pagados.
  // Desmarcarlo automáticamente lo resucitaría e inflaría lo que te falta.
  // Para reabrirlo hay que hacerlo a mano desde la ficha.
  useEffect(() => {
    if (!hasFetchedData) return;
    const cur = state.user.currency;
    const cambios: Array<{ subId: string; completedAt: string | null }> = [];
    for (const { sub } of collectGoals(state.contexts, 'PAYMENT')) {
      if (sub.completedAt) continue;
      if (goalRemaining(sub, state.transactions, cur) <= 0.005) {
        cambios.push({ subId: sub.id, completedAt: new Date().toISOString() });
      }
    }
    if (!cambios.length) return;
    setState(prev => ({
      ...prev,
      contexts: prev.contexts.map(c => ({
        ...c,
        accounts: c.accounts.map(a => ({
          ...a,
          subAccounts: a.subAccounts.map(s => {
            const hit = cambios.find(x => x.subId === s.id);
            return hit ? { ...s, completedAt: hit.completedAt } : s;
          }),
        })),
      })),
    }));
  }, [state.contexts, state.transactions, state.user.currency, hasFetchedData]);

  // Sync immediately on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!isLoaded || !session || !hasFetchedData) return;
      const uid = session.user.id;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${uid}`;
      fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          contexts: state.contexts,
          subscriptions: state.subscriptions,
          categories: state.categories,
          updated_at: new Date().toISOString()
        }),
        keepalive: true,
      });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state, isLoaded, session, hasFetchedData]);

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
  
  const formatCurrency = useCallback((amount: number, currency?: string) => {
      const cur = currency || currencyCode;
      try {
          return new Intl.NumberFormat('es-ES', {
              style: 'currency',
              currency: cur,
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
          }).format(amount);
      } catch {
          const symbol = cur === 'USD' ? '$' : (cur === 'EUR' ? '\u20ac' : '$');
          const formatted = new Intl.NumberFormat('es-ES', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
          }).format(amount);
          return `${symbol} ${formatted}`;
      }
  }, [currencyCode]);

  const tz = state.user.timezone;

  const formatDateTime = useCallback((isoString: string) => {
      try {
          return new Intl.DateTimeFormat('es-ES', {
              year: 'numeric', month: '2-digit', day: '2-digit',
              hour: '2-digit', minute: '2-digit',
              timeZone: tz
          }).format(new Date(isoString));
      } catch (e) {
          return isoString;
      }
  }, [state.user.timezone]);

  // Time only (HH:MM) in user's timezone
  const formatTime = useCallback((isoString: string) => {
      try {
          return new Intl.DateTimeFormat('es-ES', {
              hour: '2-digit', minute: '2-digit',
              timeZone: tz
          }).format(new Date(isoString));
      } catch (e) {
          return '';
      }
  }, [state.user.timezone]);

  // Day key (YYYY-MM-DD) in user's timezone — used for grouping transactions by day
  const getDayKey = useCallback((isoString: string) => {
      try {
          const parts = new Intl.DateTimeFormat('en-CA', {
              year: 'numeric', month: '2-digit', day: '2-digit',
              timeZone: tz
          }).formatToParts(new Date(isoString));
          const y = parts.find(p => p.type === 'year')?.value;
          const m = parts.find(p => p.type === 'month')?.value;
          const d = parts.find(p => p.type === 'day')?.value;
          return `${y}-${m}-${d}`;
      } catch (e) {
          return isoString.split('T')[0];
      }
  }, [state.user.timezone]);

  // Friendly day label in user's timezone
  const formatDayLabel = useCallback((isoString: string) => {
      try {
          const now = new Date();
          const today = getDayKey(now.toISOString());
          const yesterday = new Date(now.getTime() - 86_400_000);
          const yKey = getDayKey(yesterday.toISOString());
          const key = getDayKey(isoString);
          if (key === today) return 'Hoy';
          if (key === yKey) return 'Ayer';
          return new Intl.DateTimeFormat('es-ES', {
              weekday: 'long', day: 'numeric', month: 'long',
              timeZone: tz
          }).format(new Date(isoString));
      } catch (e) {
          return isoString;
      }
  }, [state.user.timezone]);

  const getAccountName = useCallback((ctxId: string, accId: string) => {
      const ctx = state.contexts.find(c => c.id === ctxId);
      const acc = ctx?.accounts.find(a => a.id === accId);
      return acc ? acc.name : '';
  }, [state.contexts]);

  const getSubAccountName = useCallback((ctxId: string, accId: string, subId: string) => {
      const ctx = state.contexts.find(c => c.id === ctxId);
      const acc = ctx?.accounts.find(a => a.id === accId);
      const sub = acc?.subAccounts.find(s => s.id === subId);
      return sub ? sub.name : '';
  }, [state.contexts]);

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

  // Active transactions only (exclude soft-deleted)
  const activeTransactions = useMemo(
      () => state.transactions.filter(t => !t.deletedAt),
      [state.transactions]
  );

  // Unique currencies actually used across the user's data (sorted alphabetically,
  // with the user's primary currency first). Used to drive CurrencyFilterChips.
  const computeCurrencies = (txs: Transaction[], subs: any[] = [], extra: string[] = []): string[] => {
      const set = new Set<string>();
      txs.forEach(t => { if (t.currency) set.add(t.currency); });
      subs.forEach(s => { if (s.currency) set.add(s.currency); });
      extra.forEach(c => { if (c) set.add(c); });
      const list = Array.from(set).sort();
      const primary = state.user.currency;
      return primary && list.includes(primary) ? [primary, ...list.filter(c => c !== primary)] : list;
  };
  const allTxCurrencies = useMemo(() => computeCurrencies(activeTransactions, state.subscriptions), [activeTransactions, state.subscriptions, state.user.currency]);
  const subscriptionCurrencies = useMemo(() => computeCurrencies([], state.subscriptions), [state.subscriptions, state.user.currency]);
  const deletedTransactions = useMemo(
      () => state.transactions.filter(t => !!t.deletedAt)
          .sort((a, b) => new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime()),
      [state.transactions]
  );

  // --- Calculations for Dashboard ---
  // Memoizado: sin esto se recorrían las transacciones en cada render Y se
  // invalidaba en cascada todo useMemo que dependiera de esta referencia.
  const filteredTransactions = useMemo(
      () => activeTransactions.filter(t => contextFilter === 'ALL' || t.contextId === contextFilter),
      [activeTransactions, contextFilter]
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
  
  const filteredContexts = useMemo(
      () => state.contexts.filter(c => contextFilter === 'ALL' || c.id === contextFilter),
      [state.contexts, contextFilter]
  );

  const totalsByCurrencyRaw = useMemo(() => getTotalsByCurrency(filteredContexts), [filteredContexts]);
  // When a currency is selected in the dashboard, narrow totals to that one.
  const totalsByCurrency = useMemo(
      () => dashboardCurrencyFilter === 'ALL'
          ? totalsByCurrencyRaw
          : { [dashboardCurrencyFilter]: totalsByCurrencyRaw[dashboardCurrencyFilter] || 0 },
      [totalsByCurrencyRaw, dashboardCurrencyFilter]
  );

  // Apply the dashboard's currency filter (if set) on top of date/context.
  const dashboardCurrencyFilteredTransactions = useMemo(() => {
      if (dashboardCurrencyFilter === 'ALL') return dashboardFilteredTransactions;
      return dashboardFilteredTransactions.filter(t => t.currency === dashboardCurrencyFilter);
  }, [dashboardFilteredTransactions, dashboardCurrencyFilter]);

  // Dashboard Chart Totals (using currency-filtered set)
  // Los cuatro totales salen de UNA sola pasada. Antes eran 6 recorridos
  // completos de las transacciones en cada render.
  const dashboardTotals = useMemo(() => {
    let income = 0, expense = 0;
    const byCurIn: Record<string, number> = {};
    const byCurOut: Record<string, number> = {};
    for (const t of dashboardCurrencyFilteredTransactions) {
      if (t.type === 'INCOME') {
        income += t.amount;
        byCurIn[t.currency] = (byCurIn[t.currency] || 0) + t.amount;
      } else if (t.type === 'EXPENSE') {
        expense += t.amount;
        byCurOut[t.currency] = (byCurOut[t.currency] || 0) + t.amount;
      }
    }
    return { income, expense, byCurIn, byCurOut };
  }, [dashboardCurrencyFilteredTransactions]);
  const dashboardIncome = dashboardTotals.income;
  const dashboardExpense = dashboardTotals.expense;
  const monthlyIncomeByCurrency = dashboardTotals.byCurIn;
  const monthlyExpenseByCurrency = dashboardTotals.byCurOut;
  const dashboardFilteredSubs = useMemo(() => {
    // Calculate the real end of the period (not capped to today)
    const start = new Date(dashboardDateRange.start);
    start.setHours(0,0,0,0);
    let periodEnd: Date;
    const preset = dashboardDateRange.preset;
    const now = new Date();
    if (preset === 'TODAY') {
      periodEnd = new Date(now);
    } else if (preset === 'THIS_WEEK') {
      const day = now.getDay();
      periodEnd = new Date(now);
      periodEnd.setDate(now.getDate() + (day === 0 ? 0 : 7 - day)); // Sunday
    } else if (preset === 'THIS_MONTH') {
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of month
    } else if (preset === 'THIS_YEAR') {
      periodEnd = new Date(now.getFullYear(), 11, 31);
    } else {
      periodEnd = new Date(dashboardDateRange.end);
    }
    periodEnd.setHours(23,59,59,999);

    return state.subscriptions
      .filter(s => s.active && (contextFilter === 'ALL' || s.contextId === contextFilter))
      .filter(s => dashboardCurrencyFilter === 'ALL' || s.currency === dashboardCurrencyFilter)
      .filter(s => {
        if (!s.nextRenewal) return false;
        const renewal = new Date(s.nextRenewal);
        return renewal >= start && renewal <= periodEnd;
      })
      .sort((a, b) => new Date(a.nextRenewal).getTime() - new Date(b.nextRenewal).getTime());
  }, [state.subscriptions, contextFilter, dashboardCurrencyFilter, dashboardDateRange]);
  const activeSubsCount = dashboardFilteredSubs.length;

  // --- Actions ---

  // Profit First Logic with Undo Support
  const distributeIncome = (contextId: string, currency: string, specificAmount?: number) => {
      const ctx = state.contexts.find(c => c.id === contextId);
      if (!ctx) return;

      const incomeAcc = ctx.accounts.find(a => a.type === 'INCOME');
      if (!incomeAcc) return;

      const amountToDistribute = specificAmount !== undefined ? specificAmount : getBalance(incomeAcc.balances, currency);
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

                  const txId = crypto.randomUUID();
                  txIds.push(txId);
                  distributionAmounts[acc.id] = splitAmount;

                  newTransactions.push({
                      id: txId,
                      type: 'TRANSFER',
                      amount: splitAmount,
                      currency,
                      date,
                      notes: `Distribución Automática (${target.percentageTarget}%)`,
                      contextId: contextId,
                      accountId: incomeAcc.id,
                      toContextId: contextId,
                      toAccountId: acc.id
                  });

                  return { ...acc, balances: addToBalance(acc.balances, currency, splitAmount) };
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
                  a.id === incomeAcc.id ? { ...a, balances: subtractFromBalance(a.balances, currency, distributedTotal) } : a
              )
          };
      });

      setState(prev => ({
          ...prev,
          contexts: finalContexts,
          transactions: [...newTransactions, ...prev.transactions]
      }));

      // Store undo data
      setLastDistribution({ txIds, contextId, currency, amounts: distributionAmounts });
      
      // Visual feedback
      // Igual que flashRecent: se queda hasta el siguiente movimiento.
      setRecentDistributions(distributionAmounts);
  };

  const undoLastDistribution = () => {
      if (!lastDistribution) return;

      const { txIds, contextId, currency, amounts } = lastDistribution;
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
                  return { ...acc, balances: subtractFromBalance(acc.balances, currency, amounts[acc.id]) };
              }
              return acc;
          });

          // Add back to income
          return {
              ...c,
              accounts: updatedAccounts.map(a =>
                  a.id === incomeAcc.id ? { ...a, balances: addToBalance(a.balances, currency, totalRestored) } : a
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

  const handleUpdateContextName = (contextId: string, newName: string) => {
      const newContexts = state.contexts.map(c => {
          if (c.id !== contextId) return c;
          return { ...c, name: newName };
      });
      setState({ ...state, contexts: newContexts });
  }

  const handleDeleteContext = (contextId: string) => {
      const newContexts = state.contexts.filter(c => c.id !== contextId);
      setState({ ...state, contexts: newContexts });
      setContextToDelete(null);
      if (contextFilter === contextId) {
          setContextFilter('ALL');
      }
  }

  // --- Gestión de cuentas y sub-cuentas -------------------------------------
  // Las CUENTAS nunca se crean ni se borran (regla de la metodología): sólo se
  // renombran. Las SUB-CUENTAS sí: crear, renombrar, mover y borrar libremente.

  const handleRenameAccount = (contextId: string, accountId: string, newName: string) => {
      setState(prev => ({
          ...prev,
          contexts: prev.contexts.map(c => c.id !== contextId ? c : {
              ...c,
              accounts: c.accounts.map(a => a.id === accountId ? { ...a, name: newName } : a),
          }),
      }));
  };

  const handleRenameSubAccount = (contextId: string, accountId: string, subId: string, newName: string) => {
      setState(prev => ({
          ...prev,
          contexts: prev.contexts.map(c => c.id !== contextId ? c : {
              ...c,
              accounts: c.accounts.map(a => a.id !== accountId ? a : {
                  ...a,
                  subAccounts: a.subAccounts.map(s => s.id === subId ? { ...s, name: newName } : s),
              }),
          }),
      }));
  };

  // Borrar una sub-cuenta NUNCA borra el historial financiero: las transacciones
  // se quedan en el libro mayor, sólo pierden el vínculo con la sub-cuenta. Si
  // tenía saldo, se devuelve a la cuenta padre para no descuadrar el total.
  const handleDeleteSubAccount = (contextId: string, accountId: string, subId: string) => {
      setState(prev => {
          const contexts = prev.contexts.map(c => {
              if (c.id !== contextId) return c;
              return {
                  ...c,
                  accounts: c.accounts.map(a => {
                      if (a.id !== accountId) return a;
                      const sub = a.subAccounts.find(s => s.id === subId);
                      let balances = { ...a.balances };
                      if (sub) {
                          for (const [cur, amount] of Object.entries(sub.balances || {})) {
                              const v = Number(amount) || 0;
                              if (v) balances = addToBalance(balances, cur, v);
                          }
                      }
                      return { ...a, balances, subAccounts: a.subAccounts.filter(s => s.id !== subId) };
                  }),
              };
          });
          const transactions = prev.transactions.map(t => (
              t.subAccountId === subId ? { ...t, subAccountId: undefined } : (
                  t.toSubAccountId === subId ? { ...t, toSubAccountId: undefined } : t
              )
          ));
          return { ...prev, contexts, transactions };
      });
  };

  // Mueve la sub-cuenta (con su saldo, historial y progreso) a otra cuenta.
  //
  // CRÍTICO: hay que reapuntar también las transacciones vinculadas. Las tx
  // guardan accountId + subAccountId, y applyTxEffect busca primero la cuenta y
  // luego la sub DENTRO de ella. Si se mueve la sub sin tocar las tx, esa
  // búsqueda falla en silencio (subIdx = -1) y cualquier reversión de saldo
  // —borrar o editar un gasto— se descarta sin aviso: descuadre permanente.
  const handleMoveSubAccount = (contextId: string, fromAccountId: string, toAccountId: string, subId: string) => {
      if (fromAccountId === toAccountId) return;
      setState(prev => {
          const ctx = prev.contexts.find(c => c.id === contextId);
          const sub = ctx?.accounts.find(a => a.id === fromAccountId)?.subAccounts.find(s => s.id === subId);
          if (!sub) return prev;
          return {
              ...prev,
              contexts: prev.contexts.map(c => c.id !== contextId ? c : {
                  ...c,
                  accounts: c.accounts.map(a => {
                      if (a.id === fromAccountId) return { ...a, subAccounts: a.subAccounts.filter(s => s.id !== subId) };
                      if (a.id === toAccountId) return { ...a, subAccounts: [...a.subAccounts, sub] };
                      return a;
                  }),
              }),
              transactions: prev.transactions.map(t => {
                  let next = t;
                  // Lado origen de la transacción
                  if (t.contextId === contextId && t.subAccountId === subId && t.accountId === fromAccountId) {
                      next = { ...next, accountId: toAccountId };
                  }
                  // Lado destino (transferencias que entran en esta sub-cuenta)
                  if (t.toContextId === contextId && t.toSubAccountId === subId && t.toAccountId === fromAccountId) {
                      next = { ...next, toAccountId: toAccountId };
                  }
                  return next;
              }),
          };
      });
  };

  // Cambiar meta, tipo (Meta <-> Objetivo), prioridad o estado de completado.
  const handleUpdateSubAccount = (
      contextId: string,
      accountId: string,
      subId: string,
      patch: Partial<Pick<SubAccount, 'name' | 'target' | 'goalKind' | 'priority' | 'completedAt'>>
  ) => {
      setState(prev => ({
          ...prev,
          contexts: prev.contexts.map(c => c.id !== contextId ? c : {
              ...c,
              accounts: c.accounts.map(a => a.id !== accountId ? a : {
                  ...a,
                  subAccounts: a.subAccounts.map(s => s.id === subId ? { ...s, ...patch } : s),
              }),
          }),
      }));
  };

  // Abono a un Objetivo SIN movimiento de dinero: la deuda baja pero no sale
  // nada de ninguna cuenta. Caso real: alguien que te debe te compensa con un
  // trabajo o con un cobro que pasó por su cuenta. No toca saldo ni métricas.
  const handleAddGoalEntry = (
      contextId: string,
      accountId: string,
      subId: string,
      data: { amount: number; date: string; note?: string; kind?: 'HISTORY' | 'CREDIT' }
  ) => {
      const entry: GoalEntry = {
          id: crypto.randomUUID(),
          date: data.date || new Date().toISOString(),
          amount: Number(data.amount),
          note: data.note,
          kind: data.kind || 'CREDIT',
      };
      setState(prev => ({
          ...prev,
          contexts: prev.contexts.map(c => c.id !== contextId ? c : {
              ...c,
              accounts: c.accounts.map(a => a.id !== accountId ? a : {
                  ...a,
                  subAccounts: a.subAccounts.map(s => s.id !== subId ? s : {
                      ...s,
                      entries: [...(s.entries || []), entry],
                  }),
              }),
          }),
      }));
  };

  const handleDeleteGoalEntry = (contextId: string, accountId: string, subId: string, entryId: string) => {
      setState(prev => ({
          ...prev,
          contexts: prev.contexts.map(c => c.id !== contextId ? c : {
              ...c,
              accounts: c.accounts.map(a => a.id !== accountId ? a : {
                  ...a,
                  subAccounts: a.subAccounts.map(s => s.id !== subId ? s : {
                      ...s,
                      entries: (s.entries || []).filter(e => e.id !== entryId),
                  }),
              }),
          }),
      }));
  };

  // Balance reconciliation: user enters the REAL balance they have; we compute
  // the delta vs the tracked balance and create a signed ADJUSTMENT entry.
  // Excluded from income/expense metrics — only corrects the balance.
  const handleAdjustment = (data: { contextId: string; accountId: string; subAccountId?: string; currency: string; realBalance: number; notes?: string }) => {
      const cur = data.currency || currencyCode;
      const ctx = state.contexts.find(c => c.id === data.contextId);
      const acc = ctx?.accounts.find(a => a.id === data.accountId);
      if (!acc) return;
      const currentBalance = data.subAccountId
          ? getBalance(acc.subAccounts.find(s => s.id === data.subAccountId)?.balances || {}, cur)
          : getBalance(acc.balances, cur);
      const delta = Number((data.realBalance - currentBalance).toFixed(2));
      if (delta === 0) return; // nothing to reconcile

      const newTx: Transaction = {
          id: crypto.randomUUID(),
          type: 'ADJUSTMENT',
          amount: delta,
          currency: cur,
          date: new Date().toISOString(),
          notes: data.notes || `Ajuste de saldo (${delta > 0 ? '+' : ''}${delta} ${cur})`,
          contextId: data.contextId,
          accountId: data.accountId,
          subAccountId: data.subAccountId || undefined,
      };
      setState(prev => ({
          ...prev,
          transactions: [newTx, ...prev.transactions],
          contexts: applyTxEffect(prev.contexts, newTx, 1),
      }));
      logAudit(newTx.id, 'CREATE', null, newTx);
      flashRecent([{ accountId: data.accountId, subAccountId: data.subAccountId || undefined, amount: Math.abs(delta), currency: cur, kind: delta >= 0 ? 'INCOME' : 'EXPENSE' }]);
  };

  const handleTransaction = (data: any) => {
    const cur = data.currency || currencyCode;
    const newTx: Transaction = { id: crypto.randomUUID(), ...data, currency: cur };
    const newContexts = [...state.contexts];
    const ctxIdx = newContexts.findIndex(c => c.id === data.contextId);

    if (ctxIdx > -1) {
        const accIdx = newContexts[ctxIdx].accounts.findIndex(a => a.id === data.accountId);
        if (accIdx > -1) {
            const acc = newContexts[ctxIdx].accounts[accIdx];
            const delta = data.type === 'INCOME' ? data.amount : -data.amount;
            if (data.subAccountId) {
                const subIdx = acc.subAccounts.findIndex(s => s.id === data.subAccountId);
                if (subIdx > -1) acc.subAccounts[subIdx].balances = addToBalance(acc.subAccounts[subIdx].balances, cur, delta);
            } else {
                acc.balances = addToBalance(acc.balances, cur, delta);
            }
        }
    }

    setState(prev => ({
        ...prev,
        transactions: [newTx, ...prev.transactions],
        contexts: newContexts
    }));
    logAudit(newTx.id, 'CREATE', null, newTx);

    flashRecent([{
        accountId: data.accountId,
        subAccountId: data.subAccountId || undefined,
        amount: data.amount,
        currency: cur,
        kind: data.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
    }]);

    // If this expense was linked to a subscription, advance its nextRenewal + counter
    if (data.linkedSubscriptionId) {
        setState(prev => ({
            ...prev,
            subscriptions: prev.subscriptions.map(s =>
                s.id === data.linkedSubscriptionId ? advanceSubscriptionRenewal(s) : s
            ),
        }));
    }

    if (data.type === 'INCOME' && data.distribute) {
        setTimeout(() => distributeIncome(data.contextId, cur, data.amount), 50);
    }
  };

  const handleTransfer = (data: any) => {
      const cur = data.currency || currencyCode;
      const newContexts = [...state.contexts];
      const updateBal = (ctxId: string, accId: string, subId: string | undefined, amount: number) => {
          const c = newContexts.find(c => c.id === ctxId);
          const a = c?.accounts.find(a => a.id === accId);
          if (a) {
              if (subId) {
                  const s = a.subAccounts.find(s => s.id === subId);
                  if (s) s.balances = addToBalance(s.balances, cur, amount);
              } else {
                  a.balances = addToBalance(a.balances, cur, amount);
              }
          }
      };
      updateBal(data.contextId, data.accountId, data.subAccountId, -data.amount);
      updateBal(data.toContextId, data.toAccountId, data.toSubAccountId, data.amount);
      const newTx: Transaction = { id: crypto.randomUUID(), ...data, currency: cur };
      setState(prev => ({ ...prev, contexts: newContexts, transactions: [newTx, ...prev.transactions] }));
      logAudit(newTx.id, 'CREATE', null, newTx);
      flashRecent([
          { accountId: data.accountId, subAccountId: data.subAccountId || undefined, amount: data.amount, currency: cur, kind: 'TRANSFER_OUT' },
          { accountId: data.toAccountId, subAccountId: data.toSubAccountId || undefined, amount: data.amount, currency: cur, kind: 'TRANSFER_IN' },
      ]);
  };

  const handleNewSubAccount = (data: any) => {
      const nueva: SubAccount = {
          id: `sub_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
          name: data.name,
          balances: {},
          target: data.target,
          goalKind: data.goalKind,
          priority: data.priority ?? null,
          entries: data.goalKind === 'PAYMENT' ? [] : undefined,
          completedAt: null,
          startDate: data.startDate,
      };
      setState(prev => ({
          ...prev,
          contexts: prev.contexts.map(c => c.id !== data.contextId ? c : {
              ...c,
              accounts: c.accounts.map(a => a.id !== data.accountId ? a : {
                  ...a,
                  subAccounts: [...a.subAccounts, nueva],
              }),
          }),
      }));
  };

  const handleNewCategory = (data: any) => {
      setState(prev => ({ ...prev, categories: [...prev.categories, { id: `c_${Date.now()}`, ...data, icon: 'Tags' }]}));
  };

  // Same as handleNewCategory but returns the created Category synchronously
  // for inline-creation flows (e.g. "+ Nueva categoría" from TransactionForm).
  const createCategoryAndReturn = (data: any): Category => {
      const newCat: Category = { id: `c_${Date.now()}`, icon: 'Tags', ...data };
      setState(prev => ({ ...prev, categories: [...prev.categories, newCat] }));
      return newCat;
  };

  const handleUpdateCategory = (data: any) => {
      setState(prev => ({ ...prev, categories: prev.categories.map(c => c.id === data.id ? { ...c, ...data } : c) }));
  };

  const handleNewSubscription = (data: any) => {
      const uid = session?.user?.id;
      setState(prev => {
          const newSubs = [...prev.subscriptions, { id: `s_${Date.now()}`, ...data }];
          // Force immediate sync to BD so quick close doesn't lose the create
          if (uid) {
              supabase.from('profiles').update({ subscriptions: newSubs, updated_at: new Date().toISOString() }).eq('id', uid)
                  .then(({ error }) => { if (error) console.warn('[sync sub create]', error.message); });
          }
          return { ...prev, subscriptions: newSubs };
      });
  };

  const handleUpdateSubscription = (data: any) => {
      const uid = session?.user?.id;
      setState(prev => {
          const newSubs = prev.subscriptions.map(s => s.id === data.id ? { ...s, ...data } : s);
          // Force immediate sync — the debounced sync would also do it eventually
          // but quick close (esp. on iOS PWA) could lose changes mid-debounce.
          if (uid) {
              supabase.from('profiles').update({ subscriptions: newSubs, updated_at: new Date().toISOString() }).eq('id', uid)
                  .then(({ error }) => { if (error) console.warn('[sync sub update]', error.message); });
          }
          return { ...prev, subscriptions: newSubs };
      });
  };

  // Apply (or reverse, with sign = -1) a transaction's effect on context balances.
  const applyTxEffect = (contexts: FinancialContext[], tx: Transaction, sign: 1 | -1): FinancialContext[] => {
      const newContexts = [...contexts];
      const ctxIdx = newContexts.findIndex(c => c.id === tx.contextId);
      if (ctxIdx > -1) {
          const accIdx = newContexts[ctxIdx].accounts.findIndex(a => a.id === tx.accountId);
          if (accIdx > -1) {
              const acc = newContexts[ctxIdx].accounts[accIdx];
              // ADJUSTMENT stores a signed delta → add it directly (like income).
              const delta = sign * ((tx.type === 'INCOME' || tx.type === 'ADJUSTMENT') ? tx.amount : -tx.amount);
              if (tx.subAccountId) {
                  const subIdx = acc.subAccounts.findIndex(s => s.id === tx.subAccountId);
                  if (subIdx > -1) acc.subAccounts[subIdx].balances = addToBalance(acc.subAccounts[subIdx].balances, tx.currency, delta);
              } else {
                  acc.balances = addToBalance(acc.balances, tx.currency, delta);
              }
          }
      }
      if (tx.type === 'TRANSFER' && tx.toContextId && tx.toAccountId) {
          const toCtxIdx = newContexts.findIndex(c => c.id === tx.toContextId);
          if (toCtxIdx > -1) {
              const toAccIdx = newContexts[toCtxIdx].accounts.findIndex(a => a.id === tx.toAccountId);
              if (toAccIdx > -1) {
                  const acc = newContexts[toCtxIdx].accounts[toAccIdx];
                  const delta = sign * tx.amount;
                  if (tx.toSubAccountId) {
                      const subIdx = acc.subAccounts.findIndex(s => s.id === tx.toSubAccountId);
                      if (subIdx > -1) acc.subAccounts[subIdx].balances = addToBalance(acc.subAccounts[subIdx].balances, tx.currency, delta);
                  } else {
                      acc.balances = addToBalance(acc.balances, tx.currency, delta);
                  }
              }
          }
      }
      return newContexts;
  };

  // Audit log helper — fire-and-forget insert.
  const logAudit = (txId: string, action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE', before?: any, after?: any) => {
      const uid = session?.user?.id;
      if (!uid) return;
      supabase.from('transaction_audit').insert({
          transaction_id: txId,
          user_id: uid,
          action,
          data_before: before ?? null,
          data_after: after ?? null,
      }).then(({ error }) => { if (error) console.warn('[audit]', error.message); });
  };

  const handleDeleteTransaction = (txId: string) => {
      clearRecentIndicators();
      const deletedAt = new Date().toISOString();
      let txSnapshot: Transaction | undefined;
      setState(prev => {
          const tx = prev.transactions.find(t => t.id === txId);
          if (!tx || tx.deletedAt) return prev;
          txSnapshot = tx;
          return {
              ...prev,
              transactions: prev.transactions.map(t => t.id === txId ? { ...t, deletedAt } : t),
              contexts: applyTxEffect(prev.contexts, tx, -1),
          };
      });
      if (txSnapshot) logAudit(txId, 'DELETE', txSnapshot, { ...txSnapshot, deletedAt });
  };

  // Duplicate a transaction — keeps EVERY field identical, only changes id
  // and appends "(copia)" to the notes for easy identification.
  const handleDuplicateTransaction = (txId: string) => {
      const tx = state.transactions.find(t => t.id === txId);
      if (!tx) return;
      const dup: Transaction = {
          ...tx,
          id: crypto.randomUUID(),
          notes: tx.notes ? `${tx.notes} (copia)` : '(copia)',
          deletedAt: null,
      };
      // Apply balance effect for the duplicate
      setState(prev => ({
          ...prev,
          transactions: [dup, ...prev.transactions],
          contexts: applyTxEffect(prev.contexts, dup, 1),
      }));
      logAudit(dup.id, 'CREATE', null, dup);
      flashRecent([
          { accountId: dup.accountId, subAccountId: dup.subAccountId || undefined, amount: dup.amount, currency: dup.currency,
            kind: dup.type === 'INCOME' ? 'INCOME' : dup.type === 'EXPENSE' ? 'EXPENSE' : 'TRANSFER_OUT' },
          ...(dup.type === 'TRANSFER' && dup.toAccountId
              ? [{ accountId: dup.toAccountId, subAccountId: dup.toSubAccountId || undefined, amount: dup.amount, currency: dup.currency, kind: 'TRANSFER_IN' as const }]
              : []),
      ]);
  };

  const handleRestoreTransaction = (txId: string) => {
      clearRecentIndicators();
      let before: Transaction | undefined;
      setState(prev => {
          const tx = prev.transactions.find(t => t.id === txId);
          if (!tx || !tx.deletedAt) return prev;
          before = tx;
          return {
              ...prev,
              transactions: prev.transactions.map(t => t.id === txId ? { ...t, deletedAt: null } : t),
              contexts: applyTxEffect(prev.contexts, tx, 1),
          };
      });
      if (before) logAudit(txId, 'RESTORE', before, { ...before, deletedAt: null });
  };

  // Bulk delete — accumulates all reversals against the SAME prev state to
  // avoid the closure race where serial setState calls overwrote each other's
  // context updates (resulting in only the last reversal being applied).
  const handleBulkDeleteTransactions = (txIds: Set<string>) => {
      clearRecentIndicators();
      const deletedAt = new Date().toISOString();
      setState(prev => {
          let contexts = prev.contexts;
          const toDeleteList: Transaction[] = [];
          for (const id of txIds) {
              const tx = prev.transactions.find(t => t.id === id);
              if (!tx || tx.deletedAt) continue;
              contexts = applyTxEffect(contexts, tx, -1);
              toDeleteList.push(tx);
          }
          return {
              ...prev,
              transactions: prev.transactions.map(t => txIds.has(t.id) && !t.deletedAt ? { ...t, deletedAt } : t),
              contexts,
          };
      });
      // Fire-and-forget audit entries
      txIds.forEach(id => {
          const tx = state.transactions.find(t => t.id === id);
          if (tx && !tx.deletedAt) logAudit(id, 'DELETE', tx, { ...tx, deletedAt });
      });
      setBulkSelectedTxIds(new Set());
      setIsBulkMode(false);
  };

  const handleUpdateTransaction = (data: any) => {
      clearRecentIndicators();
      const oldTx = state.transactions.find(t => t.id === data.id);
      if (!oldTx) return;
      const cur = data.currency || currencyCode;
      const newContexts = [...state.contexts];

      // Reverse old balance
      const oldCtxIdx = newContexts.findIndex(c => c.id === oldTx.contextId);
      if (oldCtxIdx > -1) {
          const oldAccIdx = newContexts[oldCtxIdx].accounts.findIndex(a => a.id === oldTx.accountId);
          if (oldAccIdx > -1) {
              const acc = newContexts[oldCtxIdx].accounts[oldAccIdx];
              const reverseDelta = oldTx.type === 'INCOME' ? -oldTx.amount : oldTx.amount;
              if (oldTx.subAccountId) {
                  const subIdx = acc.subAccounts.findIndex(s => s.id === oldTx.subAccountId);
                  if (subIdx > -1) acc.subAccounts[subIdx].balances = addToBalance(acc.subAccounts[subIdx].balances, oldTx.currency, reverseDelta);
              } else {
                  acc.balances = addToBalance(acc.balances, oldTx.currency, reverseDelta);
              }
          }
      }

      // Apply new balance
      const newCtxIdx = newContexts.findIndex(c => c.id === data.contextId);
      if (newCtxIdx > -1) {
          const newAccIdx = newContexts[newCtxIdx].accounts.findIndex(a => a.id === data.accountId);
          if (newAccIdx > -1) {
              const acc = newContexts[newCtxIdx].accounts[newAccIdx];
              const newDelta = data.type === 'INCOME' ? data.amount : -data.amount;
              if (data.subAccountId) {
                  const subIdx = acc.subAccounts.findIndex(s => s.id === data.subAccountId);
                  if (subIdx > -1) acc.subAccounts[subIdx].balances = addToBalance(acc.subAccounts[subIdx].balances, cur, newDelta);
              } else {
                  acc.balances = addToBalance(acc.balances, cur, newDelta);
              }
          }
      }

      const updatedTx = { ...oldTx, ...data, currency: cur };
      setState(prev => ({
          ...prev,
          transactions: prev.transactions.map(t => t.id === data.id ? updatedTx : t),
          contexts: newContexts
      }));
      logAudit(oldTx.id, 'UPDATE', oldTx, updatedTx);
  };

  const handleNewBusiness = (data: any) => {
    let remainingBalance = Number(data.initialBalance) || 0;
    const cur = data.currency || currencyCode;

    const accounts: Account[] = [
      { id: `biz_${Date.now()}_inc`, name: 'Income', type: 'INCOME', balances: {}, subAccounts: [] },
      { id: `biz_${Date.now()}_prof`, name: 'Profit', type: 'HOLDING', balances: {}, percentageTarget: 5, subAccounts: [] },
      { id: `biz_${Date.now()}_ownr`, name: 'Owner Pay', type: 'HOLDING', balances: {}, percentageTarget: 50, subAccounts: [] },
      { id: `biz_${Date.now()}_tax`, name: 'Tax', type: 'HOLDING', balances: {}, percentageTarget: 15, subAccounts: [] },
      { id: `biz_${Date.now()}_opex`, name: 'Opex', type: 'EXPENSE', balances: {}, percentageTarget: 30, subAccounts: [] },
    ];

    if (data.distributed && remainingBalance > 0) {
        accounts.forEach(acc => {
            if (acc.type !== 'INCOME' && acc.percentageTarget) {
                const amount = remainingBalance * (acc.percentageTarget / 100);
                acc.balances = { [cur]: amount };
            }
        });
    } else if (remainingBalance > 0) {
        const incomeAcc = accounts.find(a => a.type === 'INCOME');
        if (incomeAcc) {
            incomeAcc.balances = { [cur]: remainingBalance };
        }
    }

    const newContext: FinancialContext = {
      id: `ctx_biz_${Date.now()}`,
      name: data.name,
      type: 'BUSINESS',
      accounts
    };
    setState(prev => ({ ...prev, contexts: [...prev.contexts, newContext] }));
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

  // ─── Mobile-only state ─────────────────────────────────────────────
  const [moreOpen, setMoreOpen] = useState(false);
  const [accountHistoryTarget, setAccountHistoryTarget] = useState<{ contextId: string; accountId: string; subAccountId?: string } | null>(null);
  const [trashOpen, setTrashOpen] = useState(false);
  const [chartDrill, setChartDrill] = useState<{ title: string; subtitle?: string; transactions: Transaction[]; currency: string } | null>(null);
  const [manageSubTarget, setManageSubTarget] = useState<{ contextId: string; accountId: string; subId: string } | null>(null);
  const [goalArchiveOpen, setGoalArchiveOpen] = useState(false);
  const [accountsTab, setAccountsTab] = useState<'CUENTAS' | 'GOALS'>('CUENTAS');
  const [creditTarget, setCreditTarget] = useState<{ contextId: string; accountId: string; subId: string; name: string } | null>(null);

  // ─── PWA / Push bootstrap ──────────────────────────────────────────
  useEffect(() => {
    // El SW se registra atado a APP_VERSION y se purgan las cachés de versiones
    // anteriores. Sin esto la app se quedaba servida desde una caché eterna y
    // los despliegues nuevos no llegaban nunca al móvil.
    registerServiceWorker(APP_VERSION);
    purgarCachesViejas(APP_VERSION);

    // Si el service worker que controla la página cambia (ha entrado una versión
    // nueva), se recarga una sola vez para empezar a usarla de verdad.
    if ('serviceWorker' in navigator) {
      let recargando = false;
      const alCambiar = () => {
        if (recargando) return;
        recargando = true;
        window.location.reload();
      };
      navigator.serviceWorker.addEventListener('controllerchange', alCambiar);
      return () => navigator.serviceWorker.removeEventListener('controllerchange', alCambiar);
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    if (!isPushSupported()) return;
    if (getPermissionState() === 'granted') {
      getCurrentSubscription().then((sub) => {
        if (!sub) subscribeToPush(session.user.id);
      });
    }
  }, [session]);

  // Honor PWA shortcuts (?action=expense, ?view=accounts)
  useEffect(() => {
    if (!hasFetchedData) return;
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const view = params.get('view');
    if (action === 'expense') setActiveModal('EXPENSE');
    else if (action === 'income') setActiveModal('INCOME');
    else if (action === 'transfer') setActiveModal('TRANSFER');
    if (view === 'accounts') setCurrentView('ACCOUNTS');
    else if (view === 'subscriptions') setCurrentView('SUBSCRIPTIONS');
    else if (view === 'transactions') setCurrentView('TRANSACTIONS');
    if (action || view) {
      const url = new URL(window.location.href);
      url.searchParams.delete('action');
      url.searchParams.delete('view');
      window.history.replaceState({}, '', url.toString());
    }
  }, [hasFetchedData]);

  // Always reset scroll to the top when switching sections.
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [currentView]);

  // --- Render ---

  if (!isLoaded) {
    return <BrandLoader label="Cargando Bóveda" fullscreen />;
  }

  if (!session) {
    return <Auth onLogin={() => {}} />;
  }

  if (isAccountPaused) {
    return (
      <div className="min-h-[100svh] marble-dark flex items-end sm:items-center justify-center px-4 pb-safe pt-safe">
        <div className="w-full max-w-[440px] mx-auto bg-stone rounded-3xl p-8 text-center wv-pop-in shadow-[0_24px_48px_rgba(0,0,0,0.4)]">
          <img src={WHITEVAULT_ISOTYPE} alt="WhiteVault" className="w-16 h-16 mx-auto mb-5 opacity-90" />
          <div className="metallic-line w-20 mx-auto mb-5" />
          <h1 className="font-display text-2xl font-bold text-onyx tracking-tight mb-3">Cuenta Pausada</h1>
          <p className="text-graphite text-sm leading-relaxed mb-6">
            Tu suscripción no se ha podido renovar. Para recuperar el acceso a tu bóveda, actualiza tu método de pago.
          </p>
          <a
            href="#"
            className="block w-full h-12 bg-onyx text-white text-xs font-display font-bold uppercase tracking-widest rounded-xl flex items-center justify-center active:scale-95 transition-transform"
          >
            Renovar Suscripción
          </a>
          <p className="text-[10px] text-graphite/60 mt-4">
            Tus datos están seguros. Al renovar, recuperarás acceso completo.
          </p>
          <button
            {...pressProps(() => { supabase.auth.signOut(); })}
            className="mt-5 text-[10px] text-graphite hover:text-onyx uppercase tracking-widest font-bold transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  if (needsOnboarding) {
    return (
        <Onboarding
            onExit={() => { setNeedsOnboarding(false); supabase.auth.signOut(); }}
            onComplete={(name, avatarUrl, currency, personalContext, addBusiness, businessContext) => {
                const newContexts = [personalContext];
                if (addBusiness && businessContext) {
                    newContexts.push(businessContext);
                }
                setNeedsOnboarding(false);
                setState(s => ({
                    ...s,
                    user: { ...s.user, name, avatarUrl, currency },
                    contexts: newContexts
                }));
                setShowPasswordModal(true);
            }}
        />
    );
  }

  // Greeting
  const getGreeting = (name: string) => {
    const h = new Date().getHours();
    const greet = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
    const first = name.split(' ')[0] || '';
    return first ? `${greet}, ${first}` : greet;
  };

  // Mobile bottom-tab items (5 — last opens "Más" drawer)
  const tabItems: TabItem[] = [
    { id: 'DASHBOARD', label: 'Inicio', icon: Icons.Dashboard },
    { id: 'ACCOUNTS', label: 'Bóvedas', icon: Icons.Accounts },
    { id: 'TRANSACTIONS', label: 'Libro', icon: Icons.Receipt },
    { id: 'SUBSCRIPTIONS', label: 'Subs', icon: Icons.Subscription },
    { id: 'MORE', label: 'Más', icon: Icons.More },
  ];

  // Desktop sidebar items (full set, no "Más")
  const sidebarItems: TabItem[] = [
    { id: 'DASHBOARD', label: 'Inicio', icon: Icons.Dashboard },
    { id: 'ACCOUNTS', label: 'Bóvedas', icon: Icons.Accounts },
    { id: 'TRANSACTIONS', label: 'Libro Mayor', icon: Icons.Receipt },
    { id: 'SUBSCRIPTIONS', label: 'Suscripciones', icon: Icons.Subscription },
    { id: 'CATEGORIES', label: 'Categorías', icon: Icons.Category },
    { id: 'SETTINGS', label: 'Configuración', icon: Icons.Settings },
  ];

  const handleTabChange = (id: string) => {
    if (id === 'MORE') { setMoreOpen(true); return; }
    setCurrentView(id as View);
  };
  const activeTabId = currentView === 'CATEGORIES' || currentView === 'SETTINGS' ? 'MORE' : currentView;

  const headerConfig: Record<View, { title: string; subtitle?: string; large?: boolean }> = {
    DASHBOARD: { title: 'Inicio', subtitle: getGreeting(state.user.name), large: true },
    ACCOUNTS: { title: 'Bóvedas', subtitle: 'Profit First', large: true },
    TRANSACTIONS: { title: 'Libro Mayor', subtitle: 'Movimientos' },
    SUBSCRIPTIONS: { title: 'Suscripciones', subtitle: 'Pagos recurrentes' },
    CATEGORIES: { title: 'Categorías', subtitle: 'Presupuestos' },
    SETTINGS: { title: 'Configuración', subtitle: 'Ajustes y cuenta', large: true },
  };
  const hc = headerConfig[currentView] || headerConfig.DASHBOARD;

  const handleSaveProfile = async () => {
    try {
      const userId = session?.user?.id;
      if (!userId) throw new Error('No hay sesión activa');
      const currentEmail = session?.user?.email;
      if (state.user.email !== currentEmail) {
        const res = await fetch('https://avezdjpqwddyvnxtskuq.supabase.co/functions/v1/change-email', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer whitevault2026secure', 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, currentEmail, newEmail: state.user.email, userName: state.user.name }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Error al cambiar email');
      } else {
        await supabase.from('profiles').update({ name: state.user.name }).eq('id', userId);
      }
      alert('Perfil guardado correctamente');
    } catch (err: any) {
      alert('Error al guardar: ' + (err.message || err));
    }
  };

  return (
    <ToastProvider>
      <MobileShell
        sidebar={
          <DesktopSidebar
            tabs={sidebarItems}
            activeId={currentView}
            onChange={(id) => setCurrentView(id as View)}
            onFabPress={() => setIsActionsOpen(true)}
            user={{ name: state.user.name, email: state.user.email, avatarUrl: state.user.avatarUrl }}
            onUserClick={() => setCurrentView('SETTINGS')}
            brand={{ isotype: WHITEVAULT_ISOTYPE }}
          />
        }
      >
        <MobileHeader
          {...hc}
          leading={
            <button {...pressProps(() => haptic('light'))} className="p-1 active:scale-95 transition-transform lg:hidden">
              <img src={WHITEVAULT_ISOTYPE} alt="WhiteVault" className="w-7 h-7 object-contain" />
            </button>
          }
          trailing={
            currentView !== 'SETTINGS' ? (
              <div className="lg:hidden">
                <HeaderButton onClick={() => setCurrentView('SETTINGS')} ariaLabel="Configuración">
                  <Icons.Settings className="w-4 h-4 text-onyx" />
                </HeaderButton>
              </div>
            ) : null
          }
        />

        {/* Context switcher row (non-dashboard, non-settings views) */}
        {currentView !== 'DASHBOARD' && currentView !== 'SETTINGS' && state.contexts.length > 1 && (
          <div className="px-5 pt-3 pb-1 lg:hidden">
            <ContextSwitcher contexts={state.contexts} value={contextFilter} onChange={setContextFilter} />
          </div>
        )}

        <main className="overflow-x-hidden lg:max-w-[1200px] lg:mx-auto lg:w-full lg:px-2">
          {currentView === 'DASHBOARD' && (
            <MobileDashboard
              state={state}
              contextFilter={contextFilter}
              setContextFilter={setContextFilter}
              totalsByCurrency={totalsByCurrency}
              monthlyIncomeByCurrency={monthlyIncomeByCurrency}
              monthlyExpenseByCurrency={monthlyExpenseByCurrency}
              activeSubsCount={activeSubsCount}
              dashboardFilteredTransactions={dashboardCurrencyFilteredTransactions}
              dashboardFilteredSubs={dashboardFilteredSubs}
              dashboardIncome={dashboardIncome}
              dashboardExpense={dashboardExpense}
              filteredTransactions={filteredTransactions}
              formatCurrency={formatCurrency}
              formatDateTime={formatDateTime}
              dashboardDateRange={dashboardDateRange}
              applyDatePreset={applyDatePreset}
              setDashboardDateRange={setDashboardDateRange}
              getPresetLabel={getPresetLabel}
              currencyCode={currencyCode}
              onSummaryClick={(key) => {
                if (key === 'ALL') { setCurrentView('TRANSACTIONS'); return; }
                setDashboardSummaryType(key);
              }}
              onTransactionClick={(tx) => setSelectedTransaction(tx)}
              onSubscriptionClick={(s) => { setSelectedSubscription(s); setActiveModal('VIEW_SUBSCRIPTION'); }}
              onChartDrill={(d) => setChartDrill(d)}
              currencyFilter={dashboardCurrencyFilter}
              setCurrencyFilter={setDashboardCurrencyFilter}
              availableCurrencies={allTxCurrencies}
            />
          )}
          {currentView === 'ACCOUNTS' && (
            <>
              {/* Pestañas de Bóvedas. "Cuentas" es la vista de siempre, intacta.
                  "Metas y Objetivos" es una vista global ADICIONAL: las sub-cuentas
                  se siguen viendo dentro de su cuenta, esto no las mueve. */}
              <div className="px-3 lg:px-8 pt-1 pb-3 lg:max-w-[1200px] lg:mx-auto lg:w-full">
                <div className="grid grid-cols-2 gap-2">
                  {([['CUENTAS', 'Cuentas'], ['GOALS', 'Metas y Objetivos']] as const).map(([id, label]) => (
                    <button
                      key={id}
                      {...pressProps(() => { haptic('selection'); setAccountsTab(id); })}
                      className={`h-11 rounded-xl text-xs font-display font-bold uppercase tracking-widest transition-all active:scale-[0.98] ${
                        accountsTab === id ? 'bg-onyx text-white' : 'bg-white border border-onyx/[0.12] text-graphite'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {accountsTab === 'CUENTAS' ? (
                <MobileAccounts
                  contexts={filteredContexts}
                  transactions={state.transactions}
                  formatCurrency={formatCurrency}
                  baseCurrency={currencyCode}
                  onDistributeIncome={(ctxId, cur) => distributeIncome(ctxId, cur)}
                  onAddSubAccount={(ctxId, accId) => { setSubAccountPreselect({ contextId: ctxId, accountId: accId }); setActiveModal('SUB_ACCOUNT'); }}
                  onUndoDistribution={undoLastDistribution}
                  canUndo={!!lastDistribution && lastDistribution.contextId === filteredContexts[0]?.id}
                  recentDistributions={recentDistributions}
                  recentTxByAccount={recentTxByAccount}
                  onAccountHistory={(ctxId, accId, subId) => setAccountHistoryTarget({ contextId: ctxId, accountId: accId, subAccountId: subId })}
                  onManageSubAccount={(ctxId, accId, subId) => setManageSubTarget({ contextId: ctxId, accountId: accId, subId })}
                  onRenameAccount={handleRenameAccount}
                  onOpenGoalArchive={() => setGoalArchiveOpen(true)}
                  onDeleteContext={(id) => setContextToDelete(id)}
                />
              ) : (
                <GoalsOverview
                  contexts={filteredContexts}
                  transactions={state.transactions}
                  formatCurrency={formatCurrency}
                  baseCurrency={currencyCode}
                  onOpenGoal={(ctxId, accId, subId) => setAccountHistoryTarget({ contextId: ctxId, accountId: accId, subAccountId: subId })}
                  onManageGoal={(ctxId, accId, subId) => setManageSubTarget({ contextId: ctxId, accountId: accId, subId })}
                  onOpenArchive={() => setGoalArchiveOpen(true)}
                />
              )}
            </>
          )}
          {currentView === 'TRANSACTIONS' && (
            <MobileTransactions
              state={state}
              filteredTransactions={filteredTransactions}
              transactionTypeFilter={transactionTypeFilter}
              setTransactionTypeFilter={setTransactionTypeFilter}
              currencyFilter={transactionsCurrencyFilter}
              setCurrencyFilter={setTransactionsCurrencyFilter}
              availableCurrencies={allTxCurrencies}
              isBulkMode={isBulkMode}
              setIsBulkMode={setIsBulkMode}
              bulkSelectedTxIds={bulkSelectedTxIds}
              setBulkSelectedTxIds={setBulkSelectedTxIds}
              formatCurrency={formatCurrency}
              formatDateTime={formatDateTime}
              formatTime={formatTime}
              formatDayLabel={formatDayLabel}
              getDayKey={getDayKey}
              onTxClick={(tx) => setSelectedTransaction(tx)}
              onBulkDelete={() => {
                if (confirm(`¿Eliminar ${bulkSelectedTxIds.size} transacción(es)?`)) handleBulkDeleteTransactions(bulkSelectedTxIds);
              }}
            />
          )}
          {currentView === 'SUBSCRIPTIONS' && (
            <MobileSubscriptions
              state={state}
              contextFilter={contextFilter}
              setContextFilter={setContextFilter}
              subscriptionStatusFilter={subscriptionStatusFilter}
              setSubscriptionStatusFilter={setSubscriptionStatusFilter}
              currencyFilter={subscriptionsCurrencyFilter}
              setCurrencyFilter={setSubscriptionsCurrencyFilter}
              availableCurrencies={subscriptionCurrencies}
              formatCurrency={formatCurrency}
              formatDateTime={formatDateTime}
              onSubClick={(s) => { setSelectedSubscription(s); setActiveModal('VIEW_SUBSCRIPTION'); }}
              onSubEdit={(s) => { setSelectedSubscription(s); setActiveModal('EDIT_SUBSCRIPTION'); }}
              onAddSub={() => { setSelectedSubscription(undefined); setActiveModal('SUBSCRIPTION'); }}
              getAccountName={getAccountName}
              getSubAccountName={getSubAccountName}
            />
          )}
          {currentView === 'CATEGORIES' && (
            <MobileCategories
              state={state}
              contextFilter={contextFilter}
              setContextFilter={setContextFilter}
              currencyFilter={categoriesCurrencyFilter}
              setCurrencyFilter={setCategoriesCurrencyFilter}
              availableCurrencies={allTxCurrencies}
              formatCurrency={formatCurrency}
              onCategoryClick={(c) => { setSelectedCategory(c); setActiveModal('VIEW_CATEGORY'); }}
              onCategoryEdit={(c) => { setSelectedCategory(c); setActiveModal('EDIT_CATEGORY'); }}
              onAddCategory={() => { setSelectedCategory(undefined); setActiveModal('CATEGORY'); }}
              getAccountName={getAccountName}
            />
          )}
          {currentView === 'SETTINGS' && (
            <MobileSettings
              state={state}
              setState={setState}
              session={session}
              filteredTimezones={filteredTimezones}
              tzSearch={tzSearch}
              setTzSearch={setTzSearch}
              currencySearch={currencySearch}
              setCurrencySearch={setCurrencySearch}
              newPassword={newPassword}
              setNewPassword={setNewPassword}
              confirmPassword={confirmPassword}
              setConfirmPassword={setConfirmPassword}
              passwordError={passwordError}
              setPasswordError={setPasswordError}
              passwordSuccess={passwordSuccess}
              setPasswordSuccess={setPasswordSuccess}
              isUpdatingPassword={isUpdatingPassword}
              setIsUpdatingPassword={setIsUpdatingPassword}
              onUpdateContextName={handleUpdateContextName}
              onUpdateAccountPercentage={handleUpdateAccountPercentage}
              onDeleteContext={(id) => setContextToDelete(id)}
              onNewBusiness={() => setActiveModal('NEW_BIZ')}
              onSignOut={() => { if (confirm('¿Cerrar sesión?')) supabase.auth.signOut(); }}
              onSaveProfile={handleSaveProfile}
              onOpenTrash={() => setTrashOpen(true)}
              deletedCount={deletedTransactions.length}
            />
          )}
        </main>

        <BottomTabBar
          tabs={tabItems}
          activeId={activeTabId}
          onChange={handleTabChange}
          onFabPress={() => setIsActionsOpen(true)}
        />

        {/* FAB quick actions */}
        <FabSheet
          open={isActionsOpen}
          onClose={() => setIsActionsOpen(false)}
          actions={[
            { id: 'expense', label: 'Gasto', description: 'Registrar un gasto', icon: Icons.Expense, tone: 'expense', onClick: () => setActiveModal('EXPENSE') },
            { id: 'income', label: 'Ingreso', description: 'Registrar un ingreso', icon: Icons.Income, tone: 'income', onClick: () => setActiveModal('INCOME') },
            { id: 'transfer', label: 'Transferencia', description: 'Mover dinero entre cuentas', icon: Icons.Transfer, onClick: () => setActiveModal('TRANSFER') },
            { id: 'subscription', label: 'Suscripción', description: 'Nuevo pago recurrente', icon: Icons.Subscription, onClick: () => { setSelectedSubscription(undefined); setActiveModal('SUBSCRIPTION'); } },
            { id: 'category', label: 'Categoría', description: 'Crear categoría', icon: Icons.Category, onClick: () => { setSelectedCategory(undefined); setActiveModal('CATEGORY'); } },
            { id: 'sub_account', label: 'Sub-Cuenta', description: 'Añadir sub-cuenta', icon: Icons.Accounts, onClick: () => setActiveModal('SUB_ACCOUNT') },
            { id: 'adjust', label: 'Ajustar Saldo', description: 'Cuadrar con tu saldo real', icon: Icons.Refresh, onClick: () => setActiveModal('ADJUST') },
          ]}
        />

        {/* "Más" drawer (Categorías + Settings shortcut) — uses BottomSheet
            so it dismisses reliably (drag/backdrop/back-arrow). */}
        <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Otras Secciones" subtitle="Más">
          <div className="grid grid-cols-2 gap-3">
            <button {...pressProps(() => { setMoreOpen(false); setCurrentView('CATEGORIES'); haptic('selection'); })} className="bg-white border border-black/5 rounded-2xl p-5 active:scale-[0.97] transition-transform text-left">
              <div className="w-10 h-10 rounded-xl bg-stone border border-black/5 flex items-center justify-center mb-3">
                <Icons.Category className="w-5 h-5 text-onyx" />
              </div>
              <div className="text-sm font-display font-bold text-onyx">Categorías</div>
              <div className="text-[10px] text-graphite mt-0.5">{state.categories.length} categorías</div>
            </button>
            <button {...pressProps(() => { setMoreOpen(false); setCurrentView('SETTINGS'); haptic('selection'); })} className="bg-white border border-black/5 rounded-2xl p-5 active:scale-[0.97] transition-transform text-left">
              <div className="w-10 h-10 rounded-xl bg-stone border border-black/5 flex items-center justify-center mb-3">
                <Icons.Settings className="w-5 h-5 text-onyx" />
              </div>
              <div className="text-sm font-display font-bold text-onyx">Configuración</div>
              <div className="text-[10px] text-graphite mt-0.5">Cuenta, notif., divisa</div>
            </button>
          </div>
        </BottomSheet>

        {/* Form modals (existing components — render above shell) */}
        {activeModal === 'EXPENSE' && <TransactionForm type="EXPENSE" state={state} onSubmit={handleTransaction} onClose={() => setActiveModal(null)} onCreateCategory={createCategoryAndReturn} />}
        {activeModal === 'INCOME' && <TransactionForm type="INCOME" state={state} onSubmit={handleTransaction} onClose={() => setActiveModal(null)} onCreateCategory={createCategoryAndReturn} />}
        {activeModal === 'TRANSFER' && <TransferForm state={state} onSubmit={handleTransfer} onClose={() => setActiveModal(null)} />}
        {activeModal === 'CATEGORY' && <CategoryForm state={state} onSubmit={handleNewCategory} onClose={() => setActiveModal(null)} />}
        {activeModal === 'EDIT_CATEGORY' && selectedCategory && <CategoryForm state={state} initialData={selectedCategory} onSubmit={handleUpdateCategory} onClose={() => setActiveModal(null)} />}
        {activeModal === 'SUB_ACCOUNT' && <SubAccountForm state={state} onSubmit={handleNewSubAccount} onClose={() => { setActiveModal(null); setSubAccountPreselect(null); }} initialContextId={subAccountPreselect?.contextId} initialAccountId={subAccountPreselect?.accountId} />}
        {activeModal === 'SUBSCRIPTION' && <SubscriptionForm state={state} onSubmit={handleNewSubscription} onClose={() => setActiveModal(null)} />}
        {activeModal === 'EDIT_SUBSCRIPTION' && selectedSubscription && <SubscriptionForm state={state} initialData={selectedSubscription} onSubmit={handleUpdateSubscription} onClose={() => setActiveModal(null)} />}
        {activeModal === 'EDIT_TRANSACTION' && selectedTransaction && (
          <TransactionForm
            type={selectedTransaction.type as 'EXPENSE' | 'INCOME'}
            state={state}
            initialData={selectedTransaction}
            onSubmit={(data: any) => { handleUpdateTransaction(data); setSelectedTransaction(undefined); }}
            onClose={() => { setActiveModal(null); setSelectedTransaction(undefined); }}
          />
        )}
        {activeModal === 'NEW_BIZ' && <NewContextForm onSubmit={handleNewBusiness} onClose={() => setActiveModal(null)} />}
        {activeModal === 'ADJUST' && <AdjustBalanceForm state={state} onSubmit={handleAdjustment} onClose={() => setActiveModal(null)} />}

        {/* Detail bottom sheets */}
        <TransactionDetailSheet
          state={state}
          tx={selectedTransaction}
          open={!!selectedTransaction && (!activeModal || activeModal === 'VIEW_TRANSACTION')}
          onClose={() => setSelectedTransaction(undefined)}
          onEdit={() => setActiveModal('EDIT_TRANSACTION')}
          onDelete={() => { if (selectedTransaction) { handleDeleteTransaction(selectedTransaction.id); setSelectedTransaction(undefined); } }}
          onDuplicate={() => { if (selectedTransaction) { handleDuplicateTransaction(selectedTransaction.id); setSelectedTransaction(undefined); } }}
          formatCurrency={formatCurrency}
          formatDateTime={formatDateTime}
          getAccountName={getAccountName}
          getSubAccountName={getSubAccountName}
        />
        <SubscriptionDetailSheet
          state={state}
          sub={selectedSubscription}
          open={activeModal === 'VIEW_SUBSCRIPTION' && !!selectedSubscription}
          onClose={() => { setActiveModal(null); setSelectedSubscription(undefined); }}
          onEdit={() => setActiveModal('EDIT_SUBSCRIPTION')}
          onTxClick={(tx) => { setActiveModal(null); setSelectedSubscription(undefined); setSelectedTransaction(tx); }}
          formatCurrency={formatCurrency}
          formatDateTime={formatDateTime}
          getAccountName={getAccountName}
          getSubAccountName={getSubAccountName}
        />
        <CategoryHistorySheet
          state={state}
          cat={selectedCategory}
          open={activeModal === 'VIEW_CATEGORY' && !!selectedCategory}
          onClose={() => { setActiveModal(null); setSelectedCategory(undefined); }}
          onEdit={() => setActiveModal('EDIT_CATEGORY')}
          onTxClick={(tx) => { setActiveModal(null); setSelectedCategory(undefined); setSelectedTransaction(tx); }}
          formatCurrency={formatCurrency}
          formatDateTime={formatDateTime}
          getAccountName={getAccountName}
          getSubAccountName={getSubAccountName}
        />
        <DashboardSummarySheet
          state={state}
          type={dashboardSummaryType}
          onClose={() => setDashboardSummaryType(null)}
          totalsByCurrency={totalsByCurrency}
          dashboardFilteredTransactions={dashboardFilteredTransactions}
          dashboardFilteredSubs={dashboardFilteredSubs}
          onTransactionClick={(tx) => setSelectedTransaction(tx)}
          onSubscriptionClick={(s) => { setSelectedSubscription(s); setActiveModal('VIEW_SUBSCRIPTION'); }}
          formatCurrency={formatCurrency}
          formatDateTime={formatDateTime}
          getAccountName={getAccountName}
          getSubAccountName={getSubAccountName}
        />
        <DeleteConfirmSheet
          open={!!contextToDelete}
          onClose={() => setContextToDelete(null)}
          onConfirm={() => { if (contextToDelete) handleDeleteContext(contextToDelete); }}
          title="¿Eliminar negocio?"
          description="Esta acción es irreversible. Perderás la configuración de las cuentas de este negocio."
        />
        <PasswordSetupSheet
          open={showPasswordModal}
          onClose={() => {}}
          newPassword={newPassword}
          setNewPassword={setNewPassword}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          passwordError={passwordError}
          setPasswordError={setPasswordError}
          isUpdating={isUpdatingPassword}
          onSubmit={async () => {
            if (newPassword !== confirmPassword) { setPasswordError('No coinciden'); return; }
            if (newPassword.length < 6) { setPasswordError('Mínimo 6 caracteres'); return; }
            setIsUpdatingPassword(true);
            setPasswordError('');
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            setIsUpdatingPassword(false);
            if (error) setPasswordError(error.message);
            else { setShowPasswordModal(false); setNewPassword(''); setConfirmPassword(''); }
          }}
        />

        <AccountHistorySheet
          state={state}
          open={!!accountHistoryTarget}
          onClose={() => setAccountHistoryTarget(null)}
          target={accountHistoryTarget}
          transactions={activeTransactions}
          onTxClick={(tx) => setSelectedTransaction(tx)}
          formatCurrency={formatCurrency}
          formatDateTime={formatDateTime}
          getAccountName={getAccountName}
          getSubAccountName={getSubAccountName}
        />

        <ChartDrillSheet
          state={state}
          open={!!chartDrill}
          onClose={() => setChartDrill(null)}
          data={chartDrill}
          onTxClick={(tx) => setSelectedTransaction(tx)}
          onSubClick={(s) => { setSelectedSubscription(s); setActiveModal('VIEW_SUBSCRIPTION'); }}
          formatCurrency={formatCurrency}
          formatDateTime={formatDateTime}
          getAccountName={getAccountName}
          getSubAccountName={getSubAccountName}
        />

        <TrashSheet
          state={state}
          open={trashOpen}
          onClose={() => setTrashOpen(false)}
          deletedTransactions={deletedTransactions}
          onRestore={(txId) => handleRestoreTransaction(txId)}
          formatCurrency={formatCurrency}
          formatDateTime={formatDateTime}
          getAccountName={getAccountName}
          getSubAccountName={getSubAccountName}
        />
        <ManageSubAccountSheet
          open={!!manageSubTarget}
          onClose={() => setManageSubTarget(null)}
          state={state}
          target={manageSubTarget}
          formatCurrency={formatCurrency}
          onRename={(name) => manageSubTarget && handleRenameSubAccount(manageSubTarget.contextId, manageSubTarget.accountId, manageSubTarget.subId, name)}
          onMove={(toAccountId) => {
            if (!manageSubTarget) return;
            handleMoveSubAccount(manageSubTarget.contextId, manageSubTarget.accountId, toAccountId, manageSubTarget.subId);
            setManageSubTarget({ ...manageSubTarget, accountId: toAccountId });
          }}
          onUpdate={(patch) => manageSubTarget && handleUpdateSubAccount(manageSubTarget.contextId, manageSubTarget.accountId, manageSubTarget.subId, patch)}
          onAddCredit={() => {
            if (!manageSubTarget) return;
            const ctx = state.contexts.find(c => c.id === manageSubTarget.contextId);
            const sub = ctx?.accounts.find(a => a.id === manageSubTarget.accountId)?.subAccounts.find(s => s.id === manageSubTarget.subId);
            setCreditTarget({ ...manageSubTarget, name: sub?.name || '' });
            setManageSubTarget(null);
          }}
          onDelete={() => manageSubTarget && handleDeleteSubAccount(manageSubTarget.contextId, manageSubTarget.accountId, manageSubTarget.subId)}
        />
        <GoalCreditSheet
          open={!!creditTarget}
          onClose={() => setCreditTarget(null)}
          subName={creditTarget?.name || ''}
          onSubmit={(data) => creditTarget && handleAddGoalEntry(creditTarget.contextId, creditTarget.accountId, creditTarget.subId, { ...data, kind: 'CREDIT' })}
        />
        <GoalArchiveSheet
          open={goalArchiveOpen}
          onClose={() => setGoalArchiveOpen(false)}
          state={state}
          formatCurrency={formatCurrency}
          formatDateTime={formatDateTime}
        />
        <UpdatePopup />
      </MobileShell>
    </ToastProvider>
  );
}

export default App;