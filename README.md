# NoFrameVato

A Chrome extension that removes preview iframes from Envato marketplaces (preview.themeforest.net, preview.codecanyon.net) and redirects directly to the actual preview content.

## Features

- **Auto-Remove Mode**: Automatically removes preview frames when enabled (default)
- **Manual Trigger**: Remove frames on-demand via the extension popup
- **Smart Detection**: Specifically targets Envato's `.full-screen-preview__frame` container
- **URL Validation**: Ensures safe redirects with protocol validation
- **Error Handling**: Comprehensive error handling and logging for debugging

## Installation

### From Source

1. Clone this repository:
   ```bash
   git clone https://github.com/mvuljevas/noframevato.git
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" (toggle in top-right corner)

4. Click "Load unpacked" and select the `noframevato` folder

5. The extension icon should appear in your toolbar

## Usage

### Auto-Remove (Default)

By default, the extension automatically removes preview frames when you visit preview.themeforest.net or preview.codecanyon.net preview pages. The page will redirect to the actual preview content.

### Manual Control

1. Click the extension icon in your toolbar
2. Toggle "Auto Remove" on/off as needed
3. Use "Remove Frame Now" button to manually trigger frame removal on the current page

## How It Works

The extension:
1. Detects the Envato preview frame container (`.full-screen-preview__frame`)
2. Locates the iframe within the container
3. Validates the iframe's source URL
4. Redirects the page to the actual preview content
5. Falls back to removing the container if no valid iframe is found

## Technical Details

- **Manifest Version**: 3
- **Permissions**: `storage`, `activeTab`
- **Host Permissions**: `preview.themeforest.net`, `preview.codecanyon.net`
- **Content Script**: Runs at `document_idle` for optimal performance

## Development

### File Structure

```
noframevato/
├── manifest.json       # Extension configuration
├── content.js          # Main frame removal logic
├── popup.html          # Extension popup UI
├── popup.js            # Popup interaction handler
├── icons/              # Extension icons
└── README.md           # This file
```

### Key Functions

- `removeFrame()`: Main logic to detect and remove preview frames
- `isValidUrl()`: Validates URLs before redirecting
- `initialize()`: Sets up the extension based on user preferences

## License

MIT License - Feel free to use and modify as needed.

## Contributing

Issues and pull requests are welcome!
