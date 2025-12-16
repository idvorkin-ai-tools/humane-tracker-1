import { db } from "../config/db";
import { entryRepository, habitRepository } from "../repositories";

export interface LocalDataSummary {
	habitCount: number;
	entryCount: number;
	habitNames: string[];
}

/**
 * Get summary of local anonymous data.
 */
export async function getLocalAnonymousDataSummary(): Promise<LocalDataSummary | null> {
	try {
		const habits = await habitRepository.getByUserId("anonymous");
		if (habits.length === 0) {
			return null;
		}

		const entryCount = await entryRepository.countByUserId("anonymous");

		return {
			habitCount: habits.length,
			entryCount,
			habitNames: habits.map((h) => h.name).slice(0, 5), // First 5 names for preview
		};
	} catch (error) {
		console.error("Error checking for local data:", error);
		return null;
	}
}

/**
 * Clear all local anonymous data before signing in.
 * @throws Error if data clearing fails - caller must handle
 */
async function clearLocalAnonymousData(): Promise<void> {
	// Delete entries for anonymous user
	const entryCount = await entryRepository.deleteByUserId("anonymous");

	// Delete habits for anonymous user
	const habitCount = await habitRepository.deleteByUserId("anonymous");

	console.log(
		`[Auth] Cleared ${habitCount} anonymous habits and ${entryCount} entries`,
	);
}

export type SignInChoice = "merge" | "abandon" | "cancel";

export interface SignInResult {
	success: boolean;
	error?: string;
}

/**
 * Triggers Dexie Cloud login flow.
 * If there's local anonymous data, prompts user to choose merge vs abandon.
 * Returns success/error status so caller can display feedback to user.
 */
export async function handleSignIn(
	onPromptNeeded?: (summary: LocalDataSummary) => Promise<SignInChoice>,
): Promise<SignInResult> {
	try {
		const localData = await getLocalAnonymousDataSummary();

		if (localData && onPromptNeeded) {
			const choice = await onPromptNeeded(localData);

			if (choice === "cancel") {
				return { success: true }; // User cancelled sign-in intentionally
			}

			if (choice === "abandon") {
				await clearLocalAnonymousData();
			}
			// "merge" - just proceed, Dexie Cloud will merge the data
		}

		await db.cloud.login();
		return { success: true };
	} catch (error) {
		console.error("Error signing in:", error);
		const message =
			error instanceof Error ? error.message : "Unknown error occurred";
		return { success: false, error: `Sign-in failed: ${message}` };
	}
}
