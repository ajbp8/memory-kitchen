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

## Auth and families

Anyone with the app URL can sign up at `/join` (server route `/api/join`
creates the account; Supabase public sign-ups stay disabled). A new user
either creates a family (becomes its single admin) or arrives through a
family invite link (`/join?family=<token>`) and joins as a member. One family
per user and one admin per family are enforced by unique indexes
(`supabase/migrations/0005_open_signup_families.sql`). All recipes are public
(common pool); menus belong to a family. New signups and new families email the
owner via Resend (`RESEND_API_KEY`, `NOTIFY_EMAIL` env vars).

## Legacy app

`legacy-peach-v1/` contains the original single-page PEACH app that this
project replaces. Kept for reference; not part of the Next.js build.
