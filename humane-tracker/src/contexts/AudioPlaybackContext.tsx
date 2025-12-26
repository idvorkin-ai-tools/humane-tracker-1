import { createContext, useCallback, useContext, useRef } from "react";

interface AudioPlaybackContextValue {
	// Register an audio element and get a play function that coordinates with others
	registerAudio: (
		id: string,
		audioRef: React.RefObject<HTMLAudioElement | null>,
	) => void;
	unregisterAudio: (id: string) => void;
	// Call this when starting playback - it will pause any other playing audio
	startPlayback: (id: string) => void;
}

const AudioPlaybackContext = createContext<AudioPlaybackContextValue | null>(
	null,
);

export function AudioPlaybackProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	// Track all registered audio elements by ID
	const audioRefs = useRef<
		Map<string, React.RefObject<HTMLAudioElement | null>>
	>(new Map());

	const registerAudio = useCallback(
		(id: string, audioRef: React.RefObject<HTMLAudioElement | null>) => {
			audioRefs.current.set(id, audioRef);
		},
		[],
	);

	const unregisterAudio = useCallback((id: string) => {
		audioRefs.current.delete(id);
	}, []);

	const startPlayback = useCallback((id: string) => {
		// Pause all other audio elements
		for (const [audioId, ref] of audioRefs.current.entries()) {
			if (audioId !== id && ref.current) {
				ref.current.pause();
			}
		}
	}, []);

	return (
		<AudioPlaybackContext.Provider
			value={{ registerAudio, unregisterAudio, startPlayback }}
		>
			{children}
		</AudioPlaybackContext.Provider>
	);
}

export function useAudioPlayback() {
	const context = useContext(AudioPlaybackContext);
	if (!context) {
		throw new Error(
			"useAudioPlayback must be used within AudioPlaybackProvider",
		);
	}
	return context;
}
