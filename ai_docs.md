# `@supercat1337/ui-localization` – Technical Documentation for LLMs

This document provides a complete technical reference for the `@supercat1337/ui-localization` package. Use it to understand the internal API, dictionary format, and integration patterns when generating code for this library.

## Overview

The package exports two classes:

- **`Localization`** – framework‑agnostic, pure JS. Does not assume any DOM or component model.
- **`ComponentLocalization`** – extends `Localization` and adds convenience methods for BareDOM components (automatic lifecycle binding, UI refresh on language change and component mount).

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

Placeholders are replaced using `{key}`. The replacement values are passed as an object to `plural()` or when using `t()` directly (no replacement in `t()` – use `plural()` or manual formatting).

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

Returns the raw translation string for the current language. Does **not** perform placeholder replacement.

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

#### `startListening(): () => void`

Starts listening to language changes (idempotent). Returns unsubscribe. The library does **not** auto‑start; you must call `startListening()` or rely on `ComponentLocalization` which starts automatically when attached.

#### `stopListening(): void`

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
  options: {
    component: BareComponent;      // BareDOM component instance
    update: (l10n: ComponentLocalization, component: BareComponent) => void;
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
    on(event: string, callback: () => void): () => void; // used for 'connect' event
}
```

### Methods (additional)

#### `attach(component: BareComponent, updateFn: (l10n: ComponentLocalization, component: BareComponent) => void): void`

Binds the localization instance to a component. Subscribes to language changes and calls `updateFn` whenever language changes. Also registers a disposer via `component.addDisposer` to auto‑detach on unmount.  
If the component is already connected, `updateFn` is called immediately. Otherwise, the library subscribes to the `'connect'` event and calls `updateFn` once when the component becomes connected.  
You do **not** need to call `refresh()` in `connectedCallback`.

#### `refresh(): void`

Manually triggers `updateFn` (if attached). Use this when **many** UI elements depend on component state and you prefer a single call over updating each element individually. However, **prefer direct updates** for performance (see guidelines below). Language changes already trigger `refresh()` automatically.

#### `detach(): void`

Unsubscribes from language changes and removes the reference to the component. Called automatically when the component unmounts (via `addDisposer`).

## Lifecycle and Auto‑cleanup in BareDOM

When you attach `ComponentLocalization` to a component:

1. The localization instance subscribes to language changes via `onLanguageChange()`.
2. If the component is already connected (`component.isConnected === true`), `updateFn` runs immediately.
3. If the component is not yet connected, the library subscribes to the `'connect'` event (emitted by the component after `connectedCallback`).
4. **The `'connect'` subscription remains active for the entire lifetime of the component** – it does **not** auto‑unsubscribe after the first connection. This allows the component to be unmounted and later remounted (e.g., when used with `SlotToggler`) and still receive the `'connect'` event each time it reappears, ensuring `updateFn` runs every time the component becomes visible.
5. On every language change, `updateFn` runs again, updating all managed texts.
6. The library **does not** automatically unsubscribe on unmount (no `addDisposer` is used). Subscriptions persist as long as the `ComponentLocalization` instance lives.
7. To release resources (e.g., when the component is permanently destroyed and will never be used again), you can manually call `detach()`. In most cases (components that may be remounted), you should **not** call `detach()`.

This design guarantees that your UI always reflects the current language, even for components that are dynamically shown/hidden or moved between slots, without requiring manual re‑attachment.

## Updating Dynamic Texts: Direct Updates vs `refresh()`

**❌ Inefficient (calls whole `updateFn`):**

```javascript
onFileAdded() {
  this.fileCount++;
  this.l10n.refresh(); // updates ALL texts in the component
}
```

**✅ Efficient (updates only what changed):**

```javascript
onFileAdded() {
  this.fileCount++;
  const refs = this.getRefs();
  refs.counter.innerText = this.l10n.getFilesCountText(this.fileCount);
}
```

**When to use `refresh()`:**

- When **many** (10+) dynamic values depend on state and you don't want to write individual assignments.
- When the component state affects multiple scattered parts of the UI.
- It is acceptable to call `refresh()` occasionally (e.g., after loading a new dataset), but avoid calling it in high‑frequency updates (like progress indicators).

## Example: Complete Component with Localization

### `locales.js`

```javascript
// @ts-check
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
        return this.plural(count, this.t('filesCountForms'));
    }
}
```

### `UploadScreen.js`

```javascript
// @ts-check
import { Component } from '@supercat1337/ui';
import { L10n } from './locales.js';

export class UploadScreen extends Component {
    static layout = `<h1 data-ref="title"></h1><span data-ref="counter"></span>`;

    // ✅ DO NOT annotate refsAnnotation
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
                // initial value, will be updated later directly
                refs.counter.innerText = l10n.getFilesCountText(comp.fileCount);
            },
        });
    }

    // No refresh() in connectedCallback – automatic.
    onFileAdded() {
        this.fileCount++;
        // Direct update – efficient
        const refs = this.getRefs();
        refs.counter.innerText = this.l10n.getFilesCountText(this.fileCount);
    }
}
```

## Typing `refsAnnotation` – Important!

**Do not** add a JSDoc type annotation to `refsAnnotation`. For example, this is **incorrect**:

```javascript
/** @type {import('@supercat1337/ui').RefsAnnotation} */ // ❌ DON'T DO THIS
refsAnnotation = { ... };
```

If you annotate it, TypeScript/JSDoc will widen the type to `Record<string, HTMLElement>` and you will lose the specific keys. By omitting the annotation, the type is inferred as the exact object shape, giving you full auto‑completion and type safety when calling `comp.getRefs()`.

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
l10n.startListening();

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

For `ComponentLocalization`, pass a dummy component stub with `addDisposer`, `isConnected`, `getRefs`, and `on`.

## Dependencies

None. Uses browser `Intl` APIs – available in Node.js (full ICU) and all modern browsers. No external npm dependencies.

## License

MIT
