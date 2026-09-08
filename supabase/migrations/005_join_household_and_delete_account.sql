-- Join-by-invite-code and account deletion.
--
-- household_members only allows the household creator to insert members,
-- and households are only visible to members — so a new user cannot join
-- via a code with plain table access. This function validates the code
-- (the household id is the invite secret) and self-inserts the member.

CREATE OR REPLACE FUNCTION public.join_household(household_code uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.households WHERE id = household_code) THEN
    RAISE EXCEPTION 'Household not found';
  END IF;

  INSERT INTO public.household_members (household_id, user_id, role)
  VALUES (household_code, auth.uid(), 'member')
  ON CONFLICT (household_id, user_id) DO NOTHING;

  UPDATE public.profiles
  SET household_id = household_code
  WHERE user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.join_household(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.join_household(uuid) TO authenticated;

-- Permanently delete the calling user's account.
-- If the caller is the last member of a household, the household and all
-- of its data (beans, shots, reviews, recipes, media rows, and stored
-- photos) are deleted too. If other members remain, only the caller's
-- account, profile, and membership are removed — shared data stays.
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  hid uuid;
  member_count int;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT household_id INTO hid FROM public.profiles WHERE user_id = uid;

  IF hid IS NOT NULL THEN
    SELECT count(*) INTO member_count
    FROM public.household_members
    WHERE household_id = hid;

    IF member_count <= 1 THEN
      DELETE FROM storage.objects
      WHERE bucket_id = 'media'
        AND name LIKE 'households/' || hid::text || '/%';

      DELETE FROM public.households WHERE id = hid;
    END IF;
  END IF;

  DELETE FROM auth.users WHERE id = uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account() FROM public;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

-- Fallback profile insert for sign-in methods where the handle_new_user
-- trigger may not have produced a row yet (e.g. Apple sign-in).
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());
