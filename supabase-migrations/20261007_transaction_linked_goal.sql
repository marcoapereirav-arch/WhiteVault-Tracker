-- Store goal association independently from the account/subaccount that funded an expense.
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS linked_goal_id TEXT;

-- Earlier expense records used a Payment goal ID as sub_account_id. Move only
-- those references to linked_goal_id; regular subaccounts remain unchanged.
UPDATE public.transactions AS t
SET linked_goal_id = t.sub_account_id,
    sub_account_id = NULL
WHERE t.type = 'EXPENSE'
  AND t.sub_account_id IS NOT NULL
  AND t.linked_goal_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.profiles AS p
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(p.contexts, '[]'::jsonb)) AS c(value)
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(c.value->'accounts', '[]'::jsonb)) AS a(value)
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(a.value->'subAccounts', '[]'::jsonb)) AS s(value)
    WHERE p.id = t.user_id
      AND s.value->>'id' = t.sub_account_id
      AND s.value->>'goalKind' = 'PAYMENT'
  );
