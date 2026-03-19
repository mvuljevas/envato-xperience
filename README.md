<p align="center">
  <img src="images/Envato Xperience_GitHub.png" alt="Envato Xperience" />
</p>

# Envato Xperience

A Chrome extension that seamlessly removes preview iframes from Envato marketplaces and redirects you directly to the actual preview content. It features a modern, unobtrusive floating control panel injected directly into the page.

## Features

- **Auto-Remove Mode**: Automatically removes preview frames on visit (enabled by default).
- **Floating Control Panel**: A sleek, non-intrusive side panel to manage settings on the fly.
- **Premium UI**: "Glassmorphism" design with smooth, switch-like animations.
- **Context Preservation (Floating Widget)**: Optionally injects an elegant floating button panel on the creator's real external website, retaining Envato's "Buy Now" and "Details" links even after the redirect.
- **Hide Ads Toggle**: Optionally suppresses major Envato promotional surfaces such as top banners, Elements cross-sells, footer promos, marketplace switcher ads, `top-sellers` author sidebars, and account/download promos.
- **Stable Product Identity**: Uses the canonical Envato `itemId` from `/item/.../<id>` URLs so product data stays aligned across item, reviews, comments, and support tabs.
- **Local Image Cache**: Stores product hero images in `IndexedDB` with TTL and eviction rules instead of bloating extension storage.
- **Contextual Status States**: Outside item pages, the panel switches to premium editorial states for browse, preview, and fallback contexts instead of showing a dead loading message.
- **Compact Product Card**: The sidepanel now renders a tighter, Envato-inspired product card with title, author, category, price, sales, rating, last update, and direct live preview access.
- **Smart Detection**: Specifically extracts product metadata from Envato domains and targets the `.full-screen-preview__frame` container safely.
- **Shadow DOM Isolation**: The UI and floating widgets are strictly encapsulated in Shadow DOM to avoid CSS bleeding onto any theme's complex stylesheets.

## Installation

### From Source

1. Clone this repository:
   ```bash
   git clone https://github.com/mvuljevas/noframevato.git
   ```
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (toggle in top-right corner).
4. Click **Load unpacked** and select the `noframevato` folder.

## Usage

- **Auto-Remove**: Just browse Envato network sites (ThemeForest, CodeCanyon, VideoHive, etc.). Preview iframe wrappers will vanish automatically, directly redirecting you to clean theme websites.
- **Floating Control Panel**: Click the extension icon to toggle the floating panel on any Envato page. From there, you can:
    - Perform a manual Envato frame removal.
    - Toggle the "Auto Remove" configuration.
    - Enable **"Floating Widget"** to keep the essential Envato purchase links natively floating on the target theme demo.
    - Enable **"Hide Ads"** to suppress supported Envato promotional blocks across browse, category, and item pages.

## Technical Details

- **Manifest V3**: Compliant with the latest Chrome Extension standards, utilizing `chrome.storage.local` context passing mechanisms and full domain permissions `<all_urls>` for cross-origin widget injection.
- **Architecture**:
    - `envato-shared.js`: Shared helpers for Envato host detection, canonical `itemId` parsing, site naming, and settings compatibility/migration.
    - `marketplace-init.js`: Early `document_start` bootstrap that mirrors the `Hide Ads` setting into the page root before the marketplace paints.
    - `marketplace-overrides.css`: Declarative anti-flicker stylesheet that collapses supported Envato ad surfaces immediately when `Hide Ads` is enabled, including shared browse/category sidebars and downloads/account promo rails.
    - `content.js`: Captures Envato metadata on previews, uses Envato `itemId` as the stable product key, fires secure redirects, and injects floating Shadow DOM widgets seamlessly into third-party target showcase websites.
    - `content.css`: Base layout requirements for the floating panel.
    - `sidepanel.html/css/js`: An aesthetic UI implementation loaded inside an isolated inner iframe.
    - `image-cache.js`: `IndexedDB`-backed image cache with checksum, TTL, and eviction rules for product artwork.
    - `background.js`: Event handler orchestration (relaying extension clicks).

## Compliance

- The extension is packaged as a self-contained Manifest V3 project with no remote JavaScript.
- The panel typography is bundled locally, including `Oswald`, with no remote font dependency.
- Product metadata is rendered using safe DOM APIs rather than `innerHTML`.
- Cached product images are stored in `IndexedDB`, not `chrome.storage.local`.
- Envato ad suppression is applied through packaged `document_start` CSS and a lightweight local bootstrap, reducing visible flicker without remote dependencies.
- Compliance notes and pre-publish review guidance live in `docs/COMPLIANCE.md`.
- Cache architecture and storage rationale live in `docs/IMAGECACHE.md`.

## Development

### Smoke Automation

For repeatable local smoke checks, the repo now includes a Playwright-based extension runner:

```bash
npm install
npm run smoke:extension
```

What it does:
- launches Chromium with the unpacked extension loaded from the repo
- uses a standard persistent profile directory at `.playwright/chrome-extension-dev`
- opens the floating panel through a small DOM test bridge in `content.js`
- validates `Hide Ads` on supported item, browse, and `top-sellers` pages
- validates authenticated account/download views using `/.env.local`, including fallback navigation through the user popover when needed

Useful overrides:
- `PLAYWRIGHT_EXTENSION_PROFILE_DIR`: reuse an existing Chrome/Chromium dev profile instead of the default local profile
- `PLAYWRIGHT_EXTENSION_PATH`: override the unpacked extension path
- `SMOKE_ITEM_URL`: override the item-page smoke URL
- `SMOKE_TOP_SELLERS_URL`: override the browse/top-sellers smoke URL

Notes:
- The baseline smoke currently passes `item page`, `top-sellers`, and authenticated `downloads`.
- Reusing a real Chrome profile works only when Chrome is not already holding the same root user-data directory lock.

### File Structure

```
noframevato/
├── manifest.json       # Extension configuration
├── background.js       # Service worker
├── envato-shared.js    # Shared helpers for hosts, item IDs, and settings
├── marketplace-init.js # Early settings bootstrap for host-page overrides
├── marketplace-overrides.css # Early ad-suppression rules for Envato pages
├── package.json        # Local Playwright smoke tooling entrypoints
├── scripts/            # Playwright extension smoke config/spec
├── .env.local.example  # Local Playwright auth template for manual DOM debugging
├── content.js          # Injection logic
├── content.css         # Container styles
├── fonts/              # Local bundled fonts for extension UI
├── image-cache.js      # IndexedDB-backed image cache
├── sidepanel.html      # Panel Structure
├── sidepanel.css       # Panel Styles
├── sidepanel.js        # Panel Logic
├── icons/              # Assets
├── images/             # UI assets and README artwork
├── docs/               # Workflow, roadmap, compliance, cache notes
└── README.md           # This file
```

## Credits

Crafted by [Mauricio Vuljevas](https://www.mvuljevas.com?utm_source=envatoxperience).

## License

MIT License.
