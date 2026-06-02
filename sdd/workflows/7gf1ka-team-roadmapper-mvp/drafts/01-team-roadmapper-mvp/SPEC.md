---
title: Team Roadmapper MVP
spec_type: tech
type: feature
status: active
domain: Roadmap Planning
created: 2026-06-02
updated: 2026-06-02
sdd_version: 7.3.0
---

# Feature: Team Roadmapper MVP

## Overview

A full-stack CRUD application for planning and tracking team roadmaps with capacity visibility. Users manage isolated team spaces, each with sequential roadmap periods containing projects sized via a custom T-shirt estimation framework, visualized on a weekly-resolution Gantt chart.

## Domain Concepts

**New concepts introduced:**
- **Team Space**: An isolated container for a single team/role's roadmaps, roster, and backlog
- **Roadmap**: A bounded planning period (start/end dates) containing a set of projects. One active per team space, past roadmaps archived.
- **Project**: A unit of work within a roadmap with title, T-shirt size, point estimate, status, timeline, and assigned lead(s)
- **Backlog**: A team-level holding area for projects removed from a roadmap that retain their metadata for future use
- **T-Shirt Size**: An estimation category (S/M/L/XL) with configurable point ranges per team
- **Thirds Framework**: A custom estimation method that divides each T-shirt size's point range into three equal bands and takes the midpoint (rounded up) of each band as low/mid/high estimates
- **Roadmap Roster**: A per-roadmap snapshot of team members, referencing the central team member store
- **Capacity Budget**: A manually-entered number representing the team's estimated throughput for a roadmap period

## User Stories

### Team Space Management
- As a user, I want to create and manage team spaces so that each team/role I manage has isolated roadmaps
- As a user, I want to manage a team roster so that I can assign leads and understand team capacity

### Roadmap Management
- As a user, I want to create roadmaps with custom start/end dates so that I can plan work for any time period
- As a user, I want to view past roadmaps so that I can reference historical data
- As a user, I want to set a manual capacity budget per roadmap so that I can see if I'm overcommitted

### Project Management
- As a user, I want to add projects to a roadmap with planned start/end dates so that I can track timeline expectations
- As a user, I want to assign team leads to projects so that ownership is clear
- As a user, I want to customize project statuses with colors so that I can track progress my way
- As a user, I want to deprioritize projects into a backlog without losing their data so that I can pick them up later

### Estimation
- As a user, I want to configure T-shirt size point ranges per team so that sizing reflects my team's velocity
- As a user, I want to record consensus T-shirt size and point estimate for each project so that I have sizing data
- As a user, I want to see the thirds breakdown (low/mid/high) for each T-shirt size so that the team has reference points during estimation

### Visualization
- As a user, I want a Gantt chart showing projects across weeks so that I can see the timeline at a glance
- As a user, I want to see overruns visually distinguished from planned timelines so that I know what's off-track
- As a user, I want a capacity overview showing project count, sizes, and statuses so that I can assess commitment level

## Acceptance Criteria

### Authentication
- [ ] **AC1:** Given valid credentials, when user submits login, then they receive a JWT and are redirected to dashboard
- [ ] **AC2:** Given invalid credentials, when user submits login, then an error message is shown
- [ ] **AC3:** Given an expired JWT, when user makes a request, then they are redirected to login

### Team Spaces
- [ ] **AC4:** Given a logged-in user, when they create a new team space, then it appears in their dashboard
- [ ] **AC5:** Given a team space, when the user views it, then they see the active roadmap, roster, and backlog

### Roadmaps
- [ ] **AC6:** Given a team space with no active roadmap, when user creates a roadmap with start/end dates, then it becomes the active roadmap
- [ ] **AC7:** Given an active roadmap, when its end date passes or user marks it complete, then it becomes archived and viewable
- [ ] **AC8:** Given a roadmap, when user sets a capacity budget, then the budget is displayed in the capacity overview

### Projects
- [ ] **AC9:** Given a roadmap, when user adds a project with title, size, dates, and lead, then it appears in the roadmap and Gantt chart
- [ ] **AC10:** Given a project in a roadmap, when user removes it, then it moves to the team backlog with all metadata preserved
- [ ] **AC11:** Given a backlog project, when user adds it to a new roadmap, then it retains its sizing and milestone data
- [ ] **AC12:** Given a backlog project, when user deletes it, then it is permanently removed

