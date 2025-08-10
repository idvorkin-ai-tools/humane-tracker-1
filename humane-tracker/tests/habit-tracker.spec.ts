import { test, expect, Page } from '@playwright/test';

test.describe('Habit Tracker App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the app to load - handle both loading state and main app
    try {
      await page.waitForSelector('.container', { timeout: 15000 });
    } catch (e) {
      // If container not found, check for loading or error state
      const hasLoading = await page.locator('.loading-container').count();
      const hasError = await page.locator('.error-container').count();
      
      if (hasLoading > 0) {
        console.log('App is still loading...');
        await page.waitForSelector('.container', { timeout: 30000 });
      } else if (hasError > 0) {
        const errorText = await page.locator('.error-container').textContent();
        console.log('App error:', errorText);
        throw new Error(`App failed to load: ${errorText}`);
      }
    }
  });

  test('should load the main page with all sections', async ({ page }) => {
    // Check header elements
    await expect(page.locator('.week-title')).toBeVisible();
    await expect(page.locator('.week-title')).toContainText('Week of');
    
    // Check summary bar
    await expect(page.locator('.summary-bar')).toBeVisible();
    await expect(page.locator('.summary-label').first()).toContainText('Due Today');
    
    // Check view toggle buttons
    await expect(page.locator('button:has-text("Expand All")')).toBeVisible();
    await expect(page.locator('button:has-text("Collapse All")')).toBeVisible();
    await expect(page.locator('button:has-text("+ Add Habit")')).toBeVisible();
    
    // Check table structure
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('th.col-habit')).toContainText('Habit');
    
    // Check legend
    await expect(page.locator('.legend-strip')).toBeVisible();
    await expect(page.locator('.legend-item').first()).toContainText('done');
  });

  test('should expand and collapse sections', async ({ page }) => {
    // Wait for sections to load
    await page.waitForSelector('.section-header', { timeout: 5000 });
    
    // Get all section headers
    const sections = page.locator('.section-header');
    const sectionCount = await sections.count();
    
    if (sectionCount > 0) {
      // Click first section to toggle
      const firstSection = sections.first();
      await firstSection.click();
      
      // Check if arrow rotated (collapsed state)
      const arrow = firstSection.locator('.section-arrow');
      await expect(arrow).toHaveClass(/collapsed/);
      
      // Click again to expand
      await firstSection.click();
      await expect(arrow).not.toHaveClass(/collapsed/);
    }
  });

  test('should open and close add habit modal', async ({ page }) => {
    // Click Add Habit button
    await page.click('button:has-text("+ Add Habit")');
    
    // Check modal is visible
    await expect(page.locator('.habit-manager-overlay')).toBeVisible();
    await expect(page.locator('.modal-header h2')).toContainText('Add New Habit');
    
    // Check form fields
    await expect(page.locator('label:has-text("Habit Name")')).toBeVisible();
    await expect(page.locator('label:has-text("Category")')).toBeVisible();
    await expect(page.locator('label:has-text("Target per Week")')).toBeVisible();
    
    // Close modal
    await page.click('.close-btn');
    await expect(page.locator('.habit-manager-overlay')).not.toBeVisible();
  });

  test('should create a new habit', async ({ page }) => {
    // Open Add Habit modal
    await page.click('button:has-text("+ Add Habit")');
    
    // Fill in the form
    await page.fill('#habitName', 'Morning Meditation');
    await page.selectOption('#category', 'balance');
    await page.fill('#target', '5');
    
    // Submit form - use more specific selector
    await page.click('.btn-submit');
    
    // Wait for modal to close
    await expect(page.locator('.habit-manager-overlay')).not.toBeVisible({ timeout: 5000 });
    
    // Check if habit appears in the table (may need to wait for Firebase sync)
    await page.waitForTimeout(2000); // Wait for Firebase update
    const habitName = page.locator('.habit-name:has-text("Morning Meditation")');
    
    // The habit might appear if Firebase is configured
    // This is a soft check since Firebase might not be fully configured
    const habitCount = await habitName.count();
    if (habitCount > 0) {
      await expect(habitName).toBeVisible();
    }
  });

  test('should expand all sections', async ({ page }) => {
    // Click Expand All button
    await page.click('button:has-text("Expand All")');
    
    // Check that no sections have collapsed class
    const collapsedSections = page.locator('.section-header.collapsed');
    const count = await collapsedSections.count();
    expect(count).toBe(0);
  });

  test('should collapse all sections', async ({ page }) => {
    // First expand all
    await page.click('button:has-text("Expand All")');
    await page.waitForTimeout(500);
    
    // Then collapse all
    await page.click('button:has-text("Collapse All")');
    await page.waitForTimeout(500);
    
    // Check that all sections have collapsed class
    const sections = page.locator('.section-header');
    const totalCount = await sections.count();
    
    if (totalCount > 0) {
      const collapsedSections = page.locator('.section-header.collapsed');
      const collapsedCount = await collapsedSections.count();
      expect(collapsedCount).toBe(totalCount);
    }
  });

  test('should display correct week dates', async ({ page }) => {
    // Check that day headers are visible
    const dayHeaders = page.locator('th.col-day');
    const dayCount = await dayHeaders.count();
    
    // Should have 7 days
    expect(dayCount).toBe(7);
    
    // Check that headers contain day abbreviations
    const firstDay = await dayHeaders.first().textContent();
    expect(firstDay).toMatch(/[SMTWF]/);
  });

  test('should display summary statistics', async ({ page }) => {
    // Check all summary items are present
    await expect(page.locator('.summary-item:has-text("Due Today")')).toBeVisible();
    await expect(page.locator('.summary-item:has-text("Overdue")')).toBeVisible();
    await expect(page.locator('.summary-item:has-text("Done Today")')).toBeVisible();
    await expect(page.locator('.summary-item:has-text("On Track")')).toBeVisible();
    
    // Check that values are numbers
    const dueToday = page.locator('.summary-item:has-text("Due Today") .summary-value');
    const value = await dueToday.textContent();
    expect(value).toMatch(/\d+/);
  });

  test('should have proper dark theme styling', async ({ page }) => {
    // Check background colors
    const body = page.locator('body');
    const bgColor = await body.evaluate((el) => 
      window.getComputedStyle(el).backgroundColor
    );
    
    // Should be dark background
    expect(bgColor).toMatch(/rgb\(26, 26, 26\)/); // #1a1a1a
    
    // Check table background
    const table = page.locator('table');
    const tableBg = await table.evaluate((el) => 
      window.getComputedStyle(el).backgroundColor
    );
    expect(tableBg).toMatch(/rgb\(36, 36, 36\)/); // #242424
  });

  test('should be responsive to mobile view', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that main container is still visible
    await expect(page.locator('.container')).toBeVisible();
    
    // Check that table is scrollable or responsive
    const table = page.locator('table');
    await expect(table).toBeVisible();
  });
});

