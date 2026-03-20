/**
 * Envato Xperience - Content Script
 * 1. Handles frame removal on Envato pages
 * 2. Injects the floating in-page sidepanel using Shadow DOM for style isolation
 */

let panelContainer = null;
let panelWrapperRef = null;
let panelVisible = false;
const shared = window.EnvatoXperienceShared;
const testBridgeEventName = "envato-xperience:test";
let testBridgeInstalled = false;

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
function showPanel() {
  if (!panelContainer) {
    createPanel();
  }

  panelVisible = true;
  if (panelWrapperRef) {
    panelWrapperRef.classList.add("visible");
  }
}

function hidePanel() {
  panelVisible = false;
  if (panelWrapperRef) {
    panelWrapperRef.classList.remove("visible");
  }
}

function togglePanel() {
  if (panelVisible) {
    hidePanel();
  } else {
    showPanel();
  }
}

function dispatchTestBridgeState(requestId) {
  document.dispatchEvent(
    new CustomEvent(`${testBridgeEventName}:result`, {
      detail: {
        requestId: requestId || null,
        panelVisible,
        hasPanel: Boolean(panelContainer),
        hideAdsEnabled: document.documentElement.dataset.envatoHideAds === "true",
      },
    }),
  );
}

function installTestBridge() {
  if (window !== window.top || testBridgeInstalled) return;

  testBridgeInstalled = true;
  document.addEventListener(testBridgeEventName, function (event) {
    const detail = event.detail || {};

    switch (detail.action) {
      case "openPanel":
        showPanel();
        break;
      case "closePanel":
        hidePanel();
        break;
      case "togglePanel":
        togglePanel();
        break;
      case "getState":
        break;
      default:
        return;
    }

    dispatchTestBridgeState(detail.requestId);
  });
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

function extractFirstNumericValue(text) {
  if (!text) return "";
  const match = text.match(/[\d]+(?:\.\d+)?/);
  return match ? match[0] : "";
}

function normalizeItemTitle(title) {
  if (!title) return "";

  return title
    .replace(/^Reviews for\s+/i, "")
    .replace(/^Discussion on\s+/i, "")
    .replace(/^Support for\s+/i, "")
    .replace(/\s+-\s+ThemeForest$/i, "")
    .replace(/\s+-\s+CodeCanyon$/i, "")
    .trim();
}

function isEnvatoMarketplaceLogo(url) {
  return typeof url === "string" && /public-assets\.envato-static\.com\/assets\/logos\/marketplaces\//i.test(url);
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
    console.error("[Envato Xperience] Error removing frame:", error);
  }
}

/**
 * Extracts metadata from the Envato item details page
 */