### Statuses
- [ ] **AC13:** Given a team space, when user creates a custom status with a color, then it's available for projects in that space
- [ ] **AC14:** Given custom statuses, when user reorders them, then the new order is reflected in the UI

### Estimation
- [ ] **AC15:** Given a team's configured size ranges (e.g., S=1-12, M=13-25), when viewing estimation, then the thirds breakdown shows correct low/mid/high values
- [ ] **AC16:** Given a project, when user records a T-shirt size and point estimate, then both are stored and displayed

### Gantt Chart
- [ ] **AC17:** Given a roadmap with projects, when viewing the Gantt chart, then each project shows as a bar spanning its planned start-to-end dates at weekly resolution
- [ ] **AC18:** Given a project past its end date with status not "Done", when viewing Gantt, then an overrun extension is shown in a lighter/transparent shade
- [ ] **AC19:** Given a project completed before its end date, when viewing Gantt, then the bar ends at the actual completion point

### Capacity Overview
- [ ] **AC20:** Given a roadmap with projects, when viewing capacity, then user sees: total project count, breakdown by size, breakdown by status, and budget vs total estimated effort

## API Contract

### POST /api/auth/login

**Description:** Authenticate user and return JWT

**Request:**
```json
{ "email": "string", "password": "string" }
```

**Response (200):**
```json
{ "token": "string" }
```

**Errors:**
| Status | Code | Condition |
|--------|------|-----------|
| 401 | `invalid_credentials` | Email/password mismatch |

### GET /api/teams

**Description:** List all team spaces

**Response (200):**
```json
{ "teams": [{ "id": "string", "name": "string", "createdAt": "string" }] }
```

### POST /api/teams

**Description:** Create a new team space

**Request:**
```json
{ "name": "string" }
```

### GET /api/teams/:teamId/roadmaps

**Description:** List roadmaps for a team (active + archived)

### POST /api/teams/:teamId/roadmaps

**Description:** Create a new roadmap

**Request:**
```json
{ "title": "string", "startDate": "string", "endDate": "string", "budget": "number | null" }
```

### GET /api/teams/:teamId/roadmaps/:roadmapId

**Description:** Get roadmap with projects, roster, and capacity summary

### CRUD /api/teams/:teamId/roadmaps/:roadmapId/projects

**Description:** Create, read, update, delete projects within a roadmap

### POST /api/teams/:teamId/roadmaps/:roadmapId/projects/:projectId/deprioritize

**Description:** Move project to team backlog

### GET /api/teams/:teamId/backlog

**Description:** List backlog projects for the team

### POST /api/teams/:teamId/backlog/:projectId/promote

**Description:** Move backlog project into a roadmap

### CRUD /api/teams/:teamId/members

**Description:** Manage team roster (central store)

### CRUD /api/teams/:teamId/statuses

**Description:** Manage custom statuses with colors and ordering

### GET /api/teams/:teamId/sizing-config

**Description:** Get T-shirt size ranges for a team

### PUT /api/teams/:teamId/sizing-config

**Description:** Update T-shirt size ranges

**Request:**
```json
{
  "sizes": [
    { "label": "S", "minPoints": 1, "maxPoints": 12, "weeksReference": "1-2" },
    { "label": "M", "minPoints": 13, "maxPoints": 25, "weeksReference": "3-5" }
  ]
}
```

## Edge Cases

| Case | Expected Behavior |
|------|-------------------|
| Create roadmap when one already active | Block creation; user must archive/complete current roadmap first |
| Remove last project from roadmap | Roadmap remains with empty project list |
| Delete team member assigned to projects | Warn user, keep assignment as "former member" reference |
| T-shirt size range with 0 or 1 points | Minimum range of 3 points required for thirds calculation |
| Project dates outside roadmap period | Allow (projects can start before or extend beyond the period) |
| Browser resize below tablet | Stack layout vertically, Gantt scrolls horizontally |

## Security Considerations

- Single-user auth via bcrypt-hashed password + JWT
- JWT secret stored as environment variable
- All API routes require valid JWT (except /api/auth/login)
- No multi-tenancy concerns — single user owns all data
- MongoDB connection string stored as environment variable

