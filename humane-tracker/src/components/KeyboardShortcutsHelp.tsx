import { useCallback, useEffect } from "react";
import "./KeyboardShortcutsHelp.css";

interface KeyboardShortcutsHelpProps {
	isOpen: boolean;
	onClose: () => void;
}

export function KeyboardShortcutsHelp({
	isOpen,
	onClose,
}: KeyboardShortcutsHelpProps) {
	// Close on Escape key
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				onClose();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	// Close on backdrop click
	const handleBackdropClick = useCallback(
		(e: React.MouseEvent) => {
			if (e.target === e.currentTarget) {
				onClose();
			}
		},
		[onClose],
	);

	if (!isOpen) return null;

	return (
		<div className="keyboard-shortcuts-overlay" onClick={handleBackdropClick}>
			<div className="keyboard-shortcuts-dialog">
				<div className="keyboard-shortcuts-header">
					<h2>Keyboard Shortcuts</h2>
					<button
						type="button"
						className="keyboard-shortcuts-close"
						onClick={onClose}
						aria-label="Close"
					>
						×
					</button>
				</div>

				<div className="keyboard-shortcuts-content">
					<section className="keyboard-shortcuts-section">
						<h3>Global</h3>
						<div className="keyboard-shortcut">
							<kbd>?</kbd>
							<span>Show keyboard shortcuts</span>
						</div>
						<div className="keyboard-shortcut">
							<kbd>g</kbd>
							<span>Open Grateful card</span>
						</div>
						<div className="keyboard-shortcut">
							<kbd>a</kbd>
							<span>Open Affirmation card</span>
						</div>
						<div className="keyboard-shortcut">
							<kbd>Cmd/Ctrl</kbd> + <kbd>I</kbd>
							<span>Open bug reporter</span>
						</div>
					</section>

					<section className="keyboard-shortcuts-section">
						<h3>Grateful & Affirmation Cards</h3>
						<div className="keyboard-shortcut">
							<kbd>Enter</kbd>
							<span>Save and close</span>
						</div>
						<div className="keyboard-shortcut">
							<kbd>Cmd/Ctrl</kbd> + <kbd>Enter</kbd>
							<span>Save and add another</span>
						</div>
						<div className="keyboard-shortcut">
							<kbd>Esc</kbd>
							<span>Cancel</span>
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}
