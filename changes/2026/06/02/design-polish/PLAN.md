# Design Polish: GitHub Aesthetic + Cyan Neon Accents

## Context

The app is functional but visually plain — default shadcn/ui neutral tokens, Geist font, generic gray buttons. The goal is a GitHub dark-mode look (clean, well-spaced, opaque borders, muted surfaces) with subtle cyan/electric blue neon on interactive elements (primary buttons, focus rings, active states). Professional, not flashy.

## Decisions

- **Font**: Inter (sans) + JetBrains Mono (mono) via `next/font/google`
- **Accent**: Cyan `oklch(0.72 0.19 220)` — applied via `--primary` and `--ring` tokens
- **Neon intensity**: Subtle — buttons, focus rings, today marker, utilization bar only
- **Border radius**: Tighter (6px vs current 10px) to match GitHub

---

## Changes

### 1. Font Swap — `src/app/layout.tsx`

Replace Geist imports with Inter + JetBrains Mono:
```tsx
import { Inter, JetBrains_Mono } from "next/font/google";
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"] });
```
Update `<html>` className to use new variable names.

### 2. Color & Token Overhaul — `src/app/globals.css`

Update font references in `@theme inline`:
```css
--font-sans: var(--font-inter);
--font-mono: var(--font-jetbrains-mono);
```

Replace dark-mode token values in `.dark {}`:

| Token | New Value | Notes |
|-------|-----------|-------|
| `--background` | `oklch(0.13 0.005 260)` | GitHub #0d1117 equivalent |
| `--foreground` | `oklch(0.93 0 0)` | Slightly muted white |
| `--card` | `oklch(0.17 0.005 260)` | GitHub #161b22 |
| `--primary` | `oklch(0.72 0.19 220)` | Cyan accent |
| `--primary-foreground` | `oklch(0.13 0.02 220)` | Dark text on cyan |
| `--secondary` | `oklch(0.22 0.005 260)` | GitHub #21262d |
| `--muted` | `oklch(0.20 0.005 260)` | Recessed surfaces |
| `--muted-foreground` | `oklch(0.60 0 0)` | GitHub #7d8590 |
| `--accent` | `oklch(0.22 0.01 260)` | Hover bg |
| `--border` | `oklch(0.35 0.005 260)` | Opaque, GitHub #30363d |
| `--input` | `oklch(0.35 0.005 260)` | Same as border |
| `--ring` | `oklch(0.72 0.19 220)` | Cyan focus rings |
| `--radius` | `0.375rem` | 6px, tighter like GitHub |

Add custom accent property: `--accent-cyan: oklch(0.72 0.19 220);`

Add `@layer components` utility class for inputs:
```css
.input-field {
  @apply w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm
         text-foreground placeholder:text-muted-foreground
         focus:outline-none focus:ring-2 focus:ring-ring/70 focus:border-ring
         transition-colors;
}
```

### 3. Button Polish — `src/components/ui/button.tsx`

Add subtle colored shadow to default variant:
```
"bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20"
```

No other changes needed — button already uses `--primary` token.

### 4. Gantt Today Marker — `src/components/gantt-chart.tsx`

Change today line from `bg-foreground/30` (faint gray 1px) to `bg-primary w-0.5` (cyan 2px).

### 5. Capacity Bar — `src/components/capacity-overview.tsx`

- Replace `bg-green-500` with `bg-primary` (cyan when under budget)
- Replace `bg-red-500` / `text-red-500` with `bg-destructive` / `text-destructive`

### 6. Page-Level Polish (all pages)

- **Inputs**: Replace inline input class strings with `input-field` utility or update to use `bg-muted/50` + `border-border`
- **Section headings**: Add `pb-2 border-b border-border` for GitHub-style visual separation
- **Login page**: Wrap form in `rounded-lg border border-border bg-card p-6` card
- **List items**: Ensure `hover:bg-muted transition-colors` and `rounded-md` (smaller radius)

---

## Files to Modify

1. `src/app/layout.tsx`
2. `src/app/globals.css`
3. `src/components/ui/button.tsx`
4. `src/components/gantt-chart.tsx`
5. `src/components/capacity-overview.tsx`
6. `src/app/login/page.tsx`
7. `src/app/dashboard/page.tsx`
8. `src/app/teams/[teamId]/page.tsx`
9. `src/app/teams/[teamId]/roadmaps/[roadmapId]/page.tsx`

---

## Verification

1. Run `npx tsc --noEmit` — no type errors
2. Run `npm run dev` and check:
   - Login page: card container, cyan "Sign in" button, cyan focus rings on inputs
   - Dashboard: team cards with opaque borders, hover state, Inter font rendering
   - Team detail: section headers with bottom borders, "New Roadmap" button is cyan
   - Roadmap detail: capacity bar is cyan (or red when over-budget), today marker is cyan line
3. Confirm WCAG AA contrast: cyan on dark bg (~7.5:1), dark text on cyan button (~7:1)
