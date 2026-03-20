import React, { useState, useCallback, useMemo } from 'react';
import { AppState, FinancialContext, Transaction, Account } from './types';
import { INITIAL_STATE } from './constants';
import { Icons } from './components/Icons';
import { AccountsView } from './components/AccountsView';
import { TransactionForm, TransferForm, CategoryForm, SubAccountForm, SubscriptionForm, NewContextForm } from './components/ActionModals';
import { Auth } from './components/Auth';
import { Onboarding } from './components/Onboarding';
import { Sidebar } from './components/Sidebar';
import { Header, QuickActionsMenu } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { TransactionsView } from './components/TransactionsView';
import { CategoriesView } from './components/CategoriesView';
import { SubscriptionsView } from './components/SubscriptionsView';
import { SettingsView } from './components/SettingsView';

import { useAuth } from './hooks/useAuth';
import { useSupabaseSync } from './hooks/useSupabaseSync';
import { useDistribution } from './hooks/useDistribution';
import { useFormatters } from './hooks/useFormatters';
import { useModalReducer } from './hooks/useModalReducer';
import { generateId } from './utils/helpers';
import { supabase } from './lib/supabase';
import { validatePasswordMatch, validateMinLength } from './utils/helpers';

type View = 'DASHBOARD' | 'ACCOUNTS' | 'TRANSACTIONS' | 'SUBSCRIPTIONS' | 'CATEGORIES' | 'SETTINGS';

const DICTIONARY = {
  dashboard: 'Panel Principal', accounts: 'Bóvedas y Metas', transactions: 'Libro Mayor',
  subscriptions: 'Suscripciones', categories: 'Categorías', settings: 'Configuración',
  expense: 'Gasto', income: 'Ingreso', transfer: 'Transferencia',
  subscription: 'Suscrip.', category: 'Categoría', subAcc: 'Sub-Cta',
};