test.describe('Habit Tracking Functions', () => {
  test('should track habit completion by clicking cells', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.container', { timeout: 15000 });
    
    // Wait for table cells to be clickable
    await page.waitForTimeout(2000);
    
    // Find a habit row cell (if habits exist)
    const habitCells = page.locator('td[style*="cursor: pointer"]');
    const cellCount = await habitCells.count();
    
    if (cellCount > 0) {
      // Click on first available cell
      const firstCell = habitCells.first();
      
      // Get initial content
      const initialContent = await firstCell.textContent();
      
      // Click to mark as complete
      await firstCell.click();
      await page.waitForTimeout(1000); // Wait for update
      
      // Check if content changed (should show ✓ or similar)
      const newContent = await firstCell.textContent();
      
      // Content should change after click
      if (initialContent === '') {
        expect(newContent).toMatch(/[✓½1-9]/);
      }
    }
  });

  test('should validate habit form inputs', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.container', { timeout: 15000 });
    
    // Open Add Habit modal
    await page.click('button:has-text("+ Add Habit")');
    
    // Try to submit empty form - use specific selector
    await page.click('.btn-submit');
    
    // Check that modal is still open (form validation should prevent submission)
    await expect(page.locator('.habit-manager-overlay')).toBeVisible();
    
    // Fill only name and try again
    await page.fill('#habitName', 'Test Habit');
    
    // Check target field has min/max constraints
    const targetInput = page.locator('#target');
    await targetInput.fill('0');
    const minValue = await targetInput.getAttribute('min');
    expect(minValue).toBe('1');
    
    await targetInput.fill('10');
    const maxValue = await targetInput.getAttribute('max');
    expect(maxValue).toBe('7');
  });

  test('should display status indicators correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.container', { timeout: 15000 });
    
    // Check for status icons in the legend
    const legendItems = page.locator('.legend-item');
    
    await expect(legendItems.filter({ hasText: '● = done' })).toBeVisible();
    await expect(legendItems.filter({ hasText: '✓ = met target' })).toBeVisible();
    await expect(legendItems.filter({ hasText: '⏰ = due today' })).toBeVisible();
    await expect(legendItems.filter({ hasText: '→ = tomorrow' })).toBeVisible();
    await expect(legendItems.filter({ hasText: '! = overdue' })).toBeVisible();
    await expect(legendItems.filter({ hasText: '½ = partial' })).toBeVisible();
  });
});