import React, { useState, useMemo } from 'react';
import { Icons } from './Icons';
import { Subscription } from '../types';

const DICTIONARY = {
  active: 'Activo',
  paused: 'Pausada',
  nextBilling: 'Prox. Cobro',
};

interface SubscriptionsViewProps {
  subscriptions: Subscription[];
  contextFilter: string;
  formatCurrency: (amount: number) => string;
  getAccountName: (ctxId: string, accId: string) => string;
  getSubAccountName: (ctxId: string, accId: string, subId: string) => string;
  onEditSubscription: (subscription: Subscription) => void;
  onNewSubscription: () => void;
}

export const SubscriptionsView: React.FC<SubscriptionsViewProps> = React.memo(({
  subscriptions,
  contextFilter,
  formatCurrency,
  getAccountName,
  getSubAccountName,
  onEditSubscription,
  onNewSubscription,
}) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PAUSED'>('ALL');
  const t = DICTIONARY;

  const filtered = useMemo(() =>
    subscriptions
      .filter(s => contextFilter === 'ALL' || s.contextId === contextFilter)
      .filter(s => statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? s.active : !s.active)),
    [subscriptions, contextFilter, statusFilter]
  );

  return (
    <div className="space-y-6">
      <div className="flex gap-4 mb-4">
        {(['ALL', 'ACTIVE', 'PAUSED'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border transition-all ${statusFilter === filter ? 'bg-onyx text-white border-onyx' : 'bg-white text-graphite border-black/10 hover:border-alloy'}`}
          >
            {filter === 'ALL' ? 'Todos' : (filter === 'ACTIVE' ? 'Activas' : 'Pausadas')}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
        {filtered.map(s => (
          <div
            key={s.id}
            onClick={() => onEditSubscription(s)}
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

        <button
          onClick={onNewSubscription}
          className="border-2 border-dashed border-black/10 flex flex-col items-center justify-center p-6 text-graphite hover:border-alloy hover:text-alloy transition-colors group h-full min-h-[200px]"
        >
          <Icons.Plus className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
          <span className="font-display font-bold text-sm uppercase tracking-widest">Añadir Suscripción</span>
        </button>
      </div>
    </div>
  );
});
