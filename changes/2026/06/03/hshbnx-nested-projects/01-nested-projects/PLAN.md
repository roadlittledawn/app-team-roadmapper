---
title: "Implementation Plan: Nested Projects"
change: nested-projects-1
type: feature
spec: ./SPEC.md
created: 2026-06-03
sdd_version: 7.3.0
---

# Implementation Plan: Nested Projects

## Overview

**Spec:** [SPEC.md](./SPEC.md)

Introduce a Project → Milestones hierarchy with multi-roadmap association, Gantt drill-down, date overage visualization, and a dedicated projects page.

## Affected Components

- Data layer (Mongoose models, migration)
- API layer (Next.js route handlers)
- UI layer (Gantt chart, project forms, new projects page)

## Phases

### Phase 1: Data Model & Migration

**Outcome:** Milestone model created, Project model evolved, existing data migrated.

**Deliverables:**
- New `src/models/milestone.ts` with schema and indexes
- Modified `src/models/project.ts` — `roadmapIds`, `targetEndDate`, `statusOverride` fields; remove `milestones: string[]`
- Migration script to convert existing projects (`roadmapId` → `roadmapIds`, set `targetEndDate`)
- Status derivation utility function (`src/lib/derive-project-status.ts`)

**Files to Create:**
- `src/models/milestone.ts`
- `src/lib/derive-project-status.ts`
- `scripts/migrate-nested-projects.ts`

**Files to Modify:**
- `src/models/project.ts`

---

### Phase 2: API Layer

**Outcome:** All milestone CRUD endpoints working, project endpoints updated for multi-roadmap support.

**Deliverables:**
- Milestone CRUD endpoints (list, create, update, delete, reorder)
- Updated project endpoints to accept `roadmapIds` array
- Updated roadmap projects query to filter by `roadmapIds` array inclusion
- Status derivation triggered on milestone create/update/delete

**Files to Create:**
- `src/app/api/projects/[projectId]/milestones/route.ts`
- `src/app/api/milestones/[milestoneId]/route.ts`
- `src/app/api/milestones/reorder/route.ts`

**Files to Modify:**
- `src/app/api/projects/route.ts`
- `src/app/api/projects/[projectId]/route.ts`
- `src/app/api/roadmaps/[roadmapId]/projects/route.ts`

---

### Phase 3: Gantt Chart Enhancements

**Outcome:** Gantt supports inline milestone expansion, overage visualization, and clipping indicators.

**Deliverables:**
- Click-to-expand project bars showing milestones below
- Milestone bars rendered in lighter shade of parent color (HSL lightness increase)
- Overage section styled with striped/dashed pattern beyond `targetEndDate`
- Clipping indicators ("← N before | N after →") when milestones exist outside roadmap range
- Fetch milestones on expansion (lazy load)

**Files to Modify:**
- Gantt chart component(s) — extend bar rendering, add expansion state, milestone sub-bars
- Project hover/popover — show milestone count and overage info

---

### Phase 4: Project Forms & Multi-Roadmap UI

**Outcome:** Project create/edit forms support milestones and multi-roadmap association.

**Deliverables:**
- Updated project create/edit dialog — multi-select for roadmaps, `targetEndDate` field
- Milestone management UI within project detail (add/edit/delete/reorder milestones)
- Status override toggle in project edit
- Milestone form (title, description, status, assignee, dates)

**Files to Modify:**
- Project create/edit dialog component
- Project detail/popover component

**Files to Create:**
- Milestone form component
- Milestone list component (within project detail)

---

### Phase 5: Projects Page

**Outcome:** Dedicated searchable, filterable projects table page.

**Deliverables:**
- New page route at `/[teamId]/projects`
- Table view with columns: Title, Status, Lead(s), Roadmap(s), Start, End, Milestones count
- Client-side search by title
- Filters: roadmap (multi-select), status, time range (date picker), assignee
- Navigation from sidebar/header

**Files to Create:**
- `src/app/[teamId]/projects/page.tsx`
- Projects table component
- Filter bar component

**Files to Modify:**
- Navigation/sidebar component (add projects page link)

---

### Phase 6: Integration Testing & Verification

**Outcome:** All acceptance criteria verified, no regressions.

**Deliverables:**
- End-to-end testing of full flow: create project → add milestones → view on Gantt → expand → verify overage styling
- Multi-roadmap association verified
- Projects page search and filter verified
- Migration script verified against existing data
- Backward compatibility confirmed (projects with zero milestones work identically to current behavior)

## Dependencies

- None external. All work is within the existing Next.js + MongoDB stack.

## Tests

### Unit Tests
- [ ] `derive-project-status` returns correct status for all milestone combinations
- [ ] `derive-project-status` returns null when no milestones exist
- [ ] `projectedEnd` computation handles milestone dates extending beyond target
- [ ] `projectedEnd` equals `targetEndDate` when no milestones exceed it
- [ ] Status override bypasses derivation when set
- [ ] Status override clearing reverts to derived status

### Integration Tests
- [ ] Milestone CRUD operations (create, read, update, delete, reorder)
- [ ] Project query by `roadmapIds` array inclusion
- [ ] Milestone status change triggers project status recalculation
- [ ] Migration script correctly transforms existing projects
- [ ] Project with zero milestones API behavior unchanged

### E2E Tests
- [ ] Create project → add milestones → verify Gantt expansion with lighter color
- [ ] Overage visualization when milestone extends past target end
- [ ] Multi-roadmap: project appears on both roadmap Gantt views
- [ ] Clipping indicators shown for milestones outside roadmap range
- [ ] Projects page: search by title returns matching results
- [ ] Projects page: filter by roadmap shows only associated projects
- [ ] Projects page: filter by assignee shows matching projects

## Risks

| Risk | Mitigation |
|------|------------|
| Migration breaks existing project display | Run migration on dev first, verify Gantt renders correctly for projects with 0 milestones |
| Gantt performance with many expanded projects | Lazy-load milestones on expand, limit initial render to collapsed state |
| Multi-roadmap queries slower than single ID lookup | Index on `roadmapIds` array field, test with realistic data volume |

## Implementation State

- **Current Phase:** pending
- **Status:** pending
- **Completed Phases:** []
- **Actual Files Changed:** []
- **Blockers:** None
