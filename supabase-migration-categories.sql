-- ═══════════════════════════════════════════════════
--  PequeTube – Migració: Temàtiques (categories)
--  Executa este SQL a: Supabase > SQL Editor > New query
-- ═══════════════════════════════════════════════════

-- 1. Nova taula de temàtiques
create table if not exists categories (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  emoji       text not null default '📁',
  created_at  timestamptz default now()
);

alter table categories enable row level security;

create policy "categories: gestió pròpia" on categories
  for all using (auth.uid() = user_id);

-- 2. Afegir columna category_id a videos
alter table videos
  add column if not exists category_id uuid references categories(id) on delete set null;
