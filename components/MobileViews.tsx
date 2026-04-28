// WhiteVault™ — Mobile views (Dashboard, Accounts, Transactions, Subscriptions, Categories, Settings)
// All views render inside MobileShell with bottom tab bar + safe areas.

import React, { useMemo, useState, useEffect } from 'react';
import { AppState, FinancialContext, Transaction, Subscription, Category, Account } from '../types';
import { Icons } from './Icons';
import {
  BottomSheet,
  Segmented,
  ListSection,
  ListRow,
  IconCircle,
  MetricCard,
  EmptyState,
  PressButton,
  Skeleton,
  haptic,
} from './Mobile';
import { balanceEntries } from '../utils/balances';
import { CURRENCIES } from '../constants';
import {
  isPushSupported,
  getPermissionState,
  subscribeToPush,
  unsubscribeFromPush,
  getCurrentSubscription,
  showLocalTest,
  isIOS,
  isStandalone,
} from '../lib/push';
import { supabase } from '../lib/supabase';
import { CashFlowChart, ExpenseBreakdown, IncomeVsExpenseChart, FinancialCalendar } from './Charts';

// ─── DASHBOARD ──────────────────────────────────────────────────────────
interface DashboardProps {
  state: AppState;
  contextFilter: string;
  setContextFilter: (id: string) => void;
  totalsByCurrency: Record<string, number>;
  monthlyIncomeByCurrency: Record<string, number>;
  monthlyExpenseByCurrency: Record<string, number>;
  activeSubsCount: number;
  dashboardFilteredTransactions: Transaction[];
  dashboardFilteredSubs: Subscription[];
  dashboardIncome: number;
  dashboardExpense: number;
  filteredTransactions: Transaction[];
  formatCurrency: (n: number, c?: string) => string;
  formatDateTime: (s: string) => string;
  dashboardDateRange: { start: string; end: string; preset: string };
  applyDatePreset: (p: string) => void;
  setDashboardDateRange: (r: any) => void;
  getPresetLabel: (id: string) => string;
  onSummaryClick: (key: string) => void;
  onTransactionClick: (tx: Transaction) => void;
  onSubscriptionClick: (s: Subscription) => void;
  currencyCode: string;
}

export const MobileDashboard: React.FC<DashboardProps> = (p) => {
  const [showFilter, setShowFilter] = useState(false);
  const recent = useMemo(
    () => [...p.dashboardFilteredTransactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8),
    [p.dashboardFilteredTransactions]
  );

  const upcoming = useMemo(() => p.dashboardFilteredSubs.slice(0, 3), [p.dashboardFilteredSubs]);

  const balanceTotal = Object.entries(p.totalsByCurrency);
  const primaryCurrency = balanceTotal[0]?.[0] ?? p.currencyCode;
  const primaryAmount = balanceTotal[0]?.[1] ?? 0;
  const otherCurrencies = balanceTotal.slice(1);

  return (
    <div className="pb-tabbar wv-stagger">
      {/* Hero patrimonio */}
      <section className="px-5 pt-2">
        <div className="marble-dark text-white p-6 rounded-3xl border border-black/40 shadow-[0_8px_32px_rgba(0,0,0,0.18)] relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-metallic opacity-50" />
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-gold">Patrimonio</div>
              <div className="text-[10px] text-graphite mt-0.5">{p.getPresetLabel(p.dashboardDateRange.preset)}</div>
            </div>
            <button
              onClick={() => { haptic('light'); setShowFilter(true); }}
              className="flex items-center gap-1.5 px-3 h-8 bg-white/10 backdrop-blur-md border border-white/10 text-[10px] font-bold uppercase tracking-widest rounded-full active:scale-95 transition-transform"
            >
              <Icons.Calendar className="w-3 h-3" />
              {p.getPresetLabel(p.dashboardDateRange.preset)}
            </button>
          </div>
          <div className="text-4xl font-display font-bold tracking-tight tabular">
            {p.formatCurrency(primaryAmount, primaryCurrency)}
          </div>
          {otherCurrencies.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {otherCurrencies.map(([cur, amt]) => (
                <div key={cur} className="px-2.5 py-1 bg-white/10 text-[11px] font-mono tabular rounded-full">
                  {p.formatCurrency(amt, cur)}
                </div>
              ))}
            </div>
          )}
          <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
            <ContextSwitcher contexts={p.state.contexts} value={p.contextFilter} onChange={p.setContextFilter} dark />
            <div className="text-right">
              <div className="text-[9px] uppercase tracking-widest text-graphite">Suscripciones</div>
              <div className="text-sm font-display font-bold text-white">{p.activeSubsCount} activas</div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats horizontales */}
      <section className="mt-5">
        <div className="px-5 mb-2 flex items-center justify-between">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-graphite">Movimiento del Periodo</h3>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar px-5 pb-1">
          <MetricCard
            label="Ingresos"
            value={Object.entries(p.monthlyIncomeByCurrency)[0] ? p.formatCurrency(Object.entries(p.monthlyIncomeByCurrency)[0][1], Object.entries(p.monthlyIncomeByCurrency)[0][0]) : p.formatCurrency(0)}
            sublabel={Object.keys(p.monthlyIncomeByCurrency).length > 1 ? `+${Object.keys(p.monthlyIncomeByCurrency).length - 1} monedas` : undefined}
            tone="income"
            onClick={() => p.onSummaryClick('INCOME')}
          />
          <MetricCard
            label="Gastos"
            value={Object.entries(p.monthlyExpenseByCurrency)[0] ? p.formatCurrency(Object.entries(p.monthlyExpenseByCurrency)[0][1], Object.entries(p.monthlyExpenseByCurrency)[0][0]) : p.formatCurrency(0)}
            sublabel={Object.keys(p.monthlyExpenseByCurrency).length > 1 ? `+${Object.keys(p.monthlyExpenseByCurrency).length - 1} monedas` : undefined}
            tone="expense"
            onClick={() => p.onSummaryClick('EXPENSE')}
          />
          <MetricCard
            label="Subs"
            value={String(p.activeSubsCount)}
            sublabel="activas"
            tone="gold"
            onClick={() => p.onSummaryClick('SUBS')}
          />
          <MetricCard
            label="Total"
            value={p.formatCurrency(primaryAmount, primaryCurrency)}
            sublabel="balance"
            onClick={() => p.onSummaryClick('BALANCE')}
          />
        </div>
      </section>

      {/* Próximas renovaciones */}
      {upcoming.length > 0 && (
        <ListSection
          title="Próximas Renovaciones"
          trailing={<button className="text-[10px] font-bold uppercase tracking-widest text-graphite" onClick={() => p.onSummaryClick('SUBS')}>Ver todas</button>}
        >
          {upcoming.map((s) => {
            const days = Math.ceil((new Date(s.nextRenewal).getTime() - Date.now()) / 86_400_000);
            return (
              <ListRow
                key={s.id}
                leading={<IconCircle tone="gold"><Icons.Subscription className="w-4 h-4" /></IconCircle>}
                title={s.name}
                subtitle={days <= 0 ? 'Hoy' : days === 1 ? 'Mañana' : `En ${days} días · ${p.formatDateTime(s.nextRenewal).split(' ')[0]}`}
                trailing={
                  <div>
                    <div className="text-sm font-display font-bold text-onyx tabular">{p.formatCurrency(s.amount, s.currency)}</div>
                    {s.cardLastFour && <div className="text-[10px] text-graphite font-mono">•••• {s.cardLastFour}</div>}
                  </div>
                }
                onClick={() => p.onSubscriptionClick(s)}
                chevron={false}
              />
            );
          })}
        </ListSection>
      )}

      {/* Charts */}
      <section className="px-3 mt-2 space-y-4">
        <div className="bg-white border border-black/5 rounded-2xl p-4 overflow-hidden">
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-graphite mb-3">Ingresos vs Gastos</div>
          <IncomeVsExpenseChart transactions={p.dashboardFilteredTransactions} currency={p.currencyCode} />
        </div>
        <div className="bg-white border border-black/5 rounded-2xl p-4 overflow-hidden">
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-graphite mb-3">Desglose por Categoría</div>
          <ExpenseBreakdown transactions={p.dashboardFilteredTransactions} categories={p.state.categories} currency={p.currencyCode} />
        </div>
        <div className="bg-white border border-black/5 rounded-2xl p-4 overflow-hidden">
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-graphite mb-3">Cash Flow</div>
          <CashFlowChart
            transactions={p.dashboardFilteredTransactions}
            categories={p.state.categories}
            currency={p.currencyCode}
            incomeTotal={p.dashboardIncome}
            expenseTotal={p.dashboardExpense}
          />
        </div>
        <div className="bg-white border border-black/5 rounded-2xl p-4 overflow-hidden">
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-graphite mb-3">Calendario Financiero</div>
          <FinancialCalendar transactions={p.filteredTransactions} subscriptions={p.state.subscriptions} currency={p.currencyCode} />
        </div>
      </section>

      {/* Actividad reciente */}
      {recent.length > 0 && (
        <ListSection
          title="Actividad Reciente"
          trailing={<button className="text-[10px] font-bold uppercase tracking-widest text-graphite" onClick={() => p.onSummaryClick('ALL')}>Ver libro</button>}
        >
          {recent.map((tx) => {
            const cat = tx.categoryId ? p.state.categories.find((c) => c.id === tx.categoryId) : null;
            const sign = tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : '';
            const tone = tx.type === 'INCOME' ? 'income' : tx.type === 'EXPENSE' ? 'expense' : 'transfer';
            const Icon = tx.type === 'INCOME' ? Icons.Income : tx.type === 'EXPENSE' ? Icons.Expense : Icons.Transfer;
            return (
              <ListRow
                key={tx.id}
                leading={<IconCircle tone={tone as any} bgColor={cat?.color}><Icon className="w-4 h-4" /></IconCircle>}
                title={tx.notes || (tx.type === 'TRANSFER' ? 'Transferencia' : tx.type === 'INCOME' ? 'Ingreso' : 'Gasto')}
                subtitle={`${p.formatDateTime(tx.date).split(',')[0]}${cat ? ` · ${cat.name}` : ''}`}
                trailing={
                  <span className={`text-sm font-display font-bold tabular ${tx.type === 'INCOME' ? 'text-emerald-700' : tx.type === 'EXPENSE' ? 'text-rose-700' : 'text-onyx'}`}>
                    {sign}{p.formatCurrency(tx.amount, tx.currency)}
                  </span>
                }
                onClick={() => p.onTransactionClick(tx)}
                chevron={false}
              />
            );
          })}
        </ListSection>
      )}

      {/* Date filter sheet */}
      <BottomSheet open={showFilter} onClose={() => setShowFilter(false)} title="Rango de Fecha" subtitle="Filtrar Periodo">
        <div className="grid grid-cols-2 gap-2 mb-4">
          {['TODAY', 'LAST_7', 'LAST_15', 'LAST_30', 'THIS_WEEK', 'THIS_MONTH', 'THIS_YEAR'].map((id) => {
            const active = p.dashboardDateRange.preset === id;
            return (
              <button
                key={id}
                onClick={() => { haptic('selection'); p.applyDatePreset(id); setShowFilter(false); }}
                className={`h-12 px-4 text-xs font-display font-bold uppercase tracking-widest rounded-xl transition-all ${active ? 'bg-onyx text-white' : 'bg-white text-onyx border border-black/10'}`}
              >
                {p.getPresetLabel(id)}
              </button>
            );
          })}
        </div>
        <div className="space-y-3 pt-3 border-t border-black/5">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-graphite">Personalizado</label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={p.dashboardDateRange.start}
              onChange={(e) => p.setDashboardDateRange({ ...p.dashboardDateRange, start: e.target.value, preset: 'CUSTOM' })}
              className="w-full h-12 px-3 bg-white border border-black/10 rounded-xl text-sm"
            />
            <input
              type="date"
              value={p.dashboardDateRange.end}
              onChange={(e) => p.setDashboardDateRange({ ...p.dashboardDateRange, end: e.target.value, preset: 'CUSTOM' })}
              className="w-full h-12 px-3 bg-white border border-black/10 rounded-xl text-sm"
            />
          </div>
          <PressButton full onClick={() => setShowFilter(false)}>Aplicar</PressButton>
        </div>
      </BottomSheet>
    </div>
  );
};

