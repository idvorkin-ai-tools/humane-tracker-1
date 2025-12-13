import { AnonymousWarning } from "./components/AnonymousWarning";
import { HabitTracker } from "./components/HabitTracker";
import { LoginButton } from "./components/LoginButton";
import { VersionNotification } from "./components/VersionNotification";
import { db } from "./config/db";
import "./App.css";

/**
 * E2E test app for testing the logged-out state with login button.
 * Used when ?e2e-login=true is in the URL.
 */
function TestLoginApp() {
	const handleSignIn = async () => {
		try {
			await db.cloud.login();
		} catch (error) {
			console.error("Error signing in:", error);
		}
	};

	return (
		<div className="App">
			<AnonymousWarning onSignIn={handleSignIn} />
			<HabitTracker userId="anonymous" userMenu={() => <LoginButton />} />
			<VersionNotification />
		</div>
	);
}

export default TestLoginApp;
