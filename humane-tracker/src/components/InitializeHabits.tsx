import type React from "react";
import { useState } from "react";
import { DEFAULT_AFFIRMATIONS } from "../constants/affirmations";
import { DEFAULT_HABITS } from "../data/defaultHabits";
import { useHabitService } from "../hooks/useHabitService";
import { affirmationLogRepository } from "../repositories/affirmationLogRepository";
import { entryRepository } from "../repositories/entryRepository";
import { buildCategoryInfo, extractCategories } from "../utils/categoryUtils";
import "./InitializeHabits.css";

/**
 * Generate random completions for demo data with a realistic pattern:
 * - ~25% of habits are skipped entirely
 * - Recent days have higher completion probability
 * - Covers past 14 days
 */
async function generateDemoCompletions(
	habitIds: string[],
	userId: string,
): Promise<void> {
	const today = new Date();
	const DAYS_TO_FILL = 14;

	for (const habitId of habitIds) {
		// Skip ~25% of habits entirely
		if (Math.random() < 0.25) continue;

		for (let daysAgo = 0; daysAgo < DAYS_TO_FILL; daysAgo++) {
			// Completion probability decreases with age
			let probability: number;
			if (daysAgo <= 2) {
				probability = 0.6; // Recent: 60%
			} else if (daysAgo <= 6) {
				probability = 0.45; // Mid: 45%
			} else {
				probability = 0.25; // Older: 25%
			}

			if (Math.random() < probability) {
				const date = new Date(today);
				date.setDate(date.getDate() - daysAgo);

				try {
					await entryRepository.add({
						habitId,
						userId,
						date,
						value: 1,
					});
				} catch (err) {
					// Demo data failure is non-fatal, just log and continue
					console.warn(
						`[InitializeHabits] Failed to create demo entry for habit ${habitId}:`,
						err,
					);
				}
			}
		}
	}
}

/**
 * Sample notes for demo grateful logs
 */
const DEMO_GRATEFUL_NOTES = [
	"My morning coffee ritual - such a simple pleasure",
	"A productive conversation with a colleague",
	"The sunshine coming through the window",
	"My health and ability to exercise",
	"A good night's sleep",
	"Time spent with family",
];

/**
 * Sample notes for demo didit (affirmation practice) logs
 */
const DEMO_DIDIT_NOTES = [
	"Stayed focused during the meeting despite distractions",
	"Took a breath before responding to a frustrating email",
	"Chose to prioritize the most important task first",
	"Asked clarifying questions instead of assuming",
	"Stayed calm when things didn't go as planned",
	"Completed the workout even though I didn't feel like it",
];

/**
 * Generate demo affirmation logs with gratefulness and affirmation practices.
 * Creates a few entries from past days and 1-2 for today.
 */
async function generateDemoAffirmationLogs(userId: string): Promise<void> {
	const today = new Date();
	const affirmationTitles = DEFAULT_AFFIRMATIONS.map((a) => a.title);

	// Demo entries: mix of dates and types
	const demoEntries: {
		daysAgo: number;
		logType: "grateful" | "didit";
		notePool: string[];
	}[] = [
		// A few days ago
		{ daysAgo: 3, logType: "grateful", notePool: DEMO_GRATEFUL_NOTES },
		{ daysAgo: 3, logType: "didit", notePool: DEMO_DIDIT_NOTES },
		{ daysAgo: 2, logType: "grateful", notePool: DEMO_GRATEFUL_NOTES },
		{ daysAgo: 1, logType: "didit", notePool: DEMO_DIDIT_NOTES },
		{ daysAgo: 1, logType: "grateful", notePool: DEMO_GRATEFUL_NOTES },
		// Today
		{ daysAgo: 0, logType: "grateful", notePool: DEMO_GRATEFUL_NOTES },
		{ daysAgo: 0, logType: "didit", notePool: DEMO_DIDIT_NOTES },
	];

	for (const entry of demoEntries) {
		const date = new Date(today);
		date.setDate(date.getDate() - entry.daysAgo);

		// Pick a random affirmation and note
		const affirmationTitle =
			affirmationTitles[Math.floor(Math.random() * affirmationTitles.length)];
		const note =
			entry.notePool[Math.floor(Math.random() * entry.notePool.length)];

		try {
			await affirmationLogRepository.create({
				userId,
				affirmationTitle,
				logType: entry.logType,
				note,
				date,
			});
		} catch (err) {
			// Demo data failure is non-fatal, just log and continue
			console.warn(
				`[InitializeHabits] Failed to create demo affirmation log:`,
				err,
			);
		}
	}
}

