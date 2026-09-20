# Memory Kitchen

A mobile-first PWA recipe-sharing network for family and friends — plan weekly
menus together, save and share recipes, and coordinate potluck-style events.

Built with Next.js (App Router, TypeScript, Tailwind CSS) and Supabase
(Postgres, Auth, Storage). Runs on the same Supabase project as the original
`peach-a-table` app (see `legacy-peach-v1/`).

## Stack

- Next.js — App Router, TypeScript, Tailwind CSS v4
- Supabase — Postgres + Row Level Security, Auth (magic link), Storage
- Deployed on Vercel

## Local development

```bash
npm install
cp .env.example .env.local   # fill in NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY
npm run dev
```

## Database

The full schema (16 tables, RLS policies) lives in
`supabase/migrations/0001_init.sql`. Run it once in the Supabase SQL editor
for the project.

## Invite-only auth

Public sign-ups are disabled in Supabase Auth settings. New accounts can only
be created through `/join` after a valid invite token is checked server-side
(`/api/join`), which then calls `supabase.auth.admin.inviteUserByEmail`.
Existing users sign in via magic link at `/login` (`shouldCreateUser: false`).

## Legacy app

`legacy-peach-v1/` contains the original single-page PEACH app that this
project replaces. Kept for reference; not part of the Next.js build.
