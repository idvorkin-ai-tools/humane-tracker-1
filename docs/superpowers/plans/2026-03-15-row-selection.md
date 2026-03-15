# Row Selection for Backfill Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add row selection (long-press on habit name) that bypasses the date-modification confirmation dialog, complementing the existing column selection feature.

**Architecture:** Replace `selectedDate: Date | null` with a unified `Selection` discriminated union (`column | row | null`). Long-press on habit names triggers row selection. The existing `shouldConfirmDateModification` pure function expands to `shouldConfirmModification` accepting the new selection type and a habitId. Zoom changes clear selection.

**Tech Stack:** React 19, TypeScript, Vitest, date-fns

**Spec:** `docs/superpowers/specs/2026-03-15-row-selection-design.md`

---

## File Structure

| File                                                 | Action | Responsibility                                                                                                                   |
| ---------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `humane-tracker/src/hooks/useHabitTrackerVM.ts`      | Modify | Add `Selection` type, replace `selectedDate` state, update verification logic, add `selectHabit` action, clear selection on zoom |
| `humane-tracker/src/hooks/useHabitTrackerVM.test.ts` | Modify | Update `shouldConfirmDateModification` tests → `shouldConfirmModification` tests with row selection cases                        |
| `humane-tracker/src/components/HabitTracker.tsx`     | Modify | Add long-press on habit names, update column/row highlighting, update title bar display                                          |
| `humane-tracker/src/components/HabitTracker.css`     | Modify | Add `.row-selected` class for habit name cell highlight                                                                          |

---

## Chunk 1: ViewModel — Selection Type and Verification Logic

### Task 1: Update `shouldConfirmModification` pure function (TDD)

**Files:**

- Modify: `humane-tracker/src/hooks/useHabitTrackerVM.ts:28-34`
- Test: `humane-tracker/src/hooks/useHabitTrackerVM.test.ts:624-671`

- [ ] **Step 1: Define the `Selection` type and write failing tests**

Add the type and rename the function in the test file. Add new test cases for row selection.

In `humane-tracker/src/hooks/useHabitTrackerVM.ts`, add the type after line 18 (after imports):

```typescript
// Selection state: column (date header click) or row (habit name long-press)
export type Selection =
  | { type: "column"; date: Date }
  | { type: "row"; habitId: string }
  | null;
```

Replace `shouldConfirmDateModification` (lines 28-34) with the new function AND a backward-compatible wrapper (so `toggleEntry` still compiles until Task 2 updates it):

```typescript
/**
 * Determines if a confirmation dialog should be shown before modifying an entry.
 * Returns true if the date is NOT today AND NOT bypassed by the current selection.
 * Column selection bypasses confirmation for that date.
 * Row selection bypasses confirmation for that habit (and its children if it's a tag).
 */
export function shouldConfirmModification(
  date: Date,
  habitId: string,
  selection: Selection,
  childIdsOfSelectedHabit?: string[],
): boolean {
  if (isToday(date)) return false;
  if (!selection) return true;

  if (selection.type === "column") {
    return !isSameDay(date, selection.date);
  }

  if (selection.type === "row") {
    if (selection.habitId === habitId) return false;
    // If the selected habit is a tag, its children also bypass
    if (childIdsOfSelectedHabit?.includes(habitId)) return false;
    return true;
  }

  return true;
}

/** @deprecated Compatibility wrapper — will be removed in Task 2 */
export function shouldConfirmDateModification(
  date: Date,
  selectedDate: Date | null,
): boolean {
  return shouldConfirmModification(
    date,
    "",
    selectedDate ? { type: "column", date: selectedDate } : null,
  );
}
```

In `humane-tracker/src/hooks/useHabitTrackerVM.test.ts`, replace the entire `describe("shouldConfirmDateModification"` block (lines 624-671) with:

