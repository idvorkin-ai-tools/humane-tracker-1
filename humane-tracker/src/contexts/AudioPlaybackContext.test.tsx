import { render, screen } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import {
	AudioPlaybackProvider,
	useAudioPlayback,
} from "./AudioPlaybackContext";

describe("AudioPlaybackContext", () => {
	describe("useAudioPlayback", () => {
		it("throws when used outside provider", () => {
			// Suppress console.error for this test since we expect an error
			const consoleSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});

			function BadComponent() {
				useAudioPlayback();
				return null;
			}

			expect(() => render(<BadComponent />)).toThrow(
				"useAudioPlayback must be used within AudioPlaybackProvider",
			);

			consoleSpy.mockRestore();
		});

		it("provides context value when used within provider", () => {
			let contextValue: ReturnType<typeof useAudioPlayback> | undefined;

			function TestComponent() {
				contextValue = useAudioPlayback();
				return null;
			}

			render(
				<AudioPlaybackProvider>
					<TestComponent />
				</AudioPlaybackProvider>,
			);

			expect(contextValue).toBeDefined();
			expect(contextValue!.registerAudio).toBeInstanceOf(Function);
			expect(contextValue!.unregisterAudio).toBeInstanceOf(Function);
			expect(contextValue!.startPlayback).toBeInstanceOf(Function);
		});
	});

	describe("startPlayback", () => {
		it("pauses other registered audio elements", () => {
			const pauseMock1 = vi.fn();
			const pauseMock2 = vi.fn();

			function TestComponent() {
				const { registerAudio, startPlayback } = useAudioPlayback();
				const audioRef1 = useRef<HTMLAudioElement | null>(null);
				const audioRef2 = useRef<HTMLAudioElement | null>(null);

				// Simulate registering two audio elements
				audioRef1.current = {
					pause: pauseMock1,
				} as unknown as HTMLAudioElement;
				audioRef2.current = {
					pause: pauseMock2,
				} as unknown as HTMLAudioElement;

				registerAudio("player-1", audioRef1);
				registerAudio("player-2", audioRef2);

				return (
					<>
						<button
							type="button"
							onClick={() => startPlayback("player-1")}
							data-testid="play-1"
						>
							Play 1
						</button>
						<button
							type="button"
							onClick={() => startPlayback("player-2")}
							data-testid="play-2"
						>
							Play 2
						</button>
					</>
				);
			}

			render(
				<AudioPlaybackProvider>
					<TestComponent />
				</AudioPlaybackProvider>,
			);

			// When player 1 starts, player 2 should be paused
			screen.getByTestId("play-1").click();
			expect(pauseMock1).not.toHaveBeenCalled();
			expect(pauseMock2).toHaveBeenCalledTimes(1);

			// When player 2 starts, player 1 should be paused
			screen.getByTestId("play-2").click();
			expect(pauseMock1).toHaveBeenCalledTimes(1);
			expect(pauseMock2).toHaveBeenCalledTimes(1); // Still 1, not paused again
		});

		it("handles null audio refs gracefully", () => {
			function TestComponent() {
				const { registerAudio, startPlayback } = useAudioPlayback();
				const audioRef1 = useRef<HTMLAudioElement | null>(null);
				const audioRef2 = useRef<HTMLAudioElement | null>(null);

				// Register with null refs (simulates unmounted audio elements)
				registerAudio("player-1", audioRef1);
				registerAudio("player-2", audioRef2);

				return (
					<button
						type="button"
						onClick={() => startPlayback("player-1")}
						data-testid="play"
					>
						Play
					</button>
				);
			}

			render(
				<AudioPlaybackProvider>
					<TestComponent />
				</AudioPlaybackProvider>,
			);

			// Should not throw when refs are null
			expect(() => screen.getByTestId("play").click()).not.toThrow();
		});
	});

	describe("unregisterAudio", () => {
		it("removes audio from coordination", () => {
			const pauseMock = vi.fn();

			function TestComponent() {
				const { registerAudio, unregisterAudio, startPlayback } =
					useAudioPlayback();
				const audioRef = useRef<HTMLAudioElement | null>(null);

				audioRef.current = { pause: pauseMock } as unknown as HTMLAudioElement;

				return (
					<>
						<button
							type="button"
							onClick={() => registerAudio("player-1", audioRef)}
							data-testid="register"
						>
							Register
						</button>
						<button
							type="button"
							onClick={() => unregisterAudio("player-1")}
							data-testid="unregister"
						>
							Unregister
						</button>
						<button
							type="button"
							onClick={() => startPlayback("other-player")}
							data-testid="play-other"
						>
							Play Other
						</button>
					</>
				);
			}

			render(
				<AudioPlaybackProvider>
					<TestComponent />
				</AudioPlaybackProvider>,
			);

			// Register then unregister
			screen.getByTestId("register").click();
			screen.getByTestId("unregister").click();

			// Starting another player should not pause the unregistered one
			screen.getByTestId("play-other").click();
			expect(pauseMock).not.toHaveBeenCalled();
		});
	});
});
