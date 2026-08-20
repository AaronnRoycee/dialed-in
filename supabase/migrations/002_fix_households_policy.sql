-- Fix the households RLS so a brand-new creator can create and immediately view their household
-- before the household_members row exists.

DROP POLICY IF EXISTS "Users create households" ON public.households;
DROP POLICY IF EXISTS "Household members view households" ON public.households;

CREATE POLICY "Users create households" ON public.households
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Household members view households" ON public.households
  FOR SELECT USING (is_household_member(id) OR created_by = auth.uid());
