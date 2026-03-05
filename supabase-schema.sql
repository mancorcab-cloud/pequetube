-- ═══════════════════════════════════════════════════
--  PequeTube – Supabase Schema
--  Executa este SQL a: Supabase > SQL Editor > New query
-- ═══════════════════════════════════════════════════

-- 1. Taula de perfils de xiquets
create table if not exists profiles (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  emoji       text not null default '🦖',
  color       text not null default 'bg-green-500',
  pin         text not null default '',
  created_at  timestamptz default now()
);

-- 2. Taula de vídeos
create table if not exists videos (
  id          text primary key,  -- ID de YouTube
  user_id     uuid references auth.users(id) on delete cascade not null,
  title       text not null,
  thumbnail   text not null,
  created_at  timestamptz default now()
);

-- 3. Taula de relació: quin xiquet pot veure quin vídeo
create table if not exists video_profiles (
  video_id    text references videos(id) on delete cascade,
  profile_id  uuid references profiles(id) on delete cascade,
  primary key (video_id, profile_id)
);

-- 4. Row Level Security (RLS) – cada família veu només les seues dades
alter table profiles     enable row level security;
alter table videos       enable row level security;
alter table video_profiles enable row level security;

-- Polítiques de profiles
create policy "profiles: gestió pròpia" on profiles
  for all using (auth.uid() = user_id);

-- Polítiques de videos
create policy "videos: gestió pròpia" on videos
  for all using (auth.uid() = user_id);

-- Polítiques de video_profiles
create policy "video_profiles: gestió pròpia" on video_profiles
  for all using (
    exists (
      select 1 from videos
      where videos.id = video_profiles.video_id
        and videos.user_id = auth.uid()
    )
  );
