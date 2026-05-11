create table if not exists public.vv_entries (
  id uuid primary key,
  inserted_at timestamptz not null,
  payload jsonb not null
);

create table if not exists public.vv_settings (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.vv_entries enable row level security;
alter table public.vv_settings enable row level security;

drop policy if exists "vv_entries_select" on public.vv_entries;
drop policy if exists "vv_entries_insert" on public.vv_entries;
drop policy if exists "vv_entries_update" on public.vv_entries;
drop policy if exists "vv_entries_delete" on public.vv_entries;
drop policy if exists "vv_settings_select" on public.vv_settings;
drop policy if exists "vv_settings_insert" on public.vv_settings;
drop policy if exists "vv_settings_update" on public.vv_settings;
drop policy if exists "vv_settings_delete" on public.vv_settings;

create policy "vv_entries_select" on public.vv_entries for select to anon using (true);
create policy "vv_entries_insert" on public.vv_entries for insert to anon with check (true);
create policy "vv_entries_update" on public.vv_entries for update to anon using (true) with check (true);
create policy "vv_entries_delete" on public.vv_entries for delete to anon using (true);

create policy "vv_settings_select" on public.vv_settings for select to anon using (true);
create policy "vv_settings_insert" on public.vv_settings for insert to anon with check (true);
create policy "vv_settings_update" on public.vv_settings for update to anon using (true) with check (true);
create policy "vv_settings_delete" on public.vv_settings for delete to anon using (true);

insert into storage.buckets (id, name, public)
values ('vendemmia-foto', 'vendemmia-foto', false)
on conflict (id) do nothing;

drop policy if exists "vendemmia_foto_select" on storage.objects;
drop policy if exists "vendemmia_foto_insert" on storage.objects;
drop policy if exists "vendemmia_foto_update" on storage.objects;
drop policy if exists "vendemmia_foto_delete" on storage.objects;

create policy "vendemmia_foto_select" on storage.objects
for select to anon using (bucket_id = 'vendemmia-foto');

create policy "vendemmia_foto_insert" on storage.objects
for insert to anon with check (bucket_id = 'vendemmia-foto');

create policy "vendemmia_foto_update" on storage.objects
for update to anon using (bucket_id = 'vendemmia-foto') with check (bucket_id = 'vendemmia-foto');

create policy "vendemmia_foto_delete" on storage.objects
for delete to anon using (bucket_id = 'vendemmia-foto');
