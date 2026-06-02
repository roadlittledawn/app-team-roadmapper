---
title: "Implementation Plan: Team Roadmapper MVP"
change: team-roadmapper-mvp-1
type: feature
spec: ./SPEC.md
created: 2026-06-02
sdd_version: 7.3.0
---

# Implementation Plan: Team Roadmapper MVP

## Overview

**Spec:** [SPEC.md](./SPEC.md)

## Affected Components

- app-team-roadmapper (Next.js full-stack monolith)
  - API routes (App Router)
  - React frontend (Tailwind + shadcn/ui)
  - MongoDB models (Mongoose)
  - Auth (bcrypt + JWT)

## Phases

### Phase 1: Project Scaffolding

**Outcome:** Next.js project bootstrapped with dependencies, MongoDB connection, and base configuration

**Deliverables:**
- Next.js App Router project with TypeScript
- Tailwind CSS + shadcn/ui configured (dark mode default)
- MongoDB connection utility (Mongoose)
- Environment variable structure (.env.local template)
- Base layout with dark theme, responsive shell

**Key decisions:**
- App Router (not Pages Router)
- Mongoose for MongoDB ODM
- shadcn/ui components installed as needed per phase
- `src/` directory structure: `app/`, `lib/`, `models/`, `components/`

### Phase 2: Authentication

**Outcome:** Single-user login/logout with JWT-protected API routes

**Deliverables:**
- User model (MongoDB) with hashed password
- Seed script to create the single user
- POST /api/auth/login endpoint
- JWT middleware for protected routes
- Login page UI
- Auth context/provider for frontend

### Phase 3: Team Space & Roster

**Outcome:** CRUD for team spaces and team members

**Deliverables:**
- TeamSpace model
- TeamMember model
- API routes: GET/POST /api/teams, GET/PUT/DELETE /api/teams/:id
- API routes: GET/POST /api/teams/:teamId/members, PUT/DELETE individual members
- Dashboard page listing team spaces
- Team detail page with roster management UI

### Phase 4: Custom Statuses & Sizing Config

**Outcome:** Per-team configurable statuses and T-shirt sizing

**Deliverables:**
- ProjectStatus model (label, color, order, teamId)
- SizingConfig model (sizes array with label, minPoints, maxPoints, weeksReference, weight)
- API routes: CRUD /api/teams/:teamId/statuses
- API routes: GET/PUT /api/teams/:teamId/sizing-config
- Thirds calculation utility function
- Settings UI within team space (statuses tab, sizing tab)

### Phase 5: Roadmaps & Projects

**Outcome:** Full roadmap lifecycle with project CRUD, backlog, and estimation

**Deliverables:**
- Roadmap model (title, startDate, endDate, estimationMode, budget, status, teamId, roster snapshot)
- Project model (title, size, pointEstimate, statusId, plannedStart, plannedEnd, leads, roadmapId)
- BacklogProject model (same as Project but linked to team, not roadmap)
- API routes: CRUD /api/teams/:teamId/roadmaps
- API routes: CRUD /api/teams/:teamId/roadmaps/:roadmapId/projects
- API routes: POST .../projects/:id/deprioritize, GET /api/teams/:teamId/backlog, POST .../backlog/:id/promote
- Roadmap detail page with project list, add/edit project forms
- Estimation UI (mode-aware: shows points field only in `points` mode, thirds reference)
- Backlog page with promote/delete actions

### Phase 6: Gantt Chart

**Outcome:** View-only weekly Gantt visualization with overrun indicators

**Deliverables:**
- Gantt chart component (custom SVG or lightweight library)
- Weekly column rendering for roadmap date range
- Project bars: solid color for planned duration
- Overrun bars: lighter/transparent extension past end date for in-progress/blocked projects
- Color coding by project status
- Responsive: horizontal scroll on narrow screens
- Gantt view integrated into roadmap detail page

### Phase 7: Capacity Overview

**Outcome:** At-a-glance capacity dashboard per roadmap

**Deliverables:**
- Capacity summary component showing:
  - Total project count
  - Breakdown by T-shirt size (count per size)
  - Breakdown by status (count per status with colors)
  - Budget vs total effort (points or size-units depending on mode)
  - Visual overcommitment indicator (e.g., progress bar that turns red when over budget)
- Integrated into roadmap detail page (above or beside Gantt)

## Dependencies

- MongoDB Atlas account (or local MongoDB for dev)
- Vercel account for deployment
- No external service dependencies beyond database

## Expected File Structure

```
src/
├── app/
│   ├── layout.tsx                    # Root layout, dark theme, auth provider
│   ├── page.tsx                      # Dashboard (team spaces list)
│   ├── login/page.tsx                # Login page
│   ├── teams/[teamId]/
│   │   ├── page.tsx                  # Team detail (active roadmap, roster)
│   │   ├── settings/page.tsx         # Statuses + sizing config
│   │   ├── backlog/page.tsx          # Backlog projects
│   │   └── roadmaps/[roadmapId]/
│   │       └── page.tsx              # Roadmap detail (projects, Gantt, capacity)
│   └── api/
│       ├── auth/login/route.ts
│       ├── teams/route.ts
│       ├── teams/[teamId]/
│       │   ├── route.ts
│       │   ├── members/route.ts
│       │   ├── statuses/route.ts
│       │   ├── sizing-config/route.ts
│       │   ├── backlog/route.ts
│       │   └── roadmaps/
│       │       ├── route.ts
│       │       └── [roadmapId]/
│       │           ├── route.ts
│       │           └── projects/route.ts
├── lib/
│   ├── db.ts                         # MongoDB connection
│   ├── auth.ts                       # JWT utilities + middleware
│   └── thirds.ts                     # Thirds calculation utility
├── models/
│   ├── user.ts
│   ├── team-space.ts
│   ├── team-member.ts
│   ├── project-status.ts
│   ├── sizing-config.ts
│   ├── roadmap.ts
│   ├── project.ts
│   └── backlog-project.ts
└── components/
    ├── ui/                           # shadcn/ui components
    ├── gantt-chart.tsx
    ├── capacity-overview.tsx
    ├── project-form.tsx
    ├── estimation-display.tsx
    └── status-badge.tsx
```

## Implementation State

- **Current Phase:** Not started
- **Status:** pending
- **Completed Phases:** (none)
- **Actual Files Changed:** (updated during implementation)
- **Blockers:** None

## Risks

| Risk | Mitigation |
|------|------------|
| Gantt chart rendering complexity | Start with simple custom SVG; avoid heavy charting libraries. Keep view-only. |
| MongoDB connection pooling on Vercel serverless | Use cached connection pattern (standard Next.js + Mongoose approach) |
| Dark mode + shadcn component consistency | Configure shadcn with dark mode from the start; don't add it later |
