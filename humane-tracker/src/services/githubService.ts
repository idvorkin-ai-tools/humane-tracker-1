/**
 * GitHub Integration Service
 * Provides utilities for GitHub repository links and issue creation
 */

// Default repository URL - can be overridden via environment variable
const DEFAULT_REPO_URL = "https://github.com/idvorkin/humane-tracker-1";

export interface GitHubLinks {
	repo: string;
	issues: string;
	newIssue: string;
}

export interface CommitInfo {
	sha: string;
	message: string;
	url: string;
}

export interface BugReportData {
	title: string;
	description: string;
	includeMetadata: boolean;
	screenshot?: string; // base64 data URL
}

/**
 * Get the GitHub repository URL from environment or default
 */
export function getRepoUrl(): string {
	// Check for environment variable override (set at build time via Vite)
	if (
		typeof import.meta !== "undefined" &&
		import.meta.env?.VITE_GITHUB_REPO_URL
	) {
		return import.meta.env.VITE_GITHUB_REPO_URL;
	}
	return DEFAULT_REPO_URL;
}

/**
 * Generate GitHub links from a repository URL
 */
export function getGitHubLinks(repoUrl: string = getRepoUrl()): GitHubLinks {
	const base = repoUrl.replace(/\.git$/, "");
	return {
		repo: base,
		issues: `${base}/issues`,
		newIssue: `${base}/issues/new`,
	};
}

/**
 * Fetch the latest commit from the repository
 */
export async function fetchLatestCommit(
	repoUrl: string = getRepoUrl(),
): Promise<CommitInfo | null> {
	const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
	if (!match) return null;

	const [, owner, repo] = match;
	const cleanRepo = repo.replace(/\.git$/, "");

	try {
		const response = await fetch(
			`https://api.github.com/repos/${owner}/${cleanRepo}/commits?per_page=1`,
			{
				headers: {
					Accept: "application/vnd.github.v3+json",
				},
			},
		);

		if (!response.ok) return null;

		const commits = await response.json();
		if (!commits || commits.length === 0) return null;

		return {
			sha: commits[0].sha.substring(0, 7),
			message: commits[0].commit.message.split("\n")[0],
			url: commits[0].html_url,
		};
	} catch (error) {
		console.error("Failed to fetch latest commit:", error);
		return null;
	}
}

/**
 * Get browser and device information for bug reports
 */
export function getDeviceInfo(): string {
	const ua = navigator.userAgent;
	const platform = navigator.platform || "Unknown platform";
	const language = navigator.language || "Unknown language";
	const screenSize = `${window.screen.width}x${window.screen.height}`;
	const viewportSize = `${window.innerWidth}x${window.innerHeight}`;
	const online = navigator.onLine ? "Online" : "Offline";
	const touchEnabled = "ontouchstart" in window ? "Yes" : "No";

	return [
		`**Platform:** ${platform}`,
		`**User Agent:** ${ua}`,
		`**Language:** ${language}`,
		`**Screen:** ${screenSize}`,
		`**Viewport:** ${viewportSize}`,
		`**Network:** ${online}`,
		`**Touch:** ${touchEnabled}`,
	].join("\n");
}

/**
 * Build the complete issue body with metadata
 */
export async function buildIssueBody(
	description: string,
	includeMetadata: boolean,
	hasScreenshot = false,
): Promise<string> {
	const parts: string[] = [];

	// User description
	parts.push("## Description");
	parts.push(description || "_No description provided_");
	parts.push("");

	// Screenshot note
	if (hasScreenshot) {
		parts.push("## Screenshot");
		parts.push(
			"_A screenshot was captured and copied to clipboard. Please paste it below after creating this issue._",
		);
		parts.push("");
	}

	if (includeMetadata) {
		// App info
		parts.push("## Environment");
		parts.push(`**Date:** ${new Date().toISOString()}`);

		// Try to get latest commit
		const commit = await fetchLatestCommit();
		if (commit) {
			parts.push(`**Version:** [${commit.sha}](${commit.url}) - ${commit.message}`);
		}

		parts.push("");
		parts.push("## Device Info");
		parts.push(getDeviceInfo());
	}

	return parts.join("\n");
}

/**
 * Generate the URL for creating a new GitHub issue with pre-filled content
 */
export async function generateIssueUrl(data: BugReportData): Promise<string> {
	const links = getGitHubLinks();
	const body = await buildIssueBody(
		data.description,
		data.includeMetadata,
		!!data.screenshot,
	);

	const params = new URLSearchParams({
		title: data.title || "Bug Report",
		body,
		labels: "bug,from-app",
	});

	return `${links.newIssue}?${params.toString()}`;
}

/**
 * Convert base64 data URL to Blob for clipboard
 */
function dataUrlToBlob(dataUrl: string): Blob {
	const parts = dataUrl.split(",");
	const mime = parts[0].match(/:(.*?);/)?.[1] || "image/png";
	const bstr = atob(parts[1]);
	let n = bstr.length;
	const u8arr = new Uint8Array(n);
	while (n--) {
		u8arr[n] = bstr.charCodeAt(n);
	}
	return new Blob([u8arr], { type: mime });
}

/**
 * Open the bug report in GitHub
 * Returns the issue body for clipboard backup
 */
export async function openBugReport(data: BugReportData): Promise<string> {
	const body = await buildIssueBody(
		data.description,
		data.includeMetadata,
		!!data.screenshot,
	);

	// Copy screenshot to clipboard if available (so user can paste it)
	// Otherwise copy the text body as backup
	try {
		if (data.screenshot) {
			const blob = dataUrlToBlob(data.screenshot);
			await navigator.clipboard.write([
				new ClipboardItem({
					[blob.type]: blob,
				}),
			]);
		} else {
			await navigator.clipboard.writeText(body);
		}
	} catch (error) {
		console.warn("Failed to copy to clipboard:", error);
		// Fallback: try to copy text if image copy failed
		try {
			await navigator.clipboard.writeText(body);
		} catch {
			// Ignore secondary failure
		}
	}

	// Open GitHub issue page
	const url = await generateIssueUrl(data);
	window.open(url, "_blank", "noopener,noreferrer");

	return body;
}
