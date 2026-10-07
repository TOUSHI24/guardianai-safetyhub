create table public.profiles (
  id uuid primary key,
  full_name text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.trusted_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  email text not null,
  notify boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.trusted_contacts to authenticated;
grant all on public.trusted_contacts to service_role;
alter table public.trusted_contacts enable row level security;
create policy "own contacts" on public.trusted_contacts for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.emergency_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  message text not null,
  risk text not null default 'CRITICAL',
  latitude double precision,
  longitude double precision,
  email_status text not null default 'pending',
  emails_sent int not null default 0,
  emails_failed int not null default 0,
  email_error text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.emergency_events to authenticated;
grant all on public.emergency_events to service_role;
alter table public.emergency_events enable row level security;
create policy "own events" on public.emergency_events for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);