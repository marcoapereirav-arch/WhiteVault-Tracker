import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AppState } from '../types';

export function useSupabaseSync(state: AppState, isLoaded: boolean, session: any) {
  useEffect(() => {
    if (!isLoaded || !session) return;

    const syncToSupabase = async () => {
      try {
        const uid = session.user.id;

        await supabase.from('profiles').upsert({
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

        const { data: existingTxs } = await supabase.from('transactions').select('id').eq('user_id', uid);
        const existingIds = new Set(existingTxs?.map(t => t.id) || []);
        const currentIds = new Set(state.transactions.map(t => t.id));

        const toDelete = [...existingIds].filter(id => !currentIds.has(id));
        if (toDelete.length > 0) {
          await supabase.from('transactions').delete().in('id', toDelete);
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
          await supabase.from('transactions').upsert(toUpsert);
        }
      } catch (error) {
        console.error('Error syncing to Supabase:', error);
      }
    };

    const timeout = setTimeout(syncToSupabase, 1000);
    return () => clearTimeout(timeout);
  }, [state, isLoaded, session]);
}
