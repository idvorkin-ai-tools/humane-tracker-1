import { test, expect } from "@playwright/test";

test.describe("Login Flow - Cancel Dialog", () => {
	test("shows warning and login button after canceling Dexie login", async ({
		page,
	}) => {
		// Navigate WITHOUT e2e mode to trigger real Dexie Cloud login dialog
		await page.goto("/");

		// Wait for Dexie Cloud login dialog
		const cancelButton = page.locator('button:has-text("Cancel")');
		await cancelButton.waitFor({ timeout: 10000 });

		// Cancel the login
		await cancelButton.click();

		// Should see warning banner
		const warning = page.locator(".anonymous-warning");
		await expect(warning).toBeVisible({ timeout: 5000 });
		await expect(warning).toContainText("not being saved");

		// Should see login button (not UserMenu)
		const loginButton = page.locator("button.login-button");
		await expect(loginButton).toBeVisible();
		await expect(loginButton).toHaveText("Sign In");
	});
});
