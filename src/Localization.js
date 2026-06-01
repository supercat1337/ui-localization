// @ts-check

/**
 * @template {Record<string, any>} TDictionary
 */
export class Localization {
    /** @type {TDictionary} */
    #dictionary;
    /** @type {import('./types.d.ts').LanguageProvider} */
    #languageProvider;
    /** @type {Map<string, Intl.PluralRules>} */
    #pluralCache = new Map();
    /** @type {Map<string, Intl.NumberFormat>} */
    #numberCache = new Map();
    /** @type {Map<string, Intl.DateTimeFormat>} */
    #dateCache = new Map();
    /** @type {(() => void) | null} */
    #unsubscribe = null;

    /**
     * @param {TDictionary} dictionary
     * @param {import('./types.d.ts').LanguageProvider} languageProvider
     */
    constructor(dictionary, languageProvider) {
        this.#dictionary = dictionary;
        this.#languageProvider = languageProvider;
    }

    /**
     * @returns {Record<string, any>}
     */
    #getRaw() {
        const lang = this.#languageProvider.getCurrentLanguage();
        //console.log(lang);
        return this.#dictionary[lang] || this.#dictionary.en || {};
    }

    /**
     * @param {string} template
     * @param {Record<string, any>} [params]
     * @returns {string}
     */
    #format(template, params = {}) {
        if (!template) return '';
        return template.replace(
            /\{([^{}]+)\}/g,
            (/** @type {string} */ _, /** @type {string} */ key) => {
                const val = params[key.trim()];
                return val !== undefined ? String(val) : '';
            }
        );
    }

    /**
     * @param {number} count
     * @returns {string}
     */
    #getPluralCategory(count) {
        const lang = this.#languageProvider.getCurrentLanguage();
        let rules = this.#pluralCache.get(lang);
        if (!rules) {
            rules = new Intl.PluralRules(lang);
            this.#pluralCache.set(lang, rules);
        }
        return rules.select(count);
    }

    /**
     * @param {string} category
     * @returns {number}
     */
    static #pluralIndex(category) {
        /** @type {Record<string, number>} */
        const map = { zero: 0, one: 1, two: 2, few: 3, many: 4, other: 5 };
        const idx = map[category];
        return idx !== undefined ? idx : 5;
    }

    // ---------- Public API ----------
    /**
     * @param {string} key
     * @returns {string}
     */
    t(key) {
        return this.#getRaw()[key] ?? '';
    }

    /**
     * @param {number} count
     * @param {string[]} forms
     * @param {Record<string, any>} [params]
     * @returns {string}
     */
    plural(count, forms, params = {}) {
        const category = this.#getPluralCategory(count);
        const idx = Localization.#pluralIndex(category);
        const template = forms[idx] ?? forms[forms.length - 1] ?? '';
        return this.#format(template, { ...params, count });
    }

    /**
     * @param {number} value
     * @param {Intl.NumberFormatOptions} [options]
     * @returns {string}
     */
    formatNumber(value, options = {}) {
        const lang = this.#languageProvider.getCurrentLanguage();
        const key = `${lang}|${JSON.stringify(options)}`;
        let formatter = this.#numberCache.get(key);
        if (!formatter) {
            formatter = new Intl.NumberFormat(lang, options);
            this.#numberCache.set(key, formatter);
        }
        return formatter.format(value);
    }

    /**
     * @param {Date|number} date
     * @param {Intl.DateTimeFormatOptions} [options]
     * @returns {string}
     */
    formatDate(date, options = {}) {
        const lang = this.#languageProvider.getCurrentLanguage();
        const key = `${lang}|${JSON.stringify(options)}`;
        let formatter = this.#dateCache.get(key);
        if (!formatter) {
            formatter = new Intl.DateTimeFormat(lang, options);
            this.#dateCache.set(key, formatter);
        }
        return formatter.format(date);
    }

    /**
     * @param {(l10n: this) => void} callback
     * @returns {() => void}
     */
    onLanguageChange(callback) {
        const handler = () => callback(this);
        return this.#languageProvider.onLanguageChange(handler);
    }

    /**
     * @returns {() => void}
     */
    startListening() {
        if (this.#unsubscribe) return this.#unsubscribe;
        this.#unsubscribe = this.onLanguageChange(() => {});
        return this.#unsubscribe;
    }

    stopListening() {
        if (this.#unsubscribe) {
            this.#unsubscribe();
            this.#unsubscribe = null;
        }
    }
}
