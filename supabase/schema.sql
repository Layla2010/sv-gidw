-- Enable RLS
-- Run this in the Supabase SQL editor

-- Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text not null default '',
  role text not null default 'mitglied' check (role in ('admin', 'mitglied')),
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Alle eingeloggten Nutzer können Profile sehen" on public.profiles
  for select using (auth.uid() is not null);
create policy "Nutzer können eigenes Profil updaten" on public.profiles
  for update using (auth.uid() = id);
create policy "Admins können alle Profile verwalten" on public.profiles
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$ language plpgsql security definer;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Documents (Mini-Wiki für Allgemeine SV-Arbeit)
create table public.documents (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.documents enable row level security;
create policy "Eingeloggte Nutzer können Dokumente lesen" on public.documents
  for select using (auth.uid() is not null);
create policy "Eingeloggte Nutzer können Dokumente erstellen" on public.documents
  for insert with check (auth.uid() is not null);
create policy "Eingeloggte Nutzer können Dokumente bearbeiten" on public.documents
  for update using (auth.uid() is not null);
create policy "Eingeloggte Nutzer können Dokumente löschen" on public.documents
  for delete using (auth.uid() is not null);

-- Protocols
create table public.protocols (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  meeting_date date not null,
  file_path text not null,
  file_name text not null,
  file_size integer not null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);
alter table public.protocols enable row level security;
create policy "Eingeloggte Nutzer können Protokolle lesen" on public.protocols
  for select using (auth.uid() is not null);
create policy "Eingeloggte Nutzer können Protokolle hochladen" on public.protocols
  for insert with check (auth.uid() is not null);
create policy "Eingeloggte Nutzer können Protokolle löschen" on public.protocols
  for delete using (auth.uid() is not null);

-- Projects
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  has_participant_list boolean default false,
  participant_template text check (participant_template in ('overnight', 'daytrip', 'meeting')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.projects enable row level security;
create policy "Eingeloggte Nutzer können Projekte lesen" on public.projects
  for select using (auth.uid() is not null);
create policy "Eingeloggte Nutzer können Projekte erstellen" on public.projects
  for insert with check (auth.uid() is not null);
create policy "Eingeloggte Nutzer können Projekte bearbeiten" on public.projects
  for update using (auth.uid() is not null);
create policy "Eingeloggte Nutzer können Projekte löschen" on public.projects
  for delete using (auth.uid() is not null);

-- Tasks (Aufgabenverteilung)
create table public.tasks (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade,
  aufgabe text not null,
  beschreibung text,
  verantwortliche text,
  deadline date,
  erledigt boolean default false,
  created_at timestamptz default now()
);
alter table public.tasks enable row level security;
create policy "Eingeloggte Nutzer können Tasks lesen" on public.tasks
  for select using (auth.uid() is not null);
create policy "Eingeloggte Nutzer können Tasks erstellen" on public.tasks
  for insert with check (auth.uid() is not null);
create policy "Eingeloggte Nutzer können Tasks bearbeiten" on public.tasks
  for update using (auth.uid() is not null);
create policy "Eingeloggte Nutzer können Tasks löschen" on public.tasks
  for delete using (auth.uid() is not null);

-- Participants (Teilnehmer*innenlisten)
create table public.participants (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade,
  name text not null,
  rolle text,
  anwesend boolean default false,
  gruppenname text,
  raum text,
  ueber_nacht boolean,
  buffet boolean,
  gegangen boolean default false,
  sonstiges text,
  sort_order integer default 0
);
alter table public.participants enable row level security;
create policy "Eingeloggte Nutzer können Teilnehmer lesen" on public.participants
  for select using (auth.uid() is not null);
create policy "Eingeloggte Nutzer können Teilnehmer erstellen" on public.participants
  for insert with check (auth.uid() is not null);
create policy "Eingeloggte Nutzer können Teilnehmer bearbeiten" on public.participants
  for update using (auth.uid() is not null);
create policy "Eingeloggte Nutzer können Teilnehmer löschen" on public.participants
  for delete using (auth.uid() is not null);

-- Project files
create table public.project_files (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_size integer not null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);
alter table public.project_files enable row level security;
create policy "Eingeloggte Nutzer können Projektdateien lesen" on public.project_files
  for select using (auth.uid() is not null);
create policy "Eingeloggte Nutzer können Projektdateien hochladen" on public.project_files
  for insert with check (auth.uid() is not null);
create policy "Eingeloggte Nutzer können Projektdateien löschen" on public.project_files
  for delete using (auth.uid() is not null);

-- Satzung files (only admins can upload)
create table public.satzung_files (
  id uuid default gen_random_uuid() primary key,
  file_name text not null,
  file_path text not null,
  file_size integer not null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);
alter table public.satzung_files enable row level security;
create policy "Eingeloggte Nutzer können Satzung lesen" on public.satzung_files
  for select using (auth.uid() is not null);
create policy "Nur Admins können Satzung hochladen" on public.satzung_files
  for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
create policy "Nur Admins können Satzung löschen" on public.satzung_files
  for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Storage buckets (create these in Supabase dashboard or via CLI)
-- bucket: protocols (PDF, DOCX, max 10MB)
-- bucket: project-files (PDF, DOCX, max 10MB)
-- bucket: satzung (PDF, DOCX, max 10MB)
