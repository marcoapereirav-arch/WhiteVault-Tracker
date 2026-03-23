import React, { useState } from 'react';
import { FinancialContext, Account, SubAccount } from '../types';
import { Icons } from './Icons';
import { balanceEntries, getActiveCurrencies, getTotalsByCurrency } from '../utils/balances';

interface Props {
  contexts: FinancialContext[];
  formatCurrency: (amount: number, currency?: string) => string;
  baseCurrency: string;
  onDistributeIncome: (contextId: string, currency: string) => void;
  onAddSubAccount?: (contextId: string, accountId: string) => void;
  recentDistributions?: { [accountId: string]: number }; // map of accountId -> amount
  onUndoDistribution?: () => void; // Undo action
  canUndo?: boolean; // check if undo is available
}

const ProgressBar = ({ current, target, formatCurrency }: { current: number, target: number, formatCurrency: (v: number) => string }) => {
    const pct = Math.min(100, Math.max(0, (current / target) * 100));
    return (
        <div className="w-full bg-concrete h-1 mt-3">
            <div className="bg-gold h-1 transition-all duration-500" style={{ width: `${pct}%` }}></div>
            <div className="flex justify-between text-[10px] mt-1 text-graphite font-mono uppercase tracking-wider">
                <span>{formatCurrency(current)}</span>
                <span>Meta: {formatCurrency(target)}</span>
            </div>
        </div>
    )
}

