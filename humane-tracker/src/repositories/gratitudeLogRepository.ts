import { db } from "../config/db";
import {
	fromDateString,
	type GratitudeLogRecord,
	normalizeDate,
	toDateString,
	toTimestamp,
} from "./types";

export interface GratitudeLog {
	id: string;
	userId: string;
	note: string;
	date: Date;
	createdAt: Date;
}

function toGratitudeLog(record: GratitudeLogRecord): GratitudeLog {
	return {
		id: record.id,
		userId: record.userId,
		note: record.note,
		date: fromDateString(record.date),
		createdAt: normalizeDate(record.createdAt),
	};
}

function toRecord(log: GratitudeLog): GratitudeLogRecord {
	return {
		id: log.id,
		userId: log.userId,
		note: log.note,
		date: toDateString(log.date),
		createdAt: toTimestamp(log.createdAt),
	};
}

/**
 * Validate gratitude log input fields.
 * @throws Error if any field is invalid
 */
export function validateGratitudeLog(
	log: Omit<GratitudeLog, "id" | "createdAt">,
): void {
	if (!log.userId || typeof log.userId !== "string" || !log.userId.trim()) {
		throw new Error("validateGratitudeLog: userId cannot be empty");
	}
	if (!log.note || typeof log.note !== "string" || !log.note.trim()) {
		throw new Error("validateGratitudeLog: note cannot be empty");
	}
}

export const gratitudeLogRepository = {
	async create(log: Omit<GratitudeLog, "id" | "createdAt">): Promise<string> {
		validateGratitudeLog(log);

		try {
			const now = new Date();
			const id = `grt${crypto.randomUUID().replace(/-/g, "")}`;
			const record: GratitudeLogRecord = {
				id,
				userId: log.userId,
				note: log.note,
				date: toDateString(log.date),
				createdAt: toTimestamp(now),
			};
			await db.gratitudeLogs.add(record);
			return id;
		} catch (error) {
			console.error(
				"[GratitudeLogRepository] Failed to create gratitude log:",
				error,
			);
			throw new Error(
				`Failed to create gratitude log: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	async getByUserId(userId: string): Promise<GratitudeLog[]> {
		try {
			const records = await db.gratitudeLogs
				.where("userId")
				.equals(userId)
				.toArray();
			return records.map(toGratitudeLog);
		} catch (error) {
			console.error(
				"[GratitudeLogRepository] Failed to get gratitude logs by user:",
				error,
			);
			throw new Error(
				`Failed to load gratitude logs: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	async getByUserIdAndDate(
		userId: string,
		date: Date,
	): Promise<GratitudeLog[]> {
		try {
			const dateStr = toDateString(date);
			const records = await db.gratitudeLogs
				.where(["userId", "date"])
				.equals([userId, dateStr])
				.toArray();
			return records.map(toGratitudeLog);
		} catch (error) {
			console.error(
				"[GratitudeLogRepository] Failed to get gratitude logs by user and date:",
				error,
			);
			throw new Error(
				`Failed to load gratitude logs: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	async getAll(): Promise<GratitudeLog[]> {
		try {
			const records = await db.gratitudeLogs.toArray();
			return records.map(toGratitudeLog);
		} catch (error) {
			console.error(
				"[GratitudeLogRepository] Failed to get all gratitude logs:",
				error,
			);
			throw new Error(
				`Failed to load gratitude logs: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	async clear(): Promise<void> {
		try {
			const count = await db.gratitudeLogs.count();
			console.warn(
				`[GratitudeLogRepository] DESTRUCTIVE: Clearing ${count} gratitude logs.`,
			);
			await db.gratitudeLogs.clear();
		} catch (error) {
			console.error(
				"[GratitudeLogRepository] Failed to clear gratitude logs:",
				error,
			);
			throw new Error(
				`Failed to clear gratitude logs: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},

	async bulkPut(logs: GratitudeLog[]): Promise<void> {
		try {
			const records = logs.map(toRecord);
			await db.gratitudeLogs.bulkPut(records);
		} catch (error) {
			console.error(
				"[GratitudeLogRepository] Failed to bulk put gratitude logs:",
				error,
			);
			throw new Error(
				`Failed to save gratitude logs: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	},
};