```typescript
describe("shouldConfirmModification", () => {
  it("returns false for today (no confirmation needed)", () => {
    const today = new Date();
    expect(shouldConfirmModification(today, "habit-1", null)).toBe(false);
  });

  it("returns true for yesterday with no selection", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(shouldConfirmModification(yesterday, "habit-1", null)).toBe(true);
  });

  it("returns false when column selection matches the date", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const selection = { type: "column" as const, date: new Date(yesterday) };
    expect(shouldConfirmModification(yesterday, "habit-1", selection)).toBe(
      false,
    );
  });

  it("returns true when column selection does not match the date", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const selection = { type: "column" as const, date: twoDaysAgo };
    expect(shouldConfirmModification(yesterday, "habit-1", selection)).toBe(
      true,
    );
  });

  it("returns false when row selection matches the habit", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const selection = { type: "row" as const, habitId: "habit-1" };
    expect(shouldConfirmModification(yesterday, "habit-1", selection)).toBe(
      false,
    );
  });

  it("returns true when row selection does not match the habit", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const selection = { type: "row" as const, habitId: "habit-2" };
    expect(shouldConfirmModification(yesterday, "habit-1", selection)).toBe(
      true,
    );
  });

  it("returns false for child of selected tag", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const selection = { type: "row" as const, habitId: "parent-tag" };
    expect(
      shouldConfirmModification(yesterday, "child-1", selection, [
        "child-1",
        "child-2",
      ]),
    ).toBe(false);
  });

  it("returns true for non-child of selected tag", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const selection = { type: "row" as const, habitId: "parent-tag" };
    expect(
      shouldConfirmModification(yesterday, "unrelated", selection, [
        "child-1",
        "child-2",
      ]),
    ).toBe(true);
  });

  it("returns false for today even with non-matching selection", () => {
    const today = new Date();
    const selection = { type: "row" as const, habitId: "other-habit" };
    expect(shouldConfirmModification(today, "habit-1", selection)).toBe(false);
  });
});
```

