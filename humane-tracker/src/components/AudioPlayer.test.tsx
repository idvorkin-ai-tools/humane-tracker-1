import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AudioPlaybackProvider } from "../contexts/AudioPlaybackContext";
import { AudioPlayer } from "./AudioPlayer";

// Mock URL.createObjectURL and URL.revokeObjectURL
// Use a generic blob URL format without port numbers
const mockUrl = "blob:mock-audio-url";
global.URL.createObjectURL = vi.fn(() => mockUrl);
global.URL.revokeObjectURL = vi.fn();

// Wrapper to provide the AudioPlaybackContext
function Wrapper({ children }: { children: ReactNode }) {
	return <AudioPlaybackProvider>{children}</AudioPlaybackProvider>;
}

describe("AudioPlayer", () => {
	const mockBlob = new Blob(["test audio data"], { type: "audio/webm" });
	const mockOnDelete = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders play button", () => {
		render(<AudioPlayer blob={mockBlob} mimeType="audio/webm" />, {
			wrapper: Wrapper,
		});

		const playButton = screen.getByRole("button", { name: /play/i });
		expect(playButton).toBeInTheDocument();
	});

	it("renders progress slider", () => {
		render(<AudioPlayer blob={mockBlob} mimeType="audio/webm" />, {
			wrapper: Wrapper,
		});

		const slider = screen.getByRole("slider", { name: /seek/i });
		expect(slider).toBeInTheDocument();
	});

	it("renders time display showing 0:00 / 0:00 initially", () => {
		render(<AudioPlayer blob={mockBlob} mimeType="audio/webm" />, {
			wrapper: Wrapper,
		});

		expect(screen.getByText("0:00 / 0:00")).toBeInTheDocument();
	});

	it("renders delete button when onDelete is provided", () => {
		render(
			<AudioPlayer
				blob={mockBlob}
				mimeType="audio/webm"
				onDelete={mockOnDelete}
			/>,
			{ wrapper: Wrapper },
		);

		const deleteButton = screen.getByRole("button", {
			name: /delete recording/i,
		});
		expect(deleteButton).toBeInTheDocument();
	});

	it("does not render delete button when onDelete is not provided", () => {
		render(<AudioPlayer blob={mockBlob} mimeType="audio/webm" />, {
			wrapper: Wrapper,
		});

		const deleteButton = screen.queryByRole("button", {
			name: /delete recording/i,
		});
		expect(deleteButton).not.toBeInTheDocument();
	});

	it("calls onDelete when delete button is clicked", () => {
		render(
			<AudioPlayer
				blob={mockBlob}
				mimeType="audio/webm"
				onDelete={mockOnDelete}
			/>,
			{ wrapper: Wrapper },
		);

		const deleteButton = screen.getByRole("button", {
			name: /delete recording/i,
		});
		fireEvent.click(deleteButton);

		expect(mockOnDelete).toHaveBeenCalled();
	});

	it("creates object URL from blob on mount", () => {
		render(<AudioPlayer blob={mockBlob} mimeType="audio/webm" />, {
			wrapper: Wrapper,
		});

		expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
	});

	it("revokes object URL on unmount", () => {
		const { unmount } = render(
			<AudioPlayer blob={mockBlob} mimeType="audio/webm" />,
			{ wrapper: Wrapper },
		);

		unmount();

		expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl);
	});

	it("toggles between play and pause icons when clicked", async () => {
		// Mock audio element methods that also trigger native events
		const originalCreateElement = document.createElement.bind(document);
		vi.spyOn(document, "createElement").mockImplementation(
			(tagName: string) => {
				const element = originalCreateElement(tagName);
				if (tagName === "audio") {
					Object.defineProperty(element, "play", {
						value: vi.fn().mockImplementation(() => {
							// Simulate the native play event
							element.dispatchEvent(new Event("play"));
							return Promise.resolve();
						}),
						writable: true,
					});
					Object.defineProperty(element, "pause", {
						value: vi.fn().mockImplementation(() => {
							// Simulate the native pause event
							element.dispatchEvent(new Event("pause"));
						}),
						writable: true,
					});
				}
				return element;
			},
		);

		render(<AudioPlayer blob={mockBlob} mimeType="audio/webm" />, {
			wrapper: Wrapper,
		});

		const playButton = screen.getByRole("button", { name: /play/i });

		// Initially shows play icon
		expect(playButton.textContent).toContain("\u25B6");

		fireEvent.click(playButton);

		// After click, shows pause icon
		await waitFor(() => {
			expect(playButton.textContent).toContain("\u275A\u275A");
		});

		vi.restoreAllMocks();
	});

	it("shows error state when audio fails to load", async () => {
		render(<AudioPlayer blob={mockBlob} mimeType="audio/webm" />, {
			wrapper: Wrapper,
		});

		// Find the audio element and trigger error
		const audio = document.querySelector("audio");
		if (audio) {
			fireEvent.error(audio);
		}

		await waitFor(() => {
			expect(screen.getByText(/failed to load audio/i)).toBeInTheDocument();
		});
	});

	it("has correct initial progress value", () => {
		render(<AudioPlayer blob={mockBlob} mimeType="audio/webm" />, {
			wrapper: Wrapper,
		});

		const slider = screen.getByRole("slider", { name: /seek/i });
		expect(slider).toHaveValue("0");
	});

	it("pauses other players when a new player starts", async () => {
		// Track pause calls per audio element
		const pauseCalls: string[] = [];

		// Mock audio elements with tracking
		const originalCreateElement = document.createElement.bind(document);
		let audioCounter = 0;
		vi.spyOn(document, "createElement").mockImplementation(
			(tagName: string) => {
				const element = originalCreateElement(tagName);
				if (tagName === "audio") {
					const audioId = `audio-${audioCounter++}`;
					Object.defineProperty(element, "play", {
						value: vi.fn().mockImplementation(() => {
							element.dispatchEvent(new Event("play"));
							return Promise.resolve();
						}),
						writable: true,
					});
					Object.defineProperty(element, "pause", {
						value: vi.fn().mockImplementation(() => {
							pauseCalls.push(audioId);
							element.dispatchEvent(new Event("pause"));
						}),
						writable: true,
					});
				}
				return element;
			},
		);

		const blob1 = new Blob(["audio 1"], { type: "audio/webm" });
		const blob2 = new Blob(["audio 2"], { type: "audio/webm" });

		render(
			<AudioPlaybackProvider>
				<div data-testid="player-1">
					<AudioPlayer blob={blob1} mimeType="audio/webm" />
				</div>
				<div data-testid="player-2">
					<AudioPlayer blob={blob2} mimeType="audio/webm" />
				</div>
			</AudioPlaybackProvider>,
		);

		const playButtons = screen.getAllByRole("button", { name: /play/i });
		expect(playButtons).toHaveLength(2);

		// Play the first audio
		fireEvent.click(playButtons[0]);

		await waitFor(() => {
			expect(playButtons[0].textContent).toContain("\u275A\u275A");
		});

		// Play the second audio - should pause the first
		fireEvent.click(playButtons[1]);

		await waitFor(() => {
			// First player should now show play icon (was paused)
			expect(playButtons[0].textContent).toContain("\u25B6");
			// Second player should show pause icon (is playing)
			expect(playButtons[1].textContent).toContain("\u275A\u275A");
		});

		// Verify pause was called on the first audio element
		expect(pauseCalls).toContain("audio-0");

		vi.restoreAllMocks();
	});
});
