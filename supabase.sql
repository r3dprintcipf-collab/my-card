-- Run in Supabase SQL Editor. Admin-only write access; public reads only published cards.
create table if not exists public.cards (
 id uuid primary key default gen_random_uuid(),
 slug text unique not null,
 name text not null,
 role text, company text, brand text, phone text, email text, address text, website text,
 photo text, logo text, accent text default '#6558f5',
 links jsonb not null default '[]'::jsonb,
 socials jsonb not null default '[]'::jsonb,
 published boolean not null default false,
 created_at timestamptz not null default now()
);
alter table public.cards enable row level security;
create policy "Public can read published cards" on public.cards for select using (published=true);
create policy "Authenticated admins can insert" on public.cards for insert to authenticated with check (true);
create policy "Authenticated admins can update" on public.cards for update to authenticated using (true) with check (true);
create policy "Authenticated admins can delete" on public.cards for delete to authenticated using (true);
-- IMPORTANT: In Supabase, restrict admin user creation and only create your own admin account.
-- This starter policy assumes only your admin account is allowed to sign in.
