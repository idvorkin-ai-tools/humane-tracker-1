import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "../config/db";
import {
	gratitudeLogRepository,
	validateGratitudeLog,
} from "./gratitudeLogRepository";
import { toDateString } from "./types";

describe("gratitudeLogRepository", () => {
	const testUserId = "test-user-123";

	beforeEach(async () => {
		await db.gratitudeLogs.clear();
	});

	afterEach(async () => {
		await db.gratitudeLogs.clear();
	});

	describe("create", () => {
		it("creates a gratitude log with correct data", async () => {
			const testDate = new Date();

			const id = await gratitudeLogRepository.create({
				userId: testUserId,
				note: "I am grateful for my health",
				date: testDate,
			});

			expect(id).toMatch(/^grt/);

			const record = await db.gratitudeLogs.get(id);
			expect(record).toBeDefined();
			expect(record?.userId).toBe(testUserId);
			expect(record?.note).toBe("I am grateful for my health");
			expect(record?.date).toBe(toDateString(testDate));
		});
	});

	describe("getByUserId", () => {
		it("returns all logs for a user", async () => {
			const today = new Date();
			const tomorrow = new Date(today);
			tomorrow.setDate(tomorrow.getDate() + 1);

			await gratitudeLogRepository.create({
				userId: testUserId,
				note: "Grateful for family",
				date: today,
			});

			await gratitudeLogRepository.create({
				userId: testUserId,
				note: "Grateful for friends",
				date: tomorrow,
			});

			await gratitudeLogRepository.create({
				userId: "other-user",
				note: "Other user gratitude",
				date: today,
			});

			const logs = await gratitudeLogRepository.getByUserId(testUserId);

			expect(logs).toHaveLength(2);
			expect(logs.every((l) => l.userId === testUserId)).toBe(true);
		});

		it("returns empty array when no logs exist", async () => {
			const logs = await gratitudeLogRepository.getByUserId("nonexistent");
			expect(logs).toHaveLength(0);
		});
	});

	describe("getByUserIdAndDate", () => {
		it("returns logs for specific date", async () => {
			const targetDate = new Date();
			const differentDate = new Date(targetDate);
			differentDate.setDate(differentDate.getDate() + 1);

			await gratitudeLogRepository.create({
				userId: testUserId,
				note: "Target day gratitude",
				date: targetDate,
			});

			await gratitudeLogRepository.create({
				userId: testUserId,
				note: "Different day gratitude",
				date: differentDate,
			});

			const logs = await gratitudeLogRepository.getByUserIdAndDate(
				testUserId,
				targetDate,
			);

			expect(logs).toHaveLength(1);
			expect(logs[0].note).toBe("Target day gratitude");
		});
	});

	describe("getAll", () => {
		it("returns all gratitude logs", async () => {
			await gratitudeLogRepository.create({
				userId: testUserId,
				note: "Note 1",
				date: new Date(),
			});

			await gratitudeLogRepository.create({
				userId: "another-user",
				note: "Note 2",
				date: new Date(),
			});

			const logs = await gratitudeLogRepository.getAll();
			expect(logs).toHaveLength(2);
		});
	});

	describe("clear", () => {
		it("removes all gratitude logs", async () => {
			await gratitudeLogRepository.create({
				userId: testUserId,
				note: "Will be deleted",
				date: new Date(),
			});

			await gratitudeLogRepository.clear();

			const logs = await gratitudeLogRepository.getAll();
			expect(logs).toHaveLength(0);
		});
	});

	describe("bulkPut", () => {
		it("inserts multiple logs", async () => {
			const logs = [
				{
					id: "grt-1",
					userId: testUserId,
					note: "Gratitude 1",
					date: new Date(),
					createdAt: new Date(),
				},
				{
					id: "grt-2",
					userId: testUserId,
					note: "Gratitude 2",
					date: new Date(),
					createdAt: new Date(),
				},
			];

			await gratitudeLogRepository.bulkPut(logs);

			const all = await gratitudeLogRepository.getAll();
			expect(all).toHaveLength(2);
		});
	});

	describe("validateGratitudeLog", () => {
		const validLog = {
			userId: "user-123",
			note: "I am grateful",
			date: new Date(),
		};

		it("accepts valid log data", () => {
			expect(() => validateGratitudeLog(validLog)).not.toThrow();
		});

		it("throws on empty userId", () => {
			expect(() => validateGratitudeLog({ ...validLog, userId: "" })).toThrow(
				"userId cannot be empty",
			);
		});

		it("throws on whitespace-only userId", () => {
			expect(() =>
				validateGratitudeLog({ ...validLog, userId: "   " }),
			).toThrow("userId cannot be empty");
		});

		it("throws on empty note", () => {
			expect(() => validateGratitudeLog({ ...validLog, note: "" })).toThrow(
				"note cannot be empty",
			);
		});

		it("throws on whitespace-only note", () => {
			expect(() => validateGratitudeLog({ ...validLog, note: "   " })).toThrow(
				"note cannot be empty",
			);
		});
	});
});
