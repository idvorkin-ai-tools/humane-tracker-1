# Row Selection for Backfill Verification Bypass

**Date:** 2026-03-15
**Status:** Approved

## Problem

The habit tracker has a verification dialog that confirms edits to non-today dates, preventing accidental modifications. Users can bypass this by selecting a column (clicking a date header), which highlights it amber and allows free editing. However, the common backfill workflow — filling in a single habit across multiple past dates — has no equivalent bypass. Users must confirm each cell individually, which is tedious.

## Solution

Add row selection via long-press on habit names. When a row is selected, all cells in that row skip the verification dialog, mirroring the existing column selection behavior.

## Design Decisions

### Unified Selection State

Replace `selectedDate: Date | null` with a discriminated union:

```typescript
type Selection =
  | { type: "column"; date: Date }
  | { type: "row"; habitId: string }
  | null;
```

Row and column selection are **mutually exclusive** — selecting one clears the other. This is enforced structurally by the single state variable, not by coordination logic.

### Verification Logic

`shouldConfirmDateModification(date, selectedDate)` becomes:

```typescript
shouldConfirmModification(date: Date, habitId: string, selection: Selection): boolean
```

Returns `false` (no confirmation needed) when:

- The date is today
- `selection.type === 'column'` and the date matches `selection.date`
- `selection.type === 'row'` and the habitId matches `selection.habitId`

### Tag Row Selection

Tags (habits with `childIds`) are selectable rows. When a tag row is selected:

- The tag's own aggregate row bypasses verification
- All child habit rows also bypass verification
- Child rows get `.cell-selected` highlighting even if they are nested/indented
- If the tag is collapsed (children hidden), selecting it still applies — expanding the tag will show already-selected children
- Child habits can also be independently row-selected (selects only that child, not siblings or parent)

### Title Bar Display

When a row is selected, the title bar shows "Editing: {habit name}" (e.g., "Editing: Sleep"). This mirrors how column selection shows the selected date in the title. Clicking the title bar clears the selection and returns to the default today display.

### Interaction Design

**Activation:** Long-press (500ms) on a habit name/label in the leftmost column. This avoids conflicting with existing click behavior and matches the existing long-press pattern (TagChildPicker uses long-press on tag cells).

**Deselection** — any of these clears the selection:

- Long-press the same habit name again (toggle off)
- Click a column header (switches to column selection)
- Long-press a different habit name (switches to that row)
- Zoom in or out (section zoom changes)
- Click the title bar (existing "return to today" action)

### Visual Feedback

Reuse the existing amber/gold highlight palette:

- Habit name cell gets `.row-selected` class (amber background matching `.col-selected`)
- All data cells in the selected row get `.cell-selected` class (already exists for column selection)

This provides consistent visual language — amber means "selected, confirmation bypassed."

## Files to Modify

1. **`humane-tracker/src/hooks/useHabitTrackerVM.ts`**

   - Replace `selectedDate: Date | null` with `selection: Selection`
   - Rename/expand `shouldConfirmDateModification` → `shouldConfirmModification`
   - Add `selectHabit(habitId: string)` callback
   - Clear selection (`setSelection(null)`) in `zoomIn()` and `zoomOut()`
   - Update `selectDate()` to use new selection type

2. **`humane-tracker/src/components/HabitTracker.tsx`**

   - Add long-press handler on habit name cells
   - Apply `.row-selected` class to habit name when row is selected
   - Apply `.cell-selected` class to data cells in selected row
   - Update column selection rendering to read from `selection` state

3. **`humane-tracker/src/components/HabitTracker.css`**

   - Add `.row-selected` class using existing amber palette

4. **`humane-tracker/src/hooks/useHabitTrackerVM.test.ts`**
   - Update `shouldConfirmDateModification` tests for new signature
   - Add test cases for row selection bypass

## Not in Scope

- External data source imports (e.g., sleep tracker sync) — future feature
- Pinch/pull gestures for zoom
- Changes to TagChildPicker long-press behavior (different interaction target: tag cells vs. habit names)
