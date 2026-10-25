-- 001_init.sql — Initial database schema and Row Level Security setup for Contribution Finder.
-- This migration creates the saved_issues, issue_summaries, and newsletter_subscribers tables.
-- Every table has RLS explicitly enabled, and saved_issues restricts read/write access to the owning user.

-- 1) Saved issues (per user)
create table public.saved_issues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  github_issue_id bigint not null,
  repo_full_name text not null check (repo_full_name ~ '^[A-Za-z0-9_.-]{1,100}/[A-Za-z0-9_.-]{1,100}$'),
  issue_number integer not null check (issue_number > 0),
  title text not null check (char_length(title) between 1 and 500),
  html_url text not null check (html_url ~ '^https://github\.com/' and char_length(html_url) <= 500),
  language text check (language is null or char_length(language) <= 50),
  difficulty text not null check (difficulty in ('easy','medium','hard')),
  status text not null default 'saved' check (status in ('saved','in_progress','done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, github_issue_id)
);
create index saved_issues_user_id_idx on public.saved_issues (user_id);

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;

create trigger saved_issues_set_updated_at before update on public.saved_issues
for each row execute function public.set_updated_at();

alter table public.saved_issues enable row level security;

create policy "saved_issues_select_own" on public.saved_issues
  for select to authenticated using (user_id = (select auth.uid()));
create policy "saved_issues_insert_own" on public.saved_issues
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "saved_issues_update_own" on public.saved_issues
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "saved_issues_delete_own" on public.saved_issues
  for delete to authenticated using (user_id = (select auth.uid()));

-- 2) AI summary cache (server only: RLS on, no policies = clients can do nothing)
create table public.issue_summaries (
  github_issue_id bigint not null,
  source_updated_at timestamptz not null,
  summary text not null check (char_length(summary) <= 4000),
  model text not null,
  created_at timestamptz not null default now(),
  primary key (github_issue_id, source_updated_at)
);
alter table public.issue_summaries enable row level security;

-- 3) Newsletter (server only, same pattern)
create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null check (
    char_length(email) <= 254 and email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index newsletter_subscribers_email_key on public.newsletter_subscribers (email);
alter table public.newsletter_subscribers enable row level security;
