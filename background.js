/**
 * Envato Frame Remover - Background Script
 * Handles initial context and message relaying for the floating panel
 */

// Toggle the floating panel when the extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
    if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { action: "toggle_floating_panel" }).catch((err) => {
            console.warn('[Envato Frame Remover] Content script not ready on this page yet.');
        });
    }
});

chrome.runtime.onInstalled.addListener(() => {
    console.log('[Envato Frame Remover] Extension installed and ready.');
});
