# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Vite dev server with HMR (content scripts + service worker auto-reload)
npm run build      # tsc type-check + vite production build → dist/
npm run preview    # Preview production build
```

No test framework is configured. `tsc` is used only for type-checking (`noEmit: true`); Vite handles all bundling.

Load the extension in Chrome: `chrome://extensions` → Developer mode → Load unpacked → select `dist/`.

## Architecture

Chrome Manifest V3 extension with three isolated runtime contexts:

### Content Script (`src/content/`)
Injected into `chat.deepseek.com`. Scrapes conversation DOM via configurable selectors (`selectors.ts`), parses messages (`parser.ts`), injects a floating action button (`scraper-ui.ts`). Entry: `index.ts`.

**Critical**: The content script does NOT import from `src/shared/messaging.ts`. It inlines its own `sendMessage` and response types because @crxjs/vite-plugin would otherwise bundle content and background scripts into the same chunk (they'd share the messaging module as a common dependency).

### Background Service Worker (`src/background/`)
`service-worker.ts` → `message-router.ts`. Central hub for all IndexedDB access. Receives messages from both content script and manager UI, dispatches to the DAO layer. 18 message types defined in `src/shared/messaging.ts`.

**Critical**: The background entry point is named `service-worker.ts` (not `index.ts`). This is required because @crxjs/vite-plugin uses filenames to map entry points to output chunks — two `index.ts` files caused the plugin to swap content/background bundles.

### Manager UI (`src/manager/`)
Full React SPA (HashRouter). Communicates with background via `chrome.runtime.sendMessage()`. Opened as a separate tab from the popup. Built as an additional `rollupOptions.input` entry in `vite.config.ts` (not listed in the manifest).

### Popup (`src/popup.tsx`)
Lightweight stats view + "Scrape Current Page" button. Uses `chrome.tabs.sendMessage()` to trigger content script scraping.

## Data Flow

```
Content Script ──sendMessage──> Background ──> IndexedDB (via idb)
Manager UI     ──sendMessage──> Background ──> IndexedDB (via idb)
Popup          ──tabs.sendMessage──> Content Script
```

All DB access goes through the background service worker. DAO modules in `src/shared/dao/` (topic-dao, session-dao, template-dao). DB singleton with lazy init in `src/shared/db.ts`. Three stores: `topics`, `sessions`, `templates`.

## Key Constraints

- **HashRouter only** — `chrome-extension://` URLs don't support BrowserRouter
- **No `window` in service worker** — background code must not use DOM APIs or import modules that do
- **Inline styles in content script** — `scraper-ui.ts` injects styles via `<style>` element, no Tailwind in content script context
- **@crxjs rollupOptions conflict** — the `rollupOptions.input` in `vite.config.ts` only lists the manager page; content script, background, and popup entries come from the manifest via the CRX plugin
- **Sentinel topic** — `__uncategorized__` is auto-created for sessions without a topic assignment

## Core Types (`src/shared/types.ts`)

`Topic`, `Session`, `Message`, `Template`, `ScrapedSessionData`. All IDs via `crypto.randomUUID()`, timestamps via `Date.now()`.

## Styling

- Manager UI: Tailwind CSS utility classes
- Content script scraper UI: Pure inline/injected styles (no external CSS)
- Popup: Inline styles