function extractItemDetails() {
  const itemId = shared ? shared.extractItemIdFromUrl() : "";
  let title = normalizeItemTitle(document.querySelector('h1')?.textContent.trim() || document.title);

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
      if (ogImage && !isEnvatoMarketplaceLogo(ogImage.content)) imageUrl = ogImage.content;
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

  let author = '';
  const authorEl = document.querySelector('main a[href^="/user/"], main a[href*="themeforest.net/user/"], main a[href*="codecanyon.net/user/"]');
  if (authorEl) {
      author = authorEl.textContent.trim().replace(/^By\s+/i, '');
  }
  if (!author) {
      const titleAuthorMatch = document.title.match(/\sby\s(.+?)\s\|\s(?:ThemeForest|CodeCanyon)/i);
      if (titleAuthorMatch) {
          author = titleAuthorMatch[1].trim();
      }
  }

  let category = '';
  const titleHeading = document.querySelector('h1');
  const categoryLinks = Array.from(document.querySelectorAll('a[href*="/category/"]'))
      .filter((el) => titleHeading
          ? (el.compareDocumentPosition(titleHeading) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
          : true)
      .map((el) => el.textContent.trim())
      .filter((text) => text && !/^home$/i.test(text) && !/^files$/i.test(text) && !/^all items$/i.test(text));
  if (categoryLinks.length > 0) {
      category = categoryLinks[categoryLinks.length - 1];
  }

  let livePreviewUrl = '';
  const livePreviewEl = document.querySelector('a[href*="/full_screen_preview/"]');
  if (livePreviewEl && livePreviewEl.href) {
      livePreviewUrl = livePreviewEl.href;
  }

  let rating = '';
  let ratingCount = '';

  const reviewNavLink = document.querySelector('a.js-item-navigation-reviews, a[href*="/reviews/"]');
  if (reviewNavLink) {
      const reviewStarsEl = reviewNavLink.querySelector('.rating-detailed-small__stars');
      const reviewCountEl = reviewNavLink.querySelector('.item-navigation-reviews-comments');

      if (reviewStarsEl && !rating) {
          rating = extractFirstNumericValue(reviewStarsEl.textContent);
      }

      if (reviewCountEl && !ratingCount) {
          ratingCount = reviewCountEl.textContent.trim();
      }
  }

  if (!ratingCount) {
      const reviewSummaryCount = Array.from(document.querySelectorAll('p strong, strong'))
          .map((el) => el.textContent.trim())
          .find((text) => /^\d[\d,]*(?:\.\d+)?[kKmM]?\s+Reviews$/i.test(text));

      if (reviewSummaryCount) {
          ratingCount = reviewSummaryCount.replace(/\s+reviews$/i, '');
      }
  }

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

  return {
    itemId,
    title,
    author,
    category,
    imageUrl,
    isHighResImage,
    price,
    oldPrice,
    sales,
    rating,
    ratingCount,
    lastUpdate,
    livePreviewUrl,
    isItemPage: true
  };
}

/**
 * Extracts product metadata from the native Envato header
 */
function extractProductInfo() {
  const resolvedCurrentItemId = shared ? shared.extractItemIdFromUrl() : "";
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

  const itemId = resolvedCurrentItemId || (shared ? shared.extractItemIdFromUrl(itemUrl) : "");

  return { itemId, title, buyUrl, itemUrl };
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
  const style = document.createElement("style");
  style.textContent = `
      :host {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 2147483647;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
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
  `;

  const widgetBox = document.createElement("div");
  widgetBox.className = "widget-box";

  const title = document.createElement("p");
  title.className = "w-title";
  title.textContent = info.title || "Envato Product";
  title.title = info.title || "Envato Product";
  widgetBox.appendChild(title);

  const actions = document.createElement("div");
  actions.className = "w-actions";

  if (isValidUrl(info.itemUrl)) {
    const detailsLink = document.createElement("a");
    detailsLink.className = "w-btn w-btn-back";
    detailsLink.href = info.itemUrl;
    detailsLink.textContent = "Details";
    actions.appendChild(detailsLink);
  }

  if (isValidUrl(info.buyUrl)) {
    const buyLink = document.createElement("a");
    buyLink.className = "w-btn w-btn-buy";
    buyLink.href = info.buyUrl;
    buyLink.target = "_blank";
    buyLink.rel = "noopener noreferrer";
    buyLink.textContent = "Buy Now";
    actions.appendChild(buyLink);
  }

  if (actions.childElementCount > 0) {
    widgetBox.appendChild(actions);
  }

  wrapper.appendChild(style);
  wrapper.appendChild(widgetBox);

  shadow.appendChild(wrapper);
  document.body.appendChild(widgetContainer);
}

/**
 * Advanced Hide Deprecated UX
 */
function injectDeprecatedBars() {
  const deprecatedItems = document.querySelectorAll('li.download:has(.download__unavailable)');
  deprecatedItems.forEach(li => {
    if (li.dataset.exProcessed) return;
    li.dataset.exProcessed = 'true';

    const itemId = li.id.replace('item-', '');
    // EXTRACT IMAGE VIA ITERATIVE PROBING
    let finalSrcToUse = null;
    const allImages = Array.from(li.querySelectorAll('img'));
    for (const img of allImages) {
        let candidate = img.getAttribute('data-src') || img.getAttribute('src') || img.src;
        if (candidate && !candidate.startsWith('data:image') && !candidate.includes('placeholder')) {
            finalSrcToUse = candidate;
            break; 
        }
    }
    
    if (!finalSrcToUse) {
        const previewEl = li.querySelector('[data-preview-url]');
        if (previewEl) finalSrcToUse = previewEl.getAttribute('data-preview-url');
    }
    
    if (!finalSrcToUse && itemId) {
        const globalImg = document.querySelector(`img[data-item-id="${itemId}"]`);
        if (globalImg) finalSrcToUse = globalImg.getAttribute('data-src') || globalImg.getAttribute('src') || globalImg.src;
    }

    if (!finalSrcToUse && itemId && window.EnvatoImageCache) {
      window.EnvatoImageCache.getImage(itemId).then(cached => {
         if (cached && cached.blob) {
            const url = URL.createObjectURL(cached.blob);
            const placeholder = bar.querySelector('.ex-placeholder');
            const imgWrapper = bar.querySelector('.ex-tooltip-img-wrapper');
            
            const img = document.createElement('img');
            img.src = url;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.style.display = 'block';
            
            img.addEventListener('error', () => {
              img.style.display = 'none';
              placeholder.style.display = 'flex';
            });
            placeholder.style.display = 'none';
            imgWrapper.insertBefore(img, placeholder);
         }
      }).catch(err => console.error("Xperience Cache Error:", err));
    }

    const titleEl = li.querySelector('h3 a') || li.querySelector('h3') || li.querySelector('.t-heading') || li.querySelector('[class*="title"]');
    const itemTitle = titleEl ? titleEl.textContent.trim() : 'Unknown Item';

    let licenseUrl = null;
    const allLinks = Array.from(li.querySelectorAll('a'));
    for (const a of allLinks) {
        if (a.href && a.textContent && a.textContent.toLowerCase().includes('license certificate')) {
            licenseUrl = a.href;
            break;
        }
    }

    const bar = document.createElement('div');
    bar.className = 'envato-xperience-removed-bar';
    
    const infoSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    const expandSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"></path><path d="M10 14L21 3"></path><path d="M9 21H3v-6"></path><path d="M14 10L3 21"></path></svg>`;
    const collapseSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>`;
    const trashSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
    const placeholderSvg = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b0b8c0" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;
    const downloadSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;

    bar.innerHTML = `
      <div class="ex-removed-line"></div>
      <div class="ex-removed-text">ITEM REMOVED</div>
      <div class="ex-removed-line"></div>
      <div class="ex-removed-actions">
         <div class="ex-tooltip-wrapper">
            <button class="ex-btn ex-btn-info">${infoSvg}</button>
            <div class="ex-tooltip">
               <div class="ex-tooltip-img-wrapper">
                 <div class="ex-placeholder">${placeholderSvg}</div>
               </div>
               <div class="ex-tooltip-title">${itemTitle}</div>
            </div>
         </div>
         <div class="ex-action-wrapper">
         ${licenseUrl 
            ? `<a href="${licenseUrl}" target="_blank" class="ex-btn ex-btn-download">${downloadSvg}</a><div class="ex-text-tooltip">Download Licence TXT</div>` 
            : `<button class="ex-btn ex-btn-download ex-disabled" disabled>${downloadSvg}</button><div class="ex-text-tooltip">Download Not Available</div>`}
         </div>
         <div class="ex-action-wrapper">
            <button class="ex-btn ex-btn-expand">${expandSvg}</button>
            <div class="ex-text-tooltip">Toggle Original Item</div>
         </div>
         <div class="ex-action-wrapper">
            <button class="ex-btn ex-btn-delete">${trashSvg}</button>
            <div class="ex-text-tooltip">Remove from list</div>
         </div>
      </div>
    `;

    // Safely embed extracted image without blind cloning to bypass lazy loading quirks
    if (finalSrcToUse) {
      // Cache this image in IndexedDB for future visits
      const srcToUse = finalSrcToUse;
      if (itemId && srcToUse && window.EnvatoImageCache) {
          window.EnvatoImageCache.cacheImage(itemId, srcToUse).catch(err => console.error("Cache Error:", err));
      }

      const exactImg = document.createElement('img');
      exactImg.style.width = '100%';
      exactImg.style.height = '100%';
      exactImg.style.objectFit = 'cover';
      exactImg.style.display = 'block';
      
      const imgWrapper = bar.querySelector('.ex-tooltip-img-wrapper');
      const placeholder = bar.querySelector('.ex-placeholder');

      exactImg.addEventListener('error', () => {
        exactImg.style.display = 'none';
        placeholder.style.display = 'flex';
      });

      exactImg.src = srcToUse;
      placeholder.style.display = 'none';
      imgWrapper.insertBefore(exactImg, placeholder);
    }

    const tooltipWrapper = bar.querySelector('.ex-tooltip-wrapper');
    tooltipWrapper.addEventListener('mouseenter', () => {
        if (bar.querySelector('.ex-tooltip-img-wrapper img')) return;

        let lazySrc = null;
        const freshImages = Array.from(li.querySelectorAll('img'));
        for (const img of freshImages) {
            let candidate = img.getAttribute('data-src') || img.getAttribute('src') || img.src;
            if (candidate && !candidate.startsWith('data:image') && !candidate.includes('placeholder')) {
                lazySrc = candidate;
                break; 
            }
        }
        
        if (!lazySrc) {
            const previewEl = li.querySelector('[data-preview-url]');
            if (previewEl) lazySrc = previewEl.getAttribute('data-preview-url');
        }

        if (lazySrc) {
            const placeholder = bar.querySelector('.ex-placeholder');
            const imgWrapper = bar.querySelector('.ex-tooltip-img-wrapper');
            
            const img = document.createElement('img');
            img.src = lazySrc;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.style.display = 'block';
            
            img.addEventListener('error', () => {
              img.style.display = 'none';
              placeholder.style.display = 'flex';
            });
            placeholder.style.display = 'none';
            imgWrapper.insertBefore(img, placeholder);

            if (itemId && window.EnvatoImageCache) {
                 window.EnvatoImageCache.cacheImage(itemId, lazySrc).catch(() => {});
            }
        }
    });

    const expandBtn = bar.querySelector('.ex-btn-expand');
    expandBtn.addEventListener('click', () => {
      const isExpanded = li.classList.toggle('ex-expanded');
      expandBtn.classList.toggle('ex-active');
      expandBtn.innerHTML = isExpanded ? collapseSvg : expandSvg;
    });

    const deleteBtn = bar.querySelector('.ex-btn-delete');
    deleteBtn.addEventListener('click', () => {
      li.remove();
    });

    const originalContainer = document.createElement('div');
    originalContainer.className = 'ex-original-content';
    while(li.firstChild) {
      originalContainer.appendChild(li.firstChild);
    }
    li.appendChild(originalContainer);
    
    li.prepend(bar);
  });
}

function observeDownloads() {
  const downloadsList = document.querySelector('.list--downloads');
  if (downloadsList) {
    const observer = new MutationObserver(() => injectDeprecatedBars());
    observer.observe(downloadsList, { childList: true, subtree: true });
  }
  injectDeprecatedBars();
}

/**
 * Initialize the script
 */
function initialize() {
  if (window !== window.top) return; // Prevent execution inside iframes

  installTestBridge();

  chrome.storage.sync.get(["autoRemove", "widgetMode"], function (result) {
    const autoRemoveEnabled = result.autoRemove !== false; // Default to true if undefined
    const widgetModeEnabled = result.widgetMode === true; // Default to false
    const isEnvatoPreviewSite = shared
      ? shared.isEnvatoPreviewSite(window.location.hostname)
      : false;

    if (autoRemoveEnabled && isEnvatoPreviewSite) {
      removeFrame(widgetModeEnabled);
    } else if (!isEnvatoPreviewSite && widgetModeEnabled) {
      // Check if we are on a theme's site after being redirected
      checkAndInjectWidget();
    }

    // Always attempt to observe downloads for the Deprecated Items feature if we are on a potential downloads page
    if (window.location.pathname.includes('/downloads') || document.querySelector('.list--downloads')) {
      observeDownloads();
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
      if (panelVisible) hidePanel();
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
