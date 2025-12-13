import { db } from "../config/db";
import "./LoginButton.css";

export function LoginButton() {
	const handleLogin = async () => {
		try {
			await db.cloud.login();
		} catch (error) {
			console.error("Error signing in:", error);
		}
	};

	return (
		<button className="login-button" onClick={handleLogin}>
			Sign In
		</button>
	);
}
