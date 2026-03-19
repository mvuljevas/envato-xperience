/**
 * Envato Xperience - SidePanel Script (Floating In-Page Version)
 * Handles user interactions and communicates with the host page via messaging
 */

document.addEventListener('DOMContentLoaded', function () {
    const svgNs = 'http://www.w3.org/2000/svg';
    let currentImageObjectUrl = null;

    // Tab Elements
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    // Action Tab Elements
    const removeNowBtn = document.getElementById('removeNow');
    const envatoControls = document.getElementById('envatoControls');
    const notEnvatoMessage = document.getElementById('notEnvatoMessage');
    const closeBtn = document.getElementById('closePanel');

    // Settings Tab Elements
    const autoRemoveCheckbox = document.getElementById('autoRemove');
    const widgetModeCheckbox = document.getElementById('widgetMode');

    // UI Feedback Elements
    const envatoDomainText = document.getElementById('envatoDomainText');
    const productTitleText = document.getElementById('productTitleText');
    const contentArea = document.querySelector('.content-area');

    function clearChildren(element) {
        if (element) {
            element.replaceChildren();
        }
    }

    function clearImageObjectUrl() {
        if (currentImageObjectUrl) {
            URL.revokeObjectURL(currentImageObjectUrl);
            currentImageObjectUrl = null;
        }
    }

    function extractItemIdFromUrl(url) {
        if (!url || typeof url !== 'string') {
            return null;
        }

        const match = url.match(/\/item\/[^/]+\/(?:(?:reviews|comments|support)\/)?(\d+)(?:[/?#]|$)/i);
        return match ? match[1] : null;
    }

    function setImageSource(imageEl, source) {
        if (!imageEl) return;

        if (!source) {
            clearImageObjectUrl();
            imageEl.removeAttribute('src');
            imageEl.style.display = 'none';
            return;
        }

        if (source instanceof Blob) {
            clearImageObjectUrl();
            currentImageObjectUrl = URL.createObjectURL(source);
            imageEl.src = currentImageObjectUrl;
            imageEl.style.display = 'block';
            return;
        }

        clearImageObjectUrl();
        imageEl.src = source;
        imageEl.style.display = 'block';
    }

    async function resolveProductImage(itemId, details) {
        if (!details) return null;

        if (!itemId || !window.EnvatoImageCache) {
            return details.imageUrl || null;
        }

        try {
            if (details.isHighResImage && details.imageUrl) {
                const cached = await window.EnvatoImageCache.cacheImage(itemId, details.imageUrl);
                if (cached && cached.blob) return cached.blob;
            }

            const existing = await window.EnvatoImageCache.getImage(itemId);
            if (existing && existing.blob) {
                return existing.blob;
            }
        } catch (error) {
            console.warn('[Envato Xperience] Image cache unavailable, falling back to source URL.', error);
        }

        return details.imageUrl || null;
    }

    function createSvgElement(tagName, attributes = {}) {
        const element = document.createElementNS(svgNs, tagName);
        Object.entries(attributes).forEach(([name, value]) => {
            element.setAttribute(name, value);
        });
        return element;
    }

    function createStarSvg(fill, gradientId) {
        const svg = createSvgElement('svg', {
            width: '14',
            height: '14',
            viewBox: '0 0 24 24'
        });
        const pathD = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';

        if (gradientId && typeof fill === 'number' && fill > 0 && fill < 100) {
            const defs = createSvgElement('defs');
            const gradient = createSvgElement('linearGradient', { id: gradientId });
            gradient.appendChild(createSvgElement('stop', { offset: `${fill}%`, 'stop-color': '#f5a623' }));
            gradient.appendChild(createSvgElement('stop', { offset: `${fill}%`, 'stop-color': '#e9ecef' }));
            defs.appendChild(gradient);
            svg.appendChild(defs);
            svg.appendChild(createSvgElement('path', { d: pathD, fill: `url(#${gradientId})` }));
            return svg;
        }

        svg.setAttribute('fill', fill);
        svg.appendChild(createSvgElement('path', { d: pathD }));
        return svg;
    }

    function renderPrice(priceEl, response) {
        if (!priceEl) return;

        clearChildren(priceEl);

        if (response.oldPrice) {
            const oldPrice = document.createElement('span');
            oldPrice.style.cssText = 'text-decoration: line-through; text-decoration-thickness: 2px; color: #868e96; font-size: 16px; font-weight: 600; margin-right: 6px;';
            oldPrice.textContent = response.oldPrice;
            priceEl.appendChild(oldPrice);
        }

        const currentPrice = document.createElement('span');
        currentPrice.style.cssText = response.oldPrice
            ? 'color: #6fab35; font-size: 24px;'
            : 'font-size: 24px;';
        currentPrice.textContent = response.price || '--';
        priceEl.appendChild(currentPrice);
    }

    function renderSales(salesEl, response) {
        if (!salesEl) return;

        clearChildren(salesEl);

        const cartSvg = createSvgElement('svg', {
            width: '14',
            height: '14',
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            'stroke-width': '2',
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
            style: 'color:#6c757d;'
        });
        cartSvg.appendChild(createSvgElement('circle', { cx: '9', cy: '21', r: '1' }));
        cartSvg.appendChild(createSvgElement('circle', { cx: '20', cy: '21', r: '1' }));
        cartSvg.appendChild(createSvgElement('path', { d: 'M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6' }));

        const textWrapper = document.createElement('span');
        const salesValue = document.createElement('strong');
        salesValue.style.fontWeight = '600';
        salesValue.textContent = response.sales || '--';
        textWrapper.appendChild(salesValue);
        textWrapper.appendChild(document.createTextNode(' Sales'));

        salesEl.appendChild(cartSvg);
        salesEl.appendChild(document.createTextNode(' '));
        salesEl.appendChild(textWrapper);
    }

    function parseCompactNumber(value) {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }

        if (!value || typeof value !== 'string') {
            return null;
        }

        const normalized = value.trim().replace(/,/g, '').toUpperCase();
        const match = normalized.match(/^(\d+(?:\.\d+)?)([KM])?$/);
        if (!match) {
            return null;
        }

        const numeric = parseFloat(match[1]);
        if (!Number.isFinite(numeric)) {
            return null;
        }

        if (match[2] === 'K') {
            return numeric * 1000;
        }

        if (match[2] === 'M') {
            return numeric * 1000000;
        }

        return numeric;
    }

    function formatEnvatoCompactCount(value) {
        const numericValue = parseCompactNumber(value);
        if (!Number.isFinite(numericValue)) {
            return value || '';
        }

        if (numericValue < 1000) {
            return Math.round(numericValue).toString();
        }

        return new Intl.NumberFormat('en-US', {
            notation: 'compact',
            compactDisplay: 'short',
            maximumFractionDigits: 1
        }).format(numericValue).replace('k', 'K').replace('m', 'M');
    }

    function renderRating(ratingEl, response, itemId) {
        if (!ratingEl) return;

        clearChildren(ratingEl);

        const starsRow = document.createElement('div');
        starsRow.style.cssText = 'display:flex; gap:2px;';

        if (response.rating || response.ratingCount) {
            const score = response.rating ? parseFloat(response.rating) : 5;

            for (let i = 1; i <= 5; i++) {
                const fillPercentage = Math.max(0, Math.min(100, (score - i + 1) * 100));
                const gradientId = `grad-${itemId || 'default'}-${i}`;

                if (fillPercentage === 100) {
                    starsRow.appendChild(createStarSvg('#f5a623'));
                } else if (fillPercentage === 0) {
                    starsRow.appendChild(createStarSvg('#e9ecef'));
                } else {
                    starsRow.appendChild(createStarSvg(fillPercentage, gradientId));
                }
            }

            ratingEl.appendChild(starsRow);

            if (response.rating) {
                const exactScore = document.createElement('span');
                exactScore.style.cssText = 'color: #495057; font-size: 13px; font-weight: 500; margin-left: 6px;';
                exactScore.textContent = score.toFixed(2);
                ratingEl.appendChild(document.createTextNode(' '));
                ratingEl.appendChild(exactScore);
            }

            if (response.ratingCount) {
                const ratingCount = document.createElement('span');
                ratingCount.style.cssText = 'background: #007bae; color: white; padding: 2px 5px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-left: 6px; letter-spacing: 0.2px;';
                ratingCount.textContent = formatEnvatoCompactCount(response.ratingCount);
                ratingEl.appendChild(document.createTextNode(' '));
                ratingEl.appendChild(ratingCount);
            }

            return;
        }

        for (let i = 1; i <= 5; i++) {
            starsRow.appendChild(createStarSvg('#dee2e6'));
        }

        const noRatings = document.createElement('span');
        noRatings.style.cssText = 'color: #868e96; font-size: 13px; font-weight: 500; margin-left: 6px;';
        noRatings.textContent = '(No ratings)';

        ratingEl.appendChild(starsRow);
        ratingEl.appendChild(document.createTextNode(' '));
        ratingEl.appendChild(noRatings);
    }

    /**
     * Tab Switching Logic
     */
    const tabsContainer = document.querySelector('.tabs');
    
    tabButtons.forEach((button, index) => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // Visual Update
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Move Glider
            // Assuming index 0 is first tab, index 1 is second
            if (index === 1) {
                tabsContainer.classList.add('on-second-tab');
            } else {
                tabsContainer.classList.remove('on-second-tab');
            }

            // Content Update
            tabPanels.forEach(panel => {
                panel.classList.remove('active');
                if (panel.id === tabId + 'Tab') panel.classList.add('active');
            });

            if (contentArea) {
                contentArea.scrollTop = 0;
            }
        });
    });

    /**
     * Check Domain (via chrome.tabs since we are in an extension context iframe)
     */
    function checkDomain() {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (!tabs || tabs.length === 0) return;
            const activeTab = tabs[0];
            
            const previewDomains = ['preview.themeforest.net', 'preview.codecanyon.net', 'preview.videohive.net', 'preview.audiojungle.net', 'preview.graphicriver.net', 'preview.photodune.net', 'preview.3docean.net'];
            const envatoDomains = ['themeforest.net', 'codecanyon.net', 'videohive.net', 'audiojungle.net', 'graphicriver.net', 'photodune.net', '3docean.net', 'envato.com'];
            
            const isEnvatoPreview = activeTab.url && previewDomains.some(domain => activeTab.url.includes(domain));
            const isEnvatoSite = activeTab.url && envatoDomains.some(domain => activeTab.url.includes(domain));

            if (isEnvatoSite) {
                if (envatoControls) envatoControls.classList.remove('hidden');
                if (notEnvatoMessage) notEnvatoMessage.classList.add('hidden');

                let siteName = "Envato";
                if (activeTab.url.includes('themeforest')) siteName = "ThemeForest";
                if (activeTab.url.includes('codecanyon')) siteName = "CodeCanyon";
                if (activeTab.url.includes('videohive')) siteName = "VideoHive";
                if (activeTab.url.includes('audiojungle')) siteName = "AudioJungle";
                if (activeTab.url.includes('graphicriver')) siteName = "GraphicRiver";
                if (activeTab.url.includes('photodune')) siteName = "PhotoDune";
                if (activeTab.url.includes('3docean')) siteName = "3DOcean";

                if (envatoDomainText) {
                    envatoDomainText.textContent = isEnvatoPreview ? `You are viewing a preview on ${siteName}` : `You are browsing ${siteName}`;
                }

                const itemDetailsContainer = document.getElementById('itemDetailsContainer');
                if (itemDetailsContainer) itemDetailsContainer.classList.add('hidden');

                if (isEnvatoPreview) {
                    if (removeNowBtn) removeNowBtn.classList.remove('hidden');
                    
                    chrome.tabs.sendMessage(activeTab.id, { action: "get_product_info" }, function(response) {
                        // Ignore errors if the content script is not injected yet
                        if (chrome.runtime.lastError) {
                            if (productTitleText) productTitleText.textContent = "Loading...";
                            return;
                        }
                        if (response && response.title) {
                            if (productTitleText) productTitleText.textContent = response.title;
                        } else {
                            if (productTitleText) productTitleText.textContent = "Product (Title not found)";
                        }
                    });
                } else if (activeTab.url.includes('/item/')) {
                    // Item Page
                    if (removeNowBtn) removeNowBtn.classList.add('hidden');
                    if (envatoDomainText) envatoDomainText.textContent = `Viewing Product on ${siteName}`;
                    const loadingText = document.getElementById('loadingText');
                    if (loadingText) {
                        loadingText.textContent = "Fetching details...";
                        loadingText.style.display = 'block';
                    }
                    if (itemDetailsContainer) itemDetailsContainer.classList.add('hidden');
                    
                    chrome.tabs.sendMessage(activeTab.id, { action: "get_item_details" }, function(response) {
                        if (chrome.runtime.lastError) {
                            if (loadingText) loadingText.textContent = "Error fetching details.";
                            return;
                        }

                        try {
                            const details = response && typeof response === 'object' ? response : null;

                            if (details && details.title) {
                                if (loadingText) loadingText.style.display = 'none';
                                if (productTitleText) productTitleText.textContent = details.title;
                                if (itemDetailsContainer) itemDetailsContainer.classList.remove('hidden');
                                const itemId = details.itemId || extractItemIdFromUrl(activeTab.url);
                                
                                const renderUI = (finalImageUrl) => {
                                    const imageEl = document.getElementById('itemDetailsImage');
                                    setImageSource(imageEl, finalImageUrl);
                                    
                                    const priceEl = document.getElementById('itemDetailsPrice');
                                    const salesEl = document.getElementById('itemDetailsSales');
                                    const ratingEl = document.getElementById('itemDetailsRating');
                                    const updateEl = document.getElementById('itemDetailsUpdate');
                                    
                                    renderPrice(priceEl, details);
                                    renderSales(salesEl, details);
                                    renderRating(ratingEl, details, itemId);

                                    if (updateEl) {
                                        if (details.lastUpdate) {
                                            updateEl.textContent = `Last updated: ${details.lastUpdate}`;
                                            updateEl.style.display = 'block';
                                        } else {
                                            updateEl.style.display = 'none';
                                        }
                                    }
                                };

                                // Cache logic for preserving High-res image across sub-tabs (like /comments)
                                Promise.resolve(resolveProductImage(itemId, details))
                                    .then(renderUI)
                                    .catch((error) => {
                                        console.warn('[Envato Xperience] Failed to resolve cached product image.', error);
                                        renderUI(details.imageUrl);
                                    });
                            } else {
                                if (loadingText) loadingText.textContent = "General browsing (No frames here)";
                                if (loadingText) loadingText.style.display = 'block';
                            }
                        } catch (error) {
                            console.error('[Envato Xperience] Failed to render item details:', error, response);
                            if (loadingText) {
                                loadingText.textContent = "Could not render product details.";
                                loadingText.style.display = 'block';
                            }
                            if (itemDetailsContainer) itemDetailsContainer.classList.add('hidden');
                        }
                    });
                } else {
                    if (removeNowBtn) removeNowBtn.classList.add('hidden');
                    if (productTitleText) productTitleText.textContent = "General browsing (No frames here)";
                }

            } else {
                if (envatoControls) envatoControls.classList.add('hidden');
                if (notEnvatoMessage) notEnvatoMessage.classList.remove('hidden');
            }
        });
    }

    function loadSettings() {
        chrome.storage.sync.get(['autoRemove', 'widgetMode'], function (result) {
            if (autoRemoveCheckbox) autoRemoveCheckbox.checked = (result.autoRemove !== false);
            if (widgetModeCheckbox) widgetModeCheckbox.checked = (result.widgetMode === true); // defaults to false
        });
    }

    function saveSettings() {
        if (!autoRemoveCheckbox || !widgetModeCheckbox) return;
        chrome.storage.sync.set({ 
            autoRemove: autoRemoveCheckbox.checked,
            widgetMode: widgetModeCheckbox.checked 
        });
    }

    /**
     * Trigger manual removal via message to content.js
     */
    function triggerManualRemoval() {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (!tabs || tabs.length === 0) return;
            chrome.tabs.sendMessage(tabs[0].id, { action: "remove_frame" });
        });
    }

    /**
     * Close the floating panel via message to content.js
     */
    function triggerClose() {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (!tabs || tabs.length === 0) return;
            chrome.tabs.sendMessage(tabs[0].id, { action: "close_panel" });
        });
    }

    // Event Listeners
    if (autoRemoveCheckbox) autoRemoveCheckbox.addEventListener('change', saveSettings);
    if (widgetModeCheckbox) widgetModeCheckbox.addEventListener('change', saveSettings);
    if (removeNowBtn) removeNowBtn.addEventListener('click', triggerManualRemoval);
    if (closeBtn) closeBtn.addEventListener('click', triggerClose);
    window.addEventListener('beforeunload', clearImageObjectUrl);

    // Initialize
    checkDomain();
    loadSettings();

    // Listener for tab changes to update UI domain detection
    chrome.tabs.onActivated.addListener(checkDomain);
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.status === 'complete') checkDomain();
    });
});
