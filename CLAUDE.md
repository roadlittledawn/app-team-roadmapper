# App Team Roadmapper

## Project Overview

A CRUD app for creating and tracking team roadmaps and capacity planning. Built with TypeScript, MongoDB, deployed to Vercel.

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **UI:** Tailwind CSS 4 + shadcn/ui, dark mode default
- **Database:** MongoDB via Mongoose
- **Auth:** bcrypt + jose (JWT), single user
- **Deployment:** Vercel

## SDD Integration

This project uses spec-driven development (SDD). Specs live in `specs/`, settings in `sdd/`.

## Commands

- `npm run dev` — start development server
- `npm run build` — production build
- `npm run lint` — run linter
- `npm run seed` — create admin user in MongoDB

## Setup

1. Copy `.env.local.example` to `.env.local` and fill in values
2. Run `npm run seed` to create admin user
3. Run `npm run dev` to start
