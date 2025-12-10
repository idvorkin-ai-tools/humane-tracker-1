import { AnonymousWarning } from "./components/AnonymousWarning";
import { HabitTracker } from "./components/HabitTracker";
import { LoginButton } from "./components/LoginButton";
import { VersionNotification } from "./components/VersionNotification";
import "./App.css";

/**
 * E2E test app for testing the logged-out state with login button.
 * Used when ?e2e-login=true is in the URL.
 */
function TestLoginApp() {
	return (
		<div className="App">
			<AnonymousWarning />
			<HabitTracker userId="anonymous" userMenu={() => <LoginButton />} />
			<VersionNotification />
		</div>
	);
}

export default TestLoginApp;
