# AGENTS.md

Guidelines for AI agents working on this codebase.

## Project Overview

Browser-based, multi-tabbed JSON editor with side-by-side dual-pane editing (text mode left, tree mode right). Data is encrypted at rest in IndexedDB via AES-GCM and never leaves the browser. Deployed to Cloudflare Workers as a static site.

## Tech Stack

- **Language:** Vanilla JavaScript (ES6 modules, no framework)
- **Editor:** `vanilla-jsoneditor` (Svelte 5 / CodeMirror 6 under the hood)
- **Build:** Vite
- **Deployment:** Cloudflare Workers (`wrangler.jsonc`, builds from `./dist`)
- **Persistence:** IndexedDB with Web Crypto API (AES-GCM 256-bit)
- **Styling:** Plain CSS (no preprocessor)

## Commands

```bash
npm run dev      # Start Vite dev server
npm run build    # Production build → ./dist
npm run preview  # Preview production build locally
```

No test suite, linter, or formatter is configured. Always run `npm run build` before pushing to verify compilation.

## Architecture

Entry point: `index.html` → `src/main.js`

### Module Responsibilities

| Module | Class / Export | Role |
|---|---|---|
| `src/main.js` | — | Entry point. Wires modules together, binds global event listeners, calls `manager.restore()` |
| `src/tab-manager.js` | `TabManager` | Core state owner. Manages tabs array, active tab, editor lifecycle, persistence, all data operations |
| `src/tab-bar.js` | `TabBar` | Renders tab DOM elements, rename input UI, close buttons, tooltip visibility |
| `src/command-palette.js` | `CommandPalette` | Cmd+K / Ctrl+K overlay for tab switching and creation |
| `src/theme.js` | `ThemeManager` | Dark / light / auto mode cycling, persisted in `localStorage` under key `theme` |
| `src/session.js` | `ensureSessionId()` | Extracts or generates session UUID from URL param `?s=` |
| `src/storage.js` | `loadSession`, `saveSession`, `clearAllSessions` | Encrypted IndexedDB persistence layer |
| `src/style.css` | — | All application styles including dark mode variants |
| `src/icons/` | `.svg` files | SVG icon assets referenced via CSS `mask-image` |

### Key Patterns

- **Observer pattern:** `TabManager` exposes an `onChanged` callback; `main.js` wires it to `tabBar.render()`.
- **Lazy initialization:** Editors are created only when a tab becomes active (`ensureEditors`).
- **Debounced persistence:** 300ms delay on storage writes to avoid excessive IndexedDB calls.
- **Class-based modules:** Each UI concern is a self-contained class that receives its dependencies via constructor.

### Data Flow

```
User action → TabManager method → state mutation → onChanged() → TabBar.render()
                                 ↘ schedulePersist() → saveSession() (encrypted IndexedDB)
```

## Coding Conventions

- **No semicolons.** The codebase omits semicolons consistently.
- **Single quotes** for strings.
- **2-space indentation.**
- **Trailing commas** in multi-line structures.
- **No TypeScript.** Plain `.js` files with ES module syntax (`import`/`export`).
- **Minimal comments.** Code should be self-explanatory; avoid commenting the obvious.
- **CSS class naming:** BEM-like with underscores: `.block_element--modifier` (e.g., `.tab_close`, `.palette_item--active`).
- **Icons:** Stored as separate `.svg` files in `src/icons/`, rendered via CSS `mask-image` on empty elements. Never inline SVGs in JavaScript.
- **DOM construction:** Done programmatically via `document.createElement` — no template strings for HTML.
- **No external CSS frameworks.** All styles are hand-written in `src/style.css`.
- **Dark mode:** Achieved by toggling `.jse-theme-dark` class on `<body>` and using scoped CSS selectors.

## Session Management

- Each browser tab gets a unique session UUID via the `?s=` URL parameter.
- Session state (tabs, content, active index) is encrypted and stored in IndexedDB.
- The encryption key is a non-extractable `CryptoKey` stored in IndexedDB — it cannot be read by any script.

## PR & Branch Conventions

- Branch off `main` for each feature/fix.
- Branch naming: `devin/<timestamp>-short-description`
- One logical change per PR.
- Run `npm run build` before pushing.
- CI: Cloudflare Workers Builds (`jsonedit-tool` job) must pass.

## What NOT to Do

- Do not add TypeScript, linters, or formatters unless explicitly requested.
- Do not modify `storage.js` encryption logic without explicit approval.
- Do not inline SVGs in JavaScript — use `src/icons/` + CSS `mask-image`.
- Do not add semicolons or change the existing code style.
- Do not commit `.env` files, secrets, or API keys.
