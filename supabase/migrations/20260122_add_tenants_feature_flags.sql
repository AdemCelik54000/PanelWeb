-- Adds feature flags to tenants.
-- image: enable/disable image features from the panel
-- emploi_du_temps: enable/disable planning (emploi du temps)

alter table public.tenants
  add column if not exists image boolean not null default true;

alter table public.tenants
  add column if not exists emploi_du_temps boolean not null default true;
