-- Run this in the Supabase SQL editor for your project

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  keywords text[] not null default '{}',
  experience_level text not null,
  target_companies text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists sent_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  job_key text not null, -- greenhouse job id + company slug, unique per job
  title text not null,
  company text not null,
  url text not null,
  sent_at timestamptz not null default now(),
  unique (user_id, job_key)
);

create index if not exists idx_sent_jobs_user on sent_jobs(user_id);
