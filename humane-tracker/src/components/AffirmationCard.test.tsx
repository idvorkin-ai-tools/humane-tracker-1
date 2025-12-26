import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_AFFIRMATIONS } from "../constants/affirmations";
import { AffirmationCard } from "./AffirmationCard";

// Mock the repository
vi.mock("../repositories/affirmationLogRepository", () => ({
	affirmationLogRepository: {
		create: vi.fn().mockResolvedValue("test-id"),
		getByUserIdAndDate: vi.fn().mockResolvedValue([]),
	},
}));

// Mock the audio recording repository
vi.mock("../repositories/audioRecordingRepository", () => ({
	audioRecordingRepository: {
		getByUserIdAndDate: vi.fn().mockResolvedValue([]),
	},
}));

describe("AffirmationCard", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders an affirmation title and subtitle", () => {
		render(<AffirmationCard userId="test-user" />);

		// Should render one of the affirmations from the shared constant
		const possibleTitles = DEFAULT_AFFIRMATIONS.map((a) => a.title);

		// At least one title should be visible (title now includes ▾ dropdown indicator)
		const foundTitle = possibleTitles.some((title) =>
			screen.queryByText(new RegExp(title)),
		);
		expect(foundTitle).toBe(true);
	});

	it("shows Opportunity and Did It buttons by default", () => {
		render(<AffirmationCard userId="test-user" />);

		expect(screen.getByText(/Opp/)).toBeInTheDocument();
		expect(screen.getByText(/Did/)).toBeInTheDocument();
	});

	it("shows textarea when Opportunity is clicked", () => {
		render(<AffirmationCard userId="test-user" />);

		fireEvent.click(screen.getByText(/Opp/));

		expect(
			screen.getByPlaceholderText("How will you apply this today?"),
		).toBeInTheDocument();
		expect(screen.getByLabelText("Send")).toBeInTheDocument();
	});

	it("shows textarea when Did It is clicked", () => {
		render(<AffirmationCard userId="test-user" />);

		fireEvent.click(screen.getByText(/Did/));

		expect(
			screen.getByPlaceholderText("How did you apply this?"),
		).toBeInTheDocument();
	});

	it("closes textarea on cancel button click", () => {
		render(<AffirmationCard userId="test-user" />);

		fireEvent.click(screen.getByText(/Opp/));
		expect(
			screen.getByPlaceholderText("How will you apply this today?"),
		).toBeInTheDocument();

		fireEvent.click(screen.getByLabelText("Cancel"));

		expect(
			screen.queryByPlaceholderText("How will you apply this today?"),
		).not.toBeInTheDocument();
		expect(screen.getByText(/Opp/)).toBeInTheDocument();
	});

	it("closes textarea on Escape key", () => {
		render(<AffirmationCard userId="test-user" />);

		fireEvent.click(screen.getByText(/Opp/));
		const textarea = screen.getByPlaceholderText(
			"How will you apply this today?",
		);

		fireEvent.keyDown(textarea, { key: "Escape" });

		expect(
			screen.queryByPlaceholderText("How will you apply this today?"),
		).not.toBeInTheDocument();
	});

	it("changes affirmation when Random is selected from dropdown", () => {
		const { container } = render(<AffirmationCard userId="test-user" />);

		// Get initial title
		const getTitle = () =>
			container.querySelector(".affirmation-card-title")?.textContent;
		const initialTitle = getTitle();

		// Click title to open dropdown, then click Random multiple times
		// (Since there are multiple affirmations and it never repeats, should eventually change)
		let changed = false;
		for (let i = 0; i < 4; i++) {
			// Open dropdown
			const titleBtn = container.querySelector(".affirmation-title-btn");
			fireEvent.click(titleBtn!);

			// Click Random option
			const randomBtn = screen.getByText("↻ Random");
			fireEvent.click(randomBtn);

			if (getTitle() !== initialTitle) {
				changed = true;
				break;
			}
		}

		// With multiple options and no-repeat logic, should always change
		expect(changed).toBe(true);
	});

	it("saves note when Send is clicked", async () => {
		const { affirmationLogRepository } = await import(
			"../repositories/affirmationLogRepository"
		);

		render(<AffirmationCard userId="test-user" />);

		fireEvent.click(screen.getByText(/Opp/));
		const textarea = screen.getByPlaceholderText(
			"How will you apply this today?",
		);
		fireEvent.change(textarea, { target: { value: "Test note" } });
		fireEvent.click(screen.getByLabelText("Send"));

		expect(affirmationLogRepository.create).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: "test-user",
				logType: "opportunity",
				note: "Test note",
			}),
		);
	});

	it("saves note when Enter is pressed", async () => {
		const { affirmationLogRepository } = await import(
			"../repositories/affirmationLogRepository"
		);

		render(<AffirmationCard userId="test-user" />);

		fireEvent.click(screen.getByText(/Did/));
		const textarea = screen.getByPlaceholderText("How did you apply this?");
		fireEvent.change(textarea, { target: { value: "Applied it!" } });
		fireEvent.keyDown(textarea, { key: "Enter" });

		expect(affirmationLogRepository.create).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: "test-user",
				logType: "didit",
				note: "Applied it!",
			}),
		);
	});

	it("disables Send button when text is empty", () => {
		render(<AffirmationCard userId="test-user" />);

		fireEvent.click(screen.getByText(/Opp/));
		const sendBtn = screen.getByLabelText("Send");

		// Send button should be disabled when text is empty
		expect(sendBtn).toBeDisabled();
	});
});
