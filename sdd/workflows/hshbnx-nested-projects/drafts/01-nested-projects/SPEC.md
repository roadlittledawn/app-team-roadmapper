---
title: Nested Projects
spec_type: tech
type: feature
status: draft
domain: Roadmap Planning
created: 2026-06-03
updated: 2026-06-03
sdd_version: 7.3.0
---

# Feature: Nested Projects

## Overview

### Background

Projects are currently flat objects on a roadmap's Gantt chart. For medium-to-large efforts that span multiple phases (investigation, experiment, implementation, review, production readiness), there's no way to represent the iterative breakdown or track progress toward completion at a sub-project level.

### Current State

- `Project` model has a single `roadmapId` (one roadmap only)
- `milestones` field is `string[]` (free-text labels, not structured objects)
- Gantt chart renders one bar per project with no drill-down
- No dedicated project list/search page exists

### Goal

Introduce a **Project → Milestones** hierarchy where a Project is the parent body of work and Milestones are discrete deliverables within it, each with independent status, assignee, and timeline. Support multi-roadmap association, inline Gantt drill-down, date overage visualization, and a searchable project list page.

## Domain Concepts

**New concepts introduced:**

- **Milestone**: A discrete unit of work within a Project, with its own title, description, status, assignee, and start/end dates. Milestones are custom and flexible — no fixed templates.
- **Target End Date**: The original planned completion date for a Project, set at creation time.
- **Projected End Date**: Computed as `max(targetEnd, latestMilestoneEnd)`. When milestones push past target, this reflects the actual expected completion.
- **Status Derivation**: A Project's status is auto-derived from its milestones' statuses (with ability to manually override).

**Modified concepts:**

- **Project**: Evolves from a flat entity to a parent container. Now supports multiple roadmap associations and contains zero or more Milestones.

## User Stories

### Project Hierarchy
- As a user, I want to add milestones to a project so that I can break large efforts into trackable phases
- As a user, I want each milestone to have its own status, assignee, and timeline so that I can track progress independently
- As a user, I want to add or remove milestones at any time so that the breakdown can evolve as the project progresses
- As a user, I want a project to work with zero milestones so that small projects don't require unnecessary breakdown

### Status Management
- As a user, I want project status to auto-derive from milestone statuses so that I don't have to manually update parent status
- As a user, I want to manually override project status when the auto-derived status doesn't reflect reality

### Multi-Roadmap
- As a user, I want to associate a project with multiple roadmaps so that long-running projects appear on each relevant planning period
- As a user, I want each roadmap view to clip the project to its date range so that I only see what's relevant to that period

### Gantt Visualization
- As a user, I want to click a project bar on the Gantt chart to expand milestones inline below it so that I can see the detailed breakdown without navigating away
- As a user, I want milestone bars to use a lighter shade of the parent project's color so that the relationship is visually clear
- As a user, I want to see overage beyond the target end date as a visually distinct section (e.g., striped/dashed) so that I know when a project is running long
- As a user, I want clipping indicators on the Gantt (e.g., "← 2 milestones before | 3 milestones after →") when milestones exist outside the roadmap's date range

### Projects Page
- As a user, I want a dedicated page listing all projects in a table format so that I can view and manage projects across roadmaps
- As a user, I want to search projects by title so that I can quickly find what I'm looking for
- As a user, I want to filter projects by roadmap, status, time range, and assignee so that I can focus on relevant work

## Functional Requirements

### FR1: Milestone Model
- Each milestone has: title, description, statusId, assignee, plannedStart, plannedEnd
- Milestones reference the same `ProjectStatus` collection as projects
- Milestones are stored as a separate collection with a reference to parent project (not embedded subdocuments) to support independent querying and filtering
- Milestones can be created, updated, reordered, and deleted at any time

### FR2: Project Model Evolution
- Replace `roadmapId: ObjectId` with `roadmapIds: ObjectId[]` for multi-roadmap support
- Replace `milestones: string[]` with relationship to Milestone collection
- Add `targetEndDate: Date` field (original planned end, immutable after creation unless explicitly edited)
- Rename existing `plannedEnd` to serve as the dynamic projected end, or add `projectedEnd` as a virtual/computed field
- Add `statusOverride: ObjectId | null` — when set, project uses this status instead of auto-derived
- Existing projects migrate cleanly: `roadmapId` → `roadmapIds: [roadmapId]`, `milestones: []` cleared, `targetEndDate` set to current `plannedEnd`

### FR3: Status Auto-Derivation
Logic (when `statusOverride` is null):
- All milestones in "Done" → Project is "Done"
- Any milestone in "In Progress" → Project is "In Progress"
- Any milestone in "Blocked" → Project is "Blocked"
- All milestones in "Draft" → Project is "Draft"
- Mix of "Done" and other non-active → Project is "In Progress"
- No milestones → use manually set status (no derivation possible)

Priority order for conflicts: Blocked > In Progress > Needs Review > Ready > Draft > Done

