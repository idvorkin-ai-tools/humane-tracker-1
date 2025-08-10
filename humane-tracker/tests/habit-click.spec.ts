import { test, expect } from '@playwright/test';

test.describe('Habit Tracker Click Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the app
    await page.goto('http://localhost:3001');
    
    // Wait for the app to load
    await page.waitForLoadState('networkidle');
    
    // Check if we need to sign in
    const signInButton = page.locator('button:has-text("Sign in with Google")');
    if (await signInButton.isVisible()) {
      console.log('Need to sign in first - skipping test');
      test.skip();
    }
    
    // Wait for habit tracker to be visible
    await page.waitForSelector('.container', { timeout: 10000 });
  });

  test('clicking on habit cells cycles through values', async ({ page }) => {
    // Wait for the table to load
    await page.waitForSelector('table');
    
    // Find a habit row - let's use the first one we can find
    const firstHabitRow = page.locator('tr.section-row').first();
    
    // Wait for it to be visible
    await expect(firstHabitRow).toBeVisible();
    
    // Get the habit name for logging
    const habitName = await firstHabitRow.locator('.habit-name').textContent();
    console.log('Testing with habit:', habitName);
    
    // Find the cell for today (rightmost day cell)
    const todayCell = firstHabitRow.locator('td').nth(-2); // -2 because last is total
    
    // Get initial content
    const initialContent = await todayCell.textContent();
    console.log('Initial cell content:', initialContent);
    
    // Click to add first entry (should show ✓ or 1)
    await todayCell.click();
    await page.waitForTimeout(1000); // Wait for Firebase update
    
    let content = await todayCell.textContent();
    console.log('After 1st click:', content);
    expect(content).toMatch(/[✓1]/);
    
    // Click again (should show 2)
    await todayCell.click();
    await page.waitForTimeout(1000);
    
    content = await todayCell.textContent();
    console.log('After 2nd click:', content);
    expect(content).toBe('2');
    
    // Click again (should show 3)
    await todayCell.click();
    await page.waitForTimeout(1000);
    
    content = await todayCell.textContent();
    console.log('After 3rd click:', content);
    expect(content).toBe('3');
    
    // Click again (should show 4)
    await todayCell.click();
    await page.waitForTimeout(1000);
    
    content = await todayCell.textContent();
    console.log('After 4th click:', content);
    expect(content).toBe('4');
    
    // Click again (should show 5)
    await todayCell.click();
    await page.waitForTimeout(1000);
    
    content = await todayCell.textContent();
    console.log('After 5th click:', content);
    expect(content).toBe('5');
    
    // Click again (should show ½)
    await todayCell.click();
    await page.waitForTimeout(1000);
    
    content = await todayCell.textContent();
    console.log('After 6th click:', content);
    expect(content).toBe('½');
    
    // Click again (should be empty)
    await todayCell.click();
    await page.waitForTimeout(1000);
    
    content = await todayCell.textContent();
    console.log('After 7th click (should be empty):', content);
    expect(content?.trim()).toBe('');
  });

  test('clicking on old dates shows confirmation', async ({ page }) => {
    // Set up dialog handler
    let dialogShown = false;
    page.on('dialog', async dialog => {
      console.log('Dialog message:', dialog.message());
      dialogShown = true;
      await dialog.dismiss(); // Dismiss the dialog
    });
    
    // Wait for the table to load
    await page.waitForSelector('table');
    
    // Find a habit row
    const firstHabitRow = page.locator('tr.section-row').first();
    await expect(firstHabitRow).toBeVisible();
    
    // Click on a cell from 3 days ago (should trigger confirmation)
    const oldDateCell = firstHabitRow.locator('td').nth(5); // Adjust based on layout
    await oldDateCell.click();
    
    // Check that dialog was shown
    await page.waitForTimeout(500);
    expect(dialogShown).toBe(true);
  });

  test('check console for errors when clicking', async ({ page }) => {
    // Collect console messages
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });
    
    // Wait for the table to load
    await page.waitForSelector('table');
    
    // Find and click a habit cell
    const firstHabitRow = page.locator('tr.section-row').first();
    await expect(firstHabitRow).toBeVisible();
    
    const todayCell = firstHabitRow.locator('td').nth(-2);
    await todayCell.click();
    
    // Wait a bit for any async operations
    await page.waitForTimeout(2000);
    
    // Log all console messages
    console.log('Console messages during click:');
    consoleMessages.forEach(msg => console.log(msg));
    
    // Check for errors
    const errors = consoleMessages.filter(msg => msg.startsWith('error'));
    if (errors.length > 0) {
      console.log('Errors found:', errors);
    }
  });
});