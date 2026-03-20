import React from 'react';
import { Icons } from './Icons';
import { Category } from '../types';

interface CategoriesViewProps {
  categories: Category[];
  contextFilter: string;
  formatCurrency: (amount: number) => string;
  getAccountName: (ctxId: string, accId: string) => string;
  getSubAccountName: (ctxId: string, accId: string, subId: string) => string;
  getContextName: (ctxId: string) => string;
  onEditCategory: (category: Category) => void;
  onNewCategory: () => void;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  categories,
  contextFilter,
  formatCurrency,
  getAccountName,
  getSubAccountName,
  getContextName,
  onEditCategory,
  onNewCategory,
}) => {
  const filtered = contextFilter === 'ALL' ? categories : categories.filter(c => c.contextId === contextFilter);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-in fade-in">
      {filtered.map(c => (
        <div
          key={c.id}
          onClick={() => onEditCategory(c)}
          className="bg-white p-6 border border-black/5 hover:border-alloy transition-colors group relative overflow-hidden cursor-pointer"
        >
          <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: c.color }} />
          <div className="flex items-center justify-between mb-4 pl-3">
            <h3 className="font-display font-bold text-lg text-onyx">{c.name}</h3>
            <div className="p-2 rounded-full border border-black/5">
              <Icons.Category className="w-4 h-4" style={{ color: c.color }} />
            </div>
          </div>
          <div className="pl-3 mb-2">
            <p className="text-[10px] text-graphite uppercase tracking-widest mb-1">Presupuesto</p>
            <p className="font-mono font-bold text-onyx">{c.budget ? formatCurrency(c.budget) : 'N/A'}</p>
          </div>
          <div className="pl-3 pt-2 border-t border-black/5 space-y-1">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider block">
              {getContextName(c.contextId)}
            </span>
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

      <button
        onClick={onNewCategory}
        className="border-2 border-dashed border-black/10 flex flex-col items-center justify-center p-6 text-graphite hover:border-alloy hover:text-alloy transition-colors group h-full min-h-[150px]"
      >
        <Icons.Plus className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
        <span className="font-display font-bold text-sm uppercase tracking-widest">Nueva Categoría</span>
      </button>
    </div>
  );
};
