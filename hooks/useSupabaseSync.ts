import { useEffect, useRef, useState, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { AppState } from '../types';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export function useSupabaseSync(state: AppState, isLoaded: boolean, session: Session | null) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  const dismissError = useCallback(() => setSyncError(null), []);

  useEffect(() => {
    if (!isLoaded || !session) return;

    // Skip sync on initial data load to avoid writing back what we just read
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Clear previous pending sync (debounce)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      setSyncStatus('syncing');
      setSyncError(null);

      try {
        const uid = session.user.id;

        const { error: profileError } = await supabase.from('profiles').upsert({
          id: uid,
          name: state.user.name,
          email: state.user.email,
          currency: state.user.currency,
          dark_mode: state.user.darkMode,
          language: state.user.language,
          timezone: state.user.timezone,
          avatar_url: state.user.avatarUrl,
          contexts: state.contexts,
          subscriptions: state.subscriptions,
          categories: state.categories,
          updated_at: new Date().toISOString()
        });

        if (profileError) throw profileError;

        const { data: existingTxs, error: fetchError } = await supabase
          .from('transactions')
          .select('id')
          .eq('user_id', uid);

        if (fetchError) throw fetchError;

        const existingIds = new Set(existingTxs?.map(t => t.id) || []);
        const currentIds = new Set(state.transactions.map(t => t.id));

        const toDelete = [...existingIds].filter(id => !currentIds.has(id));
        if (toDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('transactions')
            .delete()
            .in('id', toDelete);
          if (deleteError) throw deleteError;
        }

        const toUpsert = state.transactions.map(t => ({
          id: t.id,
          user_id: uid,
          type: t.type,
          amount: t.amount,
          date: t.date,
          notes: t.notes,
          context_id: t.contextId,
          account_id: t.accountId,
          sub_account_id: t.subAccountId,
          category_id: t.categoryId,
          to_context_id: t.toContextId,
          to_account_id: t.toAccountId,
          to_sub_account_id: t.toSubAccountId
        }));

        if (toUpsert.length > 0) {
          const { error: upsertError } = await supabase
            .from('transactions')
            .upsert(toUpsert);
          if (upsertError) throw upsertError;
        }

        setSyncStatus('synced');
        // Reset status after 3 seconds
        setTimeout(() => setSyncStatus('idle'), 3000);
      } catch (error: unknown) {
        console.error('Error syncing to Supabase:', error);
        const message = error instanceof Error ? error.message : 'Error de sincronización';
        setSyncStatus('error');
        setSyncError(message);
      }
    }, 1500); // 1.5s debounce

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [state, isLoaded, session]);

  return { syncStatus, syncError, dismissError };
}
