import "./AnonymousWarning.css";

interface AnonymousWarningProps {
	onSignIn?: () => void;
}

export function AnonymousWarning({ onSignIn }: AnonymousWarningProps) {
	return (
		<div className="anonymous-warning">
			<span className="anonymous-warning-icon">⚠️</span>
			<span className="anonymous-warning-text">
				Your data is not being saved.{" "}
				{onSignIn ? (
					<button className="anonymous-warning-link" onClick={onSignIn}>
						Sign in
					</button>
				) : (
					"Sign in"
				)}{" "}
				to keep your habits.
			</span>
		</div>
	);
}
