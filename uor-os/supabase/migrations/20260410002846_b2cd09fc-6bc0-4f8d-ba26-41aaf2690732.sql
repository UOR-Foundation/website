CREATE TABLE public.uor_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_cid text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  namespace text NOT NULL DEFAULT 'default',
  mutation_count integer NOT NULL DEFAULT 0,
  mutations jsonb NOT NULL DEFAULT '[]',
  committed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.uor_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own transactions"
ON public.uor_transactions FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_uor_transactions_user ON public.uor_transactions(user_id);
CREATE INDEX idx_uor_transactions_committed ON public.uor_transactions(committed_at);