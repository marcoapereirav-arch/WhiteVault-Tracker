-- Run this in your Supabase SQL Editor

-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  email TEXT,
  currency TEXT DEFAULT 'USD',
  dark_mode BOOLEAN DEFAULT false,
  language TEXT DEFAULT 'ES',
  timezone TEXT DEFAULT 'UTC',
  avatar_url TEXT,
  contexts JSONB DEFAULT '[]'::jsonb,
  subscriptions JSONB DEFAULT '[]'::jsonb,
  categories JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING ( auth.uid() = id );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING ( auth.uid() = id );

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK ( auth.uid() = id );

-- Create transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT,
  context_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  sub_account_id TEXT,
  category_id TEXT,
  to_context_id TEXT,
  to_account_id TEXT,
  to_sub_account_id TEXT,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS for transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING ( auth.uid() = user_id );

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  USING ( auth.uid() = user_id );

CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  USING ( auth.uid() = user_id );

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
