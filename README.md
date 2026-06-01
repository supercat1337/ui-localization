# @supercat1337/ui-localization

A lightweight, framework-agnostic localization library with built‑in support for **pluralization**, **named placeholders**, **number/date formatting**, and **seamless integration with BareDOM components**.

## Features

- 🌍 **Framework‑agnostic core** – works in Node.js, browser, or any JS environment.
- 🔌 **BareDOM integration** – auto‑updates UI on language change, respects component lifecycle.
- 📚 **Pluralization** – uses `Intl.PluralRules` – supports any language without hardcoded rules.
- 🧩 **Named placeholders** – `"Hello, {name}!"`
- 🔢 **Number & date formatting** – via `Intl.NumberFormat` and `Intl.DateTimeFormat`.
- 🧹 **Clean API** – all internal details hidden (private fields), only intended methods exposed.
- 📦 **Tiny** – no external runtime dependencies (except `Intl` APIs, available in all modern environments).

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
            '{count} files', // other (required)
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

### 3. Use in a BareDOM component

```javascript
import { Component } from '@supercat1337/ui';
import { ComponentLocalization } from '@supercat1337/ui-localization';

export class UploadScreen extends Component {
    static layout = `<h1 data-ref="title"></h1><span data-ref="counter"></span>`;

    constructor() {
        super();
        this.fileCount = 0;

        this.l10n = new ComponentLocalization(dictionary, {
            component: this,
            update: (l10n, comp) => {
                const refs = comp.getRefs();
                refs.title.innerText = l10n.t('title');
                const forms = l10n.t('filesCountForms');
                refs.counter.innerText = l10n.plural(comp.fileCount, forms);
            },
        });
    }

    connectedCallback() {
        this.l10n.refresh();
    }

    onFileAdded() {
        this.fileCount++;
        this.l10n.refresh(); // re‑evaluate dynamic texts
    }
}
```

## Advanced: Dedicated Localization Class

For complex components, create a separate class with getters (static texts) and methods (dynamic texts).

```javascript
import { ComponentLocalization } from '@supercat1337/ui-localization';

const dictionary = {
    /* same as above */
};

export class UploadScreenLocales extends ComponentLocalization {
    constructor(options) {
        super(dictionary, options);
    }

    // static text as getter
    get title() {
        return this.t('title');
    }

    // dynamic text as method
    getFilesCountText(count) {
        const forms = this.t('filesCountForms');
        return this.plural(count, forms);
    }
}
```

Then in your component:

```javascript
this.l10n = new UploadScreenLocales({
    component: this,
    update: (l10n, comp) => {
        comp.getRefs().title.innerText = l10n.title;
        comp.getRefs().counter.innerText = l10n.getFilesCountText(comp.fileCount);
    },
});
```

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

### Performance: Prefer Direct Updates Over Full Refresh

When only a small part of the UI changes (e.g., a counter, progress bar, or error message), avoid calling `l10n.refresh()`. Instead, update the specific DOM element using the locale method directly.

**❌ Inefficient:**

```javascript
this.fileCount++;
this.l10n.refresh(); // updates ALL texts in the component
```

**✅ Efficient:**

```javascript
this.fileCount++;
const refs = this.getRefs();
refs.counter.innerText = this.l10n.getFilesCountText(this.fileCount);
```

Call `refresh()` only when:

- The language changes (handled automatically by `ComponentLocalization`)
- Many texts depend on component state and you want a simple one‑liner (but be aware of performance)

For components with many dynamic texts, consider using a reactive state library (e.g., MobX) that automatically calls specific updaters.

---

## API Reference

See [ai_docs.md](./ai_docs.md) for full API details, dictionary format, and lifecycle integration.

## License

MIT
