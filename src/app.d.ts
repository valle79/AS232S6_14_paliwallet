// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	// Ethereum provider types
	interface Window {
		ethereum?: {
			isMetaMask?: boolean;
			isPali?: boolean;
			request: (args: { method: string; params?: any[] }) => Promise<any>;
			on: (event: string, callback: (...args: any[]) => void) => void;
			removeAllListeners: (event: string) => void;
		};
	}

	// Notification types
	interface Notification {
		id: number;
		message: string;
		type: 'success' | 'error' | 'warning' | 'info';
		duration: number;
		timestamp: number;
	}

	// Error types
	interface WalletError extends Error {
		code?: number | string;
	}

	// Network info types
	interface NetworkInfo {
		chainId: string;
		name: string;
		ensAddress?: string;
	}

	// Balance info types
	interface BalanceInfo {
		balance: string;
		network: string;
		chainId: string;
		currency: string;
	}
}

export {};