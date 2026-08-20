-- Dialed In initial schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Households: the shared espresso space


-- User profile linked to Supabase auth
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email text,
  display_name text,
  household_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.household_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, user_id)
);

ALTER TABLE public.profiles
  ADD CONSTRAINT fk_profiles_household
  FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.is_household_member(hid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = hid AND user_id = auth.uid()
  );
$$;

CREATE TABLE IF NOT EXISTS public.machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  manufacturer text,
  model text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.grinders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  manufacturer text,
  model text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.beans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  roaster text NOT NULL,
  coffee_name text NOT NULL,
  origin text,
  roast_level text,
  roast_date date,
  date_opened date,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  is_finished boolean NOT NULL DEFAULT false,
  status text DEFAULT 'Dialing In',
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dial_in_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  bean_id uuid REFERENCES public.beans(id) ON DELETE CASCADE NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  bean_id uuid REFERENCES public.beans(id) ON DELETE CASCADE NOT NULL,
  session_id uuid REFERENCES public.dial_in_sessions(id) ON DELETE SET NULL,
  machine_id uuid REFERENCES public.machines(id) ON DELETE SET NULL,
  grinder_id uuid REFERENCES public.grinders(id) ON DELETE SET NULL,
  dose_g numeric NOT NULL CHECK (dose_g > 0),
  target_yield_g numeric NOT NULL CHECK (target_yield_g > 0),
  actual_yield_g numeric CHECK (actual_yield_g IS NULL OR actual_yield_g > 0),
  target_time_s numeric NOT NULL CHECK (target_time_s > 0),
  actual_time_s numeric CHECK (actual_time_s IS NULL OR actual_time_s > 0),
  brew_ratio numeric GENERATED ALWAYS AS (
    CASE
      WHEN actual_yield_g IS NOT NULL AND dose_g > 0 THEN actual_yield_g / dose_g
      ELSE NULL
    END
  ) STORED,
  external_grind_setting numeric,
  internal_burr_setting numeric,
  drink_type text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.taste_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shot_id uuid REFERENCES public.shots(id) ON DELETE CASCADE NOT NULL,
  household_id uuid REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  overall_rating numeric CHECK (overall_rating IS NULL OR (overall_rating >= 0 AND overall_rating <= 5)),
  descriptors text[] DEFAULT '{}',
  acidity numeric,
  sweetness numeric,
  bitterness numeric,
  body numeric,
  notes text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.golden_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  bean_id uuid REFERENCES public.beans(id) ON DELETE CASCADE NOT NULL,
  shot_id uuid REFERENCES public.shots(id) ON DELETE SET NULL,
  dose_g numeric NOT NULL CHECK (dose_g > 0),
  yield_g numeric NOT NULL CHECK (yield_g > 0),
  brew_ratio numeric,
  internal_burr_setting numeric,
  external_grind_setting numeric,
  extraction_time_s numeric,
  overall_rating numeric CHECK (overall_rating IS NULL OR (overall_rating >= 0 AND overall_rating <= 5)),
  machine_id uuid REFERENCES public.machines(id) ON DELETE SET NULL,
  grinder_id uuid REFERENCES public.grinders(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  locked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  locked_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES public.households(id) ON DELETE CASCADE NOT NULL,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  storage_path text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  media_category text NOT NULL,
  caption text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_household_members_user ON public.household_members(user_id);
CREATE INDEX IF NOT EXISTS idx_households_created_by ON public.households(created_by);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_user ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_household ON public.profiles(household_id);
CREATE INDEX IF NOT EXISTS idx_beans_household ON public.beans(household_id);
CREATE INDEX IF NOT EXISTS idx_shots_bean ON public.shots(bean_id);
CREATE INDEX IF NOT EXISTS idx_shots_session ON public.shots(session_id);
CREATE INDEX IF NOT EXISTS idx_taste_reviews_shot ON public.taste_reviews(shot_id);
CREATE INDEX IF NOT EXISTS idx_golden_recipes_bean ON public.golden_recipes(bean_id);
CREATE INDEX IF NOT EXISTS idx_media_entity ON public.media(entity_type, entity_id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grinders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dial_in_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taste_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.golden_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Household members view profiles" ON public.profiles
  FOR SELECT USING (is_household_member(household_id));

CREATE POLICY "Household members view households" ON public.households
  FOR SELECT USING (is_household_member(id));

CREATE POLICY "Creators update household" ON public.households
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users create households" ON public.households
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Household members view household members" ON public.household_members
  FOR SELECT USING (user_id = auth.uid() OR is_household_member(household_id));

CREATE POLICY "Creators add household members" ON public.household_members
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT created_by FROM public.households WHERE id = household_id)
  );

CREATE POLICY "Household members manage machines" ON public.machines
  FOR ALL USING (is_household_member(household_id));

CREATE POLICY "Household members manage grinders" ON public.grinders
  FOR ALL USING (is_household_member(household_id));

CREATE POLICY "Household members manage beans" ON public.beans
  FOR ALL USING (is_household_member(household_id));

CREATE POLICY "Household members manage dial-in sessions" ON public.dial_in_sessions
  FOR ALL USING (is_household_member(household_id));

CREATE POLICY "Household members manage shots" ON public.shots
  FOR ALL USING (is_household_member(household_id));

CREATE POLICY "Household members manage taste reviews" ON public.taste_reviews
  FOR ALL USING (is_household_member(household_id));

CREATE POLICY "Household members manage golden recipes" ON public.golden_recipes
  FOR ALL USING (is_household_member(household_id));

CREATE POLICY "Household members manage media" ON public.media
  FOR ALL USING (is_household_member(household_id));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, split_part(NEW.email, '@', 1));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO storage.buckets (id, name, "public")
VALUES ('media', 'media', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Household members upload media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'media'
    AND public.is_household_member((storage.foldername(name))[2]::uuid)
  );

CREATE POLICY "Household members view media"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'media'
    AND public.is_household_member((storage.foldername(name))[2]::uuid)
  );

CREATE POLICY "Household members delete media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'media'
    AND public.is_household_member((storage.foldername(name))[2]::uuid)
  );
