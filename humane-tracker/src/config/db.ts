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

// Enable debug mode for better error stack traces (recommended for development)
if (import.meta.env.DEV) {
	Dexie.debug = true;
	console.log("[Dexie] Debug mode enabled - enhanced error stack traces");
}

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

	// Set up comprehensive sync monitoring and logging
	console.log("[Dexie Cloud] Configuring sync with URL:", dexieCloudUrl);

	// Monitor sync state changes
	db.cloud.syncState.subscribe((syncState) => {
		const timestamp = new Date().toISOString();
		console.log(`[Dexie Cloud] ${timestamp} Sync state:`, {
			phase: syncState.phase,
			status: syncState.status,
			progress: syncState.progress,
			license: syncState.license,
			error: syncState.error
				? {
						message: syncState.error.message,
						name: syncState.error.name,
						stack: syncState.error.stack,
					}
				: undefined,
		});

		// Log specific sync events with more detail
		if (syncState.phase === "pushing") {
			console.log(
				`[Dexie Cloud] ${timestamp} ↑ Uploading changes (${syncState.progress ?? 0}%)`,
			);
		} else if (syncState.phase === "pulling") {
			console.log(
				`[Dexie Cloud] ${timestamp} ↓ Downloading changes (${syncState.progress ?? 0}%)`,
			);
		} else if (syncState.phase === "in-sync") {
			console.log(`[Dexie Cloud] ${timestamp} ✓ Sync complete`);
		} else if (syncState.phase === "error") {
			console.error(
				`[Dexie Cloud] ${timestamp} ✗ Sync error:`,
				syncState.error,
			);
		} else if (syncState.phase === "offline") {
			console.warn(`[Dexie Cloud] ${timestamp} ⚠ Offline mode`);
		}
	});

	// Monitor WebSocket connection status
	db.cloud.webSocketStatus.subscribe((wsStatus) => {
		const timestamp = new Date().toISOString();
		console.log(`[Dexie Cloud] ${timestamp} WebSocket status:`, wsStatus);

		if (wsStatus === "connected") {
			console.log(
				`[Dexie Cloud] ${timestamp} ✓ WebSocket connected - live sync active`,
			);
		} else if (wsStatus === "disconnected") {
			console.warn(
				`[Dexie Cloud] ${timestamp} ⚠ WebSocket disconnected - using HTTP polling`,
			);
		} else if (wsStatus === "error") {
			console.error(
				`[Dexie Cloud] ${timestamp} ✗ WebSocket error - check domain whitelist in Dexie Cloud`,
			);
		} else if (wsStatus === "connecting") {
			console.log(`[Dexie Cloud] ${timestamp} ○ WebSocket connecting...`);
		}
	});

	// Monitor persisted sync state for last sync timestamp
	db.cloud.persistedSyncState.subscribe((persistedState) => {
		if (persistedState?.timestamp) {
			const lastSyncTime = new Date(persistedState.timestamp);
			console.log(
				`[Dexie Cloud] Last successful sync:`,
				lastSyncTime.toLocaleString(),
				`(${Math.round((Date.now() - lastSyncTime.getTime()) / 1000)}s ago)`,
			);
		}
	});

	// Subscribe to sync complete events
	db.cloud.events.syncComplete.subscribe(() => {
		const timestamp = new Date().toISOString();
		console.log(`[Dexie Cloud] ${timestamp} 🎉 Sync completed successfully`);
	});

	console.log("[Dexie Cloud] Sync monitoring initialized");
} else {
	// Local-only mode - no cloud sync (also used in test mode)
	console.log("[Dexie Cloud] Not configured - running in local-only mode");
}
