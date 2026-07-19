// WhiteVault™ — Vista completa de Metas y Objetivos.
// Pestaña ADICIONAL dentro de Bóvedas. No sustituye nada: las sub-cuentas
// siguen viéndose dentro de su cuenta como siempre. Esto es la vista global
// para ver de un vistazo todo lo que tienes en marcha, venga de donde venga.

import React, { useMemo, useState } from 'react';
import { FinancialContext, Transaction, SubAccount } from '../types';
import { Icons } from './Icons';
import { haptic, EmptyState } from './Mobile';
import {
  collectGoals,
  goalPaid,
  goalRemaining,
  goalProgress,
  isGoalComplete,
  paymentGoalTotals,
  byPriority,
  GoalRef,
} from '../utils/goals';

interface Props {
  contexts: FinancialContext[];
  transactions: Transaction[];
  formatCurrency: (n: number, c?: string) => string;
  baseCurrency: string;
  onOpenGoal: (ctxId: string, accId: string, subId: string) => void;
  onManageGoal: (ctxId: string, accId: string, subId: string) => void;
  onOpenArchive: () => void;
}

type Tipo = 'PAYMENT' | 'SAVING';

export const GoalsOverview: React.FC<Props> = ({
  contexts, transactions, formatCurrency, baseCurrency, onOpenGoal, onManageGoal, onOpenArchive,
}) => {
  const [tipo, setTipo] = useState<Tipo>('PAYMENT');
  const [prioridad, setPrioridad] = useState<string>('ALL');

  const totals = useMemo(
    () => paymentGoalTotals(contexts, transactions, baseCurrency),
    [contexts, transactions, baseCurrency]
  );

  const lista = useMemo(() => {
    const todas = collectGoals(contexts, tipo)
      .filter(({ sub }) => !isGoalComplete(sub, transactions, baseCurrency));
    const filtrada = tipo === 'SAVING' || prioridad === 'ALL'
      ? todas
      : todas.filter(({ sub }) =>
          prioridad === 'NONE' ? sub.priority == null : String(sub.priority ?? '') === prioridad);
    return filtrada.sort((a, b) => byPriority(a.sub, b.sub, transactions, baseCurrency));
  }, [contexts, transactions, baseCurrency, tipo, prioridad]);

  const metas = collectGoals(contexts, 'SAVING');

  return (
    <div className="pb-tabbar lg:px-8 lg:max-w-[1200px] lg:mx-auto">
      {/* Selector Objetivos / Metas */}
      <div className="px-3 lg:px-0 mb-3">
        <div className="grid grid-cols-2 gap-2">
          {(['PAYMENT', 'SAVING'] as Tipo[]).map((t) => (
            <button
              key={t}
              onClick={() => { haptic('selection'); setTipo(t); }}
              className={`h-11 rounded-xl text-xs font-display font-bold uppercase tracking-widest transition-all active:scale-[0.98] ${
                tipo === t ? 'bg-onyx text-white' : 'bg-white border border-onyx/[0.12] text-graphite'
              }`}
            >
              {t === 'PAYMENT' ? `Objetivos (${totals.count})` : `Metas (${metas.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Resumen: sólo tiene sentido en Objetivos (deuda total) */}
      {tipo === 'PAYMENT' && (totals.count > 0 || totals.completed > 0) && (
        <section className="mx-3 lg:mx-0 mb-4">
          <div className="bg-onyx text-white rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-gold mb-1">Te falta por pagar</div>
                <div className="text-3xl font-display font-bold tabular leading-none">
                  {formatCurrency(totals.remaining, baseCurrency)}
                </div>
                <div className="text-[11px] text-white/60 mt-2 tabular">
                  {formatCurrency(totals.paid, baseCurrency)} pagados de {formatCurrency(totals.target, baseCurrency)}
                </div>
              </div>
              {totals.completed > 0 && (
                <button
                  onClick={() => { haptic('selection'); onOpenArchive(); }}
                  className="flex-shrink-0 h-8 px-3 bg-white/10 text-white text-[10px] font-display font-bold uppercase tracking-widest rounded-full active:scale-95 hover:bg-white/20 transition-all"
                >
                  {totals.completed} saldados
                </button>
              )}
            </div>
            {totals.target > 0 && (
              <div className="h-1.5 bg-white/15 rounded-full overflow-hidden mt-4">
                <div className="h-full bg-gold transition-all" style={{ width: `${(totals.paid / totals.target) * 100}%` }} />
              </div>
            )}
            <div className="flex items-center gap-1.5 mt-4 -mb-1 overflow-x-auto no-scrollbar">
              {['ALL', '1', '2', '3', '4', 'NONE'].map((p) => (
                <button
                  key={p}
                  onClick={() => { haptic('selection'); setPrioridad(p); }}
                  className={`flex-shrink-0 h-7 px-3 rounded-full text-[10px] font-display font-bold uppercase tracking-widest transition-all active:scale-95 ${
                    prioridad === p ? 'bg-gold text-onyx' : 'bg-white/10 text-white/70'
                  }`}
                >
                  {p === 'ALL' ? 'Todas' : p === 'NONE' ? 'Sin prio' : `Prio ${p}`}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {lista.length === 0 ? (
        <EmptyState
          icon={Icons.Target}
          title={tipo === 'PAYMENT' ? 'Sin objetivos activos' : 'Sin metas activas'}
          description={
            tipo === 'PAYMENT'
              ? 'Crea una sub-cuenta de tipo Objetivo para llevar la cuenta de lo que tienes que pagar.'
              : 'Crea una sub-cuenta de tipo Meta para ir reuniendo dinero hacia una cifra.'
          }
        />
      ) : (
        <div className="mx-3 lg:mx-0 bg-white border border-black/5 rounded-2xl overflow-hidden divide-y divide-black/5">
          {lista.map((g) => (
            <GoalRow
              key={g.sub.id}
              goal={g}
              tipo={tipo}
              transactions={transactions}
              baseCurrency={baseCurrency}
              formatCurrency={formatCurrency}
              onOpen={() => onOpenGoal(g.contextId, g.accountId, g.sub.id)}
              onManage={() => onManageGoal(g.contextId, g.accountId, g.sub.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const GoalRow: React.FC<{
  goal: GoalRef;
  tipo: Tipo;
  transactions: Transaction[];
  baseCurrency: string;
  formatCurrency: (n: number, c?: string) => string;
  onOpen: () => void;
  onManage: () => void;
}> = ({ goal, tipo, transactions, baseCurrency, formatCurrency, onOpen, onManage }) => {
  const { sub, contextName, accountName } = goal;
  const pagado = goalPaid(sub, transactions, baseCurrency);
  const falta = goalRemaining(sub, transactions, baseCurrency);
  const pct = goalProgress(sub, transactions, baseCurrency);

  return (
    <div
      onClick={() => { haptic('selection'); onOpen(); }}
      className="px-4 py-3.5 active:bg-stone cursor-pointer transition-colors"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] font-display font-semibold text-onyx truncate">{sub.name}</span>
            {tipo === 'PAYMENT' && sub.priority != null && (
              <span className="flex-shrink-0 px-1.5 py-0.5 text-[8px] font-bold bg-gold/20 text-onyx rounded">P{sub.priority}</span>
            )}
          </div>
          {/* De qué cuenta viene — sigue viviendo ahí, esto es sólo la vista global */}
          <div className="text-[10px] text-graphite uppercase tracking-widest mt-0.5 truncate">
            {contextName} · {accountName}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-base font-display font-bold text-onyx tabular leading-tight">
            {formatCurrency(falta, baseCurrency)}
          </div>
          <div className="text-[9px] text-graphite uppercase tracking-widest">
            {tipo === 'PAYMENT' ? 'te falta' : 'para la meta'}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); haptic('medium'); onManage(); }}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-stone active:scale-90 transition-all flex-shrink-0 -mr-1"
          aria-label={`Gestionar ${sub.name}`}
        >
          <Icons.MoreH className="w-4 h-4 text-graphite" />
        </button>
      </div>
      <div className="h-1.5 bg-stone rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${tipo === 'PAYMENT' ? 'bg-gold' : 'bg-alloy'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-graphite mt-1 tabular">
        <span>{formatCurrency(pagado, baseCurrency)} de {formatCurrency(sub.target || 0, baseCurrency)}</span>
        <span className="font-bold">{pct.toFixed(1)}%</span>
      </div>
    </div>
  );
};
