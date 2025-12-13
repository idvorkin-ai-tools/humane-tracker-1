import { db } from "../config/db";

/**
 * Triggers Dexie Cloud login flow.
 * Shared utility to avoid duplicating login logic across components.
 */
export async function handleSignIn(): Promise<void> {
	try {
		await db.cloud.login();
	} catch (error) {
		console.error("Error signing in:", error);
	}
}
