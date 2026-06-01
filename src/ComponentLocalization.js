// @ts-check

import { Localization } from './Localization.js';

/**
 * @template {Record<string, any>} TDictionary
 * @template {import('./types.d.ts').BareComponent} TComponent
 * @extends {Localization<TDictionary>}
 */
export class ComponentLocalization extends Localization {
    /** @type {TComponent | null} */
    #component = null;
    /** @type {((l10n: ComponentLocalization<TDictionary, TComponent>, component: TComponent) => void) | null} */
    #updateFn = null;
    /** @type {(() => void) | null} */
    #unsubscribe = null;
    /** @type {(() => void) | null} */
    #unsubscribeConnect = null;

    /**
     * @param {TDictionary} dictionary
     * @param {Object} options
     * @param {TComponent} options.component
     * @param {(l10n: ComponentLocalization<TDictionary, TComponent>, component: TComponent) => void} options.update
     * @param {import('./types.d.ts').LanguageProvider} [options.languageProvider]
     */
    constructor(dictionary, { component, update, languageProvider }) {
        const provider = languageProvider ?? {
            getCurrentLanguage: () => ComponentLocalization.getCurrentLanguage(),
            onLanguageChange: cb => ComponentLocalization.onLanguageChange(cb),
        };
        super(dictionary, provider);
        this.attach(component, update);
    }

    /**
     * @param {TComponent} component
     * @param {(l10n: ComponentLocalization<TDictionary, TComponent>, component: TComponent) => void} updateFn
     */
    attach(component, updateFn) {
        if (this.#component) this.detach();
        this.#component = component;
        this.#updateFn = updateFn;

        // Subscribe to language changes
        this.#unsubscribe = this.onLanguageChange(() => this.refresh());

        // Apply update immediately if component is already connected
        if (component.isConnected) {
            this.refresh();
        }

        // Otherwise wait for the 'connect' event (emitted after connectedCallback)
        if (typeof component.on === 'function') {
            this.#unsubscribeConnect = component.on('connect', () => {
                this.refresh();
            });
        }
    }

    /**
     * Manually triggers the update function (e.g., after component state changes).
     */
    refresh() {
        if (this.#component?.isConnected && this.#updateFn) {
            this.#updateFn(this, this.#component);
        }
    }

    /**
     * Detaches from the component and stops listening to language changes.
     */
    detach() {
        // Unsubscribe from language changes
        if (this.#unsubscribe) {
            this.#unsubscribe();
            this.#unsubscribe = null;
        }
        // Unsubscribe from 'connect' event
        if (this.#unsubscribeConnect) {
            this.#unsubscribeConnect();
            this.#unsubscribeConnect = null;
        }
        this.#component = null;
        this.#updateFn = null;
    }

    // ---- Static methods (must be overridden by the application) ----
    /** @type {() => string} */
    static getCurrentLanguage = () => {
        console.warn('[ui-localization] ComponentLocalization.getCurrentLanguage not implemented');
        return 'en';
    };

    /** @type {(callback: (lang: string) => void) => () => void} */
    static onLanguageChange = callback => {
        console.warn('[ui-localization] ComponentLocalization.onLanguageChange not implemented');
        return () => {};
    };
}
