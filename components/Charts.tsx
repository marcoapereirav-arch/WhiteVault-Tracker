import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, LabelList,
} from 'recharts';
import { Transaction, Category, Subscription } from '../types';
import { Icons } from './Icons';

// ─── HELPERS ────────────────────────────────────────────────────────────

const formatExact = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
};

// Group transactions by their own currency. Different currencies are NEVER
// mixed in any chart. Each currency renders as its own dataset/sub-chart.
const groupTxByCurrency = (txs: Transaction[]): Record<string, Transaction[]> => {
  const map: Record<string, Transaction[]> = {};
  txs.forEach((t) => {
    const cur = t.currency || 'USD';
    if (!map[cur]) map[cur] = [];
    map[cur].push(t);
  });
  return map;
};

// ─── CUSTOM TOOLTIP ─────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, currency, type }: any) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-onyx border border-alloy/40 p-3 shadow-2xl rounded-xl">
      {label && <p className="text-[10px] text-graphite uppercase tracking-wider mb-1.5">{label}</p>}
      {payload.map((entry: any, idx: number) => (
        <div key={idx} className="flex items-center gap-2 mb-1 last:mb-0">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
          <span className="text-xs text-white font-bold">
            {entry.name}: {formatExact(entry.value, currency)}
          </span>
        </div>
      ))}
      {type === 'CASHFLOW' && payload.length === 2 && (
        <div className="mt-2 pt-2 border-t border-white/10 flex justify-between gap-4">
          <span className="text-[10px] text-graphite uppercase">Neto</span>
          <span className={`text-xs font-bold font-mono ${payload[0].value - payload[1].value >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatExact(payload[0].value - payload[1].value, currency)}
          </span>
        </div>
      )}
    </div>
  );
};

// ─── CHART DRILL-IN PROP ────────────────────────────────────────────────
export interface ChartDrillIn {
  // The user clicked something — open a detail sheet with these transactions
  title: string;
  subtitle?: string;
  transactions: Transaction[];
  currency: string;
}
type OnDrill = (drill: ChartDrillIn) => void;

// ─── INCOME VS EXPENSE (per currency) ───────────────────────────────────
export const IncomeVsExpenseChart: React.FC<{ transactions: Transaction[], currency: string, onDrill?: OnDrill }> = ({ transactions, currency, onDrill }) => {
  const byCur = groupTxByCurrency(transactions);
  const currencies = Object.keys(byCur).sort((a, b) => (a === currency ? -1 : b === currency ? 1 : a.localeCompare(b)));

  if (currencies.length === 0) {
    return (
      <div className="w-full bg-white p-6 border border-black/5 rounded-2xl">
        <h3 className="font-display font-bold text-base lg:text-lg text-onyx">Ingresos vs. Gastos</h3>
        <p className="text-sm text-graphite mt-6 text-center py-12">Sin movimientos en este periodo</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white p-4 lg:p-6 border border-black/5 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-bold text-base lg:text-lg text-onyx">Ingresos vs. Gastos</h3>
          <p className="text-[10px] text-graphite uppercase tracking-widest mt-1">Por moneda</p>
        </div>
      </div>
      <div className="space-y-5">
        {currencies.map((cur) => {
          const list = byCur[cur];
          const income = list.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
          const expense = list.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
          const net = income - expense;
          const data = [
            { name: 'Ingresos', amount: income, kind: 'INCOME' },
            { name: 'Gastos', amount: expense, kind: 'EXPENSE' },
          ];
          return (
            <div key={cur}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gold">{cur}</span>
                <span className={`text-xs font-display font-bold tabular ${net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  Neto {formatExact(net, cur)}
                </span>
              </div>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} barSize={48} margin={{ top: 25, right: 8, left: 8, bottom: 5 }}>
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <Tooltip content={<CustomTooltip currency={cur} type="BAR" />} cursor={false} />
                    <Bar
                      dataKey="amount"
                      onClick={(_, idx) => {
                        const entry = data[idx];
                        onDrill?.({
                          title: `${entry.name} (${cur})`,
                          subtitle: 'Detalle del periodo',
                          transactions: list.filter((t) => t.type === entry.kind),
                          currency: cur,
                        });
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {data.map((entry, idx) => (
                        <Cell key={idx} fill={idx === 0 ? '#047857' : '#be123c'} />
                      ))}
                      <LabelList
                        dataKey="amount"
                        position="top"
                        formatter={(val: number) => formatExact(val, cur)}
                        style={{ fill: '#4B4B4D', fontSize: '11px', fontWeight: 700, fontFamily: 'monospace' }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── CASH FLOW (per currency) ───────────────────────────────────────────
export const CashFlowChart: React.FC<{ transactions: Transaction[], categories: Category[], currency: string, incomeTotal: number, expenseTotal: number, onDrill?: OnDrill }> = ({ transactions, currency, onDrill }) => {
  const byCur = groupTxByCurrency(transactions);
  const currencies = Object.keys(byCur).sort((a, b) => (a === currency ? -1 : b === currency ? 1 : a.localeCompare(b)));

  if (currencies.length === 0) {
    return (
      <div className="w-full bg-white p-6 border border-black/5 rounded-2xl">
        <h3 className="font-display font-bold text-base lg:text-lg text-onyx">Tendencia de Flujo</h3>
        <p className="text-sm text-graphite mt-6 text-center py-12">Sin datos para mostrar</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white p-4 lg:p-6 border border-black/5 rounded-2xl">
      <h3 className="font-display font-bold text-base lg:text-lg text-onyx mb-1">Tendencia de Flujo</h3>
      <p className="text-[10px] text-graphite uppercase tracking-widest mb-4">Ingresos vs gastos por día (cada moneda separada)</p>

      <div className="space-y-5">
        {currencies.map((cur) => {
          const list = byCur[cur];
          // Aggregate by day
          const data: { date: string; income: number; expense: number }[] = [];
          list.forEach((t) => {
            const date = t.date.split('T')[0];
            let existing = data.find((d) => d.date === date);
            if (!existing) {
              existing = { date, income: 0, expense: 0 };
              data.push(existing);
            }
            if (t.type === 'INCOME') existing.income += t.amount;
            else if (t.type === 'EXPENSE') existing.expense += t.amount;
          });
          data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          const totalIncome = data.reduce((s, d) => s + d.income, 0);
          const totalExpense = data.reduce((s, d) => s + d.expense, 0);

          return (
            <div key={cur}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gold">{cur}</span>
                <div className="flex gap-3 text-[11px]">
                  <span className="text-emerald-700 font-mono tabular">+{formatExact(totalIncome, cur)}</span>
                  <span className="text-rose-700 font-mono tabular">-{formatExact(totalExpense, cur)}</span>
                </div>
              </div>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={data}
                    onClick={(e: any) => {
                      const idx = e?.activeTooltipIndex;
                      if (idx === undefined || idx < 0) return;
                      const day = data[idx];
                      if (!day) return;
                      onDrill?.({
                        title: `Movimientos del ${day.date}`,
                        subtitle: `${cur}`,
                        transactions: list.filter((t) => t.date.startsWith(day.date)),
                        currency: cur,
                      });
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <defs>
                      <linearGradient id={`gIn-${cur}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#047857" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#047857" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id={`gEx-${cur}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#be123c" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#be123c" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={10} tickFormatter={(v) => v.slice(5)} tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <Tooltip content={<CustomTooltip currency={cur} type="CASHFLOW" />} cursor={false} />
                    <Area type="monotone" dataKey="income" name="Ingresos" stroke="#047857" strokeWidth={2} fill={`url(#gIn-${cur})`} />
                    <Area type="monotone" dataKey="expense" name="Gastos" stroke="#be123c" strokeWidth={2} fill={`url(#gEx-${cur})`} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── EXPENSE BREAKDOWN (per currency) ───────────────────────────────────
export const ExpenseBreakdown: React.FC<{ transactions: Transaction[], categories: Category[], currency: string, onDrill?: OnDrill }> = ({ transactions, categories, currency, onDrill }) => {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : true);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const expenses = transactions.filter((t) => t.type === 'EXPENSE');
  const byCur = groupTxByCurrency(expenses);
  const currencies = Object.keys(byCur).sort((a, b) => (a === currency ? -1 : b === currency ? 1 : a.localeCompare(b)));

  if (currencies.length === 0) {
    return (
      <div className="w-full bg-white p-6 border border-black/5 rounded-2xl">
        <h3 className="font-display font-bold text-base lg:text-lg text-onyx">Desglose por Categoría</h3>
        <p className="text-sm text-graphite mt-6 text-center py-12">Sin gastos categorizados</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white p-4 lg:p-6 border border-black/5 rounded-2xl">
      <h3 className="font-display font-bold text-base lg:text-lg text-onyx mb-1">Desglose por Categoría</h3>
      <p className="text-[10px] text-graphite uppercase tracking-widest mb-4">Gastos agrupados por moneda</p>

      <div className="space-y-6">
        {currencies.map((cur) => {
          const list = byCur[cur].filter((t) => t.categoryId);
          const total = list.reduce((s, t) => s + t.amount, 0);
          const data: { name: string; value: number; color: string; categoryId: string; percent: number }[] = [];
          list.forEach((t) => {
            const cat = categories.find((c) => c.id === t.categoryId);
            if (!cat) return;
            const existing = data.find((d) => d.categoryId === cat.id);
            if (existing) existing.value += t.amount;
            else data.push({ name: cat.name, value: t.amount, color: cat.color, categoryId: cat.id, percent: 0 });
          });
          data.forEach((d) => { d.percent = total > 0 ? Math.round((d.value / total) * 100) : 0; });
          data.sort((a, b) => b.value - a.value);

          if (data.length === 0) return null;

          return (
            <div key={cur}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gold">{cur}</span>
                <span className="text-xs font-display font-bold text-onyx tabular">{formatExact(total, cur)}</span>
              </div>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="50%"
                      innerRadius={isMobile ? 35 : 45}
                      outerRadius={isMobile ? 70 : 85}
                      paddingAngle={1}
                      dataKey="value"
                      stroke="#fff"
                      strokeWidth={2}
                      onClick={(_, idx) => {
                        const entry = data[idx];
                        if (!entry) return;
                        onDrill?.({
                          title: entry.name,
                          subtitle: `${cur} · ${entry.percent}% del total`,
                          transactions: list.filter((t) => t.categoryId === entry.categoryId),
                          currency: cur,
                        });
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {data.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip currency={cur} type="DONUT" />} cursor={false} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 space-y-1">
                {data.slice(0, 5).map((d) => (
                  <button
                    key={d.categoryId}
                    type="button"
                    onClick={() => onDrill?.({
                      title: d.name,
                      subtitle: `${cur} · ${d.percent}% del total`,
                      transactions: list.filter((t) => t.categoryId === d.categoryId),
                      currency: cur,
                    })}
                    className="w-full flex items-center justify-between py-1.5 px-1 hover:bg-stone/50 rounded-md transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-xs text-onyx font-medium truncate">{d.name}</span>
                      <span className="text-[10px] text-graphite tabular">{d.percent}%</span>
                    </div>
                    <span className="text-xs font-display font-bold text-onyx tabular flex-shrink-0">{formatExact(d.value, cur)}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── FINANCIAL CALENDAR (per currency, no mixing) ───────────────────────
export const FinancialCalendar: React.FC<{ transactions: Transaction[], subscriptions: Subscription[], currency: string, onDrill?: OnDrill }> = ({ transactions, subscriptions, currency, onDrill }) => {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  const monthName = new Date(currentYear, currentMonth).toLocaleString('es-ES', { month: 'long', year: 'numeric' });

  const handlePrev = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else setCurrentMonth(currentMonth - 1);
  };
  const handleNext = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else setCurrentMonth(currentMonth + 1);
  };

  const getDayEvents = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayTxs = transactions.filter((t) => t.date.startsWith(dateStr));
    const daySubs = subscriptions.filter((s) => s.active && s.nextRenewal === dateStr);
    return { dayTxs, daySubs, dateStr };
  };

  const days = [];
  for (let i = 0; i < startOffset; i++) {
    days.push(<div key={`empty-${i}`} className="min-h-[48px] md:min-h-[80px] bg-stone/30 rounded" />);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const { dayTxs, daySubs, dateStr } = getDayEvents(d);
    const hasIncome = dayTxs.some((t) => t.type === 'INCOME');
    const hasExpense = dayTxs.some((t) => t.type === 'EXPENSE');
    const isToday = d === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
    const hasActivity = dayTxs.length > 0 || daySubs.length > 0;

    days.push(
      <button
        key={d}
        type="button"
        onClick={() => {
          if (!hasActivity) return;
          onDrill?.({
            title: `Movimientos del ${dateStr}`,
            subtitle: 'Calendario',
            transactions: dayTxs,
            currency,
          });
        }}
        className={`min-h-[48px] md:min-h-[80px] bg-white border border-black/5 rounded p-1.5 text-left active:scale-[0.98] transition-all ${isToday ? 'ring-2 ring-gold' : ''} ${hasActivity ? 'hover:border-onyx cursor-pointer' : 'cursor-default'}`}
      >
        <div className={`text-[10px] font-bold ${isToday ? 'text-gold' : 'text-graphite'}`}>{d}</div>
        <div className="flex flex-wrap gap-0.5 mt-1">
          {hasIncome && <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />}
          {hasExpense && <div className="w-1.5 h-1.5 rounded-full bg-rose-600" />}
          {daySubs.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-gold" />}
        </div>
      </button>
    );
  }

  return (
    <div className="w-full bg-white p-4 lg:p-6 border border-black/5 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-bold text-base lg:text-lg text-onyx">Calendario</h3>
          <p className="text-[10px] text-graphite uppercase tracking-widest mt-1">{monthName}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handlePrev} className="w-9 h-9 rounded-full bg-stone hover:bg-concrete flex items-center justify-center active:scale-95">
            <Icons.ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={handleNext} className="w-9 h-9 rounded-full bg-stone hover:bg-concrete flex items-center justify-center active:scale-95">
            <Icons.ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
          <div key={day} className="text-center text-[10px] font-bold uppercase tracking-widest text-graphite py-1">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">{days}</div>
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-black/5 text-[10px] text-graphite">
        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Ingreso</span>
        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-rose-600" /> Gasto</span>
        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-gold" /> Renovación</span>
      </div>
    </div>
  );
};
