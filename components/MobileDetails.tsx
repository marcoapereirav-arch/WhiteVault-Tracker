// WhiteVault™ — Mobile detail sheets
// Bottom-sheet variants of: TransactionDetail, SubscriptionDetail,
// CategoryHistory, DashboardSummary, DeleteContextConfirm, PasswordSetup.

import React from 'react';
import { AppState, Transaction, Subscription, Category } from '../types';
import { Icons } from './Icons';
import { BottomSheet, IconCircle, PressButton, haptic } from './Mobile';
import { formatIntervalLabel } from '../utils/subscriptions';

interface CommonProps {
  state: AppState;
  formatCurrency: (n: number, c?: string) => string;
  formatDateTime: (s: string) => string;
  getAccountName: (cId: string, aId: string) => string;
  getSubAccountName: (cId: string, aId: string, sId: string) => string;
}

// ─── TRANSACTION DETAIL ─────────────────────────────────────────────────
export const TransactionDetailSheet: React.FC<CommonProps & {
  tx: Transaction | undefined;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
}> = ({ state, formatCurrency, formatDateTime, getAccountName, getSubAccountName, tx, open, onClose, onEdit, onDelete, onDuplicate }) => {
  if (!tx) return null;
  const cat = tx.categoryId ? state.categories.find((c) => c.id === tx.categoryId) : null;
  const ctx = state.contexts.find((c) => c.id === tx.contextId);
  const tone = tx.type === 'INCOME' ? 'income' : tx.type === 'EXPENSE' ? 'expense' : 'transfer';
  const Icon = tx.type === 'INCOME' ? Icons.Income : tx.type === 'EXPENSE' ? Icons.Expense : Icons.Transfer;
  const sign = tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : '';
  const valueColor = tx.type === 'INCOME' ? 'text-emerald-700' : tx.type === 'EXPENSE' ? 'text-rose-700' : 'text-onyx';

  return (
    <BottomSheet open={open} onClose={onClose} title="Transacción" subtitle="Detalle del movimiento">
      <div className="text-center mb-6">
        <IconCircle tone={tone as any} size="lg" bgColor={cat?.color}>
          <Icon className="w-6 h-6" />
        </IconCircle>
        <div className={`mt-3 text-3xl font-display font-bold tabular tracking-tight ${valueColor}`}>
          {sign}{formatCurrency(tx.amount, tx.currency)}
        </div>
        <div className="text-xs text-graphite mt-1">{tx.notes || (tx.type === 'TRANSFER' ? 'Transferencia' : 'Sin descripción')}</div>
      </div>

      <div className="bg-white border border-black/5 rounded-2xl divide-y divide-black/5">
        <DetailRow label="Tipo" value={tx.type === 'INCOME' ? 'Ingreso' : tx.type === 'EXPENSE' ? 'Gasto' : 'Transferencia'} />
        <DetailRow label="Fecha" value={formatDateTime(tx.date)} />
        <DetailRow label="Moneda" value={tx.currency} mono />
        <DetailRow label="Espacio" value={ctx?.name || '—'} />
        <DetailRow label="Cuenta" value={getAccountName(tx.contextId, tx.accountId) || '—'} />
        {tx.subAccountId && <DetailRow label="Sub-Cuenta" value={getSubAccountName(tx.contextId, tx.accountId, tx.subAccountId)} />}
        {cat && (
          <DetailRow
            label="Categoría"
            value={
              <span className="flex items-center gap-2 justify-end">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                {cat.name}
              </span>
            }
          />
        )}
        {tx.type === 'TRANSFER' && tx.toContextId && tx.toAccountId && (
          <DetailRow
            label="Destino"
            value={
              <span className="text-right block">
                {state.contexts.find((c) => c.id === tx.toContextId)?.name} → {getAccountName(tx.toContextId, tx.toAccountId)}
                {tx.toSubAccountId ? ` / ${getSubAccountName(tx.toContextId, tx.toAccountId, tx.toSubAccountId)}` : ''}
              </span>
            }
          />
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mt-5">
        {onDuplicate && (
          <PressButton variant="secondary" full onClick={onDuplicate}>
            <Icons.Copy className="w-4 h-4" />
            Duplicar
          </PressButton>
        )}
        <PressButton variant="secondary" full onClick={onEdit}>
          <Icons.Edit className="w-4 h-4" />
          Editar
        </PressButton>
        <PressButton variant="danger" full onClick={() => { if (confirm('¿Eliminar transacción?')) { onDelete(); haptic('heavy'); } }}>
          <Icons.Trash className="w-4 h-4" />
          Eliminar
        </PressButton>
      </div>
    </BottomSheet>
  );
};

// ─── SUBSCRIPTION DETAIL ────────────────────────────────────────────────
export const SubscriptionDetailSheet: React.FC<CommonProps & {
  sub: Subscription | undefined;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onTxClick?: (tx: Transaction) => void;
}> = ({ state, formatCurrency, formatDateTime, getAccountName, getSubAccountName, sub, open, onClose, onEdit, onTxClick }) => {
  if (!sub) return null;
  const ctx = state.contexts.find((c) => c.id === sub.contextId);
  const days = sub.nextRenewal ? Math.ceil((new Date(sub.nextRenewal).getTime() - Date.now()) / 86_400_000) : null;
  return (
    <BottomSheet open={open} onClose={onClose} title="Suscripción" subtitle={sub.name}>
      <div className="text-center mb-6">
        <IconCircle tone="gold" size="lg"><Icons.Subscription className="w-6 h-6" /></IconCircle>
        <div className="text-3xl font-display font-bold text-onyx tabular tracking-tight mt-3">
          {formatCurrency(sub.amount, sub.currency)}
        </div>
        <div className="text-xs text-graphite mt-1">
          {formatIntervalLabel(sub)}
          {sub.active ? ' · Activa' : ' · Pausada'}
        </div>
      </div>

      {days !== null && (
        <div className={`mb-4 p-4 rounded-2xl border text-center ${days <= 3 ? 'bg-gold/10 border-gold/30' : 'bg-stone border-black/5'}`}>
          <div className="text-[10px] uppercase tracking-widest text-graphite font-bold">Próximo Cobro</div>
          <div className="text-base font-display font-bold text-onyx mt-1">
            {days <= 0 ? 'Hoy' : days === 1 ? 'Mañana' : `En ${days} días`}
          </div>
          {sub.nextRenewal && <div className="text-xs font-mono text-graphite mt-0.5">{formatDateTime(sub.nextRenewal)}</div>}
        </div>
      )}

      <div className="bg-white border border-black/5 rounded-2xl divide-y divide-black/5">
        <DetailRow label="Espacio" value={ctx?.name || '—'} />
        <DetailRow label="Cuenta" value={getAccountName(sub.contextId, sub.accountId) || '—'} />
        {sub.subAccountId && <DetailRow label="Sub-Cuenta" value={getSubAccountName(sub.contextId, sub.accountId, sub.subAccountId)} />}
        {sub.cardLastFour && <DetailRow label="Tarjeta" value={`•••• ${sub.cardLastFour}`} mono />}
      </div>

      {/* Payment history — transactions linked to this subscription */}
      {(() => {
        const payments = state.transactions
          .filter((t) => t.linkedSubscriptionId === sub.id && !t.deletedAt)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const totalPaid = payments.reduce((s, t) => s + t.amount, 0);
        const lastPaidAt = payments[0]?.date;
        return (
          <div className="mt-5">
            <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-gold mb-2 px-1">Historial de pagos</div>
            <div className="bg-white border border-black/5 rounded-2xl p-4 mb-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-[9px] uppercase tracking-widest text-graphite font-bold">Pagos</div>
                <div className="text-xl font-display font-bold text-onyx tabular mt-0.5">{payments.length}</div>
              </div>
              <div className="border-x border-black/5">
                <div className="text-[9px] uppercase tracking-widest text-graphite font-bold">Total pagado</div>
                <div className="text-base font-display font-bold text-onyx tabular mt-0.5">{formatCurrency(totalPaid, sub.currency)}</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-widest text-graphite font-bold">Último</div>
                <div className="text-[11px] font-mono text-onyx mt-1.5 truncate">{lastPaidAt ? formatDateTime(lastPaidAt).split(',')[0] : '—'}</div>
              </div>
            </div>
            {payments.length === 0 ? (
              <div className="text-center text-xs text-graphite py-4 bg-stone/40 rounded-xl">
                Aún no has registrado pagos de esta suscripción
              </div>
            ) : (
              <div className="bg-white border border-black/5 rounded-2xl overflow-hidden divide-y divide-black/5">
                {payments.slice(0, 12).map((tx) => (
                  <div
                    key={tx.id}
                    onClick={() => { if (onTxClick) { onClose(); onTxClick(tx); } }}
                    className={`flex items-center justify-between px-3 py-2.5 ${onTxClick ? 'active:bg-stone cursor-pointer' : ''}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-onyx truncate">{tx.notes || 'Pago'}</div>
                      <div className="text-[11px] text-graphite font-mono">{formatDateTime(tx.date)}</div>
                    </div>
                    <span className="text-sm font-display font-bold text-rose-700 tabular flex-shrink-0">
                      -{formatCurrency(tx.amount, tx.currency)}
                    </span>
                  </div>
                ))}
                {payments.length > 12 && (
                  <div className="text-center text-[10px] text-graphite py-2 bg-stone/30">
                    +{payments.length - 12} más
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      <PressButton full onClick={onEdit} size="lg">
        <Icons.Edit className="w-4 h-4" />
        Editar Suscripción
      </PressButton>
    </BottomSheet>
  );
};

// ─── CATEGORY HISTORY ───────────────────────────────────────────────────
export const CategoryHistorySheet: React.FC<CommonProps & {
  cat: Category | undefined;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onTxClick: (tx: Transaction) => void;
}> = ({ state, formatCurrency, formatDateTime, cat, open, onClose, onEdit, onTxClick }) => {
  if (!cat) return null;
  const list = state.transactions
    .filter((tx) => tx.categoryId === cat.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 50);
  const total = list.reduce((s, tx) => s + tx.amount, 0);
  const progress = cat.budget && cat.budget > 0 ? Math.min(100, (total / cat.budget) * 100) : null;

  return (
    <BottomSheet open={open} onClose={onClose} title={cat.name} subtitle="Historial de movimientos" size="full">
      <div className="bg-white border border-black/5 rounded-2xl p-4 mb-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: cat.color }} />
        <div className="flex justify-between items-center mb-3 pl-2">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-graphite font-bold">Total Gastado</div>
            <div className="text-2xl font-display font-bold text-onyx tabular">{formatCurrency(total)}</div>
          </div>
          {cat.budget && (
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest text-graphite font-bold">Presupuesto</div>
              <div className="text-base font-display font-bold text-onyx tabular">{formatCurrency(cat.budget)}</div>
            </div>
          )}
        </div>
        {progress !== null && (
          <>
            <div className="h-2 bg-stone rounded-full overflow-hidden">
              <div className="h-full transition-all" style={{ width: `${progress}%`, backgroundColor: progress >= 100 ? '#be123c' : progress >= 90 ? '#D4A853' : cat.color }} />
            </div>
            <div className="text-[10px] text-graphite mt-1 text-right">{progress.toFixed(0)}% utilizado</div>
          </>
        )}
      </div>

      {list.length === 0 ? (
        <div className="text-center text-sm text-graphite py-8">Sin movimientos en esta categoría</div>
      ) : (
        <div className="bg-white border border-black/5 rounded-2xl overflow-hidden divide-y divide-black/5">
          {list.map((tx) => (
            <div key={tx.id} onClick={() => onTxClick(tx)} className="flex items-center gap-3 p-3 active:bg-stone cursor-pointer">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-onyx truncate">{tx.notes || 'Sin descripción'}</div>
                <div className="text-[11px] text-graphite font-mono">{formatDateTime(tx.date)}</div>
              </div>
              <span className={`text-sm font-display font-bold tabular ${tx.type === 'INCOME' ? 'text-emerald-700' : 'text-rose-700'}`}>
                {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5">
        <PressButton full onClick={onEdit} size="lg">
          <Icons.Edit className="w-4 h-4" />
          Editar Categoría
        </PressButton>
      </div>
    </BottomSheet>
  );
};

// ─── DASHBOARD SUMMARY ──────────────────────────────────────────────────
export const DashboardSummarySheet: React.FC<CommonProps & {
  type: string | null;
  onClose: () => void;
  totalsByCurrency: Record<string, number>;
  dashboardFilteredTransactions: Transaction[];
  dashboardFilteredSubs: Subscription[];
  onTransactionClick: (tx: Transaction) => void;
  onSubscriptionClick: (s: Subscription) => void;
}> = ({ state, formatCurrency, formatDateTime, type, onClose, totalsByCurrency, dashboardFilteredTransactions, dashboardFilteredSubs, onTransactionClick, onSubscriptionClick }) => {
  const open = !!type;
  const title = type === 'BALANCE' ? 'Balance Total' : type === 'INCOME' ? 'Ingresos del Periodo' : type === 'EXPENSE' ? 'Gastos del Periodo' : type === 'SUBS' ? 'Suscripciones Activas' : type === 'ALL' ? 'Todas las Transacciones' : '';
  return (
    <BottomSheet open={open} onClose={onClose} title={title} size="full">
      {type === 'BALANCE' && (
        <div className="space-y-2">
          {Object.entries(totalsByCurrency).length > 0 ? Object.entries(totalsByCurrency).map(([cur, amt]) => (
            <div key={cur} className="flex justify-between items-center p-4 bg-white border border-black/5 rounded-2xl">
              <span className="text-sm font-bold text-onyx">{cur}</span>
              <span className="text-lg font-display font-bold text-onyx tabular">{formatCurrency(amt as number, cur)}</span>
            </div>
          )) : <div className="text-center text-sm text-graphite py-8">Sin saldos registrados</div>}
        </div>
      )}
      {(type === 'INCOME' || type === 'EXPENSE') && (() => {
        const filtered = dashboardFilteredTransactions.filter((tx) => tx.type === type);
        if (filtered.length === 0) return <div className="text-center text-sm text-graphite py-8">Sin movimientos</div>;
        // Group by currency — never mix
        const byCur: Record<string, Transaction[]> = {};
        filtered.forEach((t) => { (byCur[t.currency] ||= []).push(t); });
        const currencies = Object.keys(byCur).sort();
        const totalsByCur: Record<string, number> = {};
        currencies.forEach((cur) => { totalsByCur[cur] = byCur[cur].reduce((s, t) => s + t.amount, 0); });
        return (
          <div className="space-y-4">
            {/* Totals header per currency */}
            <div className="bg-white border border-black/5 rounded-2xl p-4 space-y-1.5">
              <div className="text-[10px] uppercase tracking-widest text-graphite font-bold mb-1">Total del periodo</div>
              {currencies.map((cur) => (
                <div key={cur} className="flex items-baseline justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-gold">{cur}</span>
                  <span className={`text-xl font-display font-bold tabular ${type === 'INCOME' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {type === 'INCOME' ? '+' : '-'}{formatCurrency(totalsByCur[cur], cur)}
                  </span>
                </div>
              ))}
            </div>
            {/* Per-currency lists */}
            {currencies.map((cur) => (
              <div key={cur}>
                {currencies.length > 1 && (
                  <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-gold mb-2 px-1">{cur} · {byCur[cur].length} movimiento{byCur[cur].length !== 1 ? 's' : ''}</div>
                )}
                <div className="bg-white border border-black/5 rounded-2xl overflow-hidden divide-y divide-black/5">
                  {byCur[cur].slice(0, 30).map((tx) => {
                    const cat = tx.categoryId ? state.categories.find((c) => c.id === tx.categoryId) : null;
                    return (
                      <div key={tx.id} onClick={() => { onClose(); onTransactionClick(tx); }} className="flex justify-between items-center p-3 active:bg-stone cursor-pointer">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <IconCircle tone={type === 'INCOME' ? 'income' : 'expense'} bgColor={cat?.color}>
                            {type === 'INCOME' ? <Icons.Income className="w-4 h-4" /> : <Icons.Expense className="w-4 h-4" />}
                          </IconCircle>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-onyx truncate">{tx.notes || 'Sin descripción'}</div>
                            <div className="text-[11px] text-graphite truncate">{formatDateTime(tx.date)}{cat ? ` · ${cat.name}` : ''}</div>
                          </div>
                        </div>
                        <span className={`text-sm font-display font-bold tabular ${type === 'INCOME' ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        );
      })()}
      {type === 'SUBS' && (
        <div className="space-y-2">
          {dashboardFilteredSubs.length > 0 ? dashboardFilteredSubs.map((s) => (
            <div key={s.id} onClick={() => { onClose(); onSubscriptionClick(s); }} className="flex justify-between items-center p-4 bg-white border border-black/5 rounded-2xl active:bg-stone cursor-pointer">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <IconCircle tone="gold"><Icons.Subscription className="w-4 h-4" /></IconCircle>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-onyx truncate">{s.name}</div>
                  <div className="text-[11px] text-graphite">
                    {formatIntervalLabel(s)} · Próx: {s.nextRenewal ? formatDateTime(s.nextRenewal).split(',')[0] : '-'}
                  </div>
                </div>
              </div>
              <span className="text-sm font-display font-bold text-onyx tabular">{formatCurrency(s.amount, s.currency)}</span>
            </div>
          )) : <div className="text-center text-sm text-graphite py-8">Sin suscripciones en este periodo</div>}
        </div>
      )}
    </BottomSheet>
  );
};

// ─── DELETE CONFIRM ─────────────────────────────────────────────────────
export const DeleteConfirmSheet: React.FC<{ open: boolean; onClose: () => void; onConfirm: () => void; title: string; description: string; confirmLabel?: string }> = ({ open, onClose, onConfirm, title, description, confirmLabel = 'Eliminar' }) => (
  <BottomSheet open={open} onClose={onClose} title={title} subtitle="Acción Destructiva">
    <div className="text-center mb-6">
      <IconCircle tone="expense" size="lg"><Icons.Warning className="w-6 h-6" /></IconCircle>
      <p className="text-sm text-graphite mt-4 leading-relaxed">{description}</p>
    </div>
    <div className="flex gap-3">
      <PressButton variant="secondary" full onClick={onClose}>Cancelar</PressButton>
      <PressButton variant="danger" full onClick={() => { haptic('heavy'); onConfirm(); }}>{confirmLabel}</PressButton>
    </div>
  </BottomSheet>
);

// ─── PASSWORD SETUP (post-onboarding) ───────────────────────────────────
export const PasswordSetupSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  newPassword: string;
  setNewPassword: (s: string) => void;
  confirmPassword: string;
  setConfirmPassword: (s: string) => void;
  passwordError: string;
  setPasswordError: (s: string) => void;
  isUpdating: boolean;
  onSubmit: () => void;
}> = ({ open, onClose, newPassword, setNewPassword, confirmPassword, setConfirmPassword, passwordError, isUpdating, onSubmit }) => (
  <BottomSheet open={open} onClose={onClose} title="Crea tu contraseña" subtitle="Última paso de configuración">
    <div className="text-center mb-5">
      <IconCircle tone="gold" size="lg"><Icons.Key className="w-5 h-5" /></IconCircle>
      <p className="text-xs text-graphite mt-3 max-w-[300px] mx-auto">Para asegurar tu cuenta establece una contraseña que recuerdes.</p>
    </div>
    <div className="space-y-3">
      <input
        type="password"
        placeholder="Nueva contraseña"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        className="w-full h-12 px-4 bg-white border border-black/10 rounded-xl"
      />
      <input
        type="password"
        placeholder="Confirmar contraseña"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        className="w-full h-12 px-4 bg-white border border-black/10 rounded-xl"
      />
      {passwordError && <p className="text-rose-700 text-xs font-bold text-center">{passwordError}</p>}
      <PressButton full size="lg" disabled={isUpdating || !newPassword || !confirmPassword} onClick={onSubmit}>
        {isUpdating ? 'Guardando...' : 'Guardar Contraseña'}
      </PressButton>
    </div>
  </BottomSheet>
);

// ─── ACCOUNT HISTORY ────────────────────────────────────────────────────
export const AccountHistorySheet: React.FC<CommonProps & {
  open: boolean;
  onClose: () => void;
  target: { contextId: string; accountId: string; subAccountId?: string } | null;
  transactions: Transaction[]; // active only
  onTxClick: (tx: Transaction) => void;
}> = ({ state, formatCurrency, formatDateTime, getAccountName, getSubAccountName, open, onClose, target, transactions, onTxClick }) => {
  if (!target) return null;
  const ctx = state.contexts.find((c) => c.id === target.contextId);
  const accName = getAccountName(target.contextId, target.accountId);
  const subName = target.subAccountId ? getSubAccountName(target.contextId, target.accountId, target.subAccountId) : null;

  const history = transactions
    .filter((tx) => {
      // Outbound: tx originating in this account/subaccount
      const out = tx.contextId === target.contextId && tx.accountId === target.accountId &&
        (target.subAccountId ? tx.subAccountId === target.subAccountId : !tx.subAccountId);
      // Inbound (transfers): tx arriving to this account/subaccount
      const inbound = tx.type === 'TRANSFER' && tx.toContextId === target.contextId && tx.toAccountId === target.accountId &&
        (target.subAccountId ? tx.toSubAccountId === target.subAccountId : !tx.toSubAccountId);
      return out || inbound;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Compute totals (per currency)
  const totals: Record<string, { income: number; expense: number; net: number }> = {};
  history.forEach((tx) => {
    if (!totals[tx.currency]) totals[tx.currency] = { income: 0, expense: 0, net: 0 };
    const isInbound = tx.type === 'TRANSFER' && tx.toContextId === target.contextId && tx.toAccountId === target.accountId;
    const isOutbound = tx.contextId === target.contextId && tx.accountId === target.accountId && !isInbound;
    if (tx.type === 'INCOME' && isOutbound) { totals[tx.currency].income += tx.amount; totals[tx.currency].net += tx.amount; }
    else if (tx.type === 'EXPENSE' && isOutbound) { totals[tx.currency].expense += tx.amount; totals[tx.currency].net -= tx.amount; }
    else if (tx.type === 'TRANSFER') {
      if (isInbound) { totals[tx.currency].income += tx.amount; totals[tx.currency].net += tx.amount; }
      else if (isOutbound) { totals[tx.currency].expense += tx.amount; totals[tx.currency].net -= tx.amount; }
    }
  });

  return (
    <BottomSheet open={open} onClose={onClose} title={subName || accName} subtitle={`${ctx?.name || ''} · Historial`} size="full">
      {/* Totals header */}
      {Object.entries(totals).length > 0 && (
        <div className="space-y-2 mb-4">
          {Object.entries(totals).map(([cur, t]) => (
            <div key={cur} className="grid grid-cols-3 gap-2">
              <div className="bg-white border border-black/5 rounded-2xl p-3 text-center">
                <div className="text-[10px] uppercase tracking-widest text-graphite font-bold">Entradas</div>
                <div className="text-sm font-display font-bold text-emerald-700 tabular mt-1">+{formatCurrency(t.income, cur)}</div>
              </div>
              <div className="bg-white border border-black/5 rounded-2xl p-3 text-center">
                <div className="text-[10px] uppercase tracking-widest text-graphite font-bold">Salidas</div>
                <div className="text-sm font-display font-bold text-rose-700 tabular mt-1">-{formatCurrency(t.expense, cur)}</div>
              </div>
              <div className="bg-white border border-black/5 rounded-2xl p-3 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-gold" />
                <div className="text-[10px] uppercase tracking-widest text-graphite font-bold">Neto</div>
                <div className={`text-sm font-display font-bold tabular mt-1 ${t.net >= 0 ? 'text-onyx' : 'text-rose-700'}`}>{t.net >= 0 ? '+' : ''}{formatCurrency(t.net, cur)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-graphite mb-2 px-2">
        {history.length} movimiento{history.length !== 1 ? 's' : ''}
      </div>

      {history.length === 0 ? (
        <div className="text-center text-sm text-graphite py-8">Sin movimientos en esta {subName ? 'sub-cuenta' : 'cuenta'}</div>
      ) : (
        <div className="bg-white border border-black/5 rounded-2xl overflow-hidden divide-y divide-black/5">
          {history.map((tx) => {
            const isInbound = tx.type === 'TRANSFER' && tx.toContextId === target.contextId && tx.toAccountId === target.accountId;
            const cat = tx.categoryId ? state.categories.find((c) => c.id === tx.categoryId) : null;
            const positive = tx.type === 'INCOME' || isInbound;
            const tone: any = positive ? 'income' : tx.type === 'TRANSFER' ? 'transfer' : 'expense';
            const Icon = positive ? Icons.Income : tx.type === 'TRANSFER' ? Icons.Transfer : Icons.Expense;
            return (
              <div key={tx.id} onClick={() => { onClose(); onTxClick(tx); }} className="flex items-center gap-3 p-3 active:bg-stone cursor-pointer">
                <IconCircle tone={tone} bgColor={cat?.color}><Icon className="w-4 h-4" /></IconCircle>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-onyx truncate">{tx.notes || (tx.type === 'TRANSFER' ? (isInbound ? 'Recibido' : 'Enviado') : tx.type === 'INCOME' ? 'Ingreso' : 'Gasto')}</div>
                  <div className="text-[11px] text-graphite truncate">
                    {formatDateTime(tx.date)}{cat ? ` · ${cat.name}` : ''}
                  </div>
                </div>
                <span className={`text-sm font-display font-bold tabular ${positive ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {positive ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </BottomSheet>
  );
};

// ─── CHART DRILL-IN ─────────────────────────────────────────────────────
// Bottom sheet that opens when the user clicks anywhere in a chart. Lists
// the underlying transactions of the clicked segment, no navigation away.
export interface ChartDrillInData {
  title: string;
  subtitle?: string;
  transactions: Transaction[];
  currency: string;
}
export const ChartDrillSheet: React.FC<CommonProps & {
  open: boolean;
  onClose: () => void;
  data: ChartDrillInData | null;
  onTxClick: (tx: Transaction) => void;
}> = ({ state, formatCurrency, formatDateTime, open, onClose, data, onTxClick }) => {
  if (!data) return null;
  const sorted = [...data.transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const total = sorted.reduce((s, t) => s + t.amount, 0);
  const incomeCount = sorted.filter((t) => t.type === 'INCOME').length;
  const expenseCount = sorted.filter((t) => t.type === 'EXPENSE').length;
  return (
    <BottomSheet open={open} onClose={onClose} title={data.title} subtitle={data.subtitle} size="full">
      <div className="bg-white border border-black/5 rounded-2xl p-4 mb-4 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-graphite font-bold">Total</div>
          <div className="text-2xl font-display font-bold text-onyx tabular">{formatCurrency(total, data.currency)}</div>
        </div>
        <div className="text-right text-[11px] text-graphite">
          {incomeCount > 0 && <div><span className="text-emerald-700">●</span> {incomeCount} ingreso{incomeCount !== 1 ? 's' : ''}</div>}
          {expenseCount > 0 && <div><span className="text-rose-700">●</span> {expenseCount} gasto{expenseCount !== 1 ? 's' : ''}</div>}
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center text-sm text-graphite py-8">Sin movimientos</div>
      ) : (
        <div className="bg-white border border-black/5 rounded-2xl overflow-hidden divide-y divide-black/5">
          {sorted.map((tx) => {
            const cat = tx.categoryId ? state.categories.find((c) => c.id === tx.categoryId) : null;
            const positive = tx.type === 'INCOME';
            const Icon = tx.type === 'INCOME' ? Icons.Income : tx.type === 'EXPENSE' ? Icons.Expense : Icons.Transfer;
            const tone: any = positive ? 'income' : tx.type === 'EXPENSE' ? 'expense' : 'transfer';
            const sign = positive ? '+' : tx.type === 'EXPENSE' ? '-' : '';
            return (
              <div
                key={tx.id}
                onClick={() => { onClose(); onTxClick(tx); }}
                className="flex items-center gap-3 px-3 py-2.5 active:bg-stone cursor-pointer"
              >
                <IconCircle tone={tone} bgColor={cat?.color}><Icon className="w-4 h-4" /></IconCircle>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-onyx truncate">{tx.notes || 'Sin descripción'}</div>
                  <div className="text-[11px] text-graphite truncate">{formatDateTime(tx.date)}{cat ? ` · ${cat.name}` : ''}</div>
                </div>
                <span className={`text-sm font-display font-bold tabular ${positive ? 'text-emerald-700' : tx.type === 'EXPENSE' ? 'text-rose-700' : 'text-onyx'}`}>
                  {sign}{formatCurrency(tx.amount, tx.currency)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </BottomSheet>
  );
};

// ─── PAPELERA / TRASH ───────────────────────────────────────────────────
export const TrashSheet: React.FC<CommonProps & {
  open: boolean;
  onClose: () => void;
  deletedTransactions: Transaction[];
  onRestore: (txId: string) => void;
  onHardDelete?: (txId: string) => void;
}> = ({ state, formatCurrency, formatDateTime, open, onClose, deletedTransactions, onRestore }) => {
  return (
    <BottomSheet open={open} onClose={onClose} title="Papelera" subtitle="Restaurar transacciones eliminadas" size="full">
      <div className="mb-4 p-3 bg-gold/10 border border-gold/30 rounded-xl flex items-start gap-3">
        <IconCircle tone="gold" size="sm"><Icons.Info className="w-3.5 h-3.5" /></IconCircle>
        <div className="text-[11px] text-graphite">
          Las transacciones eliminadas se conservan <strong className="text-onyx">30 días</strong> para que puedas restaurarlas. Después se borran definitivamente.
        </div>
      </div>

      {deletedTransactions.length === 0 ? (
        <div className="text-center text-sm text-graphite py-8">
          <IconCircle tone="default" size="lg"><Icons.Trash className="w-5 h-5" /></IconCircle>
          <div className="mt-3">No hay transacciones eliminadas</div>
        </div>
      ) : (
        <div className="bg-white border border-black/5 rounded-2xl overflow-hidden divide-y divide-black/5">
          {deletedTransactions.map((tx) => {
            const cat = tx.categoryId ? state.categories.find((c) => c.id === tx.categoryId) : null;
            const ctx = state.contexts.find((c) => c.id === tx.contextId);
            const Icon = tx.type === 'INCOME' ? Icons.Income : tx.type === 'EXPENSE' ? Icons.Expense : Icons.Transfer;
            const tone: any = tx.type === 'INCOME' ? 'income' : tx.type === 'EXPENSE' ? 'expense' : 'transfer';
            const deletedDaysAgo = tx.deletedAt ? Math.floor((Date.now() - new Date(tx.deletedAt).getTime()) / 86_400_000) : 0;
            const daysLeft = 30 - deletedDaysAgo;
            return (
              <div key={tx.id} className="flex items-center gap-3 p-3">
                <IconCircle tone={tone} bgColor={cat?.color}><Icon className="w-4 h-4" /></IconCircle>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-onyx truncate">{tx.notes || (tx.type === 'TRANSFER' ? 'Transferencia' : tx.type === 'INCOME' ? 'Ingreso' : 'Gasto')}</div>
                  <div className="text-[11px] text-graphite truncate">
                    {formatCurrency(tx.amount, tx.currency)} · {ctx?.name}{cat ? ` · ${cat.name}` : ''}
                  </div>
                  <div className="text-[10px] text-rose-700 mt-0.5">
                    Eliminada {deletedDaysAgo === 0 ? 'hoy' : `hace ${deletedDaysAgo} día${deletedDaysAgo !== 1 ? 's' : ''}`} · Se borrará en {daysLeft} día{daysLeft !== 1 ? 's' : ''}
                  </div>
                </div>
                <button
                  onClick={() => { haptic('medium'); onRestore(tx.id); }}
                  className="h-9 px-3 bg-onyx text-white text-[10px] font-display font-bold uppercase tracking-widest rounded-full active:scale-95 hover:bg-graphite transition-colors flex-shrink-0 flex items-center gap-1.5"
                >
                  <Icons.Refresh className="w-3 h-3" />
                  Restaurar
                </button>
              </div>
            );
          })}
        </div>
      )}
    </BottomSheet>
  );
};

// ─── SHARED ROW ─────────────────────────────────────────────────────────
const DetailRow: React.FC<{ label: string; value: React.ReactNode; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="flex items-center justify-between p-3.5 gap-3">
    <span className="text-[10px] font-bold uppercase tracking-widest text-graphite">{label}</span>
    <span className={`text-sm text-onyx text-right max-w-[60%] ${mono ? 'font-mono tabular' : ''}`}>{value}</span>
  </div>
);
