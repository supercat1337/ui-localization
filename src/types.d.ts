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

/**
 * Framework-agnostic localization manager.
 * @template TDictionary - Record of language keys to resource objects (Record<string, string | string[]>)
 */
export class Localization<TDictionary extends Record<string, any> = any> {
    /**
     * @param dictionary - Object with language codes as keys and resource objects as values.
     * @param languageProvider - Provides current language and change notifications.
     */
    constructor(dictionary: TDictionary, languageProvider: LanguageProvider);

    /**
     * Returns a simple string by key.
     * @param key - Translation key.
     */
    t(key: string): string;

    /**
     * Returns the correct pluralized string for the given count.
     * @param count - Number to determine plural category.
     * @param forms - Array of 6 strings: [zero, one, two, few, many, other].
     * @param params - Additional named placeholders to replace in the template.
     * @returns Formatted plural string.
     */
    plural(count: number, forms: string[], params?: Record<string, any>): string;

    /**
     * Formats a number according to the current language.
     * @param value - Number to format.
     * @param options - Intl.NumberFormatOptions.
     */
    formatNumber(value: number, options?: Intl.NumberFormatOptions): string;

    /**
     * Formats a date according to the current language.
     * @param date - Date or timestamp.
     * @param options - Intl.DateTimeFormatOptions.
     */
    formatDate(date: Date | number, options?: Intl.DateTimeFormatOptions): string;

    /**
     * Subscribes to language changes.
     * @param callback - Called with this Localization instance after language changes.
     * @returns Unsubscribe function.
     */
    onLanguageChange(callback: (l10n: this) => void): () => void;

    /**
     * Starts listening to language changes (idempotent).
     * @returns Unsubscribe function.
     */
    start(): () => void;

    /** Stops listening to language changes. */
    stop(): void;
}

/**
 * Extended localization class for BareDOM components.
 * Automatically attaches to component lifecycle and updates UI on language change.
 * @template TDictionary - Same as Localization.
 */
export class ComponentLocalization<
    TDictionary extends Record<string, any> = any,
> extends Localization<TDictionary> {
    /**
     * @param dictionary - Translation dictionary.
     * @param options - Optional configuration.
     */
    constructor(
        dictionary: TDictionary,
        options?: {
            component?: BareComponent;
            update?: (l10n: this, component: BareComponent) => void;
            languageProvider?: LanguageProvider;
        }
    );

    /**
     * Attaches the localization instance to a BareDOM component.
     * @param component - Component instance.
     * @param updateFn - Called on language change or refresh().
     */
    attach(
        component: BareComponent,
        updateFn: (l10n: this, component: BareComponent) => void
    ): void;

    /** Manually triggers the update function (e.g., after component state changes). */
    refresh(): void;

    /** Detaches from component and stops listening to language changes. */
    detach(): void;

    /**
     * Static method to get current language.
     * Must be overridden by the application.
     */
    static getCurrentLanguage: () => string;

    /**
     * Static method to subscribe to language changes.
     * Must be overridden by the application.
     */
    static onLanguageChange: (callback: (lang: string) => void) => () => void;
}
