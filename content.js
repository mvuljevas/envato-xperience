/**
 * Envato Frame Remover - Content Script
 * 1. Handles frame removal on Envato pages
 * 2. Injects the floating in-page sidepanel
 */

let panelContainer = null;
let panelVisible = false;

/**
 * Creates and injects the floating panel iframe
 */
function createPanel() {
    if (panelContainer) return;

    panelContainer = document.createElement('div');
    panelContainer.id = 'envato-frame-remover-root';

    // Use Shadow DOM to prevent host page CSS from messing with our container
    const shadow = panelContainer.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = `
        #panel-wrapper {
            position: fixed;
            top: 0;
            right: -340px;
            width: 320px;
            height: 100vh;
            background: #ffffff;
            box-shadow: -5px 0 25px rgba(0,0,0,0.15);
            z-index: 2147483647;
            transition: right 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
        }
        #panel-wrapper.visible {
            right: 0;
        }
        iframe {
            width: 100%;
            height: 100%;
            border: none;
        }
    `;

    const wrapper = document.createElement('div');
    wrapper.id = 'panel-wrapper';

    const iframe = document.createElement('iframe');
    iframe.src = chrome.runtime.getURL('sidepanel.html');
    iframe.allow = 'clipboard-read; clipboard-write';

    wrapper.appendChild(iframe);
    shadow.appendChild(style);
    shadow.appendChild(wrapper);
    document.body.appendChild(panelContainer);

    // Force reflow
    wrapper.offsetHeight;
}

/**
 * Toggles the visibility of the floating panel
 */
function togglePanel() {
    if (!panelContainer) {
        createPanel();
    }

    const wrapper = panelContainer.shadowRoot ? null : document.getElementById('envato-frame-remover-root').shadowRoot.getElementById('panel-wrapper');
    // Note: Since we used mode: 'closed', we need a reference. Let's adjust slightly for easier access in this script.
}

// Re-implementing with accessible reference
let panelWrapperRef = null;

function createPanelAccessible() {
    if (panelContainer) return;

    panelContainer = document.createElement('div');
    panelContainer.id = 'envato-frame-remover-root';
    panelContainer.style.all = 'initial'; // Reset styles

    const wrapper = document.createElement('div');
    wrapper.id = 'envato-panel-wrapper';
    wrapper.style.cssText = `
        position: fixed;
        top: 0;
        right: -340px;
        width: 320px;
        height: 100vh;
        background: #ffffff;
        box-shadow: -5px 0 25px rgba(0,0,0,0.15);
        z-index: 2147483647;
        transition: right 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
        display: block !important;
    `;

    const iframe = document.createElement('iframe');
    iframe.src = chrome.runtime.getURL('sidepanel.html');
    iframe.style.cssText = `
        width: 100% !important;
        height: 100% !important;
        border: none !important;
        display: block !important;
    `;

    wrapper.appendChild(iframe);
    panelContainer.appendChild(wrapper);
    document.body.appendChild(panelContainer);

    panelWrapperRef = wrapper;
    // Force reflow
    wrapper.offsetHeight;
}

function togglePanelAccessible() {
    if (!panelContainer) createPanelAccessible();

    panelVisible = !panelVisible;
    if (panelVisible) {
        panelWrapperRef.style.right = '0px';
    } else {
        panelWrapperRef.style.right = '-340px';
    }
}

/**
 * Validates if a URL is safe to redirect to
 */
function isValidUrl(url) {
    if (!url || typeof url !== 'string') return false;
    try {
        const urlObj = new URL(url);
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch (e) {
        return false;
    }
}

/**
 * Original frame removal logic
 */
function removeFrame() {
    try {
        const previewIframe = document.querySelector('iframe.full-screen-preview__frame');
        if (!previewIframe) return;

        if (previewIframe.src) {
            const targetUrl = previewIframe.src;
            if (isValidUrl(targetUrl)) {
                window.location.href = targetUrl;
            } else {
                previewIframe.remove();
            }
        } else {
            previewIframe.remove();
            if (document.body.style.marginTop) document.body.style.marginTop = '0px';
        }
    } catch (error) {
        console.error('[Envato Frame Remover] Error:', error);
    }
}

/**
 * Initialize
 */
function initialize() {
    chrome.storage.sync.get(['autoRemove'], function (result) {
        const autoRemoveEnabled = result.autoRemove !== false;
        // Only auto-remove on actual preview pages
        const isEnvatoSite = window.location.hostname.includes('preview.themeforest.net') ||
            window.location.hostname.includes('preview.codecanyon.net');

        if (autoRemoveEnabled && isEnvatoSite) {
            removeFrame();
        }
    });
}

// Listen for messages
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === "toggle_floating_panel") {
        togglePanelAccessible();
        sendResponse({ success: true });
    } else if (request.action === "close_panel") {
        panelVisible = false;
        if (panelWrapperRef) panelWrapperRef.style.right = '-340px';
        sendResponse({ success: true });
    } else if (request.action === "remove_frame") {
        removeFrame();
        sendResponse({ success: true });
    }
    return true;
});

initialize();