interface InitializeHabitsProps {
	userId: string;
	onComplete: () => void;
}

export const InitializeHabits: React.FC<InitializeHabitsProps> = ({
	userId,
	onComplete,
}) => {
	const habitService = useHabitService();
	const [loading, setLoading] = useState(false);
	const [progress, setProgress] = useState(0);

	// Derive categories from default habits dynamically
	const categories = extractCategories(DEFAULT_HABITS);

	const initializeDefaultHabits = async () => {
		setLoading(true);
		setProgress(0);

		try {
			// Delete all existing habits first (wipe and replace)
			const existingHabits = await habitService.getUserHabits(userId);
			if (existingHabits.length > 0) {
				await habitService.bulkDeleteHabits(existingHabits.map((h) => h.id));
			}

			const habitsToAdd = DEFAULT_HABITS;
			const total = habitsToAdd.length;

			// First pass: create all raw habits (children must exist before tags)
			const rawHabits = habitsToAdd.filter((h) => h.habitType !== "tag");
			const tagHabits = habitsToAdd.filter((h) => h.habitType === "tag");

			// Map from name to created ID
			const nameToId = new Map<string, string>();

			// Create raw habits first
			for (let i = 0; i < rawHabits.length; i++) {
				const habit = rawHabits[i];
				const id = await habitService.createHabit({
					name: habit.name,
					category: habit.category,
					targetPerWeek: habit.targetPerWeek,
					userId,
					habitType: "raw",
				});
				nameToId.set(habit.name, id);
				setProgress(Math.round(((i + 1) / total) * 100));
			}

			// Second pass: create tags with child references
			for (let i = 0; i < tagHabits.length; i++) {
				const habit = tagHabits[i];
				// Resolve child names to IDs, warning on missing children
				const childIds: string[] = [];
				for (const childName of habit.childNames ?? []) {
					const childId = nameToId.get(childName);
					if (childId) {
						childIds.push(childId);
					} else {
						console.warn(
							`[InitializeHabits] Child habit "${childName}" not found for tag "${habit.name}". ` +
								`Check defaultHabits.ts for typos.`,
						);
					}
				}

				const tagId = await habitService.createHabit({
					name: habit.name,
					category: habit.category,
					targetPerWeek: habit.targetPerWeek,
					userId,
					habitType: "tag",
					childIds,
				});

				// Update children to have parentIds pointing to this tag
				for (const childId of childIds) {
					await habitService.updateHabit(childId, {
						parentIds: [tagId],
					});
				}

				setProgress(Math.round(((rawHabits.length + i + 1) / total) * 100));
			}

			// Generate demo completions (non-fatal if this fails)
			const rawHabitIds = Array.from(nameToId.values());
			try {
				await generateDemoCompletions(rawHabitIds, userId);
			} catch (err) {
				console.warn("[InitializeHabits] Demo completions failed:", err);
			}

			// Generate demo affirmation logs (non-fatal if this fails)
			try {
				await generateDemoAffirmationLogs(userId);
			} catch (err) {
				console.warn("[InitializeHabits] Demo affirmation logs failed:", err);
			}

			onComplete();
		} catch (error) {
			console.error("Error initializing habits:", error);
			alert("Failed to initialize habits. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="initialize-habits">
			<div className="init-card">
				<h2>Load Demo Data</h2>
				<p>Explore the app with sample habits and completions.</p>
				<p className="habit-count">
					{DEFAULT_HABITS.length} habits across {categories.length} categories
					<br />
					<small>
						Includes 2 weeks of sample completions, plus gratefulness &amp;
						affirmation entries
					</small>
				</p>

				<div className="categories-preview">
					{categories.map((category) => {
						const info = buildCategoryInfo(category);
						const count = DEFAULT_HABITS.filter(
							(h) => h.category === category,
						).length;
						return (
							<div key={category} className="category-item">
								<span
									className="category-dot"
									style={{ background: info.color }}
								/>
								{info.name} ({count} habits)
							</div>
						);
					})}
				</div>

				{loading && (
					<div className="progress-bar">
						<div
							className="progress-fill"
							style={{ width: `${progress}%` }}
						></div>
						<span className="progress-text">{progress}%</span>
					</div>
				)}

				<div className="init-actions">
					<button className="btn-skip" onClick={onComplete} disabled={loading}>
						Skip
					</button>
					<button
						className="btn-initialize"
						onClick={initializeDefaultHabits}
						disabled={loading}
					>
						{loading ? "Loading..." : "Load Demo Data"}
					</button>
				</div>
			</div>
		</div>
	);
};
