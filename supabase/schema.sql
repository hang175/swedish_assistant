-- Swedish Assistant – cloud storage for study progress.
-- Run this once in the Supabase dashboard:  SQL Editor → New query → paste → Run.

create table if not exists public.progress (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- Row Level Security: every signed-in user can only see and change their own row.
alter table public.progress enable row level security;

drop policy if exists "read own progress"   on public.progress;
drop policy if exists "insert own progress" on public.progress;
drop policy if exists "update own progress" on public.progress;
drop policy if exists "delete own progress" on public.progress;

create policy "read own progress"   on public.progress for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own progress" on public.progress for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "update own progress" on public.progress for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own progress" on public.progress for delete to authenticated using ((select auth.uid()) = user_id);

-- Housekeeping, if the free database ever fills up (run by hand, adjust the e-mail):
--   select u.email, pg_column_size(p.data) as bytes, p.updated_at
--     from public.progress p join auth.users u on u.id = p.user_id order by p.updated_at;
--   delete from public.progress where user_id <> (select id from auth.users where email = 'you@example.com');
