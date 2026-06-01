# @supercat1337/ui-localization

A lightweight, framework-agnostic localization library with support for **pluralization**, **named placeholders**, **number/date formatting**, and **seamless integration with BareDOM components**.

## Features

- 🌍 **Framework‑agnostic core** – works in Node.js, browser, or any JS environment.
- 🔌 **BareDOM integration** – auto‑updates UI on language change and when component mounts.
- 📚 **Pluralization** – uses `Intl.PluralRules` – supports any language without hardcoded rules.
- 🧩 **Named placeholders** – `"Hello, {name}!"`
- 🔢 **Number & date formatting** – via `Intl.NumberFormat` and `Intl.DateTimeFormat`.
- 🧹 **Clean API** – all internal details hidden (private fields), only intended methods exposed.
- 📦 **Tiny** – no external runtime dependencies.

## Installation

```bash
npm install @supercat1337/ui-localization
```

If you plan to use `ComponentLocalization` with BareDOM, also install the peer dependency:

```bash
npm install @supercat1337/ui
```

## Quick Start (with BareDOM)

### 1. Global setup (once in your app)

Tell the library how to obtain the current language and how to listen for language changes.

```javascript
import { ComponentLocalization } from '@supercat1337/ui-localization';
import { appConfig } from './services/app-config.js';

ComponentLocalization.getCurrentLanguage = () => appConfig.getCurrentLanguage();
ComponentLocalization.onLanguageChange = callback => appConfig.onLanguageChange(callback);
```

### 2. Define your dictionary

Create a plain object or import a JSON file:

```javascript
const dictionary = {
    en: {
        title: 'Upload file',
        filesCountForms: [
            '{count} files', // zero
            '{count} file', // one
            '{count} files', // two
            '{count} files', // few
            '{count} files', // many
            '{count} files', // other
        ],
    },
    ru: {
        title: 'Отправить файл',
        filesCountForms: [
            '{count} файлов',
            '{count} файл',
            '{count} файла',
            '{count} файла',
            '{count} файлов',
            '{count} файлов',
        ],
    },
};
```

### 3. Create a component‑specific localization class (recommended)

Create a `locales.js` file next to your component:

```javascript
// @ts-check
import { ComponentLocalization } from '@supercat1337/ui-localization';

const dictionary = {
    /* as above */
};

/**
 * @template {import('@supercat1337/ui').Component} TComponent
 * @extends {ComponentLocalization<typeof dictionary, TComponent>}
 */
export class L10n extends ComponentLocalization {
    /**
     * @param {{ component: TComponent, update: (l10n: L10n<TComponent>, component: TComponent) => void }} options
     */
    constructor(options) {
        super(dictionary, options);
    }
    get title() {
        return this.t('title');
    }
    getFilesCountText(count) {
        const forms = this.t('filesCountForms');
        return this.plural(count, forms);
    }
}
```

### 4. Use in your BareDOM component

```javascript
// @ts-check
import { Component } from '@supercat1337/ui';
import { L10n } from './locales.js';

export class UploadScreen extends Component {
    static layout = `<h1 data-ref="title"></h1><span data-ref="counter"></span>`;

    // ✅ Do NOT annotate refsAnnotation – let TypeScript infer the exact type
    refsAnnotation = {
        title: HTMLHeadingElement.prototype,
        counter: HTMLSpanElement.prototype,
    };

    constructor() {
        super();
        this.fileCount = 0;

        /** @type {L10n<this>} */
        this.l10n = new L10n({
            component: this,
            update: (l10n, comp) => {
                const refs = comp.getRefs();
                refs.title.innerText = l10n.title;
                // Dynamic text will be updated directly, not via refresh() – see below
                refs.counter.innerText = l10n.getFilesCountText(comp.fileCount);
            },
        });
    }

    // No need to call refresh() in connectedCallback – it happens automatically.
    // For state changes, update the specific DOM element directly:
    onFileAdded() {
        this.fileCount++;
        const refs = this.getRefs();
        refs.counter.innerText = this.l10n.getFilesCountText(this.fileCount);
    }
}
```

**Important notes:**

- **No `refresh()` in `connectedCallback`** – the library automatically updates the UI after the component is mounted (using the `'connect'` event).
- **Update dynamic texts directly** – use `refs.element.innerText = this.l10n.someMethod(param)` instead of calling `refresh()`. This is more efficient and avoids re‑rendering static texts.
- **Call `refresh()` only when many UI elements depend on state** – if you have dozens of dynamic fields and don't want to update each manually, a single `refresh()` is acceptable, but be aware it will re‑execute the whole `update` function.
- **Do not annotate `refsAnnotation`** – let JSDoc/TypeScript infer the exact type. Adding `/** @type {import('@supercat1337/ui').RefsAnnotation} */` will break the precise typing of `comp.getRefs()`.

## Standalone Usage (without BareDOM)

```javascript
import { Localization } from '@supercat1337/ui-localization';

const provider = {
    getCurrentLanguage: () => 'en',
    onLanguageChange: cb => {
        /* subscribe */ return () => {};
    },
};

const l10n = new Localization(dictionary, provider);
console.log(l10n.t('title')); // "Upload file"
console.log(l10n.plural(5, l10n.t('filesCountForms'))); // "5 files"
console.log(l10n.formatNumber(1234.56)); // "1,234.56"
```

## API Reference

See [ai_docs.md](./ai_docs.md) for full API details, dictionary format, and lifecycle integration.

## License

MIT
