# `@supercat1337/ui-localization` – Technical Documentation for LLMs

This document provides a complete technical reference for the `@supercat1337/ui-localization` package. Use it to understand the internal API, dictionary format, and integration patterns when generating code for this library.

## Overview

The package exports two classes:

- **`Localization`** – framework‑agnostic, pure JS. Does not assume any DOM or component model.
- **`ComponentLocalization`** – extends `Localization` and adds convenience methods for BareDOM components (automatic lifecycle binding, UI refresh on language change).

Both classes use **private fields** (`#`) – no internal properties are exposed. Only the documented public API is accessible.

## Dictionary Format

A dictionary is an object where each key is a language code (e.g., `"en"`, `"ru"`), and the value is a resource object of shape `Record<string, string | string[]>`.

### String values

Simple translation with optional named placeholders:

```json
{
    "greeting": "Hello, {name}!",
    "simple": "Just text"
}
```

Placeholders are replaced using `{key}`. The replacement values are passed as an object to `plural()` or internally when using `t()` directly (no replacement in `t()` – use `plural()` or manual formatting).

### Array values (pluralization)

An array of **exactly 6 strings** representing the plural forms in the order:

| Index | Category | Example (English)    |
| ----- | -------- | -------------------- |
| 0     | zero     | "0 files"            |
| 1     | one      | "1 file"             |
| 2     | two      | "2 files" (not used) |
| 3     | few      | "3 files" (not used) |
| 4     | many     | "5 files" (not used) |
| 5     | other    | "10 files"           |

For languages that don't use all categories, repeat the appropriate form (usually the `other` form for unused slots).

Example for English:

```json
"filesCountForms": [
  "{count} files",
  "{count} file",
  "{count} files",
  "{count} files",
  "{count} files",
  "{count} files"
]
```

The placeholder `{count}` is automatically replaced by the actual number when `plural()` is called. Additional placeholders can be passed via the third argument of `plural()`.

## Public API – `Localization`

### Constructor

```typescript
new Localization(dictionary: Record<string, Record<string, string | string[]>>, languageProvider: LanguageProvider)
```

**`LanguageProvider` interface:**

```typescript
interface LanguageProvider {
    getCurrentLanguage(): string;
    onLanguageChange(callback: (lang: string) => void): () => void;
}
```

### Methods

#### `t(key: string): string`

Returns the raw translation string for the current language. Does **not** perform placeholder replacement. To replace placeholders, use `plural()` or the protected `_format()` (not exposed; implement custom formatting manually if needed).

#### `plural(count: number, forms: string[], params?: Record<string, any>): string`

Selects the correct plural form based on `count` and the current language rules, then replaces `{count}` and any extra keys from `params`.

Example:

```javascript
l10n.plural(5, ['{count} files', '{count} file', ...]);
// returns "5 files"
```

#### `formatNumber(value: number, options?: Intl.NumberFormatOptions): string`

Formats a number using `Intl.NumberFormat` with current language.

#### `formatDate(date: Date | number, options?: Intl.DateTimeFormatOptions): string`

Formats a date using `Intl.DateTimeFormat`.

#### `onLanguageChange(callback: (l10n: Localization) => void): () => void`

Subscribes to language changes. The callback receives the `Localization` instance. Returns an unsubscribe function.

#### `start(): () => void`

Starts listening to language changes (idempotent). Returns unsubscribe. The library does **not** auto‑start; you must call `start()` or rely on `ComponentLocalization` which starts automatically when attached.

#### `stop(): void`

Stops listening.

## Public API – `ComponentLocalization`

Extends `Localization` with additional methods and static configuration.

### Static methods (must be overridden by the host application)

```typescript
ComponentLocalization.getCurrentLanguage: () => string;
ComponentLocalization.onLanguageChange: (callback: (lang: string) => void) => () => void;
```

These act as the global language provider for all `ComponentLocalization` instances that do not receive a custom `languageProvider` in constructor.

### Constructor

```typescript
new ComponentLocalization(
  dictionary: Dictionary,
  options?: {
    component?: BareComponent;      // BareDOM component instance
    update?: (l10n: ComponentLocalization, component: BareComponent) => void;
    languageProvider?: LanguageProvider;
  }
)
```

If `component` and `update` are provided, `attach()` is called automatically.

**`BareComponent` interface** (expected from `@supercat1337/ui`):

