import type React from "react";
import {
	generateCrashReportUrl,
	getBuildInfo,
} from "../services/githubService";
import "./CrashFallback.css";

interface CrashFallbackProps {
	error: Error;
}

export function CrashFallback({ error }: CrashFallbackProps) {
	const buildInfo = getBuildInfo();
	const reportUrl = generateCrashReportUrl(error);

	const handleReload = () => {
		window.location.reload();
	};

	return (
		<div className="crash-fallback">
			<div className="crash-fallback-content">
				<div className="crash-fallback-icon">
					<svg
						width="48"
						height="48"
						viewBox="0 0 48 48"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
					>
						<circle cx="24" cy="24" r="20" />
						<path d="M24 14v12M24 30h.01" />
					</svg>
				</div>

				<h1 className="crash-fallback-title">Something went wrong</h1>

				<p className="crash-fallback-message">{error.message}</p>

				{error.stack && (
					<details className="crash-fallback-details">
						<summary>Technical details</summary>
						<pre className="crash-fallback-stack">{error.stack}</pre>
					</details>
				)}

				<div className="crash-fallback-actions">
					<button
						type="button"
						className="crash-fallback-btn crash-fallback-btn-primary"
						onClick={handleReload}
					>
						<svg
							width="16"
							height="16"
							viewBox="0 0 16 16"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
						>
							<path d="M1 8a7 7 0 0114-1M15 8a7 7 0 01-14 1" />
							<path d="M1 3V8h5M15 13V8h-5" />
						</svg>
						Reload App
					</button>

					<a
						href={reportUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="crash-fallback-btn crash-fallback-btn-secondary"
					>
						<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
							<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
						</svg>
						Report on GitHub
					</a>
				</div>

				{buildInfo.sha && buildInfo.sha !== "development" && (
					<p className="crash-fallback-build">
						Build:{" "}
						<a
							href={buildInfo.commitUrl}
							target="_blank"
							rel="noopener noreferrer"
						>
							{buildInfo.sha.slice(0, 7)}
						</a>
					</p>
				)}
			</div>
		</div>
	);
}
