-- WBME Projects Blog — Supabase schema
--
-- Run this ONCE in your Supabase project's SQL Editor:
-- https://supabase.com/dashboard/project/kbmgpqwmgthswjkfmqfe/sql/new
--
-- What this does:
--   1. Creates a "projects" table to back the Projects blog + admin portal.
--   2. Locks it down with Row Level Security: anyone can read published posts,
--      only a signed-in admin (Supabase Auth user) can create/edit/delete.
--   3. Grants that same signed-in admin permission to upload/replace/delete
--      files in the existing public "WBME" storage bucket (for cover/gallery photos).
--   4. Seeds the four case studies already on the static Projects page today,
--      so the blog isn't empty on day one.
--
-- After running this, create your admin login in the dashboard:
--   Authentication > Users > Add user (email + password) — that's the account
--   you sign in with at admin.html. Any Supabase Auth user counts as admin;
--   only create logins for people who should be able to publish.

create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  discipline text not null default 'General',
  summary text not null,
  body text not null default '',
  cover_path text not null,
  gallery jsonb not null default '[]'::jsonb,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- project_date: the date the JOB happened, set by the admin per post (defaults
-- to today for new posts, editable). The listing sorts by this, not by
-- created_at — created_at is just row-insert time, so if several posts are
-- uploaded in one sitting (or backfilled later) they'd otherwise all tie and
-- "newest first" would really mean "most recently uploaded", not most
-- recent work. Safe to re-run: adds the column only if it isn't there yet.
alter table public.projects add column if not exists project_date date not null default current_date;

alter table public.projects enable row level security;

drop policy if exists "Public can read published projects" on public.projects;
create policy "Public can read published projects"
  on public.projects for select
  to anon, authenticated
  using (published = true);

drop policy if exists "Admin can read all projects" on public.projects;
create policy "Admin can read all projects"
  on public.projects for select
  to authenticated
  using (true);

drop policy if exists "Admin can insert projects" on public.projects;
create policy "Admin can insert projects"
  on public.projects for insert
  to authenticated
  with check (true);

drop policy if exists "Admin can update projects" on public.projects;
create policy "Admin can update projects"
  on public.projects for update
  to authenticated
  using (true) with check (true);

drop policy if exists "Admin can delete projects" on public.projects;
create policy "Admin can delete projects"
  on public.projects for delete
  to authenticated
  using (true);

-- Storage: the WBME bucket is already public for reads. These policies let a
-- signed-in admin write into it too (uploads land under "admin-uploads/").
drop policy if exists "Admin can upload to WBME bucket" on storage.objects;
create policy "Admin can upload to WBME bucket"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'WBME');

drop policy if exists "Admin can update WBME bucket objects" on storage.objects;
create policy "Admin can update WBME bucket objects"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'WBME');

drop policy if exists "Admin can delete WBME bucket objects" on storage.objects;
create policy "Admin can delete WBME bucket objects"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'WBME');

-- Seed: the four case studies already live on the static Projects page today.
-- project_date values below are placeholder ordering only (most-recent-first
-- in the order these were already listed) — correct them to the real
-- completion dates from the admin dashboard whenever convenient.
insert into public.projects (title, slug, discipline, summary, body, cover_path, gallery, published, project_date) values
('Kort Nozzle & Shaft Conversion', 'kort-nozzle-shaft-conversion', 'Ship Repair',
 'Removal and refit work changing a vessel from CPP to fixed shaft configuration.',
 'Full removal and refit of a controllable-pitch propeller (CPP) system, converting the vessel to a fixed-shaft configuration. Work included shaft alignment, kort nozzle fitting, and full reassembly to class-approved tolerances.',
 'wbme photos for web 2026/Remove and fit new vessel kort nozzel change shaft from cpp to fixed/1.jpg',
 '["wbme photos for web 2026/Remove and fit new vessel kort nozzel change shaft from cpp to fixed/4.jpg","wbme photos for web 2026/Remove and fit new vessel kort nozzel change shaft from cpp to fixed/8.jpg","wbme photos for web 2026/Remove and fit new vessel kort nozzel change shaft from cpp to fixed/12.jpg"]'::jsonb,
 true, current_date),
('New Complete Ship''s Rudder', 'new-complete-ships-rudder', 'Boiler Making',
 'Structural steel rudder built, fitted and finished from raw plate to installed component.',
 'A complete rudder built in-house from raw steel plate: cutting, forming, welding and finishing, through to fitting on the vessel. Full boiler-making discipline work from first cut to installed, class-ready component.',
 'wbme photos for web 2026/New Complete Ships Rudder/1.jpg',
 '["wbme photos for web 2026/New Complete Ships Rudder/6.jpg","wbme photos for web 2026/New Complete Ships Rudder/11.jpg","wbme photos for web 2026/New Complete Ships Rudder/21.jpg"]'::jsonb,
 true, current_date - interval '30 days'),
('Stainless Steel Tank', 'stainless-steel-tank', 'Fabrication',
 'Custom steel fabrication, preparation and finish work for marine and industrial use.',
 'Custom stainless steel tank fabrication for marine and industrial use — cut, welded and finished in-house to spec, including surface preparation for corrosion resistance in a marine environment.',
 'wbme photos for web 2026/Pics for T/Fabrication/Stainless Steel tank 1.jpg',
 '["wbme photos for web 2026/Pics for T/Fabrication/Stainless Steel tank 2.jpg"]'::jsonb,
 true, current_date - interval '60 days'),
('Hull Plate Replacement', 'hull-plate-replacement', 'Boiler Making',
 'Structural renewal work for hull, deck and vessel steel repairs.',
 'Bottom hull plate replacement carried out in dry dock — cutting out corroded steel, fitting and welding new class-approved plate, and finishing to survey standard.',
 'wbme photos for web 2026/Pics for T/Boilermaking/bottom hull plate replacement 1.jpg',
 '["wbme photos for web 2026/Pics for T/Boilermaking/bottom hull plate replacement 2.jpg"]'::jsonb,
 true, current_date - interval '90 days')
on conflict (slug) do nothing;

-- Backfill project_date for anyone who ran an earlier version of this seed
-- before the column existed (on conflict do nothing above skips existing rows).
update public.projects set project_date = current_date where slug = 'kort-nozzle-shaft-conversion' and project_date = current_date;
update public.projects set project_date = current_date - interval '30 days' where slug = 'new-complete-ships-rudder' and project_date = current_date;
update public.projects set project_date = current_date - interval '60 days' where slug = 'stainless-steel-tank' and project_date = current_date;
update public.projects set project_date = current_date - interval '90 days' where slug = 'hull-plate-replacement' and project_date = current_date;
