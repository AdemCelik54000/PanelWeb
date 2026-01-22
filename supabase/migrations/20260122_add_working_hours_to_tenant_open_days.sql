-- Adds per-day working hours to tenant_open_days.
-- Default hours: 08:00-18:00

alter table public.tenant_open_days
  add column if not exists start_time time not null default '08:00',
  add column if not exists end_time time not null default '18:00';

-- Ensure a unique constraint exists for upsert on (tenant_id, date)
-- (If you already have a PK/unique index, this will fail and you can skip it.)
-- NOTE: Supabase does not support IF NOT EXISTS for constraints in all Postgres versions.
-- If it errors with "already exists", ignore.
--
-- alter table public.tenant_open_days
--   add constraint tenant_open_days_tenant_id_date_key unique (tenant_id, date);
