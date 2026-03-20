import React from 'react';
import { Icons } from './Icons';
import { FinancialContext } from '../types';

const WHITEVAULT_ISOTYPE = "https://storage.googleapis.com/msgsndr/QDrKqO1suwk5VOPoTKJE/media/693880a4fb91d00b324304d7.png";

interface HeaderProps {
  contexts: FinancialContext[];
  contextFilter: string;
  onContextFilterChange: (value: string) => void;
  onToggleNav: () => void;
  onOpenActions: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  contexts,
  contextFilter,
  onContextFilterChange,
  onToggleNav,
  onOpenActions,
}) => {
  return (
    <header className="h-20 bg-white border-b border-black/5 flex items-center justify-between px-6 md:px-10 z-10 sticky top-0 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-4">
        <button onClick={onToggleNav} className="p-1 hover:opacity-80 transition-opacity">
          <img src={WHITEVAULT_ISOTYPE} alt="Menu" className="w-7 h-7 object-contain" />
        </button>

        <div className="relative group">
          <select
            value={contextFilter}
            onChange={(e) => onContextFilterChange(e.target.value)}
            className="bg-transparent border-b border-black/20 py-2 pr-8 pl-0 text-sm font-display font-bold uppercase tracking-wide text-onyx focus:outline-none focus:border-alloy appearance-none cursor-pointer"
          >
            <option value="ALL">VISTA GLOBAL</option>
            {contexts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none">
            <Icons.Expense className="w-3 h-3 text-alloy" />
          </div>
        </div>
      </div>

      <div className="flex items-center">
        <button
          onClick={onOpenActions}
          className="hidden md:flex items-center gap-2 bg-onyx text-white px-4 py-2 hover:bg-gold transition-colors shadow-sm"
        >
          <Icons.Plus className="w-4 h-4" />
          <span className="font-display font-bold text-xs uppercase tracking-widest">Acciones Rápidas</span>
        </button>

        <button
          onClick={onOpenActions}
          className="md:hidden flex items-center justify-center w-8 h-8 bg-onyx text-white rounded-full shadow-md hover:bg-gold transition-colors"
        >
          <Icons.Plus className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

// Quick Actions Overlay
interface QuickActionsProps {
  isOpen: boolean;
  onClose: () => void;
  actions: { label: string; icon: any; action: () => void }[];
}

export const QuickActionsMenu: React.FC<QuickActionsProps> = ({ isOpen, onClose, actions }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-start justify-center md:justify-end md:p-4">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="
        relative z-50 w-full md:w-64 bg-white shadow-2xl p-4 rounded-t-2xl md:rounded-lg border border-black/10
        animate-in slide-in-from-bottom-5 md:slide-in-from-top-2 fade-in
        md:mt-14 md:mr-10
      ">
        <div className="flex justify-between items-center mb-4 px-2 md:hidden">
          <span className="text-xs font-bold uppercase tracking-widest text-graphite">Seleccionar Acción</span>
          <button onClick={onClose}><Icons.Close className="w-5 h-5 text-onyx" /></button>
        </div>

        <div className="grid grid-cols-2 md:flex md:flex-col gap-2 md:gap-0">
          {actions.map((btn) => (
            <button
              key={btn.label}
              onClick={() => { btn.action(); onClose(); }}
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
  );
};
