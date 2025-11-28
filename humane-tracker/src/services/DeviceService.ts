/**
 * Humble Object for browser API access.
 * Isolates localStorage and window calls for testability.
 */
export const DeviceService = {
	getStorageItem(key: string): string | null {
		try {
			return localStorage.getItem(key);
		} catch {
			return null;
		}
	},

	setStorageItem(key: string, value: string): void {
		try {
			localStorage.setItem(key, value);
		} catch {
			// localStorage unavailable (private browsing, quota)
		}
	},
};

export type DeviceServiceType = typeof DeviceService;
