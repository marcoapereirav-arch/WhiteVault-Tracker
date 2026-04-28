// WhiteVault™ — Mobile detail sheets
// Bottom-sheet variants of: TransactionDetail, SubscriptionDetail,
// CategoryHistory, DashboardSummary, DeleteContextConfirm, PasswordSetup.

import React from 'react';
import { AppState, Transaction, Subscription, Category } from '../types';
import { Icons } from './Icons';
import { BottomSheet, IconCircle, PressButton, haptic } from './Mobile';

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
}> = ({ state, formatCurrency, formatDateTime, getAccountName, getSubAccountName, tx, open, onClose, onEdit, onDelete }) => {
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

      <div className="flex gap-3 mt-5">
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
}> = ({ state, formatCurrency, formatDateTime, getAccountName, getSubAccountName, sub, open, onClose, onEdit }) => {
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
          {sub.frequency === 'WEEKLY' ? 'Semanal' : sub.frequency === 'MONTHLY' ? 'Mensual' : sub.frequency === 'QUARTERLY' ? 'Trimestral' : 'Anual'}
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
      {(type === 'INCOME' || type === 'EXPENSE') && (
        <div className="space-y-2">
          {dashboardFilteredTransactions.filter((tx) => tx.type === type).length > 0 ? (
            <div className="bg-white border border-black/5 rounded-2xl overflow-hidden divide-y divide-black/5">
              {dashboardFilteredTransactions.filter((tx) => tx.type === type).slice(0, 30).map((tx) => {
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
          ) : <div className="text-center text-sm text-graphite py-8">Sin movimientos</div>}
        </div>
      )}
      {type === 'SUBS' && (
        <div className="space-y-2">
          {dashboardFilteredSubs.length > 0 ? dashboardFilteredSubs.map((s) => (
            <div key={s.id} onClick={() => { onClose(); onSubscriptionClick(s); }} className="flex justify-between items-center p-4 bg-white border border-black/5 rounded-2xl active:bg-stone cursor-pointer">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <IconCircle tone="gold"><Icons.Subscription className="w-4 h-4" /></IconCircle>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-onyx truncate">{s.name}</div>
                  <div className="text-[11px] text-graphite">
                    {s.frequency === 'WEEKLY' ? 'Semanal' : s.frequency === 'MONTHLY' ? 'Mensual' : s.frequency === 'QUARTERLY' ? 'Trimestral' : 'Anual'} · Próx: {s.nextRenewal ? formatDateTime(s.nextRenewal).split(',')[0] : '-'}
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

// ─── SHARED ROW ─────────────────────────────────────────────────────────
const DetailRow: React.FC<{ label: string; value: React.ReactNode; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="flex items-center justify-between p-3.5 gap-3">
    <span className="text-[10px] font-bold uppercase tracking-widest text-graphite">{label}</span>
    <span className={`text-sm text-onyx text-right max-w-[60%] ${mono ? 'font-mono tabular' : ''}`}>{value}</span>
  </div>
);