Also update the import at the top of the test file — replace `shouldConfirmDateModification` with `shouldConfirmModification`.

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd humane-tracker && npx vitest run src/hooks/useHabitTrackerVM.test.ts`
Expected: All `shouldConfirmModification` tests PASS

- [ ] **Step 3: Commit**

```bash
git add humane-tracker/src/hooks/useHabitTrackerVM.ts humane-tracker/src/hooks/useHabitTrackerVM.test.ts
git commit -m "feat: add Selection type and shouldConfirmModification function"
```

---

### Task 2: Update ViewModel state and actions

**Files:**

- Modify: `humane-tracker/src/hooks/useHabitTrackerVM.ts:215-541`

- [ ] **Step 1: Replace `selectedDate` with `selection` in the VM interface and state**

In the `HabitTrackerVM` interface (line 224), replace:

```typescript
selectedDate: Date | null;
```

with:

```typescript
selection: Selection;
```

Add a new action to the interface (after line 244):

```typescript
selectHabit: (habitId: string) => void;
```

In the hook body (line 258), replace:

```typescript
const [selectedDate, setSelectedDate] = useState<Date | null>(null);
```

with:

```typescript
const [selection, setSelection] = useState<Selection>(null);
```

- [ ] **Step 2: Update `selectDate` to use `selection`**

Replace `selectDate` callback (lines 429-431):

```typescript
const selectDate = useCallback((date: Date | null) => {
  setSelection(date ? { type: "column", date } : null);
}, []);
```

Add `selectHabit` callback after it:

```typescript
const selectHabit = useCallback((habitId: string) => {
  setSelection((current) => {
    // Toggle off if same habit already selected
    if (current?.type === "row" && current.habitId === habitId) return null;
    return { type: "row", habitId };
  });
}, []);
```

- [ ] **Step 3: Clear selection on zoom in/out**

Update `zoomIn` (line 412-416) — add `setSelection(null)`:

```typescript
const zoomIn = useCallback((category: string) => {
  setZoomedSection(category);
  setSelection(null);
  collapsedSectionsRef.current.delete(category);
  setCollapsedVersion((v) => v + 1);
}, []);
```

Update `zoomOut` (lines 418-427) — add `setSelection(null)`:

```typescript
const zoomOut = useCallback(() => {
  setSelection(null);
  setZoomedSection((current) => {
    if (current) {
      collapsedSectionsRef.current.add(current);
      setCollapsedVersion((v) => v + 1);
    }
    return null;
  });
}, []);
```

- [ ] **Step 4: Update `toggleEntry` to use new `shouldConfirmModification`**

Replace the confirmation check in `toggleEntry` (lines 444-454):

```typescript
const toggleEntry = useCallback(
	async (habitId: string, date: Date) => {
		// Resolve childIds if the selected habit is a tag
		const selectedChildIds =
			selection?.type === "row"
				? habits.find((h) => h.id === selection.habitId)?.childIds
				: undefined;

		if (shouldConfirmModification(date, habitId, selection, selectedChildIds)) {
			const dateStr = format(date, "MMM d");
			if (
				!window.confirm(
					`Are you sure you want to modify entries for ${dateStr}?`,
				)
			) {
				return;
			}
		}
		// ... rest of toggleEntry unchanged
```

Update the dependency array (line 500) — replace `selectedDate` with `selection`:

```typescript
[habits, userId, selection],
```

- [ ] **Step 5: Delete the deprecated `shouldConfirmDateModification` wrapper**

Remove the `shouldConfirmDateModification` compatibility function that was added in Task 1. It's no longer called anywhere.

- [ ] **Step 6: Update the return object**

In the return block (lines 507-541), replace:

```typescript
selectedDate,
```

with:

```typescript
selection,
```

And add `selectHabit` to the actions section:

```typescript
selectHabit,
```

- [ ] **Step 7: Run tests to verify nothing breaks**

Run: `cd humane-tracker && npx vitest run src/hooks/useHabitTrackerVM.test.ts`
Expected: All tests PASS

- [ ] **Step 8: Commit**

```bash
git add humane-tracker/src/hooks/useHabitTrackerVM.ts
git commit -m "feat: replace selectedDate with unified selection state in VM"
```

---

## Chunk 2: Component — Rendering and Interaction

### Task 3: Update HabitTracker.tsx to use `selection` state

**Files:**

- Modify: `humane-tracker/src/components/HabitTracker.tsx`

- [ ] **Step 1: Update all references to `vm.selectedDate`**

In the title bar section (lines 232-241), replace the entire `<span>` block:

```typescript
{vm.zoomedSection ? (
	<>
		{buildCategoryInfo(vm.zoomedSection).name}
		<button className="zoom-back-btn" onClick={vm.zoomOut}>
			← Back
		</button>
	</>
) : (
	<span
		className={`current-day ${vm.selection ? "selected-day" : ""}`}
		onClick={() => vm.selectDate(null)}
		style={{ cursor: vm.selection ? "pointer" : "default" }}
		title={vm.selection ? "Click to return to today" : undefined}
	>
		{(() => {
		const sel = vm.selection;
		if (sel?.type === "column") return format(sel.date, "EEEE, MMM d");
		if (sel?.type === "row") return `Editing: ${vm.habits.find((h) => h.id === sel.habitId)?.name ?? "Unknown"}`;
		return format(new Date(), "EEEE, MMM d");
	})()}
	</span>
)}
```

- [ ] **Step 2: Update column header `isSelected` computation**

In the `<thead>` section (lines 274-298), replace:

```typescript
const isSelected = Boolean(vm.selectedDate && isSameDay(date, vm.selectedDate));
```

with:

```typescript
const isSelected = Boolean(
  vm.selection?.type === "column" && isSameDay(date, vm.selection.date),
);
```

- [ ] **Step 3: Update `handleDateHeaderClick` to clear row selection**

Replace `handleDateHeaderClick` (lines 199-206):

```typescript
const handleDateHeaderClick = (
  date: Date,
  isTodayDate: boolean,
  isSelected: boolean,
) => {
  if (isTodayDate) return;
  vm.selectDate(isSelected ? null : date);
};
```

This already works because `selectDate` sets column selection, which naturally replaces any row selection via the unified state. No changes needed here.

- [ ] **Step 4: Update cell `isSelected` for column highlighting**

In the habit row cell rendering (lines 429-431), replace:

```typescript
const isSelected = Boolean(vm.selectedDate && isSameDay(date, vm.selectedDate));
```

with:

```typescript
const isColumnSelected = Boolean(
  vm.selection?.type === "column" && isSameDay(date, vm.selection.date),
);
const isRowSelected = Boolean(
  vm.selection?.type === "row" &&
    (vm.selection.habitId === habit.id ||
      (vm.habits
        .find((h) => h.id === vm.selection?.habitId)
        ?.childIds?.includes(habit.id) ??
        false)),
);
```

Update the `cellClass` construction (lines 433-443):

```typescript
const cellClass = [
  cellDisplay.className,
  getDateColumnClass("cell", isTodayDate, isColumnSelected),
  isRowSelected ? "cell-selected" : "",
  isTag ? "tag-cell" : "",
]
  .filter(Boolean)
  .join(" ");
```

- [ ] **Step 5: Remove `isSameDay` import if no longer used directly**

Check if `isSameDay` is still used in the component. It's used in the `isSelected` computations which we've updated — but we're still calling `isSameDay` in the new code. Keep the import.

- [ ] **Step 6: Run TypeScript check**

Run: `cd humane-tracker && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add humane-tracker/src/components/HabitTracker.tsx
git commit -m "feat: update HabitTracker to render with unified selection state"
```

---

### Task 4: Add long-press handler for habit names

**Files:**

- Modify: `humane-tracker/src/components/HabitTracker.tsx`

- [ ] **Step 1: Add a long-press handler for habit name cells**

Add a new ref and handlers after the existing `longPressTimer`/`longPressTriggered` refs (around line 46). We'll reuse the existing refs but add a separate handler for habit name long-press since it has different behavior (select row vs. open TagChildPicker).

Add a new ref after line 47:

```typescript
const habitNameLongPressTimer = useRef<ReturnType<typeof setTimeout> | null>(
  null,
);
```

Add cleanup in the existing useEffect (line 50-56):

```typescript
useEffect(() => {
  return () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    if (habitNameLongPressTimer.current) {
      clearTimeout(habitNameLongPressTimer.current);
    }
  };
}, []);
```

Add the habit name long-press handlers after `handleCellPressEnd` (after line 102):

```typescript
const handleHabitNamePressStart = useCallback(
  (habitId: string, event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault();
    habitNameLongPressTimer.current = setTimeout(() => {
      vm.selectHabit(habitId);
    }, 500);
  },
  [vm],
);

const handleHabitNamePressEnd = useCallback(() => {
  if (habitNameLongPressTimer.current) {
    clearTimeout(habitNameLongPressTimer.current);
    habitNameLongPressTimer.current = null;
  }
}, []);
```

- [ ] **Step 2: Attach long-press handlers to the habit name `<td>`**

In the habit row rendering (around line 392), update the `<td className="col-habit">` to include long-press handlers and row-selected class:

```typescript
<td
	className={`col-habit ${
		vm.selection?.type === "row" &&
		(vm.selection.habitId === habit.id ||
			(vm.habits.find((h) => h.id === vm.selection?.habitId)?.childIds?.includes(habit.id) ?? false))
			? "row-selected"
			: ""
	}`}
	onMouseDown={(e) => handleHabitNamePressStart(habit.id, e)}
	onMouseUp={handleHabitNamePressEnd}
	onMouseLeave={handleHabitNamePressEnd}
	onTouchStart={(e) => handleHabitNamePressStart(habit.id, e)}
	onTouchEnd={handleHabitNamePressEnd}
>
```

- [ ] **Step 3: Run TypeScript check**

Run: `cd humane-tracker && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add humane-tracker/src/components/HabitTracker.tsx
git commit -m "feat: add long-press on habit names for row selection"
```

---

### Task 5: Add CSS for row-selected class

**Files:**

- Modify: `humane-tracker/src/components/HabitTracker.css`

- [ ] **Step 1: Add `.row-selected` class**

Add after the `.col-selected` block (after line 280):

```css
/* Selected Row Highlight - amber/gold matching column selection */
.section-row td.row-selected {
  background: linear-gradient(
    90deg,
    rgba(217, 119, 6, 0.2) 0%,
    rgba(217, 119, 6, 0.1) 100%
  );
  border-top: 2px solid var(--color-amber);
  border-bottom: 2px solid var(--color-amber);
  color: var(--color-cream);
  font-weight: 700;
}
```

- [ ] **Step 2: Commit**

```bash
git add humane-tracker/src/components/HabitTracker.css
git commit -m "feat: add row-selected CSS class for habit row highlighting"
```

---

### Task 6: Verify everything works together

- [ ] **Step 1: Run all unit tests**

Run: `cd humane-tracker && npx vitest run`
Expected: All tests PASS

- [ ] **Step 2: Run TypeScript check**

Run: `cd humane-tracker && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run E2E tests (desktop)**

Run: `just e2e-desktop` (from `humane-tracker/` directory)
Expected: All E2E tests pass. The existing column selection E2E tests should still pass since the behavior is unchanged — we just changed the internal state representation.

- [ ] **Step 4: Manual verification in dev server**

Run: `just dev`

Verify:

1. Long-press (hold 500ms) on a habit name → row highlights amber, title shows "Editing: {name}"
2. Click cells in the selected row for past dates → no confirmation dialog
3. Click cells in other rows for past dates → confirmation dialog appears
4. Click a column header → row selection clears, column selection activates
5. Long-press a different habit → switches to that row
6. Long-press same habit again → deselects
7. Click title bar → deselects
8. Zoom in/out → clears selection
9. Column selection still works exactly as before
10. Today's column never needs confirmation regardless of selection

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -p  # Stage only relevant changes
git commit -m "fix: address issues found during manual verification"
```

---

## Cleanup Checklist

After all tasks complete:

- [ ] Remove any `shouldConfirmDateModification` references (should be fully replaced by `shouldConfirmModification`)
- [ ] Verify no TypeScript errors: `npx tsc --noEmit`
- [ ] Verify all tests pass: `npx vitest run`
- [ ] Verify E2E: `just e2e-desktop`
