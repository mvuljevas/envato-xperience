/**
 * Envato Frame Remover - Content Script
 * 1. Handles frame removal on Envato pages
 * 2. Injects the floating in-page sidepanel using Shadow DOM for style isolation
 */

let panelContainer = null;
let panelWrapperRef = null;
let panelVisible = false;

/**
 * Creates and injects the floating panel iframe using Shadow DOM
 * This ensures host page styles don't bleed into our panel and vice versa.
 */
function createPanel() {
  if (panelContainer) return;

  // Create the host for the Shadow DOM
  panelContainer = document.createElement("div");
  panelContainer.id = "envato-frame-remover-root";
  // Styles handled by content.css (:host)

  // Attach Shadow DOM
  const shadow = panelContainer.attachShadow({ mode: "open" }); // 'open' allows easier debugging/access if needed

  // Create the wrapper that will slide in/out
  const wrapper = document.createElement("div");
  wrapper.id = "panel-wrapper";

  // Define styles for the shadow DOM content
  // Link to the external CSS file
  const link = document.createElement("link");
  link.setAttribute("rel", "stylesheet");
  link.setAttribute("href", chrome.runtime.getURL("content.css"));

  // Create the iframe
  const iframe = document.createElement("iframe");
  iframe.src = chrome.runtime.getURL("sidepanel.html");
  iframe.allow = "clipboard-read; clipboard-write";

  // Assemble the DOM
  wrapper.appendChild(iframe);
  shadow.appendChild(link);
  shadow.appendChild(wrapper);
  document.body.appendChild(panelContainer);

  // Store reference to the wrapper for toggling
  panelWrapperRef = wrapper;

  // Force reflow to ensure transitions work
  wrapper.offsetHeight;
}

/**
 * Toggles the visibility of the floating panel
 */
function togglePanel() {
  if (!panelContainer) {
    createPanel();
  }

  panelVisible = !panelVisible;
  if (panelVisible) {
    panelWrapperRef.classList.add("visible");
  } else {
    panelWrapperRef.classList.remove("visible");
  }
}

/**
 * Validates if a URL is safe to redirect to
 */
function isValidUrl(url) {
  if (!url || typeof url !== "string") return false;
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === "http:" || urlObj.protocol === "https:";
  } catch (e) {
    return false;
  }
}

/**
 * Logic to remove the Envato preview frame
 */
function removeFrame() {
  try {
    // Selector for the Envato preview iframe
    const previewIframe = document.querySelector(
      "iframe.full-screen-preview__frame",
    );
    if (!previewIframe) return;

    if (previewIframe.src) {
      const targetUrl = previewIframe.src;
      if (isValidUrl(targetUrl)) {
        window.location.href = targetUrl;
      } else {
        previewIframe.remove();
      }
    } else {
      // Fallback if src is missing
      previewIframe.remove();
      if (document.body.style.marginTop) document.body.style.marginTop = "0px";
    }
  } catch (error) {
    console.error("[Envato Frame Remover] Error removing frame:", error);
  }
}

/**
 * Initialize the script
 */
function initialize() {
  chrome.storage.sync.get(["autoRemove"], function (result) {
    const autoRemoveEnabled = result.autoRemove !== false; // Default to true if undefined

    // Only trigger auto-remove on actual preview pages
    const isEnvatoSite =
      window.location.hostname.includes("preview.themeforest.net") ||
      window.location.hostname.includes("preview.codecanyon.net");

    if (autoRemoveEnabled && isEnvatoSite) {
      removeFrame();
    }
  });
}

// Listen for messages from background script or sidepanel
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  switch (request.action) {
    case "toggle_floating_panel":
      togglePanel();
      sendResponse({ success: true });
      break;
    case "close_panel":
      if (panelVisible) togglePanel(); // Toggle off
      sendResponse({ success: true });
      break;
    case "remove_frame":
      removeFrame();
      sendResponse({ success: true });
      break;
  }
  return true; // Keep message channel open for async response if needed
});

initialize();
