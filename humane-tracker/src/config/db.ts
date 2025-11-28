import Dexie, { type Table } from "dexie";
import dexieCloud from "dexie-cloud-addon";
import type { Habit, HabitEntry } from "../types/habit";

// Extend Dexie with cloud addon
export class HumaneTrackerDB extends Dexie {
	habits!: Table<Habit, string>;
	entries!: Table<HabitEntry, string>;

	constructor() {
		super("HumaneTrackerDB", { addons: [dexieCloud] });

		// Define schema - using @id for Dexie Cloud compatible auto-generated string IDs
		this.version(2).stores({
			habits:
				"@id, userId, name, category, targetPerWeek, createdAt, updatedAt",
			entries: "@id, habitId, userId, date, value, createdAt",
		});
	}
}

// Create database instance
export const db = new HumaneTrackerDB();

// Configure Dexie Cloud (optional - works offline if not configured)
const dexieCloudUrl = import.meta.env.VITE_DEXIE_CLOUD_URL;
const isTestMode =
	typeof window !== "undefined" && window.location.search.includes("test=true");

if (
	dexieCloudUrl &&
	dexieCloudUrl !== "https://your-db.dexie.cloud" &&
	!isTestMode
) {
	// Configure cloud sync with the provided URL
	db.cloud.configure({
		databaseUrl: dexieCloudUrl,
		requireAuth: true, // Require authentication for cloud sync
		tryUseServiceWorker: true,
	});
} else {
	// Local-only mode - no cloud sync (also used in test mode)
	console.log("Dexie Cloud not configured - running in local-only mode");
}