```typescript
interface BareComponent {
    addDisposer(fn: () => void): void;
    isConnected: boolean;
    getRefs(): Record<string, HTMLElement>;
}
```

### Methods (additional)

#### `attach(component: BareComponent, updateFn: (l10n: ComponentLocalization, component: BareComponent) => void): void`

Binds the localization instance to a component. Subscribes to language changes and calls `updateFn` whenever language changes. Also registers a disposer via `component.addDisposer` to auto‑detach on unmount. If `component.isConnected` is `true`, calls `updateFn` immediately.

#### `refresh(): void`

Manually triggers `updateFn` (if attached). Useful when component state changes (e.g., `fileCount` updates) and you need to re‑evaluate dynamic texts.

#### `detach(): void`

Unsubscribes from language changes and removes the reference to the component. Called automatically when the component unmounts (via `addDisposer`).

## Lifecycle and Auto‑cleanup in BareDOM

When you attach `ComponentLocalization` to a component:

1. The localization instance subscribes to language changes.
2. It calls `component.addDisposer()` to schedule `detach()` when the component unmounts.
3. On every language change, the provided `update` function runs, allowing you to update DOM refs.
4. You must call `refresh()` manually whenever component state affecting displayed texts changes (e.g., new file count, upload progress). There is **no automatic reactivity** – this is by design to keep the library minimal and predictable.

## Example: Full Component with Dedicated Locales Class

**`locales/UploadScreenLocales.js`**

```javascript
import { ComponentLocalization } from '@supercat1337/ui-localization';

const dictionary = {
    en: {
        title: 'Upload file',
        filesCountForms: [
            '{count} files',
            '{count} file',
            '{count} files',
            '{count} files',
            '{count} files',
            '{count} files',
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

export class UploadScreenLocales extends ComponentLocalization {
    constructor(options) {
        super(dictionary, options);
    }
    get title() {
        return this.t('title');
    }
    getFilesCountText(count) {
        return this.plural(count, this.t('filesCountForms'));
    }
}
```

**`UploadScreen.js`**

```javascript
import { Component } from '@supercat1337/ui';
import { UploadScreenLocales } from './locales/UploadScreenLocales.js';

export class UploadScreen extends Component {
    static layout = `<h1 data-ref="title"></h1><span data-ref="counter"></span>`;

    constructor() {
        super();
        this.fileCount = 0;

        this.l10n = new UploadScreenLocales({
            component: this,
            update: (l10n, comp) => {
                const refs = comp.getRefs();
                refs.title.innerText = l10n.title;
                refs.counter.innerText = l10n.getFilesCountText(comp.fileCount);
            },
        });
    }

    connectedCallback() {
        // Ensure UI is up‑to‑date (update runs after attach, but if component was already connected, update already ran; explicit refresh is safe)
        this.l10n.refresh();
    }

    incrementFileCount() {
        this.fileCount++;
        this.l10n.refresh(); // re‑run update to refresh counter
    }
}
```

## Error Handling

- If a key is missing in the dictionary for the current language, `t(key)` returns an empty string.
- If plural forms array has fewer than 6 items, the last item is used as fallback.
- If `plural()` is called with an empty array, it returns an empty string.
- Static methods `getCurrentLanguage` and `onLanguageChange` default to `console.warn` and return a no‑op unsubscribe. You **must** override them before creating any `ComponentLocalization` instance that relies on the default provider.

## Integration with non‑BareDOM projects

You can use `Localization` directly with any custom language provider:

```javascript
import { Localization } from '@supercat1337/ui-localization';

let currentLang = 'en';
const listeners = new Set();

const provider = {
    getCurrentLanguage: () => currentLang,
    onLanguageChange: cb => {
        listeners.add(cb);
        return () => listeners.delete(cb);
    },
};

const l10n = new Localization(dictionary, provider);
l10n.start();

// later, change language:
currentLang = 'ru';
listeners.forEach(cb => cb('ru'));
```

## Testing

Create a mock `LanguageProvider`:

```javascript
const mockProvider = {
    getCurrentLanguage: () => 'en',
    onLanguageChange: () => () => {},
};
const l10n = new Localization(dictionary, mockProvider);
expect(l10n.t('title')).toBe('Upload file');
```

For `ComponentLocalization`, pass a dummy component stub with `addDisposer`, `isConnected`, `getRefs`.

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

## Dependencies

None. Uses browser `Intl` APIs – available in Node.js (full ICU) and all modern browsers. No external npm dependencies.

## License

MIT
