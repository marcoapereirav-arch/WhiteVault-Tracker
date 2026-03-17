import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, LabelList
} from 'recharts';
import { Transaction, Category, Subscription } from '../types';
import { Icons } from './Icons';

interface ChartsProps {
  transactions: Transaction[];
  categories: Category[];
  currency: string;
}

// Extended props for CashFlow to accept totals
interface CashFlowProps extends ChartsProps {
    incomeTotal: number;
    expenseTotal: number;
}

const formatCurrencyLocal = (amount: number, currency: string) => {
    const symbol = currency === 'USD' ? '$' : (currency === 'EUR' ? '€' : '$');
    const formatted = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
    return currency === 'EUR' ? `${formatted} ${symbol}` : `${symbol} ${formatted}`;
};

// Exact formatter: Always full numbers, standard separators, no abbreviations.
const formatExact = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-ES', { 
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
};

// --- Custom Tooltip Component ---
const CustomTooltip = ({ active, payload, label, currency, type }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-onyx border border-alloy p-3 shadow-xl z-50">
                {label && <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 font-sans">{label}</p>}
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 mb-1 last:mb-0">
                         <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }}></div>
                         <div className="flex flex-col">
                             <span className="text-xs text-white font-bold">
                                 {entry.name}: {formatExact(entry.value, currency)}
                             </span>
                             {type === 'DONUT' && entry.payload.percent && (
                                 <span className="text-[10px] text-gray-400">
                                     {entry.payload.percent}% del total
                                 </span>
                             )}
                             {type === 'CASHFLOW' && entry.dataKey === 'income' && (
                                 <span className="text-[10px] text-green-400">Ingreso</span>
                             )}
                             {type === 'CASHFLOW' && entry.dataKey === 'expense' && (
                                 <span className="text-[10px] text-red-400">Gasto</span>
                             )}
                         </div>
                    </div>
                ))}
                {/* Net Calculation for Cashflow */}
                {type === 'CASHFLOW' && payload.length === 2 && (
                    <div className="mt-2 pt-2 border-t border-white/10">
                        <div className="flex justify-between items-center gap-4">
                            <span className="text-[10px] text-gray-400 uppercase">Neto</span>
                            <span className={`text-xs font-bold font-mono ${payload[0].value - payload[1].value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {formatExact(payload[0].value - payload[1].value, currency)}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        );
    }
    return null;
};

export const FinancialCalendar: React.FC<{ transactions: Transaction[], subscriptions: Subscription[], currency: string }> = ({ transactions, subscriptions, currency }) => {
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday
    
    const startOffset = firstDay === 0 ? 6 : firstDay - 1; 

    const monthName = new Date(currentYear, currentMonth).toLocaleString('es-ES', { month: 'long', year: 'numeric' });

    const handlePrev = () => {
        if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
        else { setCurrentMonth(currentMonth - 1); }
    };
    
    const handleNext = () => {
        if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
        else { setCurrentMonth(currentMonth + 1); }
    };

    const getDayEvents = (day: number) => {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        const dayTxs = transactions.filter(t => t.date.startsWith(dateStr));
        const daySubs = subscriptions.filter(s => s.active && s.nextRenewal === dateStr);
        
        const income = dayTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
        const expense = dayTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
        const transferCount = dayTxs.filter(t => t.type === 'TRANSFER').length;
        
        return { income, expense, transferCount, subs: daySubs, txs: dayTxs };
    };

    const days = [];
    for (let i = 0; i < startOffset; i++) {
        days.push(<div key={`empty-${i}`} className="bg-stone/30 min-h-[50px] md:min-h-[100px] border border-black/5"></div>);
    }
    for (let d = 1; d <= daysInMonth; d++) {
        const events = getDayEvents(d);
        const isToday = d === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
        
        days.push(
            <div 
                key={d} 
                onClick={() => setSelectedDate(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)}
                className={`min-h-[60px] md:min-h-[100px] bg-white border border-black/5 p-1 md:p-2 hover:border-alloy transition-colors relative group cursor-pointer overflow-hidden ${isToday ? 'bg-stone ring-1 ring-onyx inset-0' : ''}`}
            >
                <div className="flex justify-center md:justify-start">
                    <span className={`text-[10px] font-bold ${isToday ? 'text-white bg-onyx w-5 h-5 flex items-center justify-center rounded-full' : 'text-graphite'}`}>{d}</span>
                </div>
                
                {/* Desktop Content: Detailed Badges */}
                <div className="mt-2 hidden md:flex flex-col gap-1">
                    {/* Subscriptions */}
                    {events.subs.map((s, idx) => (
                         <div key={s.id} className="text-[9px] font-bold text-onyx bg-alloy/20 px-1 py-0.5 rounded truncate border-l-2 border-alloy" title={s.name}>
                            {s.name}
                        </div>
                    ))}

                    {/* Financial Summaries Container */}
                    <div className={`flex flex-wrap gap-1 ${events.subs.length > 0 ? 'mt-0' : 'mt-1'}`}>
                        {events.income > 0 && (
                            <div className="flex items-center gap-1 text-[9px] text-green-700 font-bold bg-green-50 px-1 rounded">
                                <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                                {formatExact(events.income, currency)}
                            </div>
                        )}
                        {events.expense > 0 && (
                            <div className="flex items-center gap-1 text-[9px] text-red-700 font-bold bg-red-50 px-1 rounded">
                                <div className="w-1 h-1 bg-red-500 rounded-full"></div>
                                {formatExact(events.expense, currency)}
                            </div>
                        )}
                        {events.transferCount > 0 && (
                             <div className="flex items-center gap-1 text-[9px] text-gray-600 font-bold px-1 bg-stone rounded">
                                <Icons.Transfer className="w-2 h-2" /> {events.transferCount}
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile Content: Minimalist Dots */}
                <div className="md:hidden flex flex-wrap gap-1 mt-2 justify-center content-center h-full pb-2">
                    {events.income > 0 && <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>}
                    {events.expense > 0 && <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>}
                    {(events.subs.length > 0 || events.transferCount > 0) && <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>}
                </div>
            </div>
        );
    }

    // Modal Content Logic
    const selectedDayData = selectedDate ? (() => {
        const day = parseInt(selectedDate.split('-')[2]);
        return getDayEvents(day);
    })() : null;

    return (
        <div className="w-full bg-white p-6 border border-black/5 shadow-sm relative">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="font-display font-bold text-lg text-onyx">Calendario Financiero</h3>
                    <p className="font-sans text-[10px] text-graphite uppercase tracking-widest mt-1">Actividad de {monthName}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handlePrev} className="p-2 hover:bg-stone text-onyx"><Icons.Transfer className="w-4 h-4 rotate-180" /></button>
                    <span className="text-xs font-bold uppercase tracking-wider w-32 text-center">{monthName}</span>
                    <button onClick={handleNext} className="p-2 hover:bg-stone text-onyx"><Icons.Transfer className="w-4 h-4" /></button>
                </div>
            </div>
            
            <div className="grid grid-cols-7 gap-px bg-black/10 text-center mb-px border border-black/5">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                    <div key={day} className="bg-stone py-2 text-[10px] font-bold uppercase text-graphite">{day}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {days}
            </div>

            {/* Day Detail Pop-up */}
            {selectedDate && selectedDayData && (
                <div className="absolute inset-0 z-10 bg-onyx/20 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedDate(null)}>
                    <div className="bg-white w-full max-w-sm shadow-2xl border border-alloy p-0" onClick={e => e.stopPropagation()}>
                        <div className="bg-stone p-4 border-b border-black/5 flex justify-between items-center">
                            <h4 className="font-display font-bold text-onyx">{selectedDate}</h4>
                            <button onClick={() => setSelectedDate(null)}><Icons.Close className="w-4 h-4" /></button>
                        </div>
                        <div className="p-4 max-h-[300px] overflow-y-auto space-y-4">
                            {/* Subscriptions */}
                            {selectedDayData.subs.length > 0 && (
                                <div>
                                    <h5 className="text-[10px] uppercase tracking-widest text-graphite font-bold mb-2">Renovaciones</h5>
                                    {selectedDayData.subs.map(s => (
                                        <div key={s.id} className="flex justify-between items-center p-2 bg-stone border-l-2 border-alloy mb-2">
                                            <span className="text-sm font-bold text-onyx">{s.name}</span>
                                            <span className="text-sm font-mono">{formatExact(s.amount, currency)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Transactions */}
                            {(selectedDayData.txs.length > 0) ? (
                                <div>
                                    <h5 className="text-[10px] uppercase tracking-widest text-graphite font-bold mb-2">Movimientos</h5>
                                    {selectedDayData.txs.map(t => (
                                        <div key={t.id} className="flex justify-between items-center p-2 border-b border-black/5 last:border-0">
                                            <div>
                                                <div className="text-xs font-bold text-onyx">{t.notes || 'Sin descripción'}</div>
                                                <div className="text-[10px] text-graphite uppercase">{t.type}</div>
                                            </div>
                                            <span className={`text-xs font-mono font-bold ${t.type === 'INCOME' ? 'text-green-600' : (t.type === 'EXPENSE' ? 'text-red-600' : 'text-gray-500')}`}>
                                                {t.type === 'EXPENSE' ? '-' : '+'}{formatExact(t.amount, currency)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                selectedDayData.subs.length === 0 && <p className="text-center text-sm text-gray-400 py-4">Sin actividad registrada.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export const CashFlowChart: React.FC<CashFlowProps> = ({ transactions, currency, incomeTotal, expenseTotal }) => {
  // Aggregate data by date
  const data = transactions.reduce((acc: any[], t) => {
    const date = t.date.split('T')[0];
    const existing = acc.find(d => d.date === date);
    
    if (existing) {
      if (t.type === 'INCOME') existing.income += t.amount;
      if (t.type === 'EXPENSE') existing.expense += t.amount;
    } else {
      acc.push({
        date,
        income: t.type === 'INCOME' ? t.amount : 0,
        expense: t.type === 'EXPENSE' ? t.amount : 0
      });
    }
    return acc;
  }, []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="h-[400px] w-full bg-white p-6 border border-black/5 hover:border-alloy transition-colors group">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h3 className="font-display font-bold text-lg text-onyx">Tendencia de Flujo de Efectivo</h3>
            <p className="font-sans text-[10px] text-graphite uppercase tracking-widest mt-1">Velocidad & Neto</p>
          </div>
          {/* Summary Metrics for current range */}
          <div className="flex gap-4">
              <div className="text-right">
                  <p className="text-[9px] uppercase tracking-widest text-graphite font-bold">Ingresos</p>
                  <p className="text-sm font-mono font-bold text-green-600">{formatExact(incomeTotal, currency)}</p>
              </div>
              <div className="text-right">
                  <p className="text-[9px] uppercase tracking-widest text-graphite font-bold">Gastos</p>
                  <p className="text-sm font-mono font-bold text-red-600">{formatExact(expenseTotal, currency)}</p>
              </div>
          </div>
      </div>
      <ResponsiveContainer width="100%" height="80%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0E0E0F" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#0E0E0F" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#D4A853" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#D4A853" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="date" stroke="#9ca3af" fontSize={10} tickFormatter={(val) => val.slice(5)} tickLine={false} axisLine={false} />
          <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}`} />
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
          <Tooltip content={<CustomTooltip currency={currency} type="CASHFLOW" />} cursor={{ stroke: '#C9A86A', strokeWidth: 1 }} />
          <Area type="monotone" dataKey="income" name="Ingresos" stroke="#0E0E0F" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
          <Area type="monotone" dataKey="expense" name="Gastos" stroke="#D4A853" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const IncomeVsExpenseChart: React.FC<{ transactions: Transaction[], currency: string }> = ({ transactions, currency }) => {
    const income = transactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
    const net = income - expense;
    
    const data = [
        { name: 'Ingresos', amount: income },
        { name: 'Gastos', amount: expense }
    ];

    return (
        <div className="h-[500px] w-full bg-white p-6 border border-black/5 hover:border-alloy transition-colors flex flex-col">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <div>
                    <h3 className="font-display font-bold text-lg text-onyx">Ingresos vs. Gastos</h3>
                    <p className="font-sans text-[10px] text-graphite uppercase tracking-widest mt-1">Comparativa del Periodo</p>
                </div>
                {/* Net Balance Replacement for Gold Line */}
                <div className="text-right">
                    <p className="font-sans text-[10px] text-graphite uppercase tracking-widest mb-1">Balance Neto</p>
                    <p className={`font-mono font-bold text-lg ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatExact(net, currency)}
                    </p>
                </div>
            </div>
            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} barSize={60} margin={{top: 20}}>
                        <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltip currency={currency} type="BAR" />} cursor={{fill: '#f7f7f7'}} />
                        <Bar dataKey="amount" fill="#0E0E0F">
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index === 0 ? '#0E0E0F' : '#D4A853'} />
                            ))}
                            {/* Permanent Label List with Exact Numbers */}
                            <LabelList 
                                dataKey="amount" 
                                position="top" 
                                formatter={(val: number) => formatExact(val, currency)}
                                style={{ fill: '#4B4B4D', fontSize: '11px', fontWeight: 'bold', fontFamily: 'monospace' }}
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

export const ExpenseBreakdown: React.FC<ChartsProps> = ({ transactions, categories, currency }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const totalExpense = transactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0);

  const data = transactions
    .filter(t => t.type === 'EXPENSE' && t.categoryId)
    .reduce((acc: any[], t) => {
      const cat = categories.find(c => c.id === t.categoryId);
      if (!cat) return acc;
      
      const existing = acc.find(d => d.name === cat.name);
      if (existing) {
        existing.value += t.amount;
      } else {
        acc.push({ name: cat.name, value: t.amount, color: cat.color, percent: 0 }); // init percent
      }
      return acc;
    }, [])
    .sort((a, b) => b.value - a.value); // Sort desc
  
  // Calculate percents
  data.forEach(d => {
      d.percent = totalExpense > 0 ? Math.round((d.value / totalExpense) * 100) : 0;
  });

  if (data.length === 0) {
      data.push({ name: 'Sin Datos', value: 100, color: '#DEDEDE', percent: 0 });
  }

  return (
    <div className="h-[500px] w-full bg-white p-6 border border-black/5 hover:border-alloy transition-colors relative flex flex-col">
       <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <div>
            <h3 className="font-display font-bold text-lg text-onyx">Desglose por Categorías</h3>
            <p className="font-sans text-[10px] text-graphite uppercase tracking-widest mt-1">Análisis de Gastos</p>
          </div>
          <div className="text-right">
              <p className="font-sans text-[10px] text-graphite uppercase tracking-widest mb-1">Gasto Total</p>
              <p className="font-mono font-bold text-lg text-onyx">{formatExact(totalExpense, currency)}</p>
          </div>
      </div>
      
      {/* Container: Flex Column for Chart Top / List Bottom */}
      <div className="flex-1 min-h-0 flex flex-col">
          
          {/* Pie Chart (Solid) */}
          <div className="w-full h-[55%] relative flex justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={0} // Solid Pie
                    outerRadius={isMobile ? 80 : 95}
                    paddingAngle={0}
                    dataKey="value"
                    stroke="#fff"
                    strokeWidth={1}
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip currency={currency} type="DONUT" />} />
                </PieChart>
              </ResponsiveContainer>
          </div>

          {/* List Below */}
          <div className="w-full h-[45%] overflow-y-auto custom-scrollbar pt-4 border-t border-black/5 mt-2">
               <div className="flex flex-col gap-0">
                  {data.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-black/5 last:border-0 hover:bg-stone/50 transition-colors px-1">
                       <div className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{backgroundColor: item.color}}></div>
                          <span className="text-onyx text-xs font-bold truncate max-w-[140px] md:max-w-[180px]" title={item.name}>{item.name}</span>
                       </div>
                       <span className="font-mono font-bold text-xs text-onyx text-right">{formatExact(item.value, currency)}</span>
                    </div>
                  ))}
               </div>
          </div>
      </div>
    </div>
  );
};