## Domain Model

### Entities

| Entity | Definition | Status |
|--------|------------|--------|
| User | Single app owner with auth credentials | New |
| TeamSpace | Isolated container for a team's roadmaps and data | New |
| TeamMember | Person on a team (name, role) | New |
| Roadmap | Bounded time period with projects and roster snapshot | New |
| RoadmapRoster | Snapshot of team members for a specific roadmap | New |
| Project | Unit of work with sizing, timeline, status, and leads | New |
| ProjectStatus | Custom status with label, color, and order | New |
| SizingConfig | T-shirt size definitions with point ranges per team | New |
| BacklogProject | Deprioritized project retaining all metadata | New |

### Relationships

```text
User ──── owns ───→ TeamSpace (1:many)
TeamSpace ──── has ───→ TeamMember (1:many)
TeamSpace ──── has ───→ Roadmap (1:many, one active)
TeamSpace ──── has ───→ BacklogProject (1:many)
TeamSpace ──── has ───→ ProjectStatus (1:many)
TeamSpace ──── has ───→ SizingConfig (1:1)
Roadmap ──── contains ───→ Project (1:many)
Roadmap ──── snapshots ───→ RoadmapRoster (1:1)
RoadmapRoster ──── references ───→ TeamMember (many:many)
Project ──── has ───→ ProjectStatus (many:1)
Project ──── assigned to ───→ TeamMember (many:many)
```

### Glossary

| Term | Definition | First Defined In |
|------|------------|------------------|
| T-Shirt Size | Estimation category (S/M/L/XL) with point range | This spec |
| Thirds Framework | Divide point range into 3 bands, midpoint of each = low/mid/high | This spec |
| Capacity Budget | Manually-entered number for team's estimated throughput | This spec |
| Overrun | Visual indicator when project extends past planned end date | This spec |
| Active Roadmap | The current (non-archived) roadmap for a team space | This spec |

### Bounded Contexts

- **Identity**: User authentication
- **Team Management**: TeamSpace, TeamMember, SizingConfig, ProjectStatus
- **Planning**: Roadmap, Project, RoadmapRoster, BacklogProject, capacity budget
- **Visualization**: Gantt chart rendering, capacity overview display

## Specs Directory Changes

### Before

```text
specs/
└── INDEX.md
```

### After

```text
specs/
├── INDEX.md                          # MODIFIED
└── domain/
    └── definitions/
        ├── team-space.md             # NEW
        ├── roadmap.md                # NEW
        ├── project.md                # NEW
        └── sizing-config.md          # NEW
```

### Changes Summary

| Path | Action | Description |
|------|--------|-------------|
| specs/INDEX.md | Modify | Add reference to this change |
| specs/domain/definitions/ | Create | Domain entity definitions |

## Components

### New Components

| Component | Type | Purpose | Settings |
|-----------|------|---------|----------|
| app-team-roadmapper | Next.js full-stack | Monolith: API routes + React frontend deployed to Vercel | `{ framework: "nextjs", database: "mongodb", auth: "jwt", deployment: "vercel", ui: "tailwind+shadcn", darkMode: true }` |

### Architecture Notes

This is a **Next.js monolith** deployed to Vercel:
- **Frontend**: React with Tailwind CSS + shadcn/ui, dark mode default
- **API**: Next.js API routes (App Router)
- **Database**: MongoDB (via Mongoose or native driver)
- **Auth**: bcrypt for password hashing, JWT for sessions
- **Deployment**: Vercel (serverless functions for API, static for frontend)
- **Responsive**: Mobile-friendly down to tablet, stacked layout on small screens

## System Analysis

### Inferred Requirements

- MongoDB indexes needed on: teamId (roadmaps, members, statuses), roadmapId (projects), teamId+active (roadmaps)
- JWT middleware for all API routes except login
- Gantt chart library or custom SVG/Canvas rendering for weekly bars
- Date utility for computing overruns (compare current date vs planned end for in-progress/blocked projects)
- Thirds calculation is pure math: `midpoint(band) = floor((bandStart + bandEnd) / 2) + 1` rounded up

### Gaps & Assumptions

