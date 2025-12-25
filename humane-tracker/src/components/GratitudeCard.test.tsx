import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GratitudeCard } from "./GratitudeCard";

// Mock the repositories
vi.mock("../repositories/gratitudeLogRepository", () => ({
	gratitudeLogRepository: {
		create: vi.fn().mockResolvedValue("test-grt-id"),
	},
}));

vi.mock("../repositories/audioRecordingRepository", () => ({
	audioRecordingRepository: {
		create: vi.fn().mockResolvedValue("test-aud-id"),
	},
}));

describe("GratitudeCard", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the gratitude prompt", () => {
		render(<GratitudeCard userId="test-user" />);

		expect(screen.getByText("What are you grateful for?")).toBeInTheDocument();
	});

	it("shows Log Gratitude button by default", () => {
		render(<GratitudeCard userId="test-user" />);

		expect(screen.getByText(/Log Gratitude/)).toBeInTheDocument();
	});

	it("shows textarea when Log Gratitude is clicked", () => {
		render(<GratitudeCard userId="test-user" />);

		fireEvent.click(screen.getByText(/Log Gratitude/));

		expect(
			screen.getByPlaceholderText("I'm grateful for..."),
		).toBeInTheDocument();
		expect(screen.getByText("Save")).toBeInTheDocument();
	});

	it("closes textarea on cancel button click", () => {
		render(<GratitudeCard userId="test-user" />);

		fireEvent.click(screen.getByText(/Log Gratitude/));
		expect(
			screen.getByPlaceholderText("I'm grateful for..."),
		).toBeInTheDocument();

		fireEvent.click(screen.getByText("\u2715"));

		expect(
			screen.queryByPlaceholderText("I'm grateful for..."),
		).not.toBeInTheDocument();
		expect(screen.getByText(/Log Gratitude/)).toBeInTheDocument();
	});

	it("closes textarea on Escape key", () => {
		render(<GratitudeCard userId="test-user" />);

		fireEvent.click(screen.getByText(/Log Gratitude/));
		const textarea = screen.getByPlaceholderText("I'm grateful for...");

		fireEvent.keyDown(textarea, { key: "Escape" });

		expect(
			screen.queryByPlaceholderText("I'm grateful for..."),
		).not.toBeInTheDocument();
	});

	it("saves note when Save is clicked", async () => {
		const { gratitudeLogRepository } = await import(
			"../repositories/gratitudeLogRepository"
		);

		render(<GratitudeCard userId="test-user" />);

		fireEvent.click(screen.getByText(/Log Gratitude/));
		const textarea = screen.getByPlaceholderText("I'm grateful for...");
		fireEvent.change(textarea, { target: { value: "My family and friends" } });
		fireEvent.click(screen.getByText("Save"));

		expect(gratitudeLogRepository.create).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: "test-user",
				note: "My family and friends",
			}),
		);
	});

	it("saves note when Enter is pressed", async () => {
		const { gratitudeLogRepository } = await import(
			"../repositories/gratitudeLogRepository"
		);

		render(<GratitudeCard userId="test-user" />);

		fireEvent.click(screen.getByText(/Log Gratitude/));
		const textarea = screen.getByPlaceholderText("I'm grateful for...");
		fireEvent.change(textarea, { target: { value: "Good health" } });
		fireEvent.keyDown(textarea, { key: "Enter" });

		expect(gratitudeLogRepository.create).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: "test-user",
				note: "Good health",
			}),
		);
	});

	it("does not save empty notes", async () => {
		const { gratitudeLogRepository } = await import(
			"../repositories/gratitudeLogRepository"
		);

		render(<GratitudeCard userId="test-user" />);

		fireEvent.click(screen.getByText(/Log Gratitude/));
		fireEvent.click(screen.getByText("Save"));

		expect(gratitudeLogRepository.create).not.toHaveBeenCalled();
	});

	it("clears text and closes on successful save", async () => {
		render(<GratitudeCard userId="test-user" />);

		fireEvent.click(screen.getByText(/Log Gratitude/));
		const textarea = screen.getByPlaceholderText("I'm grateful for...");
		fireEvent.change(textarea, { target: { value: "Sunshine" } });
		fireEvent.click(screen.getByText("Save"));

		// Wait for async operation
		await vi.waitFor(() => {
			expect(
				screen.queryByPlaceholderText("I'm grateful for..."),
			).not.toBeInTheDocument();
		});

		expect(screen.getByText(/Log Gratitude/)).toBeInTheDocument();
	});
});
