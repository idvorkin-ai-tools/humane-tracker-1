import { useEffect, useState } from "react";
import { useVersionCheck } from "../hooks/useVersionCheck";

// Delay before showing notification to avoid interrupting users on page load
const NOTIFICATION_DELAY_MS = 5000;

export function VersionNotification() {
	const { updateAvailable, reload } = useVersionCheck();
	const [dismissed, setDismissed] = useState(false);
	const [showNotification, setShowNotification] = useState(false);

	// Delay showing notification to avoid interrupting users mid-task
	useEffect(() => {
		if (!updateAvailable) {
			setShowNotification(false);
			return;
		}

		const timer = setTimeout(() => {
			setShowNotification(true);
		}, NOTIFICATION_DELAY_MS);

		return () => clearTimeout(timer);
	}, [updateAvailable]);

	if (!showNotification || dismissed) return null;

	return (
		<div
			role="alert"
			aria-live="polite"
			aria-label="Application update available"
			style={{
				position: "fixed",
				bottom: "1rem",
				right: "1rem",
				zIndex: 1000,
				animation: "pulse 2s infinite",
			}}
		>
			<div
				style={{
					backgroundColor: "#4F46E5",
					border: "1px solid rgba(99, 102, 241, 0.3)",
					padding: "1rem",
					borderRadius: "0.75rem",
					boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
					maxWidth: "20rem",
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "0.75rem",
					}}
				>
					<div style={{ fontSize: "1.5rem" }} aria-hidden="true">
						🚀
					</div>
					<div style={{ flex: 1 }}>
						<div
							style={{
								color: "white",
								fontWeight: 600,
							}}
						>
							New Version Available
						</div>
						<div
							style={{
								color: "rgba(199, 210, 254, 1)",
								fontSize: "0.875rem",
							}}
						>
							Reload to get the latest features
						</div>
					</div>
					<button
						onClick={reload}
						style={{
							backgroundColor: "white",
							color: "#4F46E5",
							padding: "0.5rem 1rem",
							borderRadius: "0.5rem",
							fontWeight: 700,
							border: "none",
							cursor: "pointer",
						}}
					>
						Reload
					</button>
					<button
						onClick={() => setDismissed(true)}
						style={{
							color: "rgba(255, 255, 255, 0.7)",
							padding: "0.25rem",
							background: "none",
							border: "none",
							cursor: "pointer",
						}}
						aria-label="Dismiss update notification"
					>
						<svg
							style={{ width: "1.25rem", height: "1.25rem" }}
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>
			</div>
		</div>
	);
}