export const AccountsView: React.FC<Props> = ({
    contexts,
    formatCurrency,
    baseCurrency,
    onDistributeIncome,
    onAddSubAccount,
    recentDistributions = {},
    onUndoDistribution,
    canUndo
}) => {
  return (
    <div className="space-y-12 pb-20">
      {contexts.map(context => {
        // Per-context totals by currency
        const ctxTotals = getTotalsByCurrency([context]);

        return (
        <div key={context.id} className="relative group">
            {/* Context Header */}
            <div className="flex justify-between items-end border-b border-black/10 pb-4 mb-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-onyx text-white">
                        {context.type === 'BUSINESS' ? <Icons.Business className="w-6 h-6"/> : <Icons.Personal className="w-6 h-6"/>}
                    </div>
                    <div>
                        <span className="text-xs font-bold text-alloy uppercase tracking-widest block mb-1">BOVEDA {context.type === 'BUSINESS' ? 'NEGOCIO' : 'PERSONAL'}</span>
                        <h2 className="text-3xl font-display font-bold text-onyx">{context.name}</h2>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-[10px] text-graphite uppercase tracking-widest block mb-1">Activos Liquidos</span>
                    <div className="font-display font-bold text-2xl text-onyx">
                        {Object.entries(ctxTotals).length > 0
                            ? Object.entries(ctxTotals).map(([cur, amt]) => (
                                <span key={cur} className="block">{formatCurrency(amt, cur)}</span>
                              ))
                            : formatCurrency(0)
                        }
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {context.accounts.map(account => {
                    const entries = balanceEntries(account.balances);
                    const activeCurrencies = getActiveCurrencies(account.balances);
                    const hasBalance = activeCurrencies.length > 0;

                    return (
                    <div key={account.id} className="bg-white border border-black/5 p-6 hover:border-alloy transition-colors shadow-sm group/card relative overflow-hidden">
                         {/* Metallic accent line */}
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-transparent group-hover/card:bg-metallic transition-all"></div>

                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-display font-bold text-lg text-onyx">{account.name}</h3>
                                {account.percentageTarget && (
                                    <span className="text-[10px] bg-stone px-2 py-1 text-graphite border border-black/5 mt-1 inline-block uppercase tracking-wider">Target: {account.percentageTarget}%</span>
                                )}
                            </div>
                            <div className="text-right">
                                {entries.length > 0 ? entries.map(e => (
                                    <span key={e.currency} className="font-display font-bold text-xl text-onyx tracking-tight block">{formatCurrency(e.amount, e.currency)}</span>
                                )) : (
                                    <span className="font-display font-bold text-xl text-onyx tracking-tight block">{formatCurrency(0)}</span>
                                )}

                                {/* Recent Distribution Feedback */}
                                {recentDistributions[account.id] && (
                                    <span className="text-xs font-bold text-green-600 animate-in fade-in slide-in-from-bottom-1 block mt-1">
                                        + {formatCurrency(recentDistributions[account.id])}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Distribute Button for Income Accounts */}
                        {account.type === 'INCOME' && (
                            <div className="space-y-2 mb-4">
                                {hasBalance && activeCurrencies.length === 1 && (
                                    <button
                                        onClick={() => onDistributeIncome(context.id, activeCurrencies[0])}
                                        className="w-full py-2 bg-onyx text-white text-[10px] font-bold uppercase tracking-widest hover:bg-gold transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Icons.Transfer className="w-3 h-3" /> Distribuir Fondos
                                    </button>
                                )}
                                {hasBalance && activeCurrencies.length > 1 && (
                                    <CurrencyDistributeButtons
                                        currencies={activeCurrencies}
                                        contextId={context.id}
                                        onDistribute={onDistributeIncome}
                                        formatCurrency={formatCurrency}
                                        balances={account.balances}
                                    />
                                )}
                                {/* Undo Button */}
                                {canUndo && (
                                    <button
                                        onClick={onUndoDistribution}
                                        className="w-full py-2 bg-white border border-red-200 text-red-600 text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Icons.Transfer className="w-3 h-3 rotate-180" /> Deshacer Distribucion (Control Z)
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Sub Accounts */}
                        {account.subAccounts.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-black/5 space-y-4">
                                {account.subAccounts.map(sub => {
                                    const subEntries = balanceEntries(sub.balances);
                                    // For progress bar, sum all currencies (simple approach)
                                    const subTotal = Object.values(sub.balances).reduce((s, v) => s + v, 0);
                                    return (
                                    <div key={sub.id} className="text-sm">
                                        <div className="flex justify-between items-start">
                                            <span className="flex items-center gap-2 text-graphite font-medium">
                                                {sub.target ? <Icons.Target className="w-3 h-3 text-gold" /> : <div className="w-1.5 h-1.5 bg-alloy rotate-45"></div>}
                                                {sub.name}
                                            </span>
                                            {!sub.target && (
                                                <div className="text-right">
                                                    {subEntries.length > 0 ? subEntries.map(e => (
                                                        <span key={e.currency} className="font-mono text-xs font-bold text-onyx block">{formatCurrency(e.amount, e.currency)}</span>
                                                    )) : <span className="font-mono text-xs font-bold text-onyx">{formatCurrency(0)}</span>}
                                                </div>
                                            )}
                                        </div>
                                        {sub.target && <ProgressBar current={subTotal} target={sub.target} formatCurrency={formatCurrency} />}
                                    </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="mt-6 flex justify-end opacity-0 group-hover/card:opacity-100 transition-opacity">
                            <button
                                onClick={() => onAddSubAccount?.(context.id, account.id)}
                                className="text-[10px] text-alloy font-bold uppercase tracking-widest hover:text-gold flex items-center gap-1"
                            >
                                <Icons.Plus className="w-3 h-3"/> Añadir Sub-cuenta
                            </button>
                        </div>
                    </div>
                    );
                })}
            </div>
        </div>
        );
      })}
    </div>
  );
};

/** When income account has multiple currencies, show a button per currency */
const CurrencyDistributeButtons: React.FC<{
    currencies: string[];
    contextId: string;
    onDistribute: (contextId: string, currency: string) => void;
    formatCurrency: (amount: number, currency?: string) => string;
    balances: Record<string, number>;
}> = ({ currencies, contextId, onDistribute, formatCurrency, balances }) => {
    return (
        <div className="space-y-1">
            <span className="text-[9px] text-graphite uppercase tracking-widest block mb-1">Distribuir por moneda:</span>
            {currencies.map(cur => (
                <button
                    key={cur}
                    onClick={() => onDistribute(contextId, cur)}
                    className="w-full py-2 bg-onyx text-white text-[10px] font-bold uppercase tracking-widest hover:bg-gold transition-colors flex items-center justify-center gap-2"
                >
                    <Icons.Transfer className="w-3 h-3" /> {cur} ({formatCurrency(balances[cur], cur)})
                </button>
            ))}
        </div>
    );
};
