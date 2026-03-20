import React, { useState, useMemo } from 'react';
import { Icons } from './Icons';
import { CashFlowChart, ExpenseBreakdown, IncomeVsExpenseChart, FinancialCalendar } from './Charts';
import { Input as DateInput } from './ActionModals';
import { AppState, FinancialContext, Transaction } from '../types';

const DICTIONARY = {
  totalBalance: 'Balance Total',
  monthlyIn: 'Ingreso Mensual',
  monthlyOut: 'Gasto Mensual',
  activeSubs: 'Suscripciones Activas',
};

const getPresetLabel = (id: string) => {
  const map: { [key: string]: string } = {
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

// AccountsQuickView (internal)
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

interface DashboardViewProps {
  state: AppState;
  contextFilter: string;
  formatCurrency: (amount: number) => string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  state,
  contextFilter,
  formatCurrency,
}) => {
  const currencyCode = state.user.currency;

  // Date filter state
  const [dashboardDateRange, setDashboardDateRange] = useState<{ start: string; end: string; preset: string }>({
    start: new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
    preset: 'THIS_MONTH'
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const applyDatePreset = (preset: string) => {
    const today = new Date();
    let start = new Date(today);
    const end = new Date(today);

    switch (preset) {
      case 'TODAY': break;
      case 'LAST_7': start.setDate(today.getDate() - 6); break;
      case 'LAST_15': start.setDate(today.getDate() - 14); break;
      case 'LAST_30': start.setDate(today.getDate() - 29); break;
      case 'THIS_WEEK': {
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
        break;
      }
      case 'THIS_MONTH':
        start = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1));
        break;
      case 'THIS_YEAR':
        start = new Date(Date.UTC(today.getFullYear(), 0, 1));
        break;
      default: return;
    }

    setDashboardDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
      preset
    });
    setIsFilterOpen(false);
  };

  // Memoized calculations
  const filteredContexts = useMemo(() =>
    state.contexts.filter(c => contextFilter === 'ALL' || c.id === contextFilter),
    [state.contexts, contextFilter]
  );

  const filteredTransactions = useMemo(() =>
    state.transactions.filter(t => contextFilter === 'ALL' || t.contextId === contextFilter),
    [state.transactions, contextFilter]
  );

  const dashboardFilteredTransactions = useMemo(() => {
    const start = new Date(dashboardDateRange.start);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dashboardDateRange.end);
    end.setHours(23, 59, 59, 999);

    return filteredTransactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= start && tDate <= end;
    });
  }, [filteredTransactions, dashboardDateRange]);

  const totalBalance = useMemo(() =>
    filteredContexts.reduce((acc, ctx) =>
      acc + ctx.accounts.reduce((a, act) => a + act.balance + act.subAccounts.reduce((s, sub) => s + sub.balance, 0), 0),
      0),
    [filteredContexts]
  );

  const monthlyIncome = useMemo(() =>
    filteredTransactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0),
    [filteredTransactions]
  );

  const monthlyExpense = useMemo(() =>
    filteredTransactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0),
    [filteredTransactions]
  );

  const activeSubsCount = useMemo(() =>
    state.subscriptions.filter(s => s.active && (contextFilter === 'ALL' || s.contextId === contextFilter)).length,
    [state.subscriptions, contextFilter]
  );

  const dashboardIncome = useMemo(() =>
    dashboardFilteredTransactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0),
    [dashboardFilteredTransactions]
  );

  const dashboardExpense = useMemo(() =>
    dashboardFilteredTransactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0),
    [dashboardFilteredTransactions]
  );

  const t = DICTIONARY;

  return (
    <>
      {/* Sticky date filter */}
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
                    onChange={(e: any) => setDashboardDateRange({ ...dashboardDateRange, start: e.target.value, preset: 'CUSTOM' })}
                    className="w-full"
                  />
                </div>
                <div className="w-full md:w-auto">
                  <DateInput
                    label="Hasta"
                    type="date"
                    value={dashboardDateRange.end}
                    onChange={(e: any) => setDashboardDateRange({ ...dashboardDateRange, end: e.target.value, preset: 'CUSTOM' })}
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

      <div className="p-4 md:p-10 pb-32">
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <AccountsQuickView
            contexts={state.contexts}
            filterId={contextFilter}
            currency={currencyCode}
          />

          {/* Top Stats */}
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
                  {stat.isCount ? stat.val : formatCurrency(stat.val as number)}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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

          <div className="col-span-full">
            <FinancialCalendar transactions={filteredTransactions} subscriptions={state.subscriptions} currency={currencyCode} />
          </div>
        </div>
      </div>
    </>
  );
};