// ─── CONTEXT SWITCHER ───────────────────────────────────────────────────
export const ContextSwitcher: React.FC<{ contexts: FinancialContext[]; value: string; onChange: (id: string) => void; dark?: boolean }> = ({ contexts, value, onChange, dark }) => {
  const [open, setOpen] = useState(false);
  const current = value === 'ALL' ? 'Vista Global' : contexts.find((c) => c.id === value)?.name || 'Vista Global';
  return (
    <>
      <button
        onClick={() => { haptic('selection'); setOpen(true); }}
        className={`flex items-center gap-1.5 ${dark ? 'text-white' : 'text-onyx'}`}
      >
        <span className={`text-[9px] font-bold uppercase tracking-[0.2em] ${dark ? 'text-graphite' : 'text-graphite'}`}>Espacio</span>
        <span className="text-sm font-display font-bold tracking-tight">{current}</span>
        <Icons.ChevronDown className="w-3.5 h-3.5 opacity-60" />
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Seleccionar Espacio" subtitle="Vista Global o Específica" size="auto">
        <div className="space-y-2">
          <button
            onClick={() => { onChange('ALL'); setOpen(false); }}
            className={`w-full flex items-center gap-3 p-4 rounded-xl text-left ${value === 'ALL' ? 'bg-onyx text-white' : 'bg-white border border-black/5'}`}
          >
            <IconCircle tone={value === 'ALL' ? 'dark' : 'default'}><Icons.Grid className="w-4 h-4" /></IconCircle>
            <div className="flex-1">
              <div className="text-sm font-display font-bold">Vista Global</div>
              <div className={`text-xs ${value === 'ALL' ? 'text-graphite' : 'text-graphite'}`}>Todos los espacios combinados</div>
            </div>
            {value === 'ALL' && <Icons.Check className="w-5 h-5 text-gold" />}
          </button>
          {contexts.map((c) => (
            <button
              key={c.id}
              onClick={() => { onChange(c.id); setOpen(false); }}
              className={`w-full flex items-center gap-3 p-4 rounded-xl text-left ${value === c.id ? 'bg-onyx text-white' : 'bg-white border border-black/5'}`}
            >
              <IconCircle tone={value === c.id ? 'dark' : c.type === 'PERSONAL' ? 'default' : 'gold'}>
                {c.type === 'PERSONAL' ? <Icons.Personal className="w-4 h-4" /> : <Icons.Business className="w-4 h-4" />}
              </IconCircle>
              <div className="flex-1">
                <div className="text-sm font-display font-bold">{c.name}</div>
                <div className={`text-xs ${value === c.id ? 'text-graphite' : 'text-graphite'}`}>{c.type === 'PERSONAL' ? 'Finanzas Personales' : 'Negocio'} · {c.accounts.length} cuentas</div>
              </div>
              {value === c.id && <Icons.Check className="w-5 h-5 text-gold" />}
            </button>
          ))}
        </div>
      </BottomSheet>
    </>
  );
};

