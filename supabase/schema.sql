-- LabXChange database schema
-- Run in Supabase → SQL Editor after creating a new project.

create extension if not exists "pgcrypto";

create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  spec text default '',
  condition text not null default 'USED',
  price numeric,
  negotiable boolean default false,
  source_name text not null,
  source_url text,
  contact_name text,
  contact_email text,
  year integer,
  category text not null default 'Analytical',
  tags text[] default '{}',
  is_active boolean not null default true,
  scraped_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists listings_active_created_idx
  on listings (is_active, created_at desc);

create index if not exists listings_category_idx
  on listings (category);

create index if not exists listings_name_source_idx
  on listings (name, source_name);

create table if not exists scrape_log (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  status text not null,
  listings_added integer default 0,
  listings_updated integer default 0,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists wishlists (
  id uuid primary key default gen_random_uuid(),
  submitter_name text not null,
  submitter_email text,
  department text,
  priority text,
  items jsonb not null default '[]',
  comment text,
  status text not null default 'pending',
  admin_note text,
  created_at timestamptz not null default now()
);

-- Allow public read on listings; restrict writes to service role (scraper).
alter table listings enable row level security;
alter table scrape_log enable row level security;
alter table wishlists enable row level security;

create policy "Public read listings"
  on listings for select
  using (is_active = true);

create policy "Public insert wishlists"
  on wishlists for insert
  with check (true);

create policy "Public read wishlists"
  on wishlists for select
  using (true);

-- Sample data so search works immediately
insert into listings (name, spec, condition, price, negotiable, source_name, source_url, category, year, tags)
values
  ('Agilent 1260 Infinity II HPLC', 'Quaternary pump, DAD detector, autosampler', 'USED', 28500, true, 'LabX.com', 'https://www.labx.com', 'Analytical', 2019, array['hplc']),
  ('Waters Xevo TQ-S Micro LC-MS/MS', 'Triple quadrupole mass spec with Acquity UPLC', 'USED', 95000, true, 'BioSurplus.com', 'https://www.biosurplus.com', 'Analytical', 2018, array['lc-ms','mass spec']),
  ('Eppendorf 5810R Centrifuge', 'Refrigerated benchtop centrifuge, 4L capacity', 'USED', 4200, false, 'EquipNet.com', 'https://www.equipnet.com', 'Biology', 2017, array['centrifuge']),
  ('Hamilton STAR Liquid Handler', '96-channel automated liquid handling platform', 'USED', 120000, true, 'LabX.com', 'https://www.labx.com', 'Drug Discovery', 2020, array['liquid handler','hts']),
  ('Sartorius Biostat STR 200L', 'Single-use bioreactor for upstream processing', 'NEW', 185000, false, 'BioSurplus.com', 'https://www.biosurplus.com', 'Life Science', 2024, array['bioreactor']);
