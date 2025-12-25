import { useCallback, useRef, useState } from "react";
import { audioRecordingRepository } from "../repositories/audioRecordingRepository";
import { gratitudeLogRepository } from "../repositories/gratitudeLogRepository";
import "./GratitudeCard.css";
import { AudioRecorderButton } from "./AudioRecorderButton";

interface GratitudeCardProps {
	userId: string;
}

export function GratitudeCard({ userId }: GratitudeCardProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [noteText, setNoteText] = useState("");
	const [saveError, setSaveError] = useState(false);
	const [isRecording, setIsRecording] = useState(false);
	const stopRecordingRef = useRef<(() => Promise<void>) | null>(null);

	const handleRecordingComplete = useCallback(
		async (blob: Blob, durationMs: number) => {
			try {
				await audioRecordingRepository.create({
					userId,
					audioBlob: blob,
					mimeType: blob.type || "audio/webm",
					durationMs,
					affirmationTitle: "Gratitude",
					recordingContext: "didit",
					date: new Date(),
					transcriptionStatus: "pending",
				});
				setIsOpen(false);
				setNoteText("");
			} catch (error) {
				console.error("Failed to save audio recording:", error);
				setSaveError(true);
			}
		},
		[userId],
	);

	const handleSaveNote = useCallback(async () => {
		setSaveError(false);

		// If recording, stop and save it
		if (isRecording && stopRecordingRef.current) {
			await stopRecordingRef.current();
			return;
		}

		// Save text note if there is one
		if (!noteText.trim()) {
			setIsOpen(false);
			return;
		}

		try {
			await gratitudeLogRepository.create({
				userId,
				note: noteText.trim(),
				date: new Date(),
			});
			setIsOpen(false);
			setNoteText("");
		} catch (error) {
			console.error("Failed to save gratitude log:", error);
			setSaveError(true);
		}
	}, [noteText, userId, isRecording]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSaveNote();
			} else if (e.key === "Escape") {
				setIsOpen(false);
				setNoteText("");
			}
		},
		[handleSaveNote],
	);

	return (
		<div className="gratitude-card">
			<div className="gratitude-header">
				<span className="gratitude-card-title">What are you grateful for?</span>
			</div>

			{!isOpen ? (
				<div className="gratitude-actions">
					<button
						type="button"
						className="gratitude-action"
						onClick={() => setIsOpen(true)}
					>
						🙏 Log Gratitude
					</button>
				</div>
			) : (
				<div className="gratitude-note-input">
					<div
						className={`gratitude-input-row ${isRecording ? "recording-active" : ""}`}
					>
						{!isRecording && (
							<textarea
								placeholder="I'm grateful for..."
								value={noteText}
								onChange={(e) => {
									setNoteText(e.target.value);
									setSaveError(false);
								}}
								onKeyDown={handleKeyDown}
								autoFocus
							/>
						)}
						<AudioRecorderButton
							onRecordingComplete={handleRecordingComplete}
							onRecordingStateChange={setIsRecording}
							stopRecordingRef={stopRecordingRef}
							onError={(err) => {
								console.error("Recording error:", err);
								setSaveError(true);
							}}
						/>
					</div>
					<div className="gratitude-note-actions">
						<button
							type="button"
							className="gratitude-save"
							onClick={handleSaveNote}
						>
							Save
						</button>
						<button
							type="button"
							className="gratitude-cancel"
							onClick={() => {
								setIsOpen(false);
								setNoteText("");
								setSaveError(false);
							}}
						>
							{"\u2715"}
						</button>
					</div>
					{saveError && <span className="gratitude-error">Failed to save</span>}
				</div>
			)}
		</div>
	);
}