- **Assumption**: User manually archives a roadmap (no auto-archive on end date)
- **Assumption**: "Overcommitted" is a visual signal (e.g., total estimated points > budget) without hard enforcement
- **Assumption**: No notifications or email — single user checks the app directly
- **Assumption**: No data export/import for MVP

## Requirements Discovery

### Component Discovery Phase

| # | Question | Answer | Source |
|---|----------|--------|--------|
| D1 | Do you need to persist data? | Yes — roadmaps, projects, teams, capacity | User |
| D2 | Does it have a backend/API? | Yes — CRUD operations, auth | User |
| D3 | Does it have a user-facing frontend? | Yes — Gantt charts, planning UI | User |
| D4 | Deployed to Kubernetes? | No — Vercel | User |
| D5 | Monolith or separated services? | Monolith (Next.js) — appropriate for MVP | User |

### Solicitation Phase

| # | Question | Answer | Source |
|---|----------|--------|--------|
| S1 | Auth mechanism? | bcrypt + JWT stored as env var | User |
| S2 | Are team members just names or profiles? | Central team roster collection, referenced per-roadmap as snapshot via object reference | User |
| S3 | How is actual timeline tracked? | Manual start/end entry. Gantt shows overrun when still in-progress/blocked past end date | User |
| S4 | Verify thirds calculation math? | Split into equal thirds, take midpoint rounded up. S=1-12: low=3, mid=7, high=11 | User |
| S5 | UI framework preferences? | Tailwind/shadcn, dark mode default, responsive to tablet | User |
| S6 | Can statuses have colors? Custom workflow? | Yes colors, no workflow rules for MVP | User |
| S7 | Roadmap period format? | Start/end date picker, no overlapping | User |
| S8 | Backlog scope? | Team-level. Deprioritized projects keep data, can pull into future roadmaps or permanently delete | User |
| S9 | Gantt overrun visual? | Solid bar for planned, lighter shade for overrun. Weekly resolution, view-only | User |
| S10 | Sizing vote mechanism? | Consensus result only, no per-person tracking | User |
| S11 | Historical data / forecasting? | Manual for MVP — user references past roadmaps and enters budget manually | User |
| S12 | Capacity math? | Simple: project count, sizes, statuses, visual overcommitment signal. Manual budget. | User |
| S13 | Multiple active roadmaps per team? | No — one active, past ones archived and viewable | User |
| S14 | Gantt time resolution? | Weeks | User |
| S15 | Drag to adjust on Gantt? | No, view-only | User |

### Open Questions

No open questions — all requirements clarified.

## Testing Strategy

### Unit Tests

| Component | Test Case | Expected Behavior |
|-----------|-----------|-------------------|
| Thirds calculation | S=1-12 input | Returns low=3, mid=7, high=11 |
| Thirds calculation | Range of 3 (min viable) | Returns correct 3 values |
| JWT middleware | Valid token | Passes through to handler |
| JWT middleware | Expired/invalid token | Returns 401 |
| Overrun detection | Project in-progress past end date | Flags as overrun |
| Overrun detection | Project done before end date | No overrun flag |

### Integration Tests

| Scenario | Components | Expected Outcome |
|----------|------------|------------------|
| Create team + roadmap + project flow | API routes → MongoDB | Full CRUD persisted correctly |
| Deprioritize project to backlog | API → DB | Project moves to backlog with metadata |
| Promote backlog project | API → DB | Project added to roadmap with existing sizing |

### E2E Tests

| User Flow | Steps | Expected Result |
|-----------|-------|-----------------|
| Full planning workflow | Login → Create team → Add members → Create roadmap → Add projects → View Gantt | All screens render correctly, data persists |
| Estimation flow | Configure sizes → Add project → Enter size/points | Thirds display correctly, estimate saved |
| Deprioritize/promote | Remove project from roadmap → View backlog → Add to new roadmap | Data preserved across transitions |

## Out of Scope

- Multi-user support / team collaboration
- Real-time sync or WebSockets
- Drag-and-drop on Gantt chart
- Automated velocity calculation from historical data
- Notifications or email
- Data export/import
- Per-person vote tracking (poker-style)
- Status workflow rules or transition logic
- Overlapping roadmap periods
- Mobile-native app
