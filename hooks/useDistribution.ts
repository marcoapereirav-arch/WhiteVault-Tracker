import { useState, useCallback } from 'react';
import { AppState, Transaction } from '../types';
import { generateId } from '../utils/helpers';

interface DistributionRecord {
  txIds: string[];
  contextId: string;
  amounts: { [id: string]: number };
}

export function useDistribution(
  state: AppState,
  setState: React.Dispatch<React.SetStateAction<AppState>>
) {
  const [lastDistribution, setLastDistribution] = useState<DistributionRecord | null>(null);
  const [recentDistributions, setRecentDistributions] = useState<{ [accountId: string]: number }>({});

  const distributeIncome = useCallback((contextId: string, specificAmount?: number) => {
    const ctx = state.contexts.find(c => c.id === contextId);
    if (!ctx) return;

    const incomeAcc = ctx.accounts.find(a => a.type === 'INCOME');
    if (!incomeAcc) return;

    const amountToDistribute = specificAmount !== undefined ? specificAmount : incomeAcc.balance;
    if (amountToDistribute <= 0) return;

    const newTransactions: Transaction[] = [];
    const distributionAmounts: { [accId: string]: number } = {};
    const txIds: string[] = [];
    const date = new Date().toISOString();

    const targets = ctx.accounts.filter(
      a => a.percentageTarget !== undefined && a.percentageTarget > 0 && a.id !== incomeAcc.id
    );

    let distributedTotal = 0;

    const newContexts = state.contexts.map(c => {
      if (c.id !== contextId) return c;

      const updatedAccounts = c.accounts.map(acc => {
        const target = targets.find(t => t.id === acc.id);
        if (target && target.percentageTarget) {
          const splitAmount = amountToDistribute * (target.percentageTarget / 100);
          distributedTotal += splitAmount;

          const txId = generateId('tr_dist');
          txIds.push(txId);
          distributionAmounts[acc.id] = splitAmount;

          newTransactions.push({
            id: txId,
            type: 'TRANSFER',
            amount: splitAmount,
            date,
            notes: `Distribución Automática (${target.percentageTarget}%)`,
            contextId: contextId,
            accountId: incomeAcc.id,
            toContextId: contextId,
            toAccountId: acc.id
          });

          return { ...acc, balance: acc.balance + splitAmount };
        }
        return acc;
      });

      return { ...c, accounts: updatedAccounts };
    });

    const finalContexts = newContexts.map(c => {
      if (c.id !== contextId) return c;
      return {
        ...c,
        accounts: c.accounts.map(a =>
          a.id === incomeAcc.id ? { ...a, balance: a.balance - distributedTotal } : a
        )
      };
    });

    setState(prev => ({
      ...prev,
      contexts: finalContexts,
      transactions: [...newTransactions, ...prev.transactions]
    }));

    setLastDistribution({ txIds, contextId, amounts: distributionAmounts });
    setRecentDistributions(distributionAmounts);
    setTimeout(() => setRecentDistributions({}), 5000);
  }, [state, setState]);

  const undoLastDistribution = useCallback(() => {
    if (!lastDistribution) return;

    const { txIds, contextId, amounts } = lastDistribution;
    const ctx = state.contexts.find(c => c.id === contextId);
    if (!ctx) return;
    const incomeAcc = ctx.accounts.find(a => a.type === 'INCOME');
    if (!incomeAcc) return;

    let totalRestored = 0;

    const newContexts = state.contexts.map(c => {
      if (c.id !== contextId) return c;

      const updatedAccounts = c.accounts.map(acc => {
        if (amounts[acc.id]) {
          totalRestored += amounts[acc.id];
          return { ...acc, balance: acc.balance - amounts[acc.id] };
        }
        return acc;
      });

      return {
        ...c,
        accounts: updatedAccounts.map(a =>
          a.id === incomeAcc.id ? { ...a, balance: a.balance + totalRestored } : a
        )
      };
    });

    const newTransactions = state.transactions.filter(t => !txIds.includes(t.id));

    setState(prev => ({
      ...prev,
      contexts: newContexts,
      transactions: newTransactions
    }));

    setLastDistribution(null);
    setRecentDistributions({});
  }, [lastDistribution, state, setState]);

  return {
    lastDistribution,
    recentDistributions,
    distributeIncome,
    undoLastDistribution
  };
}
