# NoFrameVato

A Chrome extension that seamlessly removes preview iframes from Envato marketplaces (ThemeForest, CodeCanyon) and redirects you directly to the actual preview content. It features a modern, unobtrusive floating control panel injected directly into the page.

## Features

- **Auto-Remove Mode**: Automatically removes preview frames on visit (enabled by default).
- **Floating Control Panel**: A sleek, non-intrusive side panel to manage settings on the fly.
- **Premium UI**: "Glassmorphism" design with smooth, switch-like animations.
- **Smart Detection**: Specifically targets Envato's `.full-screen-preview__frame` container.
- **Safe Redirects**: Validates URLs before redirecting to ensure safety.
- **Shadow DOM Isolation**: The UI is encapsulated in Shadow DOM to prevent style conflicts with the host page.

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

- **Auto-Remove**: Just browse ThemeForest or CodeCanyon. Preview frames vanish automatically!
- **Manual Control**: Click the extension icon to toggle the floating panel. From there, you can:
    - Perform a manual frame removal.
    - Toggle the "Auto Remove" setting.

## Technical Details

- **Manifest V3**: Compliant with the latest Chrome Extension standards.
- **Architecture**:
    - `content.js`: Handles logic and Shadow DOM injection.
    - `content.css`: Styles for the panel container.
    - `sidepanel.html/css/js`: The UI implementation loaded inside the Shadow DOM iframe.
    - `background.js`: Orchestration and event handling.
- **Permissions**: Minimal permissions (`storage`, `activeTab`).

## Development

### File Structure

```
noframevato/
├── manifest.json       # Extension configuration
├── background.js       # Service worker
├── content.js          # Injection logic
├── content.css         # Container styles
├── sidepanel.html      # Panel Structure
├── sidepanel.css       # Panel Styles
├── sidepanel.js        # Panel Logic
├── icons/              # Assets
└── README.md           # This file
```

## Credits

Crafted with love in 🇺🇾 by [Mauricio Vuljevas](https://www.mvuljevas.com?utm_source=noframevato).

## License

MIT License.