### FR4: Date Overage Computation
- `projectedEnd = max(targetEndDate, max(milestone.plannedEnd for all milestones))`
- If `projectedEnd > targetEndDate`, the project is in overage
- Gantt bar extends to `projectedEnd`, with the section beyond `targetEndDate` styled distinctly (striped/dashed pattern)

### FR5: Multi-Roadmap Association
- Projects have `roadmapIds: ObjectId[]` — can belong to multiple roadmaps
- Roadmap view filters projects by `roadmapIds.includes(currentRoadmapId)`
- Project bars are clipped to roadmap date range (start/end)
- Milestones outside roadmap date range are hidden but indicated with edge markers

### FR6: Gantt Inline Expansion
- Click project bar → expand/collapse milestone bars below it
- Milestone bars rendered with lighter shade (increase HSL lightness or reduce opacity)
- Expansion state is UI-only (not persisted)
- Milestone bars are positioned within the project's time range on the chart

### FR7: Clipping Indicators
- When a project's milestones exist outside the visible roadmap range, show indicators at the edges
- Format: "← N before" on the left edge, "N after →" on the right edge
- If adjacent roadmap exists for those dates, link to it (best-effort, not required for MVP)

### FR8: Projects Page
- Route: `/[teamId]/projects` or similar
- Table columns: Title, Status, Lead(s), Roadmap(s), Start, End, Milestones count
- Search: filter by title (client-side for now, server if needed)
- Filters: roadmap (multi-select), status, time range (date picker), assignee
- Click row → navigate to project detail or expand inline

## Non-Functional Requirements

- **Performance**: No strict latency requirements. Page loads should feel fast (< 1s) for up to ~100 projects with ~10 milestones each.
- **Backward Compatibility**: Existing projects must continue to work with zero milestones. Migration should be non-breaking.
- **Simplicity**: Keep milestone structure flexible and minimal — no templates, no mandatory fields beyond title and dates.

## Technical Design

### Data Model Changes

**New Collection: `Milestone`**
```
{
  _id: ObjectId,
  projectId: ObjectId (ref: Project),
  title: String (required),
  description: String (default: ""),
  statusId: ObjectId (ref: ProjectStatus),
  assignee: String (default: ""),
  plannedStart: Date (required),
  plannedEnd: Date (required),
  order: Number (for display ordering),
  createdAt: Date,
  updatedAt: Date
}
Indexes: { projectId: 1, order: 1 }
```

**Modified Collection: `Project`**
```
Changes:
- roadmapId: ObjectId         → roadmapIds: [ObjectId] (required, min 1)
- milestones: [String]        → REMOVED (milestones are separate collection)
+ targetEndDate: Date         (set from plannedEnd at creation, editable)
+ statusOverride: ObjectId | null (ref: ProjectStatus, default: null)
```

### API Changes

**New endpoints:**
- `GET /api/projects/[projectId]/milestones` — list milestones for a project
- `POST /api/projects/[projectId]/milestones` — create milestone
- `PUT /api/milestones/[milestoneId]` — update milestone
- `DELETE /api/milestones/[milestoneId]` — delete milestone
- `PUT /api/milestones/reorder` — reorder milestones within a project

**Modified endpoints:**
- `GET /api/roadmaps/[roadmapId]/projects` — update query to use `roadmapIds` array
- `POST /api/projects` — accept `roadmapIds` array, set `targetEndDate`
- `PUT /api/projects/[projectId]` — support `roadmapIds`, `statusOverride`, `targetEndDate`

**New page route:**
- `GET /[teamId]/projects` — projects list page

### Status Derivation Algorithm

```
function deriveStatus(milestones, statuses):
  if milestones.length === 0: return null (use manual)

  statusLabels = milestones.map(m => getStatusLabel(m.statusId))

  if all "Done": return "Done"
  if any "Blocked": return "Blocked"
  if any "In Progress": return "In Progress"
  if any "Needs Review": return "Needs Review"
  if any "Ready": return "Ready"
  return "Draft"
```

## Acceptance Criteria

### Milestones
- [ ] **AC1:** Given a project, when user adds a milestone with title, dates, status, and assignee, then it appears in the project's milestone list
- [ ] **AC2:** Given a project with milestones, when user reorders them, then the new order persists
- [ ] **AC3:** Given a project with milestones, when user deletes a milestone, then it is removed and project dates/status recalculate
- [ ] **AC4:** Given a project with no milestones, when viewed, then it displays and functions identically to current behavior

### Status Derivation
- [ ] **AC5:** Given a project with milestones in mixed states, when any milestone status changes, then project status auto-updates per derivation rules
- [ ] **AC6:** Given a project with `statusOverride` set, when milestone statuses change, then project status remains at the override value
- [ ] **AC7:** Given a project with `statusOverride` set, when user clears the override, then status reverts to auto-derived

### Date Overage
- [ ] **AC8:** Given a project whose latest milestone `plannedEnd` exceeds `targetEndDate`, when viewed on Gantt, then the bar extends with a visually distinct overage section
- [ ] **AC9:** Given a project with no overage, when viewed on Gantt, then no overage styling is shown

