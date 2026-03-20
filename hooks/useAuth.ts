import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AppState } from '../types';
import { INITIAL_STATE } from '../constants';

export function useAuth(
  setState: React.Dispatch<React.SetStateAction<AppState>>
) {
  const [session, setSession] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const fetchData = async (userId: string) => {
    try {
      const [profileRes, txRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('transactions').select('*').eq('user_id', userId)
      ]);

      if (profileRes.data) {
        const p = profileRes.data;
        const transactions = (txRes.data || []).map((t: any) => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          date: t.date,
          notes: t.notes,
          contextId: t.context_id,
          accountId: t.account_id,
          subAccountId: t.sub_account_id,
          categoryId: t.category_id,
          toContextId: t.to_context_id,
          toAccountId: t.to_account_id,
          toSubAccountId: t.to_sub_account_id
        }));

        setState({
          user: {
            name: p.name || INITIAL_STATE.user.name,
            email: p.email || INITIAL_STATE.user.email,
            currency: p.currency || INITIAL_STATE.user.currency,
            darkMode: p.dark_mode || INITIAL_STATE.user.darkMode,
            language: p.language || INITIAL_STATE.user.language,
            timezone: p.timezone || INITIAL_STATE.user.timezone,
            avatarUrl: p.avatar_url,
          },
          contexts: p.contexts || INITIAL_STATE.contexts,
          subscriptions: p.subscriptions || INITIAL_STATE.subscriptions,
          categories: p.categories || INITIAL_STATE.categories,
          transactions
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchData(session.user.id);
      } else {
        setIsLoaded(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchData(session.user.id);
      } else {
        setState(INITIAL_STATE);
        setIsLoaded(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return { session, isLoaded, signOut };
}
