-- ═══════════════════════════════════════════════════════════════════
-- VETOC.RU — Supabase schema v2 (hardened)
-- Выполните один раз в SQL-редакторе Supabase Dashboard.
-- ═══════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── таблица контента ────────────────────────────────────────────────
create table if not exists public.vetoc_content (
  id           uuid         primary key default gen_random_uuid(),
  kind         text         not null
                            check (kind in ('review','event_photo','video','hall','certificate')),
  title        text         not null
                            check (char_length(title) between 1 and 120),
  body         text         check (body is null or char_length(body) <= 2000),
  author       text         check (author is null or char_length(author) <= 120),
  -- media_path: только безопасные символы
  media_path   text         check (media_path is null or media_path ~ '^[a-zA-Z0-9/_.\-]+$'),
  -- media_url: только Supabase Storage
  media_url    text         check (
                              media_url is null or
                              media_url ~ '^https://[a-z0-9\-]+\.(supabase\.co|supabase\.in)/'
                            ),
  is_published boolean      not null default true,
  created_at   timestamptz  not null default now()
);

alter table public.vetoc_content enable row level security;

-- Публичное чтение: только опубликованное; выбираем только нужные поля
create policy "public_read_published"
  on public.vetoc_content for select
  using (is_published = true);

-- Запись: только аутентифицированный пользователь;
-- kind и media_url валидируются на уровне CHECK CONSTRAINT выше
create policy "auth_insert"
  on public.vetoc_content for insert to authenticated
  with check (true);

create policy "auth_update"
  on public.vetoc_content for update to authenticated
  using (true)
  with check (true);

create policy "auth_delete"
  on public.vetoc_content for delete to authenticated
  using (true);

-- ── хранилище медиа ─────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vetoc-media',
  'vetoc-media',
  true,
  209715200,   -- 200 МБ
  array[
    'image/jpeg','image/png','image/webp','image/gif',
    'video/mp4','video/webm','video/quicktime','video/x-msvideo'
  ]
)
on conflict (id) do update set
  public             = true,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Публичный просмотр медиа
create policy "public_view_media"
  on storage.objects for select
  using (bucket_id = 'vetoc-media');

-- Загрузка только в папку uploads/
create policy "auth_upload_media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'vetoc-media' and
    (storage.foldername(name))[1] = 'uploads'
  );

create policy "auth_update_media"
  on storage.objects for update to authenticated
  using (bucket_id = 'vetoc-media')
  with check (bucket_id = 'vetoc-media');

create policy "auth_delete_media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'vetoc-media');