### Multi-Roadmap
- [ ] **AC10:** Given a project associated with two roadmaps, when viewing either roadmap, then the project appears on both
- [ ] **AC11:** Given a project spanning Jan–June on a Feb–April roadmap, when viewed, then the bar is clipped to Feb–April with clipping indicators

### Gantt Drill-Down
- [ ] **AC12:** Given a project with milestones on the Gantt, when user clicks the project bar, then milestones expand inline below with lighter color
- [ ] **AC13:** Given an expanded project, when user clicks again, then milestones collapse

### Clipping Indicators
- [ ] **AC14:** Given a project with milestones outside the roadmap range, when expanded on Gantt, then indicators show count of hidden milestones on each side

### Projects Page
- [ ] **AC15:** Given the projects page, when loaded, then all projects display in a table with key columns
- [ ] **AC16:** Given the projects page, when user searches by title, then results filter in real-time
- [ ] **AC17:** Given the projects page, when user applies filters (roadmap, status, assignee, date range), then only matching projects show

### Migration
- [ ] **AC18:** Given existing projects with single `roadmapId`, after migration, then they have `roadmapIds: [originalId]` and continue to display correctly

## Migration / Rollback

### Migration Strategy
1. Add `roadmapIds` field to Project schema (coexist with `roadmapId` temporarily)
2. Run migration script: for each project, set `roadmapIds: [roadmapId]`, set `targetEndDate: plannedEnd`
3. Remove old `roadmapId` field and `milestones: string[]` field from schema
4. Create Milestone collection and indexes

### Rollback
- If rollback needed: re-add `roadmapId` field, set from `roadmapIds[0]`
- Milestones collection can be dropped
- No data loss since milestones are additive

## Out of Scope

- Milestone templates or presets
- Drag-and-drop milestone reordering on Gantt
- Milestone dependencies (blocking relationships between milestones)
- Time tracking or actuals vs. estimates
- Tags or team fields on projects
- Server-side search/pagination (client-side sufficient at current scale)
- Auto-linking to adjacent roadmaps in clipping indicators (nice-to-have, not required)

## Dependencies

### Internal
- Existing `ProjectStatus` collection (reused for milestone statuses)
- Existing Gantt chart component (extended with expansion and overage styling)
- Existing project API routes (modified for `roadmapIds`)

### External
- None

## Requirements Discovery

### Solicitation Phase

| # | Question | Answer | Source |
|---|----------|--------|--------|
| 1 | What's the parent/child naming? | Project → Milestones. "Project" is methodology-neutral, "Milestones" allows independent states without implying strict order. | User decision |
| 2 | Can milestones have independent status? | Yes, each milestone has its own status. A project may have 3 milestones in different states. | User |
| 3 | Are milestones from a template or custom? | Custom and flexible for now. No templates. | User |
| 4 | Can milestones have different assignees? | Yes, milestones may have different assignees than parent project owner. | User |
| 5 | Can milestones be added at any time? | Yes, any time regardless of project state. | User |
| 6 | Should project status auto-derive or be manual? | Auto-derive with ability to manually override. | User |
| 7 | Gantt drill-down: inline or separate page? | Inline expansion below parent bar. Milestone bars in lighter shade of parent color. | User |
| 8 | How to handle date overage? | Show target end date vs projected end. Overage section visually distinct (striped/dashed). Parent extends to cover all milestones. | User |
| 9 | Multi-roadmap clipping behavior? | Clip to roadmap date range. Show indicators for milestones outside range. | User |
| 10 | Can a project have zero milestones? | Yes, small projects don't need breakdown. | User |
| 11 | Project list filters? | Roadmap, status, time range, assignee. No team/tags for now. | User |
| 12 | Evolve existing model or new entity? | Evolve existing Project model. User will update existing projects. | User |

### Open Questions (BLOCKING)

| # | Question | Status | Blocker For |
|---|----------|--------|-------------|
| — | None | — | — |

## Testing Strategy

### Unit Tests
| Test | Covers |
|------|--------|
| Status derivation logic with various milestone combinations | FR3 |
| Projected end date computation | FR4 |
| Migration script correctness | FR2 |

### Integration Tests
| Test | Covers |
|------|--------|
| Milestone CRUD API operations | FR1 |
| Multi-roadmap project querying | FR5 |
| Project API backward compatibility (zero milestones) | FR2 |

### E2E Tests
| Test | Covers |
|------|--------|
| Create project → add milestones → verify Gantt expansion | FR6, AC12 |
| Overage visualization on Gantt | FR4, AC8 |
| Projects page search and filter | FR8, AC15-17 |
| Multi-roadmap project visibility | FR5, AC10-11 |

## References

- Existing project model: `src/models/project.ts`
- Existing status model: `src/models/project-status.ts`
- Existing roadmap model: `src/models/roadmap.ts`