// ─── ACCOUNTS (Bóvedas) ─────────────────────────────────────────────────
interface AccountsProps {
  contexts: FinancialContext[];
  formatCurrency: (n: number, c?: string) => string;
  baseCurrency: string;
  onDistributeIncome: (ctxId: string, currency: string) => void;
  onAddSubAccount: (ctxId: string, accId: string) => void;
  onUndoDistribution: () => void;
  canUndo: boolean;
  recentDistributions: { [accountId: string]: number };
}
export const MobileAccounts: React.FC<AccountsProps> = ({ contexts, formatCurrency, onDistributeIncome, onAddSubAccount, recentDistributions }) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    haptic('selection');
    setExpanded((p) => {
      const next = new Set(p);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (contexts.length === 0) {
    return <EmptyState icon={Icons.Accounts} title="Sin bóvedas" description="Configura tus contextos financieros para empezar." />;
  }

  return (
    <div className="pb-tabbar wv-stagger">
      {contexts.map((ctx) => {
        const incomeAcc = ctx.accounts.find((a) => a.type === 'INCOME');
        const total = ctx.accounts.reduce((sum, a) => {
          const e = balanceEntries(a.balances);
          return sum + (e[0]?.amount || 0);
        }, 0);
        return (
          <section key={ctx.id} className="mb-6">
            <div className="px-5 mb-2 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">{ctx.type === 'PERSONAL' ? 'Personal' : 'Negocio'}</div>
                <div className="text-base font-display font-bold text-onyx">{ctx.name}</div>
              </div>
              {incomeAcc && balanceEntries(incomeAcc.balances).some((e) => e.amount > 0) && (
                <button
                  onClick={() => { haptic('medium'); onDistributeIncome(ctx.id, balanceEntries(incomeAcc.balances)[0]?.currency || 'USD'); }}
                  className="flex items-center gap-1.5 h-9 px-3 bg-onyx text-white text-[10px] font-display font-bold uppercase tracking-widest rounded-full active:scale-95 transition-transform"
                >
                  <Icons.Zap className="w-3.5 h-3.5 text-gold" />
                  Distribuir
                </button>
              )}
            </div>
            <div className="bg-white mx-3 border border-black/5 rounded-2xl overflow-hidden divide-y divide-black/5">
              {ctx.accounts.map((acc) => {
                const entries = balanceEntries(acc.balances);
                const primary = entries[0];
                const hasSubs = acc.subAccounts.length > 0;
                const isOpen = expanded.has(acc.id);
                const recentlyAdded = recentDistributions[acc.id];
                const target = acc.percentageTarget;

                return (
                  <div key={acc.id}>
                    <div
                      className="flex items-center gap-3 p-4 active:bg-stone cursor-pointer"
                      onClick={() => hasSubs && toggle(acc.id)}
                    >
                      <div className="w-2 h-2 bg-onyx rotate-45 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-display font-semibold text-onyx truncate">{acc.name}</span>
                          {target !== undefined && target > 0 && (
                            <span className="px-1.5 py-0.5 text-[9px] bg-stone border border-black/10 text-graphite font-bold rounded">{target}%</span>
                          )}
                        </div>
                        <div className="text-[10px] text-graphite uppercase tracking-widest mt-0.5">
                          {acc.type === 'INCOME' ? 'Ingresos' : acc.type === 'EXPENSE' ? 'Gasto' : 'Holding'}{hasSubs ? ` · ${acc.subAccounts.length} sub` : ''}
                        </div>
                      </div>
                      <div className="text-right">
                        {entries.length > 0 ? entries.map((e) => (
                          <div key={e.currency} className="text-sm font-display font-bold text-onyx tabular">
                            {formatCurrency(e.amount, e.currency)}
                          </div>
                        )) : <div className="text-sm font-display font-bold text-graphite tabular">{formatCurrency(0)}</div>}
                        {recentlyAdded && (
                          <div className="text-[10px] font-bold text-emerald-700 wv-fade-in">+{formatCurrency(recentlyAdded, primary?.currency)}</div>
                        )}
                      </div>
                      {hasSubs && <Icons.ChevronDown className={`w-4 h-4 text-graphite transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
                    </div>
                    {hasSubs && isOpen && (
                      <div className="bg-stone/50 px-5 py-3 space-y-2 border-t border-black/5">
                        {acc.subAccounts.map((sub) => {
                          const subEntries = balanceEntries(sub.balances);
                          const subAmount = subEntries[0]?.amount || 0;
                          const progress = sub.target ? Math.min(100, (subAmount / sub.target) * 100) : null;
                          return (
                            <div key={sub.id} className="bg-white border border-black/5 rounded-xl p-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-onyx truncate">{sub.name}</span>
                                <span className="text-xs font-display font-bold text-onyx tabular">
                                  {subEntries.length > 0 ? subEntries.map((e) => formatCurrency(e.amount, e.currency)).join(' / ') : formatCurrency(0)}
                                </span>
                              </div>
                              {progress !== null && (
                                <>
                                  <div className="h-1.5 bg-stone rounded-full overflow-hidden mt-2">
                                    <div className="h-full bg-alloy transition-all" style={{ width: `${progress}%` }} />
                                  </div>
                                  <div className="text-[10px] text-graphite mt-1 flex justify-between">
                                    <span>Meta: {formatCurrency(sub.target!, subEntries[0]?.currency)}</span>
                                    <span>{progress.toFixed(0)}%</span>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                        <button
                          onClick={() => { haptic('medium'); onAddSubAccount(ctx.id, acc.id); }}
                          className="w-full h-10 border border-dashed border-black/15 text-graphite text-[10px] font-display font-bold uppercase tracking-widest rounded-xl active:scale-[0.98] transition-transform flex items-center justify-center gap-1.5"
                        >
                          <Icons.Plus className="w-3.5 h-3.5" />
                          Añadir Sub-Cuenta
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="px-5 mt-2 flex items-center justify-between">
              <span className="text-[9px] uppercase tracking-widest text-graphite">Total Asignado</span>
              <span className="text-[10px] font-display font-bold text-onyx tabular">{formatCurrency(total)}</span>
            </div>
          </section>
        );
      })}
    </div>
  );
};

// ─── TRANSACTIONS (Libro Mayor) ─────────────────────────────────────────
interface TxProps {
  state: AppState;
  filteredTransactions: Transaction[];
  transactionTypeFilter: 'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER';
  setTransactionTypeFilter: (f: any) => void;
  isBulkMode: boolean;
  setIsBulkMode: (b: boolean) => void;
  bulkSelectedTxIds: Set<string>;
  setBulkSelectedTxIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  formatCurrency: (n: number, c?: string) => string;
  formatDateTime: (s: string) => string;
  onTxClick: (tx: Transaction) => void;
  onBulkDelete: () => void;
}
export const MobileTransactions: React.FC<TxProps> = ({ state, filteredTransactions, transactionTypeFilter, setTransactionTypeFilter, isBulkMode, setIsBulkMode, bulkSelectedTxIds, setBulkSelectedTxIds, formatCurrency, formatDateTime, onTxClick, onBulkDelete }) => {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    return filteredTransactions
      .filter((t) => transactionTypeFilter === 'ALL' || t.type === transactionTypeFilter)
      .filter((t) => !search || (t.notes || '').toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredTransactions, transactionTypeFilter, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    filtered.forEach((tx) => {
      const day = new Date(tx.date).toISOString().split('T')[0];
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(tx);
    });
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="pb-tabbar">
      <div className="px-5 pt-1 pb-3">
        <div className="relative mb-3">
          <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite" />
          <input
            type="text"
            placeholder="Buscar transacciones..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-9 pr-4 bg-white border border-black/5 rounded-full text-sm placeholder:text-graphite/60"
          />
        </div>
        <Segmented
          options={[
            { id: 'ALL', label: 'Todas' },
            { id: 'INCOME', label: 'Ingresos' },
            { id: 'EXPENSE', label: 'Gastos' },
            { id: 'TRANSFER', label: 'Transf.' },
          ]}
          activeId={transactionTypeFilter}
          onChange={(id) => setTransactionTypeFilter(id as any)}
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-graphite">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
          <button
            onClick={() => { haptic('selection'); setIsBulkMode(!isBulkMode); setBulkSelectedTxIds(new Set()); }}
            className={`text-[10px] font-display font-bold uppercase tracking-widest h-7 px-3 rounded-full ${isBulkMode ? 'bg-rose-700 text-white' : 'bg-white border border-black/10 text-onyx'}`}
          >
            {isBulkMode ? 'Cancelar' : 'Seleccionar'}
          </button>
        </div>
        {isBulkMode && bulkSelectedTxIds.size > 0 && (
          <div className="flex items-center justify-between mt-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl">
            <span className="text-[11px] font-bold text-rose-800">{bulkSelectedTxIds.size} seleccionada{bulkSelectedTxIds.size > 1 ? 's' : ''}</span>
            <button
              onClick={onBulkDelete}
              className="h-8 px-3 bg-rose-700 text-white text-[10px] font-display font-bold uppercase tracking-widest rounded-full"
            >
              Eliminar
            </button>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Icons.Receipt} title="Sin transacciones" description="Cuando registres movimientos los verás aquí." />
      ) : (
        <div className="px-3 mt-2 space-y-4 wv-stagger">
          {grouped.map(([day, txs]) => {
            const date = new Date(day);
            const today = new Date(); today.setHours(0,0,0,0);
            const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
            const label = date.getTime() === today.getTime() ? 'Hoy' : date.getTime() === yesterday.getTime() ? 'Ayer' : new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
            return (
              <div key={day}>
                <div className="px-3 mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-graphite">{label}</span>
                  <span className="text-[10px] font-mono text-graphite">{day}</span>
                </div>
                <div className="bg-white border border-black/5 rounded-2xl overflow-hidden divide-y divide-black/5">
                  {txs.map((tx) => {
                    const cat = tx.categoryId ? state.categories.find((c) => c.id === tx.categoryId) : null;
                    const Icon = tx.type === 'INCOME' ? Icons.Income : tx.type === 'EXPENSE' ? Icons.Expense : Icons.Transfer;
                    const tone = tx.type === 'INCOME' ? 'income' : tx.type === 'EXPENSE' ? 'expense' : 'transfer';
                    const sign = tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : '';
                    const selected = bulkSelectedTxIds.has(tx.id);
                    return (
                      <div
                        key={tx.id}
                        onClick={() => {
                          if (isBulkMode) {
                            haptic('selection');
                            setBulkSelectedTxIds((p) => {
                              const next = new Set(p);
                              if (next.has(tx.id)) next.delete(tx.id);
                              else next.add(tx.id);
                              return next;
                            });
                          } else {
                            onTxClick(tx);
                          }
                        }}
                        className={`flex items-center gap-3 px-4 py-3 active:bg-stone cursor-pointer transition-colors ${selected ? 'bg-rose-50' : ''}`}
                      >
                        {isBulkMode && (
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selected ? 'bg-rose-700 border-rose-700' : 'border-black/20'}`}>
                            {selected && <Icons.Check className="w-3 h-3 text-white" />}
                          </div>
                        )}
                        <IconCircle tone={tone as any} bgColor={cat?.color}>
                          <Icon className="w-4 h-4" />
                        </IconCircle>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-onyx truncate">{tx.notes || (tx.type === 'TRANSFER' ? 'Transferencia' : tx.type === 'INCOME' ? 'Ingreso' : 'Gasto')}</div>
                          <div className="text-xs text-graphite truncate">
                            {new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(new Date(tx.date))}{cat ? ` · ${cat.name}` : ''}
                          </div>
                        </div>
                        <span className={`text-sm font-display font-bold tabular ${tx.type === 'INCOME' ? 'text-emerald-700' : tx.type === 'EXPENSE' ? 'text-rose-700' : 'text-onyx'}`}>
                          {sign}{formatCurrency(tx.amount, tx.currency)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── SUBSCRIPTIONS ──────────────────────────────────────────────────────
interface SubsProps {
  state: AppState;
  contextFilter: string;
  subscriptionStatusFilter: 'ALL' | 'ACTIVE' | 'PAUSED';
  setSubscriptionStatusFilter: (f: any) => void;
  formatCurrency: (n: number, c?: string) => string;
  formatDateTime: (s: string) => string;
  onSubClick: (s: Subscription) => void;
  onSubEdit: (s: Subscription) => void;
  onAddSub: () => void;
  getAccountName: (cId: string, aId: string) => string;
  getSubAccountName: (cId: string, aId: string, sId: string) => string;
}
export const MobileSubscriptions: React.FC<SubsProps> = ({ state, contextFilter, subscriptionStatusFilter, setSubscriptionStatusFilter, formatCurrency, formatDateTime, onSubClick, onSubEdit, onAddSub, getAccountName }) => {
  const list = useMemo(() => {
    return state.subscriptions
      .filter((s) => contextFilter === 'ALL' || s.contextId === contextFilter)
      .filter((s) => subscriptionStatusFilter === 'ALL' || (subscriptionStatusFilter === 'ACTIVE' ? s.active : !s.active))
      .sort((a, b) => {
        if (!a.nextRenewal) return 1;
        if (!b.nextRenewal) return -1;
        return new Date(a.nextRenewal).getTime() - new Date(b.nextRenewal).getTime();
      });
  }, [state.subscriptions, contextFilter, subscriptionStatusFilter]);

  // Monthly total (active only)
  const monthlyTotalByCurrency = useMemo(() => {
    const map: Record<string, number> = {};
    list.filter((s) => s.active).forEach((s) => {
      let monthly = s.amount;
      if (s.frequency === 'WEEKLY') monthly *= 4.33;
      else if (s.frequency === 'QUARTERLY') monthly /= 3;
      else if (s.frequency === 'ANNUAL') monthly /= 12;
      map[s.currency] = (map[s.currency] || 0) + monthly;
    });
    return map;
  }, [list]);

  return (
    <div className="pb-tabbar wv-stagger">
      <section className="px-5 pt-2 mb-4">
        <div className="bg-white border border-black/5 rounded-2xl p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-gold" />
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-graphite mb-2">Coste Mensual Estimado</div>
          {Object.entries(monthlyTotalByCurrency).length === 0 ? (
            <div className="text-2xl font-display font-bold text-onyx tabular">{formatCurrency(0)}</div>
          ) : (
            Object.entries(monthlyTotalByCurrency).map(([cur, amt]) => (
              <div key={cur} className="text-2xl font-display font-bold text-onyx tabular">{formatCurrency(amt, cur)}</div>
            ))
          )}
          <div className="text-[10px] text-graphite mt-1">{list.filter((s) => s.active).length} activas · {list.filter((s) => !s.active).length} pausadas</div>
        </div>
      </section>

      <div className="px-5 mb-3">
        <Segmented
          options={[
            { id: 'ALL', label: 'Todas' },
            { id: 'ACTIVE', label: 'Activas' },
            { id: 'PAUSED', label: 'Pausadas' },
          ]}
          activeId={subscriptionStatusFilter}
          onChange={(id) => setSubscriptionStatusFilter(id as any)}
        />
      </div>

      {list.length === 0 ? (
        <EmptyState icon={Icons.Subscription} title="Sin suscripciones" description="Añade suscripciones para no perder ningún cobro." action={{ label: 'Añadir', onClick: onAddSub }} />
      ) : (
        <div className="px-3 space-y-3">
          {list.map((s) => {
            const ctx = state.contexts.find((c) => c.id === s.contextId);
            const days = s.nextRenewal ? Math.ceil((new Date(s.nextRenewal).getTime() - Date.now()) / 86_400_000) : null;
            return (
              <div
                key={s.id}
                onClick={() => onSubClick(s)}
                className="bg-white border border-black/5 rounded-2xl p-4 active:scale-[0.99] cursor-pointer transition-transform"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <IconCircle tone="gold" size="md"><Icons.Subscription className="w-4 h-4" /></IconCircle>
                    <div>
                      <div className="text-base font-display font-bold text-onyx">{s.name}</div>
                      <div className="text-[10px] text-graphite uppercase tracking-widest">
                        {s.frequency === 'WEEKLY' ? 'Semanal' : s.frequency === 'MONTHLY' ? 'Mensual' : s.frequency === 'QUARTERLY' ? 'Trimestral' : 'Anual'}
                      </div>
                    </div>
                  </div>
                  <div className={`px-2 py-0.5 text-[9px] uppercase tracking-widest font-bold rounded-full ${s.active ? 'bg-emerald-50 text-emerald-700' : 'bg-stone text-graphite'}`}>
                    {s.active ? 'Activa' : 'Pausada'}
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-xl font-display font-bold text-onyx tabular">{formatCurrency(s.amount, s.currency)}</div>
                    {s.nextRenewal && (
                      <div className="text-[11px] text-graphite mt-1 flex items-center gap-1">
                        <Icons.Calendar className="w-3 h-3" />
                        {days! <= 0 ? 'Hoy' : days === 1 ? 'Mañana' : `En ${days} días`}
                      </div>
                    )}
                    {s.cardLastFour && <div className="text-[10px] font-mono text-graphite mt-0.5">•••• {s.cardLastFour}</div>}
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    {ctx && <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded-full ${ctx.type === 'PERSONAL' ? 'bg-stone text-onyx' : 'bg-onyx text-white'}`}>{ctx.name}</span>}
                    <span className="text-[10px] text-graphite">{getAccountName(s.contextId, s.accountId || '')}</span>
                  </div>
                </div>
              </div>
            );
          })}
          <button
            onClick={() => { haptic('medium'); onAddSub(); }}
            className="w-full h-14 border-2 border-dashed border-black/15 text-graphite text-xs font-display font-bold uppercase tracking-widest rounded-2xl active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <Icons.Plus className="w-4 h-4" />
            Añadir Suscripción
          </button>
        </div>
      )}
    </div>
  );
};

// ─── CATEGORIES ─────────────────────────────────────────────────────────
interface CatProps {
  state: AppState;
  contextFilter: string;
  formatCurrency: (n: number, c?: string) => string;
  onCategoryClick: (c: Category) => void;
  onCategoryEdit: (c: Category) => void;
  onAddCategory: () => void;
  getAccountName: (cId: string, aId: string) => string;
}
export const MobileCategories: React.FC<CatProps> = ({ state, contextFilter, formatCurrency, onCategoryClick, onAddCategory, getAccountName }) => {
  const list = state.categories.filter((c) => contextFilter === 'ALL' || c.contextId === contextFilter);

  if (list.length === 0) {
    return (
      <div className="pb-tabbar">
        <EmptyState icon={Icons.Category} title="Sin categorías" description="Crea categorías para organizar tus gastos." action={{ label: 'Nueva categoría', onClick: onAddCategory }} />
      </div>
    );
  }

  const totalByCategory = (catId: string) => {
    return state.transactions.filter((tx) => tx.categoryId === catId).reduce((sum, tx) => sum + tx.amount, 0);
  };

  return (
    <div className="pb-tabbar wv-stagger px-3 space-y-3 mt-2">
      {list.map((c) => {
        const ctx = state.contexts.find((x) => x.id === c.contextId);
        const total = totalByCategory(c.id);
        const progress = c.budget && c.budget > 0 ? Math.min(100, (total / c.budget) * 100) : null;
        return (
          <div
            key={c.id}
            onClick={() => onCategoryClick(c)}
            className="bg-white border border-black/5 rounded-2xl p-4 relative overflow-hidden active:scale-[0.99] cursor-pointer transition-transform"
          >
            <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: c.color }} />
            <div className="flex items-start justify-between pl-2">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <IconCircle bgColor={c.color}><Icons.Category className="w-4 h-4" /></IconCircle>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-display font-bold text-onyx truncate">{c.name}</div>
                  <div className="text-[10px] text-graphite uppercase tracking-widest">
                    {ctx?.name || '—'} · {getAccountName(c.contextId, c.accountId || '')}
                  </div>
                </div>
              </div>
              <Icons.ChevronRight className="w-4 h-4 text-graphite flex-shrink-0" />
            </div>
            {c.budget && c.budget > 0 ? (
              <div className="mt-3 pl-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase tracking-widest text-graphite">Presupuesto</span>
                  <span className="text-xs font-display font-bold text-onyx tabular">
                    {formatCurrency(total)} / {formatCurrency(c.budget)}
                  </span>
                </div>
                <div className="h-1.5 bg-stone rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{ width: `${progress}%`, backgroundColor: progress! >= 100 ? '#be123c' : progress! >= 90 ? '#D4A853' : c.color }}
                  />
                </div>
              </div>
            ) : (
              total > 0 && (
                <div className="mt-2 pl-2 text-xs text-graphite">
                  Total gastado: <span className="font-display font-bold text-onyx tabular">{formatCurrency(total)}</span>
                </div>
              )
            )}
          </div>
        );
      })}
      <button
        onClick={() => { haptic('medium'); onAddCategory(); }}
        className="w-full h-14 border-2 border-dashed border-black/15 text-graphite text-xs font-display font-bold uppercase tracking-widest rounded-2xl active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
      >
        <Icons.Plus className="w-4 h-4" />
        Nueva Categoría
      </button>
    </div>
  );
};

// ─── SETTINGS ───────────────────────────────────────────────────────────
interface SettingsProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  session: any;
  filteredTimezones: any[];
  tzSearch: string;
  setTzSearch: (s: string) => void;
  currencySearch: string;
  setCurrencySearch: (s: string) => void;
  newPassword: string; setNewPassword: (s: string) => void;
  confirmPassword: string; setConfirmPassword: (s: string) => void;
  passwordError: string; setPasswordError: (s: string) => void;
  passwordSuccess: string; setPasswordSuccess: (s: string) => void;
  isUpdatingPassword: boolean; setIsUpdatingPassword: (b: boolean) => void;
  onUpdateContextName: (id: string, name: string) => void;
  onUpdateAccountPercentage: (cId: string, aId: string, p: number) => void;
  onDeleteContext: (id: string) => void;
  onNewBusiness: () => void;
  onSignOut: () => void;
  onSaveProfile: () => Promise<void>;
}
export const MobileSettings: React.FC<SettingsProps> = (p) => {
  const [section, setSection] = useState<'profile' | 'currency' | 'timezone' | 'distribution' | 'notifications' | 'security' | null>(null);
  const [pushState, setPushState] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('default');
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    setPushState(getPermissionState());
    getCurrentSubscription().then((s) => setPushSubscribed(!!s));
  }, []);

  const handleEnablePush = async () => {
    setPushBusy(true);
    const userId = p.session?.user?.id;
    if (!userId) { setPushBusy(false); return; }
    const result = await subscribeToPush(userId);
    setPushState(getPermissionState());
    if (result.ok) {
      setPushSubscribed(true);
      showLocalTest('WhiteVault', 'Notificaciones activadas correctamente');
      haptic('heavy');
    }
    setPushBusy(false);
  };
  const handleDisablePush = async () => {
    setPushBusy(true);
    const userId = p.session?.user?.id;
    if (!userId) { setPushBusy(false); return; }
    await unsubscribeFromPush(userId);
    setPushSubscribed(false);
    setPushBusy(false);
  };

  return (
    <div className="pb-tabbar wv-stagger">
      {/* Profile card */}
      <section className="px-5 pt-2">
        <div className="bg-white border border-black/5 rounded-3xl p-5 flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 bg-onyx rounded-2xl flex items-center justify-center text-white font-display font-bold text-xl overflow-hidden">
              {p.state.user.avatarUrl ? <img src={p.state.user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : p.state.user.name.charAt(0)}
            </div>
            <button
              onClick={() => { haptic('medium'); document.getElementById('avatar-upload-mobile')?.click(); }}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-gold text-onyx rounded-full flex items-center justify-center shadow-md active:scale-95"
              aria-label="Cambiar avatar"
            >
              <Icons.Edit className="w-3.5 h-3.5" />
            </button>
            <input
              id="avatar-upload-mobile"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 2 * 1024 * 1024) { alert('Máximo 2MB'); return; }
                const r = new FileReader();
                r.onloadend = () => p.setState((prev) => ({ ...prev, user: { ...prev.user, avatarUrl: r.result as string } }));
                r.readAsDataURL(f);
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-base font-display font-bold text-onyx truncate">{p.state.user.name}</div>
            <div className="text-xs text-graphite truncate">{p.state.user.email}</div>
            <div className="text-[10px] uppercase tracking-widest text-gold mt-1">{p.state.user.currency} · {p.state.user.language}</div>
          </div>
        </div>
      </section>

      <ListSection title="Cuenta">
        <ListRow leading={<IconCircle><Icons.Personal className="w-4 h-4" /></IconCircle>} title="Perfil" subtitle="Nombre, email, foto" onClick={() => setSection('profile')} />
        <ListRow leading={<IconCircle><Icons.Dollar className="w-4 h-4" /></IconCircle>} title="Divisa principal" subtitle={p.state.user.currency} onClick={() => setSection('currency')} />
        <ListRow leading={<IconCircle><Icons.Globe className="w-4 h-4" /></IconCircle>} title="Zona horaria" subtitle={p.state.user.timezone} onClick={() => setSection('timezone')} />
      </ListSection>

      <ListSection title="Notificaciones">
        <ListRow
          leading={<IconCircle tone={pushSubscribed ? 'gold' : 'default'}>{pushSubscribed ? <Icons.BellRing className="w-4 h-4" /> : <Icons.Bell className="w-4 h-4" />}</IconCircle>}
          title="Push notifications"
          subtitle={
            pushState === 'unsupported' ? 'No soportado en este dispositivo' :
            pushState === 'denied' ? 'Bloqueadas — habilítalas en ajustes del navegador' :
            pushSubscribed ? 'Activadas en este dispositivo' : 'Recibe avisos de renovaciones, presupuestos y pagos'
          }
          onClick={() => setSection('notifications')}
        />
      </ListSection>

      <ListSection title="Configuración Avanzada">
        <ListRow leading={<IconCircle tone="gold"><Icons.Chart className="w-4 h-4" /></IconCircle>} title="Distribución (Profit First)" subtitle={`${p.state.contexts.length} ${p.state.contexts.length === 1 ? 'espacio' : 'espacios'}`} onClick={() => setSection('distribution')} />
        <ListRow leading={<IconCircle><Icons.Building className="w-4 h-4" /></IconCircle>} title="Iniciar Nuevo Negocio" subtitle="Crear espacio Profit First" onClick={p.onNewBusiness} />
        <ListRow leading={<IconCircle><Icons.Lock className="w-4 h-4" /></IconCircle>} title="Cambiar contraseña" onClick={() => setSection('security')} />
      </ListSection>

      <ListSection>
        <ListRow leading={<IconCircle tone="expense"><Icons.LogOut className="w-4 h-4" /></IconCircle>} title="Cerrar sesión" danger onClick={p.onSignOut} chevron={false} />
      </ListSection>

      <div className="text-center mt-6 mb-4">
        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-graphite">WhiteVault™</div>
        <div className="text-[10px] text-graphite/60 mt-0.5">v1.0 · Disciplined Premium</div>
      </div>

      {/* PROFILE SHEET */}
      <BottomSheet open={section === 'profile'} onClose={() => setSection(null)} title="Perfil" subtitle="Información personal" size="full">
        <div className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-graphite mb-2">Nombre</label>
            <input
              type="text"
              value={p.state.user.name}
              maxLength={50}
              onChange={(e) => p.setState((s) => ({ ...s, user: { ...s.user, name: e.target.value } }))}
              className="w-full h-12 px-4 bg-white border border-black/10 rounded-xl text-onyx focus:border-onyx outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-graphite mb-2">Email</label>
            <input
              type="email"
              value={p.state.user.email}
              onChange={(e) => p.setState((s) => ({ ...s, user: { ...s.user, email: e.target.value } }))}
              className="w-full h-12 px-4 bg-white border border-black/10 rounded-xl text-onyx focus:border-onyx outline-none"
            />
          </div>
          <PressButton full onClick={async () => { await p.onSaveProfile(); setSection(null); }}>Guardar Cambios</PressButton>
        </div>
      </BottomSheet>

      {/* CURRENCY SHEET */}
      <BottomSheet open={section === 'currency'} onClose={() => setSection(null)} title="Divisa Principal" subtitle="Moneda por defecto" size="full">
        <div className="relative mb-3">
          <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite" />
          <input
            type="text"
            value={p.currencySearch}
            onChange={(e) => p.setCurrencySearch(e.target.value)}
            placeholder="Buscar moneda…"
            className="w-full h-11 pl-9 pr-4 bg-white border border-black/10 rounded-xl text-sm"
          />
        </div>
        <div className="space-y-1.5">
          {CURRENCIES.filter((c) => c.code.toLowerCase().includes(p.currencySearch.toLowerCase()) || c.name.toLowerCase().includes(p.currencySearch.toLowerCase())).map((c) => (
            <button
              key={c.code}
              onClick={() => { haptic('selection'); p.setState((s) => ({ ...s, user: { ...s.user, currency: c.code } })); }}
              className={`w-full flex items-center justify-between p-3 rounded-xl ${p.state.user.currency === c.code ? 'bg-onyx text-white' : 'bg-white border border-black/5'}`}
            >
              <div className="flex items-center gap-3">
                <span className={`font-mono font-bold text-sm w-12 text-left ${p.state.user.currency === c.code ? 'text-gold' : 'text-onyx'}`}>{c.code}</span>
                <span className="text-xs">{c.name}</span>
              </div>
              <span className={`font-display font-bold ${p.state.user.currency === c.code ? 'text-gold' : 'text-graphite'}`}>{c.symbol}</span>
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* TIMEZONE SHEET */}
      <BottomSheet open={section === 'timezone'} onClose={() => setSection(null)} title="Zona Horaria" subtitle="Hora local" size="full">
        <div className="relative mb-3">
          <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite" />
          <input
            type="text"
            value={p.tzSearch}
            onChange={(e) => p.setTzSearch(e.target.value)}
            placeholder="Buscar ciudad o país…"
            className="w-full h-11 pl-9 pr-4 bg-white border border-black/10 rounded-xl text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <button
            onClick={() => { haptic('selection'); p.setState((s) => ({ ...s, user: { ...s.user, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone } })); }}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-white border border-black/5"
          >
            <span className="text-sm text-onyx">Automático (Sistema)</span>
            <span className="text-[10px] text-graphite font-mono">{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
          </button>
          {p.filteredTimezones.slice(0, 80).map((tz: any) => (
            <button
              key={tz.value}
              onClick={() => { haptic('selection'); p.setState((s) => ({ ...s, user: { ...s.user, timezone: tz.value } })); }}
              className={`w-full text-left p-3 rounded-xl text-sm ${p.state.user.timezone === tz.value ? 'bg-onyx text-white' : 'bg-white border border-black/5 text-onyx'}`}
            >
              {tz.label}
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* DISTRIBUTION SHEET */}
      <BottomSheet open={section === 'distribution'} onClose={() => setSection(null)} title="Profit First" subtitle="Distribución por Espacio" size="full">
        <div className="space-y-6">
          {p.state.contexts.map((ctx) => {
            const total = ctx.accounts.reduce((s, a) => s + (a.percentageTarget || 0), 0);
            return (
              <div key={ctx.id} className="bg-white border border-black/5 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <input
                    value={ctx.name}
                    onChange={(e) => p.onUpdateContextName(ctx.id, e.target.value)}
                    className="flex-1 text-base font-display font-bold text-onyx bg-transparent border-b border-transparent focus:border-onyx outline-none"
                  />
                  {ctx.type === 'BUSINESS' && (
                    <button
                      onClick={() => { haptic('heavy'); if (confirm('¿Eliminar negocio?')) p.onDeleteContext(ctx.id); }}
                      className="p-2 text-rose-700 active:scale-95"
                      aria-label="Eliminar"
                    >
                      <Icons.Trash className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {ctx.accounts.filter((a) => a.type !== 'INCOME').map((acc) => (
                    <div key={acc.id} className="flex items-center justify-between p-3 bg-stone rounded-xl">
                      <span className="text-sm text-onyx flex-1 truncate">{acc.name}</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={acc.percentageTarget ?? 0}
                          onChange={(e) => p.onUpdateAccountPercentage(ctx.id, acc.id, Number(e.target.value))}
                          className="w-16 h-9 px-2 text-right bg-white border border-black/10 rounded-lg font-mono font-bold text-sm focus:border-onyx outline-none"
                        />
                        <span className="text-graphite text-sm">%</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-black/5 flex justify-between items-center">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-graphite">Total Asignado</span>
                  <span className={`text-sm font-display font-bold tabular ${total === 100 ? 'text-emerald-700' : 'text-rose-700'}`}>{total}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </BottomSheet>

      {/* NOTIFICATIONS SHEET */}
      <BottomSheet open={section === 'notifications'} onClose={() => setSection(null)} title="Notificaciones" subtitle="Push & alertas" size="full">
        <NotificationSettings
          pushState={pushState}
          pushSubscribed={pushSubscribed}
          pushBusy={pushBusy}
          onEnable={handleEnablePush}
          onDisable={handleDisablePush}
          userId={p.session?.user?.id}
        />
      </BottomSheet>

      {/* SECURITY SHEET */}
      <BottomSheet open={section === 'security'} onClose={() => setSection(null)} title="Cambiar Contraseña" subtitle="Seguridad" size="full">
        <div className="space-y-4">
          <input
            type="password"
            placeholder="Nueva contraseña"
            value={p.newPassword}
            onChange={(e) => p.setNewPassword(e.target.value)}
            className="w-full h-12 px-4 bg-white border border-black/10 rounded-xl"
          />
          <input
            type="password"
            placeholder="Confirmar contraseña"
            value={p.confirmPassword}
            onChange={(e) => p.setConfirmPassword(e.target.value)}
            className="w-full h-12 px-4 bg-white border border-black/10 rounded-xl"
          />
          {p.passwordError && <p className="text-rose-700 text-xs font-bold">{p.passwordError}</p>}
          {p.passwordSuccess && <p className="text-emerald-700 text-xs font-bold">{p.passwordSuccess}</p>}
          <ul className="text-[11px] text-graphite space-y-1 pl-3">
            <li>• Mínimo 8 caracteres</li>
            <li>• Mayúsculas y minúsculas</li>
            <li>• Al menos un número</li>
          </ul>
          <PressButton
            full
            disabled={p.isUpdatingPassword || !p.newPassword || !p.confirmPassword}
            onClick={async () => {
              if (p.newPassword !== p.confirmPassword) return p.setPasswordError('No coinciden');
              if (p.newPassword.length < 8) return p.setPasswordError('Mínimo 8 caracteres');
              if (!/[A-Z]/.test(p.newPassword) || !/[a-z]/.test(p.newPassword) || !/[0-9]/.test(p.newPassword)) return p.setPasswordError('Mayús, minús y números');
              p.setIsUpdatingPassword(true);
              p.setPasswordError(''); p.setPasswordSuccess('');
              const { error } = await supabase.auth.updateUser({ password: p.newPassword });
              p.setIsUpdatingPassword(false);
              if (error) p.setPasswordError(error.message);
              else { p.setPasswordSuccess('Contraseña actualizada'); p.setNewPassword(''); p.setConfirmPassword(''); }
            }}
          >
            {p.isUpdatingPassword ? 'Actualizando...' : 'Guardar'}
          </PressButton>
        </div>
      </BottomSheet>
    </div>
  );
};

// ─── NOTIFICATION SETTINGS BLOCK ────────────────────────────────────────
const NotificationSettings: React.FC<{ pushState: string; pushSubscribed: boolean; pushBusy: boolean; onEnable: () => void; onDisable: () => void; userId?: string }> = ({ pushState, pushSubscribed, pushBusy, onEnable, onDisable, userId }) => {
  const [prefs, setPrefs] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    supabase.from('notification_preferences').select('*').eq('user_id', userId).maybeSingle().then(({ data }) => {
      setPrefs(data || {
        renewals_enabled: true, renewals_days_before: 3,
        budget_alerts_enabled: true, budget_threshold: 90,
        income_received_enabled: true, account_status_enabled: true,
        weekly_summary_enabled: true,
        quiet_hours_enabled: true,
        quiet_hours_start: 22, quiet_hours_end: 8
      });
      setLoading(false);
    });
  }, [userId]);

  const update = async (patch: any) => {
    if (!userId) return;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    haptic('selection');
    await supabase.from('notification_preferences').upsert({ user_id: userId, ...next, updated_at: new Date().toISOString() });
  };

  if (pushState === 'unsupported') {
    return (
      <div className="p-5 bg-white border border-black/5 rounded-2xl">
        <div className="flex items-start gap-3">
          <IconCircle tone="expense"><Icons.Alert className="w-4 h-4" /></IconCircle>
          <div>
            <div className="text-sm font-display font-bold text-onyx">No soportado</div>
            <div className="text-xs text-graphite mt-1">Tu navegador no soporta notificaciones push. {isIOS() && !isStandalone() ? 'Para iOS, instala la app primero ("Añadir a Pantalla de Inicio") y abre desde el icono.' : 'Prueba en Chrome o Safari actualizado.'}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* iOS hint */}
      {isIOS() && !isStandalone() && (
        <div className="p-4 bg-gold/10 border border-gold/30 rounded-2xl">
          <div className="flex items-start gap-3">
            <IconCircle tone="gold"><Icons.Smartphone className="w-4 h-4" /></IconCircle>
            <div>
              <div className="text-sm font-display font-bold text-onyx">Instala la app primero</div>
              <div className="text-xs text-graphite mt-1">En iOS necesitas instalar WhiteVault como app: pulsa el botón Compartir → "Añadir a Pantalla de Inicio". Después abre desde el icono y activa las notificaciones.</div>
            </div>
          </div>
        </div>
      )}

      {/* Master toggle */}
      <div className="bg-white border border-black/5 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <IconCircle tone={pushSubscribed ? 'gold' : 'default'}>{pushSubscribed ? <Icons.BellRing className="w-4 h-4" /> : <Icons.Bell className="w-4 h-4" />}</IconCircle>
          <div>
            <div className="text-sm font-display font-bold text-onyx">Notificaciones push</div>
            <div className="text-[11px] text-graphite mt-0.5">
              {pushState === 'denied' ? 'Bloqueadas en el navegador' :
               pushSubscribed ? 'Activas en este dispositivo' : 'Permite que la app te avise'}
            </div>
          </div>
        </div>
        {pushState === 'denied' ? (
          <span className="text-[10px] font-bold uppercase tracking-widest text-rose-700">Bloqueadas</span>
        ) : pushSubscribed ? (
          <button onClick={onDisable} disabled={pushBusy} className="h-9 px-4 text-[10px] font-display font-bold uppercase tracking-widest text-onyx border border-black/10 rounded-full active:scale-95">Desactivar</button>
        ) : (
          <button onClick={onEnable} disabled={pushBusy} className="h-9 px-4 text-[10px] font-display font-bold uppercase tracking-widest bg-onyx text-white rounded-full active:scale-95">Activar</button>
        )}
      </div>

      {/* Categorías */}
      {!loading && prefs && pushSubscribed && (
        <>
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-graphite px-2">Tipos de Aviso</div>
          <div className="bg-white border border-black/5 rounded-2xl divide-y divide-black/5">
            <ToggleRow label="Renovaciones próximas" desc={`Aviso ${prefs.renewals_days_before ?? 3} días antes + 1 día + el día`} value={prefs.renewals_enabled} onChange={(v) => update({ renewals_enabled: v })} />
            <ToggleRow label="Alertas de presupuesto" desc={`Cuando una categoría alcanza ${prefs.budget_threshold ?? 90}%`} value={prefs.budget_alerts_enabled} onChange={(v) => update({ budget_alerts_enabled: v })} />
            <ToggleRow label="Pago recibido" desc="Confirmaciones de ingresos" value={prefs.income_received_enabled} onChange={(v) => update({ income_received_enabled: v })} />
            <ToggleRow label="Estado de cuenta" desc="Pausas, reactivaciones, errores de pago" value={prefs.account_status_enabled} onChange={(v) => update({ account_status_enabled: v })} />
            <ToggleRow label="Resumen semanal" desc="Cada lunes, repaso financiero" value={prefs.weekly_summary_enabled} onChange={(v) => update({ weekly_summary_enabled: v })} />
          </div>

          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-graphite px-2 mt-4">Aviso de Renovación</div>
          <div className="bg-white border border-black/5 rounded-2xl p-4">
            <div className="text-sm text-onyx mb-3">Avisar primero <span className="font-display font-bold text-gold">{prefs.renewals_days_before ?? 3}</span> días antes</div>
            <input
              type="range"
              min="1" max="14"
              value={prefs.renewals_days_before ?? 3}
              onChange={(e) => update({ renewals_days_before: Number(e.target.value) })}
              className="w-full accent-onyx"
            />
            <div className="flex justify-between text-[10px] text-graphite mt-1"><span>1d</span><span>7d</span><span>14d</span></div>
          </div>

          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-graphite px-2 mt-4">Modo Silencioso</div>
          <div className="bg-white border border-black/5 rounded-2xl divide-y divide-black/5">
            <ToggleRow
              label="Activar modo silencioso"
              desc={prefs.quiet_hours_enabled === false ? 'Recibirás avisos a cualquier hora' : `No te molestaremos entre ${String(prefs.quiet_hours_start ?? 22).padStart(2, '0')}:00 y ${String(prefs.quiet_hours_end ?? 8).padStart(2, '0')}:00`}
              value={prefs.quiet_hours_enabled !== false}
              onChange={(v) => update({ quiet_hours_enabled: v })}
            />
            {prefs.quiet_hours_enabled !== false && (
              <div className="p-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-graphite block mb-1">Inicio</label>
                  <select value={prefs.quiet_hours_start ?? 22} onChange={(e) => update({ quiet_hours_start: Number(e.target.value) })} className="w-full h-10 px-3 bg-stone border border-black/5 rounded-xl text-sm">
                    {Array.from({ length: 24 }, (_, i) => i).map((h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-graphite block mb-1">Fin</label>
                  <select value={prefs.quiet_hours_end ?? 8} onChange={(e) => update({ quiet_hours_end: Number(e.target.value) })} className="w-full h-10 px-3 bg-stone border border-black/5 rounded-xl text-sm">
                    {Array.from({ length: 24 }, (_, i) => i).map((h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => { haptic('medium'); showLocalTest('Notificación de Prueba', 'Las notificaciones funcionan correctamente'); }}
            className="w-full h-12 bg-stone border border-black/5 rounded-2xl text-sm font-display font-bold uppercase tracking-widest text-onyx active:scale-[0.98]"
          >
            Enviar Notificación de Prueba
          </button>
        </>
      )}
    </div>
  );
};

const ToggleRow: React.FC<{ label: string; desc?: string; value: boolean; onChange: (v: boolean) => void }> = ({ label, desc, value, onChange }) => (
  <div className="flex items-center justify-between p-4 gap-3">
    <div className="flex-1 min-w-0">
      <div className="text-sm font-medium text-onyx">{label}</div>
      {desc && <div className="text-[11px] text-graphite mt-0.5">{desc}</div>}
    </div>
    <button
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-onyx' : 'bg-concrete'}`}
      aria-pressed={value}
    >
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>
  </div>
);
