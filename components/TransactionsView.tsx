import React, { useState, useMemo } from 'react';
import { Icons } from './Icons';
import { Transaction, Category } from '../types';

const DICTIONARY = {
  transactions: 'Libro Mayor',
  all: 'Todos',
  income: 'Ingreso',
  expense: 'Gasto',
  transfer: 'Transferencia',
};

interface TransactionsViewProps {
  transactions: Transaction[];
  categories: Category[];
  contextFilter: string;
  formatCurrency: (amount: number) => string;
  formatDateTime: (isoString: string) => string;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  categories,
  contextFilter,
  formatCurrency,
  formatDateTime,
}) => {
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER'>('ALL');
  const t = DICTIONARY;

  const filteredTransactions = useMemo(() =>
    transactions
      .filter(tx => contextFilter === 'ALL' || tx.contextId === contextFilter)
      .filter(tx => typeFilter === 'ALL' || tx.type === typeFilter),
    [transactions, contextFilter, typeFilter]
  );

  return (
    <div className="bg-white border border-black/5 shadow-sm overflow-hidden animate-in fade-in">
      <div className="p-6 border-b border-black/5 bg-stone flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="font-display font-bold text-xl uppercase tracking-widest text-onyx">{t.transactions}</h2>

        <div className="flex bg-white border border-black/10">
          {(['ALL', 'INCOME', 'EXPENSE', 'TRANSFER'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setTypeFilter(filter)}
              className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${typeFilter === filter ? 'bg-onyx text-white' : 'text-graphite hover:bg-stone'}`}
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
            {filteredTransactions.map(tx => (
              <tr key={tx.id} className="hover:bg-stone transition-colors group">
                <td className="p-5 text-sm text-graphite font-mono">
                  {formatDateTime(tx.date)}
                </td>
                <td className="p-5">
                  <span className={`text-[10px] font-bold px-2 py-1 uppercase tracking-wider border ${tx.type === 'INCOME' ? 'bg-onyx text-white border-onyx' : 'bg-white text-onyx border-black/10'}`}>
                    {tx.type === 'INCOME' ? 'INGRESO' : (tx.type === 'EXPENSE' ? 'GASTO' : 'TRANSF.')}
                  </span>
                </td>
                <td className="p-5 text-sm font-bold text-onyx font-display">{tx.notes}</td>
                <td className="p-5 text-sm text-graphite flex items-center gap-2">
                  {tx.categoryId && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: categories.find(c => c.id === tx.categoryId)?.color }} />}
                  {tx.categoryId && categories.find(c => c.id === tx.categoryId)?.name}
                </td>
                <td className={`p-5 text-right font-mono font-bold ${tx.type === 'INCOME' ? 'text-onyx' : 'text-graphite'}`}>
                  {formatCurrency(tx.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
