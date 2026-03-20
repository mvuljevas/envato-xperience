/**
 * Envato XPerience - Background Script
 * Handles initial context and message relaying for the floating panel
 */

// Toggle the floating panel when the extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return;

  chrome.tabs.sendMessage(tab.id, { action: "toggle_floating_panel" }).catch(() => {
    console.warn("[Envato XPerience] Content script not ready on this page yet.");
  });
});

chrome.runtime.onInstalled.addListener(() => {
    console.log('[Envato XPerience] Extension installed and ready.');
});
