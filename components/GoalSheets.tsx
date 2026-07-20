// WhiteVault™ — Sheets de Metas y Objetivos
//   ManageSubAccountSheet — renombrar, mover, convertir, prioridad, abonar, borrar
//   GoalArchiveSheet      — Objetivos ya saldados, con su historial completo
//   GoalCreditSheet       — abono a un Objetivo sin movimiento de dinero

import React, { useState } from 'react';
import { AppState, SubAccount, GoalKind } from '../types';
import { Icons } from './Icons';
import { BottomSheet, PressButton, haptic, pressProps} from './Mobile';
import {
  goalKindOf,
  goalPaid,
  goalRemaining,
  goalProgress,
  goalMovements,
  isGoalComplete,
  collectGoals,
} from '../utils/goals';

interface Ubicacion {
  contextId: string;
  accountId: string;
  subId: string;
}

// ─── GESTIONAR SUB-CUENTA ───────────────────────────────────────────────
export const ManageSubAccountSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  state: AppState;
  target: Ubicacion | null;
  formatCurrency: (n: number, c?: string) => string;
  onRename: (name: string) => void;
  onMove: (toAccountId: string) => void;
  onUpdate: (patch: Partial<Pick<SubAccount, 'target' | 'goalKind' | 'priority' | 'completedAt'>>) => void;
  onAddCredit: () => void;
  onDelete: () => void;
}> = ({ open, onClose, state, target, formatCurrency, onRename, onMove, onUpdate, onAddCredit, onDelete }) => {
  const ctx = state.contexts.find((c) => c.id === target?.contextId);
  const acc = ctx?.accounts.find((a) => a.id === target?.accountId);
  const sub = acc?.subAccounts.find((s) => s.id === target?.subId);

  const [nombre, setNombre] = useState('');
  const [meta, setMeta] = useState('');
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);

  React.useEffect(() => {
    if (sub) {
      setNombre(sub.name);
      setMeta(sub.target ? String(sub.target) : '');
      setConfirmarBorrado(false);
    }
  }, [sub?.id, open]);

  if (!sub || !ctx || !acc) return null;

  const kind = goalKindOf(sub);
  const cur = state.user.currency;
  const pagado = goalPaid(sub, state.transactions, cur);
  const falta = goalRemaining(sub, state.transactions, cur);

  const guardarNombre = () => {
    const v = nombre.trim();
    if (v && v !== sub.name) onRename(v);
  };

  const cambiarTipo = (k: GoalKind | null) => {
    haptic('medium');
    if (k === null) onUpdate({ goalKind: undefined, target: undefined });
    else onUpdate({ goalKind: k, target: sub.target || Number(meta) || undefined });
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={sub.name} subtitle={`${ctx.name} · ${acc.name}`}>
      {kind === 'PAYMENT' && (
        <div className="bg-stone rounded-2xl p-4 mb-5">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-[10px] uppercase tracking-widest text-graphite">Te falta</span>
            <span className="text-xl font-display font-bold text-onyx tabular">{formatCurrency(falta, cur)}</span>
          </div>
          <div className="h-1.5 bg-white rounded-full overflow-hidden">
            <div className="h-full bg-gold transition-all" style={{ width: `${goalProgress(sub, state.transactions, cur)}%` }} />
          </div>
          <div className="text-[10px] text-graphite mt-1.5 tabular">
            {formatCurrency(pagado, cur)} pagados de {formatCurrency(sub.target || 0, cur)}
          </div>
        </div>
      )}

      {/* Nombre */}
      <label className="block text-[10px] font-display font-bold uppercase tracking-widest text-graphite mb-1.5">Nombre</label>
      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        onBlur={guardarNombre}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        maxLength={100}
        className="wv-field mb-4"
      />

      {/* Tipo */}
      <label className="block text-[10px] font-display font-bold uppercase tracking-widest text-graphite mb-1.5">Tipo</label>
      <div className="grid grid-cols-3 gap-2 mb-2">
        {([null, 'SAVING', 'PAYMENT'] as const).map((k) => (
          <button
            key={String(k)}
            {...pressProps(() => cambiarTipo(k))}
            className={`h-11 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition-all active:scale-95 ${
              kind === k ? 'bg-onyx text-white' : 'bg-stone text-graphite'
            }`}
          >
            {k === null ? 'Normal' : k === 'SAVING' ? 'Meta' : 'Objetivo'}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-graphite mb-4 leading-snug">
        {kind === 'PAYMENT'
          ? 'Sube cuando PAGAS. Asigna gastos aquí y la barra avanza.'
          : kind === 'SAVING'
            ? 'Sube cuando GUARDAS. Transfiere dinero y se queda dentro.'
            : 'Sin barra de progreso.'}
      </p>

      {/* Meta */}
      {kind && (
        <>
          <label className="block text-[10px] font-display font-bold uppercase tracking-widest text-graphite mb-1.5">
            {kind === 'PAYMENT' ? 'Total a pagar' : 'Cuánto reunir'}
          </label>
          <input
            type="number" step="0.01" min="0" value={meta}
            onChange={(e) => setMeta(e.target.value)}
            onBlur={() => { const v = Number(meta); if (v > 0 && v !== sub.target) onUpdate({ target: v }); }}
            className="wv-field mb-4"
          />
        </>
      )}

      {/* Prioridad */}
      {kind === 'PAYMENT' && (
        <>
          <label className="block text-[10px] font-display font-bold uppercase tracking-widest text-graphite mb-1.5">Prioridad</label>
          <div className="grid grid-cols-5 gap-2 mb-4">
            {[null, 1, 2, 3, 4].map((p) => (
              <button
                key={String(p)}
                {...pressProps(() => { haptic('selection'); onUpdate({ priority: p }); })}
                className={`h-10 rounded-xl text-xs font-display font-bold transition-all active:scale-95 ${
                  (sub.priority ?? null) === p ? 'bg-gold text-onyx' : 'bg-stone text-graphite'
                }`}
              >
                {p === null ? '—' : p}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Saldado manual — para deudas que se cierran sin pagarlas enteras */}
      {kind === 'PAYMENT' && (
        <>
          <label className="block text-[10px] font-display font-bold uppercase tracking-widest text-graphite mb-1.5">Estado</label>
          <div className="grid grid-cols-2 gap-2 mb-5">
            <button
              {...pressProps(() => { haptic('medium'); onUpdate({ completedAt: null }); })}
              className={`h-11 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition-all active:scale-95 ${
                !sub.completedAt ? 'bg-onyx text-white' : 'bg-stone text-graphite'
              }`}
            >
              Pendiente
            </button>
            <button
              {...pressProps(() => { haptic('medium'); onUpdate({ completedAt: new Date().toISOString() }); })}
              className={`h-11 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition-all active:scale-95 ${
                sub.completedAt ? 'bg-emerald-700 text-white' : 'bg-stone text-graphite'
              }`}
            >
              Saldado
            </button>
          </div>
          <p className="text-[11px] text-graphite -mt-3 mb-5 leading-snug">
            Puedes darlo por saldado aunque no esté pagado del todo. Sale del listado y pasa al historial.
          </p>
        </>
      )}

      {/* Mover a otra cuenta */}
      <label className="block text-[10px] font-display font-bold uppercase tracking-widest text-graphite mb-1.5">Mover a</label>
      <select
        value={acc.id}
        onChange={(e) => { haptic('medium'); onMove(e.target.value); }}
        className="wv-field mb-5"
      >
        {ctx.accounts.map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>

      {/* Abono sin movimiento */}
      {kind === 'PAYMENT' && (
        <PressButton onClick={() => { haptic('medium'); onAddCredit(); }} variant="secondary" className="w-full mb-2">
          <Icons.Plus className="w-4 h-4" />
          Registrar abono sin pago
        </PressButton>
      )}

      {/* Borrar */}
      {!confirmarBorrado ? (
        <button
          {...pressProps(() => { haptic('medium'); setConfirmarBorrado(true); })}
          className="w-full h-12 text-rose-700 text-xs font-display font-bold uppercase tracking-widest rounded-xl active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          <Icons.Trash className="w-4 h-4" />
          Eliminar sub-cuenta
        </button>
      ) : (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 mt-2">
          <p className="text-xs text-onyx leading-snug mb-3">
            Se elimina <strong>{sub.name}</strong>. Tus transacciones <strong>no se borran</strong>: siguen en el
            libro mayor y sólo pierden el vínculo con esta sub-cuenta.
            {Object.values(sub.balances || {}).some((v) => v) && ' El saldo vuelve a la cuenta padre.'}
          </p>
          <div className="flex gap-2">
            <button
              {...pressProps(() => setConfirmarBorrado(false))}
              className="flex-1 h-11 bg-white text-graphite text-xs font-display font-bold uppercase tracking-widest rounded-xl active:scale-95"
            >
              Cancelar
            </button>
            <button
              {...pressProps(() => { haptic('heavy'); onDelete(); onClose(); })}
              className="flex-1 h-11 bg-rose-700 text-white text-xs font-display font-bold uppercase tracking-widest rounded-xl active:scale-95"
            >
              Eliminar
            </button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
};

// ─── ABONO SIN MOVIMIENTO ───────────────────────────────────────────────
// Baja la deuda sin que salga dinero de ninguna cuenta. Caso real: alguien que
// te debe te compensa con trabajo, o te cobra algo que era tuyo y lo descontáis.
export const GoalCreditSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  subName: string;
  onSubmit: (data: { amount: number; date: string; note: string }) => void;
}> = ({ open, onClose, subName, onSubmit }) => {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  React.useEffect(() => { if (open) { setAmount(''); setNote(''); } }, [open]);

  const submit = () => {
    const v = Number(amount);
    if (!v || v <= 0) return;
    onSubmit({ amount: v, date: new Date(`${date}T12:00:00`).toISOString(), note: note.trim() });
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Abono sin pago" subtitle={subName}>
      <p className="text-xs text-graphite leading-snug mb-5">
        Descuenta de la deuda sin que salga dinero de ninguna cuenta. No afecta a tus saldos ni a tus métricas de gasto.
      </p>
      <label className="block text-[10px] font-display font-bold uppercase tracking-widest text-graphite mb-1.5">Importe</label>
      <input
        type="number" step="0.01" min="0.01" autoFocus value={amount} placeholder="0.00"
        onChange={(e) => setAmount(e.target.value)}
        className="wv-field mb-4"
      />
      <label className="block text-[10px] font-display font-bold uppercase tracking-widest text-graphite mb-1.5">Concepto</label>
      <input
        type="text" maxLength={200} value={note} placeholder="Ej. Mes de julio no cobrado — descontado"
        onChange={(e) => setNote(e.target.value)}
        className="wv-field mb-4"
      />
      <label className="block text-[10px] font-display font-bold uppercase tracking-widest text-graphite mb-1.5">Fecha</label>
      <input
        type="date" value={date} onChange={(e) => setDate(e.target.value)}
        className="wv-field mb-5"
      />
      <PressButton onClick={submit} variant="primary" className="w-full">Registrar abono</PressButton>
    </BottomSheet>
  );
};

// ─── ARCHIVO DE OBJETIVOS SALDADOS ──────────────────────────────────────
export const GoalArchiveSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  state: AppState;
  formatCurrency: (n: number, c?: string) => string;
  formatDateTime: (s: string) => string;
}> = ({ open, onClose, state, formatCurrency, formatDateTime }) => {
  const [abierto, setAbierto] = useState<string | null>(null);
  const cur = state.user.currency;
  const saldados = collectGoals(state.contexts, 'PAYMENT')
    .filter(({ sub }) => isGoalComplete(sub, state.transactions, cur));

  return (
    <BottomSheet open={open} onClose={onClose} title="Objetivos saldados" subtitle={`${saldados.length} completados`}>
      {saldados.length === 0 ? (
        <div className="text-center py-10 text-sm text-graphite">Todavía no has saldado ningún objetivo.</div>
      ) : (
        <div className="space-y-2">
          {saldados.map(({ sub, accountName }) => {
            const movs = goalMovements(sub, state.transactions);
            const isOpen = abierto === sub.id;
            return (
              <div key={sub.id} className="bg-stone rounded-2xl overflow-hidden">
                <button
                  {...pressProps(() => { haptic('selection'); setAbierto(isOpen ? null : sub.id); })}
                  className="w-full px-4 py-3.5 flex items-center gap-3 text-left active:bg-black/5 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Icons.Check className="w-4 h-4 text-emerald-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-display font-semibold text-onyx truncate">{sub.name}</div>
                    <div className="text-[10px] text-graphite uppercase tracking-widest mt-0.5">
                      {accountName} · {movs.length} {movs.length === 1 ? 'pago' : 'pagos'}
                    </div>
                  </div>
                  <span className="text-sm font-display font-bold text-onyx tabular flex-shrink-0">
                    {formatCurrency(sub.target || 0, cur)}
                  </span>
                  <Icons.ChevronDown className={`w-4 h-4 text-graphite flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-4 pb-3 space-y-1.5 border-t border-black/5 pt-3">
                    {movs.length === 0 && <div className="text-[11px] text-graphite py-2">Sin movimientos registrados.</div>}
                    {movs.map((m) => (
                      <div key={m.id} className="flex items-center justify-between gap-3 bg-white rounded-xl px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-onyx truncate">{m.note}</div>
                          <div className="text-[10px] text-graphite mt-0.5">
                            {formatDateTime(m.date)}
                            {m.source !== 'LEDGER' && (
                              <span className="ml-1.5 px-1 py-0.5 bg-stone rounded text-[8px] uppercase tracking-wider font-bold">
                                {m.source === 'CREDIT' ? 'Abono' : 'Histórico'}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs font-display font-bold text-onyx tabular flex-shrink-0">
                          {formatCurrency(m.amount, cur)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </BottomSheet>
  );
};
