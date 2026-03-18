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
 * Logic to remove the Envato preview frame or apply Widget Mode
 */
function removeFrame(useWidgetMode = false) {
  try {
    const previewIframe = document.querySelector(
      "iframe.full-screen-preview__frame",
    );
    if (!previewIframe) return;

    if (previewIframe.src) {
      const targetUrl = previewIframe.src;
      if (isValidUrl(targetUrl)) {
        if (useWidgetMode) {
          const info = extractProductInfo();
          info.targetDomain = new URL(targetUrl).hostname;
          info.timestamp = Date.now();

          chrome.storage.local.set({ activeEnvatoPreview: info }, () => {
            window.location.href = targetUrl;
          });
        } else {
          window.location.href = targetUrl;
        }
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
 * Extracts metadata from the Envato item details page
 */
function extractItemDetails() {
  let title = document.querySelector('h1')?.textContent.trim() || document.title;
  if (title.includes(' - ThemeForest')) title = title.replace(' - ThemeForest', '');
  if (title.includes(' - CodeCanyon')) title = title.replace(' - CodeCanyon', '');

  let imageUrl = '';
  let isHighResImage = false;
  // Prioritize the actual high-res rectangular preview image in the DOM
  const imgEl = document.querySelector('.js-item-preview img, .item-preview img, .item-preview-image__img, .preview-image, #preview-image');
  if (imgEl) {
      // Manage lazy-loaded formats common in ThemeForest
      imageUrl = imgEl.getAttribute('data-preview-url') || imgEl.getAttribute('data-src') || imgEl.src;
      isHighResImage = true;
  } else {
      // Fallback to og:image if native preview container is completely missing
      const ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage) imageUrl = ogImage.content;
  }

  let price = '';
  let oldPrice = '';
  const priceEl = document.querySelector('.js-purchase-price, .item-price, .purchase-form__price');
  if (priceEl) {
      const strikeEl = priceEl.querySelector('s, del, strike, .price-strikethrough, .js-purchase-price--old');
      
      if (strikeEl) {
          oldPrice = strikeEl.textContent.trim();
          price = priceEl.textContent.replace(oldPrice, '').trim();
      } else {
          // Fallback: If Envato collapses both prices into raw text "$49 $34", we can extract them mathematically
          const rawText = priceEl.textContent.trim().replace(/\s+/g, ' ');
          let priceMatch = rawText.match(/([\$\€\£]\s*\d+(?:[\.,]\d+)?)\s+([\$\€\£]\s*\d+(?:[\.,]\d+)?)/);
          if (priceMatch && priceMatch.length >= 3) {
              oldPrice = priceMatch[1];
              price = priceMatch[2];
          } else {
              price = rawText;
          }
      }
  }

  let sales = '';
  const salesEl = document.querySelector('.item-header__sales-count, .item-sales-count, .item-header__sales');
  if (salesEl) {
      const sMatch = salesEl.textContent.match(/[\d.,]+[kKmM]?/);
      if (sMatch) sales = sMatch[0];
  }
  if (!sales) {
      const bodySalesMatch = document.body.innerText.match(/([\d.,]+[kKmM]?)\s*Sales/i);
      if (bodySalesMatch) sales = bodySalesMatch[1];
  }

  let rating = '';
  let ratingCount = '';

  const rMeta = document.querySelector('[itemprop="ratingValue"]');
  if (rMeta) rating = rMeta.getAttribute('content') || rMeta.textContent;
  const cMeta = document.querySelector('[itemprop="reviewCount"]');
  if (cMeta) ratingCount = cMeta.getAttribute('content') || cMeta.textContent;

  if (!rating) {
      const rEl = document.querySelector('.rating-score strong, .rating-score, .stars-rating__score, .js-item-rating-score');
      if (rEl) rating = rEl.getAttribute('data-score') || rEl.textContent;
  }
  if (!ratingCount) {
      const cEl = document.querySelector('.rating-count, .item-rating__count, .js-item-rating-count');
      if (cEl) ratingCount = cEl.textContent;
  }

  // Hardcore Fallbacks scanning the raw text of the site
  const bodyText = document.body.innerText;
  
  if (!rating || !ratingCount) {
      // Look for the modern ThemeForest menu pattern: "Reviews ★★★★★ 4.84 [1K]" or similar
      const tfMatch = bodyText.match(/Reviews[\s\n★☆\-\*]*([\d.]+)[\s\n]*([\[\(]?[\d.,]+[kKmM]?[\]\)]?)/i);
      if (tfMatch) {
          if (!rating) rating = tfMatch[1];
          if (!ratingCount) ratingCount = tfMatch[2];
      }
  }

  if (!rating) {
      const outOfMatch = bodyText.match(/(?:Rated\s+)?([\d.]+)\s*(?:out of|\/)\s*5/i);
      if (outOfMatch) rating = outOfMatch[1];
  }
  if (!ratingCount) {
      // Match patterns like "1,033 Reviews"
      const numRevMatch = bodyText.match(/([\d.,]+[kKmM]?)\s*(?:Ratings|Reviews)/i);
      if (numRevMatch) ratingCount = numRevMatch[1];
  }

  if (rating) rating = rating.replace(/[^\d.]/g, '').trim();
  if (ratingCount) ratingCount = ratingCount.replace(/[()\[\]]/g, '').replace(/reviews?/i, '').replace(/ratings?/i, '').trim();

  let lastUpdate = '';
  const timeEl = document.querySelector('time.updated, time[itemprop="dateModified"], .last-update-date');
  if (timeEl) lastUpdate = timeEl.textContent.trim();

  return { title, imageUrl, isHighResImage, price, oldPrice, sales, rating, ratingCount, lastUpdate, isItemPage: true };
}

/**
 * Extracts product metadata from the native Envato header
 */
function extractProductInfo() {
  let title = document.title;
  if (title.includes(' - ThemeForest')) title = title.replace(' - ThemeForest', '');
  if (title.includes(' - CodeCanyon')) title = title.replace(' - CodeCanyon', '');
  title = title.trim();

  const titleEl = document.querySelector('.t-link--hidden-reversed');
  if (titleEl && titleEl.textContent) title = titleEl.textContent.trim();

  let buyUrl = '';
  const buyBtn = document.querySelector('a.buy-btn, a[href*="/checkout/"], a.header-buy-btn, .js-buy-btn');
  if (buyBtn) buyUrl = buyBtn.href;

  let itemUrl = '';
  if (titleEl && titleEl.href) itemUrl = titleEl.href;

  return { title, buyUrl, itemUrl };
}

let widgetContainer = null;

/**
 * Checks if we are on a post-redirect target site and injects the widget
 */
function checkAndInjectWidget() {
  chrome.storage.local.get(['activeEnvatoPreview'], function(result) {
    if (result.activeEnvatoPreview) {
      const info = result.activeEnvatoPreview;
      
      // Check if context is fresh (e.g. within 2 hours)
      const isFresh = (Date.now() - info.timestamp) < (2 * 60 * 60 * 1000);
      
      if (isFresh && window.location.hostname.includes(info.targetDomain)) {
        injectWidget(info);
      }
    }
  });
}

/**
 * Injects our own Premium floating widget using Shadow DOM
 */
function injectWidget(info) {
  if (widgetContainer) return;
  
  widgetContainer = document.createElement("div");
  widgetContainer.id = "envato-custom-widget-root";
  const shadow = widgetContainer.attachShadow({ mode: "open" });

  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
      <style>
          :host {
              position: fixed;
              bottom: 24px;
              right: 24px;
              z-index: 2147483647;
              font-family: 'Noto Sans', sans-serif;
          }
          .widget-box {
              background: rgba(255, 255, 255, 0.85);
              backdrop-filter: blur(12px);
              -webkit-backdrop-filter: blur(12px);
              border-radius: 12px;
              padding: 16px 20px;
              box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
              border: 1px solid rgba(255, 255, 255, 0.5);
              display: flex;
              flex-direction: column;
              gap: 12px;
              transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
              animation: slideIn 0.5s ease-out forwards;
          }
          @keyframes slideIn {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
          }
          .widget-box:hover {
              transform: translateY(-4px);
              box-shadow: 0 14px 45px rgba(0, 0, 0, 0.2);
          }
          .w-title {
              font-size: 14px;
              font-weight: 600;
              color: #262626;
              margin: 0;
              max-width: 250px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
          }
          .w-actions {
              display: flex;
              gap: 8px;
          }
          .w-btn {
              text-decoration: none;
              font-size: 13px;
              font-weight: 600;
              padding: 10px 14px;
              border-radius: 8px;
              cursor: pointer;
              text-align: center;
              transition: all 0.2s;
              flex: 1;
              box-sizing: border-box;
          }
          .w-btn-buy {
              background: #82b641;
              color: white;
              box-shadow: 0 4px 10px rgba(130, 182, 65, 0.3);
          }
          .w-btn-buy:hover {
              background: #6fab35;
              transform: translateY(-1px);
              box-shadow: 0 6px 15px rgba(130, 182, 65, 0.4);
          }
          .w-btn-back {
              background: rgba(0,0,0,0.06);
              color: #495057;
          }
          .w-btn-back:hover {
              background: rgba(0,0,0,0.1);
              color: #262626;
          }
      </style>
      <div class="widget-box">
          <p class="w-title" title="${info.title}">${info.title || 'Envato Product'}</p>
          <div class="w-actions">
              ${info.itemUrl ? `<a href="${info.itemUrl}" class="w-btn w-btn-back">Details</a>` : ''}
              ${info.buyUrl ? `<a href="${info.buyUrl}" class="w-btn w-btn-buy" target="_blank">Buy Now</a>` : ''}
          </div>
      </div>
  `;

  shadow.appendChild(wrapper);
  document.body.appendChild(widgetContainer);
}

/**
 * Initialize the script
 */
function initialize() {
  if (window !== window.top) return; // Prevent execution inside iframes
  
  chrome.storage.sync.get(["autoRemove", "widgetMode"], function (result) {
    const autoRemoveEnabled = result.autoRemove !== false; // Default to true if undefined
    const widgetModeEnabled = result.widgetMode === true; // Default to false

    // Only trigger auto-remove on actual preview pages
    const previewDomains = ['preview.themeforest.net', 'preview.codecanyon.net', 'preview.videohive.net', 'preview.audiojungle.net', 'preview.graphicriver.net', 'preview.photodune.net', 'preview.3docean.net'];
    const isEnvatoPreviewSite = previewDomains.some(domain => window.location.hostname.includes(domain));

    if (autoRemoveEnabled && isEnvatoPreviewSite) {
      removeFrame(widgetModeEnabled);
    } else if (!isEnvatoPreviewSite && widgetModeEnabled) {
      // Check if we are on a theme's site after being redirected
      checkAndInjectWidget();
    }
  });
}

// Listen for messages from background script or sidepanel
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (window !== window.top) return; // Only process messages on the top level window
  
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
      chrome.storage.sync.get(["widgetMode"], function(result) {
          removeFrame(result.widgetMode === true);
      });
      sendResponse({ success: true });
      break;
    case "get_product_info":
      const info = extractProductInfo();
      sendResponse(info);
      break;
    case "get_item_details":
      const details = extractItemDetails();
      sendResponse(details);
      break;
  }
  return true; // Keep message channel open for async response
});

initialize();
