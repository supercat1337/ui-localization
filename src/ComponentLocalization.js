// @ts-check

import { Localization } from './Localization.js';

/**
 * @template {Record<string, any>} TDictionary
 * @extends {Localization<TDictionary>}
 */
export class ComponentLocalization extends Localization {
    /** @type {import('./types.d.ts').BareComponent | null} */
    #component = null;
    /** @type {((l10n: ComponentLocalization<TDictionary>, component: import('./types.d.ts').BareComponent) => void) | null} */
    #updateFn = null;
    /** @type {(() => void) | null} */
    #unsubscribe = null;

    /**
     * @param {TDictionary} dictionary
     * @param {Object} [options]
     * @param {import('./types.d.ts').BareComponent} [options.component]
     * @param {(l10n: ComponentLocalization<TDictionary>, component: import('./types.d.ts').BareComponent) => void} [options.update]
     * @param {import('./types.d.ts').LanguageProvider} [options.languageProvider]
     */
    constructor(dictionary, { component, update, languageProvider } = {}) {
        const provider = languageProvider ?? {
            getCurrentLanguage: () => ComponentLocalization.getCurrentLanguage(),
            onLanguageChange: cb => ComponentLocalization.onLanguageChange(cb),
        };
        super(dictionary, provider);
        if (component && update) {
            this.attach(component, update);
        }
    }

    /**
     * @param {import('./types.d.ts').BareComponent} component
     * @param {(l10n: ComponentLocalization<TDictionary>, component: import('./types.d.ts').BareComponent) => void} updateFn
     */
    attach(component, updateFn) {
        if (this.#component) this.detach();
        this.#component = component;
        this.#updateFn = updateFn;

        this.#unsubscribe = this.onLanguageChange(() => this.#applyUpdate());

        if (typeof component.addDisposer === 'function') {
            component.addDisposer(() => this.detach());
        }

        if (component.isConnected) {
            this.#applyUpdate();
        }
    }

    refresh() {
        if (this.#component?.isConnected) {
            this.#applyUpdate();
        }
    }

    detach() {
        if (this.#unsubscribe) {
            this.#unsubscribe();
            this.#unsubscribe = null;
        }
        this.#component = null;
        this.#updateFn = null;
    }

    #applyUpdate() {
        if (!this.#component || !this.#updateFn) return;
        this.#updateFn(this, this.#component);
    }

    // ---- Static methods (must be overridden by the app) ----
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
