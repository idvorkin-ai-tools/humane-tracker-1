import { test, expect } from "@playwright/test";
import { clearIndexedDB } from "./helpers/indexeddb-helpers";

test.describe("Login Button", () => {
	test.afterEach(async ({ page }) => {
		await clearIndexedDB(page);
	});

	test("shows login button when logged out", async ({ page }) => {
		// Use e2e-login mode to test logged-out state
		await page.goto("/?e2e-login=true");
		await page.waitForLoadState("networkidle");

		// Login button should be visible
		const loginButton = page.locator("button.login-button");
		await expect(loginButton).toBeVisible();
		await expect(loginButton).toHaveText("Sign In");
	});

	test("clicking login button triggers login flow", async ({ page }) => {
		await page.goto("/?e2e-login=true");
		await page.waitForLoadState("networkidle");

		const loginButton = page.locator("button.login-button");
		await expect(loginButton).toBeVisible();

		// Click login button - should trigger db.cloud.login()
		// In E2E mode, Dexie Cloud isn't configured so login() fails gracefully.
		await loginButton.click();

		// Verify the button is still visible and app didn't crash
		await expect(loginButton).toBeVisible();
		await expect(loginButton).toBeEnabled();
	});

	test("login button has correct styling", async ({ page }) => {
		await page.goto("/?e2e-login=true");
		await page.waitForLoadState("networkidle");

		const loginButton = page.locator("button.login-button");
		await expect(loginButton).toBeVisible();

		// Check button has expected styles
		await expect(loginButton).toHaveCSS("cursor", "pointer");
	});

	test("shows warning banner when not logged in", async ({ page }) => {
		await page.goto("/?e2e-login=true");
		await page.waitForLoadState("networkidle");

		const warning = page.locator(".anonymous-warning");
		await expect(warning).toBeVisible();
		await expect(warning).toContainText("Your data is not being saved");
		await expect(warning).toContainText("Sign in");
	});
});
