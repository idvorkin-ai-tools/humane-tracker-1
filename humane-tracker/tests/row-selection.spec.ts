import { test, expect } from "@playwright/test";
import { clearIndexedDB } from "./helpers/indexeddb-helpers";

test.describe("Row Selection", () => {
	const TEST_USER_ID = "anonymous";

	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		await page.waitForLoadState("networkidle");

		// Create test habits in two categories
		await page.evaluate(async (userId) => {
			const { habitService } = await import("/src/services/habitService.ts");
			await habitService.bulkCreateHabits([
				{
					userId,
					name: "Physical Mobility",
					category: "Mobility",
					targetPerWeek: 5,
					order: 0,
				},
				{
					userId,
					name: "Box Breathing",
					category: "Emotional Health",
					targetPerWeek: 3,
					order: 1,
				},
			]);
		}, TEST_USER_ID);

		await page.waitForSelector("table", { timeout: 15000 });

		// Expand all sections so habit rows are visible
		const expandButton = page.locator('button:has-text("Expand All")');
		if (await expandButton.isVisible()) {
			await expandButton.click();
			await page.waitForTimeout(200);
		}
		await expect(page.locator("tr.section-row").first()).toBeVisible();
	});

	test.afterEach(async ({ page }) => {
		await clearIndexedDB(page);
	});

	test("long-press on habit name selects the row with amber highlight", async ({
		page,
	}) => {
		const firstHabitRow = page.locator("tr.section-row").first();
		const habitNameCell = firstHabitRow.locator("td.col-habit");

		// Long-press the habit name (hold for 600ms to exceed 500ms threshold)
		await habitNameCell.dispatchEvent("mousedown");
		await page.waitForTimeout(600);
		await habitNameCell.dispatchEvent("mouseup");

		// Verify the habit name cell has row-selected class
		await expect(habitNameCell).toHaveClass(/row-selected/);

		// Verify data cells in the row have cell-selected class
		const selectedCells = firstHabitRow.locator("td.cell-selected");
		const count = await selectedCells.count();
		expect(count).toBeGreaterThan(0);
	});

	test("title bar shows 'Editing: {name}' when row is selected", async ({
		page,
	}) => {
		const firstHabitRow = page.locator("tr.section-row").first();
		const habitNameCell = firstHabitRow.locator("td.col-habit");

		// Long-press to select
		await habitNameCell.dispatchEvent("mousedown");
		await page.waitForTimeout(600);
		await habitNameCell.dispatchEvent("mouseup");

		// Title should show "Editing: Physical Mobility"
		const title = page.locator(".week-title .current-day, .week-title .selected-day");
		await expect(title).toContainText("Editing:");
	});

	test("row selection bypasses confirmation dialog for past dates", async ({
		page,
	}) => {
		let dialogShown = false;
		page.on("dialog", async (dialog) => {
			dialogShown = true;
			await dialog.dismiss();
		});

		const firstHabitRow = page.locator("tr.section-row").first();
		const habitNameCell = firstHabitRow.locator("td.col-habit");

		// Long-press to select the row
		await habitNameCell.dispatchEvent("mousedown");
		await page.waitForTimeout(600);
		await habitNameCell.dispatchEvent("mouseup");
		await page.waitForTimeout(100);

		// Click a past date cell in the selected row — should NOT show dialog
		const cells = firstHabitRow.locator("td");
		const oldDateCell = cells.nth(5); // 3 days ago
		await oldDateCell.click();
		await page.waitForTimeout(300);

		expect(dialogShown).toBe(false);
	});

	test("unselected rows still show confirmation dialog for past dates", async ({
		page,
	}) => {
		let dialogShown = false;
		page.on("dialog", async (dialog) => {
			dialogShown = true;
			await dialog.dismiss();
		});

		const habitRows = page.locator("tr.section-row");
		const firstRow = habitRows.first();
		const secondRow = habitRows.nth(1);
		const firstHabitNameCell = firstRow.locator("td.col-habit");

		// Select the first row
		await firstHabitNameCell.dispatchEvent("mousedown");
		await page.waitForTimeout(600);
		await firstHabitNameCell.dispatchEvent("mouseup");
		await page.waitForTimeout(100);

		// Click a past date cell in the SECOND row — should show dialog
		const cells = secondRow.locator("td");
		const oldDateCell = cells.nth(5);
		await oldDateCell.click();
		await page.waitForTimeout(500);

		expect(dialogShown).toBe(true);
	});

	test("long-press same habit again deselects the row", async ({ page }) => {
		const firstHabitRow = page.locator("tr.section-row").first();
		const habitNameCell = firstHabitRow.locator("td.col-habit");

		// Select
		await habitNameCell.dispatchEvent("mousedown");
		await page.waitForTimeout(600);
		await habitNameCell.dispatchEvent("mouseup");
		await expect(habitNameCell).toHaveClass(/row-selected/);

		// Deselect by long-pressing again
		await habitNameCell.dispatchEvent("mousedown");
		await page.waitForTimeout(600);
		await habitNameCell.dispatchEvent("mouseup");

		await expect(habitNameCell).not.toHaveClass(/row-selected/);
		await expect(page.locator("tr.section-row td.cell-selected")).toHaveCount(0);
	});

	test("clicking title bar deselects the row", async ({ page }) => {
		const firstHabitRow = page.locator("tr.section-row").first();
		const habitNameCell = firstHabitRow.locator("td.col-habit");

		// Select
		await habitNameCell.dispatchEvent("mousedown");
		await page.waitForTimeout(600);
		await habitNameCell.dispatchEvent("mouseup");
		await expect(habitNameCell).toHaveClass(/row-selected/);

		// Click title bar to deselect
		const title = page.locator(".week-title .current-day, .week-title .selected-day");
		await title.click();
		await page.waitForTimeout(300);

		await expect(habitNameCell).not.toHaveClass(/row-selected/);
	});

	test("column selection clears row selection (mutually exclusive)", async ({
		page,
	}) => {
		const firstHabitRow = page.locator("tr.section-row").first();
		const habitNameCell = firstHabitRow.locator("td.col-habit");

		// Select a row
		await habitNameCell.dispatchEvent("mousedown");
		await page.waitForTimeout(600);
		await habitNameCell.dispatchEvent("mouseup");
		await expect(habitNameCell).toHaveClass(/row-selected/);

		// Click a column header to select a column
		const dayHeaders = page.locator("th.col-day");
		const secondDayHeader = dayHeaders.nth(1);
		await secondDayHeader.click();
		await page.waitForTimeout(300);

		// Row should be deselected
		await expect(habitNameCell).not.toHaveClass(/row-selected/);

		// Column should be selected
		await expect(secondDayHeader).toHaveClass(/col-selected/);
	});

	test("zoom clears row selection", async ({ page }) => {
		const firstHabitRow = page.locator("tr.section-row").first();
		const habitNameCell = firstHabitRow.locator("td.col-habit");

		// Select a row
		await habitNameCell.dispatchEvent("mousedown");
		await page.waitForTimeout(600);
		await habitNameCell.dispatchEvent("mouseup");
		await expect(habitNameCell).toHaveClass(/row-selected/);

		// Zoom into a section
		const zoomBtn = page.locator(".zoom-btn").first();
		await zoomBtn.click();
		await page.waitForTimeout(300);

		// Row selection should be cleared
		await expect(page.locator("td.row-selected")).toHaveCount(0);
	});
});