function App() {
  // --- Core State ---
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [currentView, setCurrentView] = useState<View>('DASHBOARD');
  const [contextFilter, setContextFilter] = useState<string>('ALL');

  // --- UI State ---
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopSidebarExpanded, setIsDesktopSidebarExpanded] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [showDemoOnboarding, setShowDemoOnboarding] = useState(false);

  // --- Password Modal State (for post-onboarding) ---
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // --- Custom Hooks ---
  const { session, isLoaded, signOut } = useAuth(setState);
  useSupabaseSync(state, isLoaded, session);
  const { lastDistribution, recentDistributions, distributeIncome, undoLastDistribution } = useDistribution(state, setState);
  const { formatCurrency, formatDateTime, getAccountName, getSubAccountName, timezones } = useFormatters(state.user.currency, state.user.timezone, state.contexts);
  const { modalState, dispatchModal } = useModalReducer();

  const t = DICTIONARY;

  // --- Navigation ---
  const navItems = useMemo(() => [
    { id: 'DASHBOARD', icon: Icons.Dashboard, label: t.dashboard },
    { id: 'ACCOUNTS', icon: Icons.Accounts, label: t.accounts },
    { id: 'TRANSACTIONS', icon: Icons.Transfer, label: t.transactions },
    { id: 'CATEGORIES', icon: Icons.Category, label: t.categories },
    { id: 'SUBSCRIPTIONS', icon: Icons.Subscription, label: t.subscriptions },
    { id: 'SETTINGS', icon: Icons.Settings, label: t.settings },
  ], []);

  const quickActions = useMemo(() => [
    { label: t.expense, icon: Icons.Expense, action: () => dispatchModal({ type: 'OPEN_MODAL', modal: 'EXPENSE' }) },
    { label: t.income, icon: Icons.Income, action: () => dispatchModal({ type: 'OPEN_MODAL', modal: 'INCOME' }) },
    { label: t.transfer, icon: Icons.Transfer, action: () => dispatchModal({ type: 'OPEN_MODAL', modal: 'TRANSFER' }) },
    { label: t.subscription, icon: Icons.Subscription, action: () => dispatchModal({ type: 'OPEN_MODAL', modal: 'SUBSCRIPTION' }) },
    { label: t.category, icon: Icons.Category, action: () => dispatchModal({ type: 'OPEN_MODAL', modal: 'CATEGORY' }) },
    { label: t.subAcc, icon: Icons.Accounts, action: () => dispatchModal({ type: 'OPEN_MODAL', modal: 'SUB_ACCOUNT' }) },
  ], [dispatchModal]);

  const toggleNavigation = useCallback(() => {
    if (window.innerWidth < 768) {
      setIsMobileMenuOpen(prev => !prev);
    } else {
      setIsDesktopSidebarExpanded(prev => !prev);
    }
  }, []);

  // --- Memoized Derived Data ---
  const filteredContexts = useMemo(() =>
    state.contexts.filter(c => contextFilter === 'ALL' || c.id === contextFilter),
    [state.contexts, contextFilter]
  );

  // --- Action Handlers (with useCallback) ---
  const handleTransaction = useCallback((data: any) => {
    const newTx: Transaction = { id: generateId('tx'), ...data };
    const newContexts = state.contexts.map(c => {
      if (c.id !== data.contextId) return c;
      return {
        ...c,
        accounts: c.accounts.map(acc => {
          if (acc.id !== data.accountId) return acc;
          if (data.subAccountId) {
            return {
              ...acc,
              subAccounts: acc.subAccounts.map(sub =>
                sub.id === data.subAccountId
                  ? { ...sub, balance: sub.balance + (data.type === 'INCOME' ? data.amount : -data.amount) }
                  : sub
              )
            };
          }
          return { ...acc, balance: acc.balance + (data.type === 'INCOME' ? data.amount : -data.amount) };
        })
      };
    });

    setState(prev => ({
      ...prev,
      transactions: [newTx, ...prev.transactions],
      contexts: newContexts
    }));

    if (data.type === 'INCOME' && data.distribute) {
      setTimeout(() => distributeIncome(data.contextId, data.amount), 50);
    }
  }, [state.contexts, distributeIncome]);

  const handleTransfer = useCallback((data: any) => {
    const newContexts = state.contexts.map(c => {
      return {
        ...c,
        accounts: c.accounts.map(acc => {
          // Source
          if (c.id === data.contextId && acc.id === data.accountId) {
            if (data.subAccountId) {
              return { ...acc, subAccounts: acc.subAccounts.map(s => s.id === data.subAccountId ? { ...s, balance: s.balance - data.amount } : s) };
            }
            return { ...acc, balance: acc.balance - data.amount };
          }
          // Destination
          if (c.id === data.toContextId && acc.id === data.toAccountId) {
            if (data.toSubAccountId) {
              return { ...acc, subAccounts: acc.subAccounts.map(s => s.id === data.toSubAccountId ? { ...s, balance: s.balance + data.amount } : s) };
            }
            return { ...acc, balance: acc.balance + data.amount };
          }
          return acc;
        })
      };
    });

    const newTx: Transaction = { id: generateId('tr'), ...data };
    setState(prev => ({ ...prev, contexts: newContexts, transactions: [newTx, ...prev.transactions] }));
  }, [state.contexts]);

  const handleNewSubAccount = useCallback((data: any) => {
    const newContexts = state.contexts.map(c => {
      if (c.id !== data.contextId) return c;
      return {
        ...c,
        accounts: c.accounts.map(acc => {
          if (acc.id !== data.accountId) return acc;
          return {
            ...acc,
            subAccounts: [...acc.subAccounts, {
              id: generateId('sub'),
              name: data.name,
              balance: 0,
              target: data.target,
              startDate: data.startDate
            }]
          };
        })
      };
    });
    setState(prev => ({ ...prev, contexts: newContexts }));
  }, [state.contexts]);

  const handleNewCategory = useCallback((data: any) => {
    setState(prev => ({
      ...prev,
      categories: [...prev.categories, { id: generateId('c'), ...data, icon: 'Tags' }]
    }));
  }, []);

  const handleUpdateCategory = useCallback((data: any) => {
    setState(prev => ({
      ...prev,
      categories: prev.categories.map(c => c.id === data.id ? { ...c, ...data } : c)
    }));
  }, []);

  const handleNewSubscription = useCallback((data: any) => {
    setState(prev => ({
      ...prev,
      subscriptions: [...prev.subscriptions, { id: generateId('s'), ...data }]
    }));
  }, []);

  const handleUpdateSubscription = useCallback((data: any) => {
    setState(prev => ({
      ...prev,
      subscriptions: prev.subscriptions.map(s => s.id === data.id ? { ...s, ...data } : s)
    }));
  }, []);

  const handleNewBusiness = useCallback((data: any) => {
    let remainingBalance = Number(data.initialBalance) || 0;

    const accounts: Account[] = [
      { id: generateId('biz_inc'), name: 'Income', type: 'INCOME', balance: 0, subAccounts: [] },
      { id: generateId('biz_prof'), name: 'Profit', type: 'HOLDING', balance: 0, percentageTarget: 5, subAccounts: [] },
      { id: generateId('biz_ownr'), name: 'Owner Pay', type: 'HOLDING', balance: 0, percentageTarget: 50, subAccounts: [] },
      { id: generateId('biz_tax'), name: 'Tax', type: 'HOLDING', balance: 0, percentageTarget: 15, subAccounts: [] },
      { id: generateId('biz_opex'), name: 'Opex', type: 'EXPENSE', balance: 0, percentageTarget: 30, subAccounts: [] },
    ];

    if (data.distributed && remainingBalance > 0) {
      accounts.forEach(acc => {
        if (acc.type !== 'INCOME' && acc.percentageTarget) {
          acc.balance = remainingBalance * (acc.percentageTarget / 100);
        }
      });
    } else if (remainingBalance > 0) {
      const incomeAcc = accounts.find(a => a.type === 'INCOME');
      if (incomeAcc) incomeAcc.balance = remainingBalance;
    }

    const newContext: FinancialContext = {
      id: generateId('ctx_biz'),
      name: data.name,
      type: 'BUSINESS',
      accounts
    };
    setState(prev => ({ ...prev, contexts: [...prev.contexts, newContext] }));
  }, []);

  const handleUpdateAccountPercentage = useCallback((contextId: string, accountId: string, percentage: number) => {
    setState(prev => ({
      ...prev,
      contexts: prev.contexts.map(c =>
        c.id !== contextId ? c : {
          ...c,
          accounts: c.accounts.map(a => a.id === accountId ? { ...a, percentageTarget: percentage } : a)
        }
      )
    }));
  }, []);

  const handleUpdateContextName = useCallback((contextId: string, newName: string) => {
    setState(prev => ({
      ...prev,
      contexts: prev.contexts.map(c => c.id !== contextId ? c : { ...c, name: newName })
    }));
  }, []);

  const handleDeleteContext = useCallback((contextId: string) => {
    setState(prev => ({
      ...prev,
      contexts: prev.contexts.filter(c => c.id !== contextId)
    }));
    if (contextFilter === contextId) setContextFilter('ALL');
  }, [contextFilter]);

  const getContextName = useCallback((ctxId: string) => {
    return state.contexts.find(c => c.id === ctxId)?.name || 'Desconocido';
  }, [state.contexts]);

  // --- Render: Loading ---
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

  // --- Render: Demo Onboarding ---
  if (showDemoOnboarding) {
    return <Onboarding onComplete={() => setShowDemoOnboarding(false)} />;
  }

  // --- Render: Auth ---
  if (!session) {
    return <Auth onLogin={() => {}} onDemoOnboarding={() => setShowDemoOnboarding(true)} />;
  }

  // --- Render: Onboarding (no contexts) ---
  if (state.contexts.length === 0) {
    return (
      <Onboarding
        onComplete={(name, avatarUrl, currency, personalContext, addBusiness, businessContext) => {
          const newContexts = [personalContext];
          if (addBusiness && businessContext) newContexts.push(businessContext);
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

  // --- Render: Main App ---
  return (
    <div className="flex h-screen overflow-hidden font-sans">

      <Sidebar
        state={state}
        currentView={currentView}
        isDesktopSidebarExpanded={isDesktopSidebarExpanded}
        isMobileMenuOpen={isMobileMenuOpen}
        onViewChange={setCurrentView}
        onToggle={toggleNavigation}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onNameChange={(name) => setState(s => ({ ...s, user: { ...s.user, name } }))}
        navItems={navItems}
      />

      <main className="flex-1 flex flex-col overflow-hidden relative bg-stone">
        <Header
          contexts={state.contexts}
          contextFilter={contextFilter}
          onContextFilterChange={setContextFilter}
          onToggleNav={toggleNavigation}
          onOpenActions={() => setIsActionsOpen(true)}
        />

        <div className="flex-1 overflow-y-auto relative">
          {currentView === 'DASHBOARD' && (
            <DashboardView state={state} contextFilter={contextFilter} formatCurrency={formatCurrency} />
          )}

          {currentView === 'ACCOUNTS' && (
            <div className="p-4 md:p-10 pb-32">
              <AccountsView
                contexts={filteredContexts}
                formatCurrency={formatCurrency}
                onDistributeIncome={(ctxId) => distributeIncome(ctxId)}
                recentDistributions={recentDistributions}
                onUndoDistribution={undoLastDistribution}
                canUndo={!!lastDistribution && lastDistribution.contextId === filteredContexts[0]?.id}
              />
            </div>
          )}

          {currentView === 'TRANSACTIONS' && (
            <div className="p-4 md:p-10 pb-32">
              <TransactionsView
                transactions={state.transactions}
                categories={state.categories}
                contextFilter={contextFilter}
                formatCurrency={formatCurrency}
                formatDateTime={formatDateTime}
              />
            </div>
          )}

          {currentView === 'CATEGORIES' && (
            <div className="p-4 md:p-10 pb-32">
              <CategoriesView
                categories={state.categories}
                contextFilter={contextFilter}
                formatCurrency={formatCurrency}
                getAccountName={getAccountName}
                getSubAccountName={getSubAccountName}
                getContextName={getContextName}
                onEditCategory={(cat) => dispatchModal({ type: 'OPEN_EDIT_CATEGORY', category: cat })}
                onNewCategory={() => dispatchModal({ type: 'OPEN_NEW_CATEGORY' })}
              />
            </div>
          )}

          {currentView === 'SUBSCRIPTIONS' && (
            <div className="p-4 md:p-10 pb-32">
              <SubscriptionsView
                subscriptions={state.subscriptions}
                contextFilter={contextFilter}
                formatCurrency={formatCurrency}
                getAccountName={getAccountName}
                getSubAccountName={getSubAccountName}
                onEditSubscription={(sub) => dispatchModal({ type: 'OPEN_EDIT_SUBSCRIPTION', subscription: sub })}
                onNewSubscription={() => dispatchModal({ type: 'OPEN_NEW_SUBSCRIPTION' })}
              />
            </div>
          )}

          {currentView === 'SETTINGS' && (
            <div className="p-4 md:p-10 pb-32">
              <SettingsView
                state={state}
                session={session}
                timezones={timezones}
                onStateChange={setState}
                onUpdateAccountPercentage={handleUpdateAccountPercentage}
                onUpdateContextName={handleUpdateContextName}
                onDeleteContext={handleDeleteContext}
                onOpenNewBiz={() => dispatchModal({ type: 'OPEN_MODAL', modal: 'NEW_BIZ' })}
                onSignOut={signOut}
              />
            </div>
          )}
        </div>
      </main>

      {/* Quick Actions Menu */}
      <QuickActionsMenu
        isOpen={isActionsOpen}
        onClose={() => setIsActionsOpen(false)}
        actions={quickActions}
      />

      {/* Modals (via reducer) */}
      {modalState.activeModal === 'EXPENSE' && <TransactionForm type="EXPENSE" state={state} onSubmit={handleTransaction} onClose={() => dispatchModal({ type: 'CLOSE_MODAL' })} />}
      {modalState.activeModal === 'INCOME' && <TransactionForm type="INCOME" state={state} onSubmit={handleTransaction} onClose={() => dispatchModal({ type: 'CLOSE_MODAL' })} />}
      {modalState.activeModal === 'TRANSFER' && <TransferForm state={state} onSubmit={handleTransfer} onClose={() => dispatchModal({ type: 'CLOSE_MODAL' })} />}
      {modalState.activeModal === 'CATEGORY' && <CategoryForm state={state} onSubmit={handleNewCategory} onClose={() => dispatchModal({ type: 'CLOSE_MODAL' })} />}
      {modalState.activeModal === 'EDIT_CATEGORY' && modalState.selectedCategory && <CategoryForm state={state} initialData={modalState.selectedCategory} onSubmit={handleUpdateCategory} onClose={() => dispatchModal({ type: 'CLOSE_MODAL' })} />}
      {modalState.activeModal === 'SUB_ACCOUNT' && <SubAccountForm state={state} onSubmit={handleNewSubAccount} onClose={() => dispatchModal({ type: 'CLOSE_MODAL' })} />}
      {modalState.activeModal === 'SUBSCRIPTION' && <SubscriptionForm state={state} onSubmit={handleNewSubscription} onClose={() => dispatchModal({ type: 'CLOSE_MODAL' })} />}
      {modalState.activeModal === 'EDIT_SUBSCRIPTION' && modalState.selectedSubscription && <SubscriptionForm state={state} initialData={modalState.selectedSubscription} onSubmit={handleUpdateSubscription} onClose={() => dispatchModal({ type: 'CLOSE_MODAL' })} />}
      {modalState.activeModal === 'NEW_BIZ' && <NewContextForm onSubmit={handleNewBusiness} onClose={() => dispatchModal({ type: 'CLOSE_MODAL' })} />}

      {/* Post-Onboarding Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full p-8 shadow-2xl border border-black/10 animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-display font-bold text-onyx mb-2 text-center">Crea tu contraseña de acceso</h3>
            <p className="text-graphite mb-6 text-sm text-center">
              Para asegurar tu cuenta, por favor establece una contraseña.
            </p>
            <div className="space-y-4">
              <input
                type="password"
                placeholder="Nueva contraseña"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-4 bg-stone border border-black/5 text-onyx font-sans outline-none focus:border-alloy"
              />
              <input
                type="password"
                placeholder="Confirmar contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-4 bg-stone border border-black/5 text-onyx font-sans outline-none focus:border-alloy"
              />
              {passwordError && <p className="text-red-500 text-xs font-bold text-center">{passwordError}</p>}
              <button
                onClick={async () => {
                  const matchErr = validatePasswordMatch(newPassword, confirmPassword);
                  if (matchErr) { setPasswordError(matchErr.message); return; }
                  const lenErr = validateMinLength(newPassword, 6, 'Contraseña');
                  if (lenErr) { setPasswordError(lenErr.message); return; }

                  setIsUpdatingPassword(true);
                  setPasswordError('');
                  try {
                    const { error } = await supabase.auth.updateUser({ password: newPassword });
                    if (error) { setPasswordError(error.message); }
                    else { setShowPasswordModal(false); setNewPassword(''); setConfirmPassword(''); }
                  } catch (err: any) {
                    setPasswordError(err.message || 'Error');
                  } finally {
                    setIsUpdatingPassword(false);
                  }
                }}
                disabled={isUpdatingPassword || !newPassword || !confirmPassword}
                className="w-full py-4 bg-onyx text-white font-display font-bold text-sm uppercase tracking-widest hover:bg-alloy transition-colors disabled:opacity-50"
              >
                {isUpdatingPassword ? 'Guardando...' : 'Guardar Contraseña'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
