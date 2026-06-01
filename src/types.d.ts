/**
 * Provider for language management.
 * Used by Localization to get current language and subscribe to changes.
 */
export interface LanguageProvider {
    /** Returns current language code (e.g., 'en', 'ru') */
    getCurrentLanguage(): string;
    /**
     * Subscribes to language changes.
     * @param callback - Called with new language code.
     * @returns Unsubscribe function.
     */
    onLanguageChange(callback: (lang: string) => void): () => void;
}

/**
 * Minimal interface of a BareDOM component.
 * Used by ComponentLocalization to integrate with component lifecycle.
 */
export interface BareComponent {
    /** Registers a cleanup function called when component unmounts */
    addDisposer(fn: () => void): void;
    /** Whether the component is currently mounted in the DOM */
    isConnected: boolean;
    /** Returns the map of refs (elements with data-ref) */
    getRefs(): Record<string, HTMLElement>;
}
