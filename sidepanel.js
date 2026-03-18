/**
 * Envato Frame Remover - SidePanel Script (Floating In-Page Version)
 * Handles user interactions and communicates with the host page via messaging
 */

document.addEventListener('DOMContentLoaded', function () {
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
                        if (response && response.title) {
                            if (loadingText) loadingText.style.display = 'none';
                            if (productTitleText) productTitleText.textContent = response.title;
                            if (itemDetailsContainer) itemDetailsContainer.classList.remove('hidden');
                            
                            const renderUI = (finalImageUrl) => {
                                const imageEl = document.getElementById('itemDetailsImage');
                                if (imageEl && finalImageUrl) {
                                    imageEl.src = finalImageUrl;
                                    imageEl.style.display = 'block';
                                } else if (imageEl) {
                                    imageEl.style.display = 'none';
                                }
                                
                                const priceEl = document.getElementById('itemDetailsPrice');
                                const salesEl = document.getElementById('itemDetailsSales');
                                const ratingEl = document.getElementById('itemDetailsRating');
                                const updateEl = document.getElementById('itemDetailsUpdate');
                                
                                if (priceEl) {
                                    if (response.oldPrice) {
                                        // Modern Discount layout
                                        priceEl.innerHTML = `<span style="text-decoration: line-through; text-decoration-thickness: 2px; color: #868e96; font-size: 16px; font-weight: 600; margin-right: 6px;">${response.oldPrice}</span><span style="color: #6fab35; font-size: 24px;">${response.price}</span>`;
                                    } else {
                                        priceEl.innerHTML = `<span style="font-size: 24px;">${response.price ? response.price : '--'}</span>`;
                                    }
                                }
                                
                                if (salesEl) {
                                    const svgCart = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#6c757d;"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>`;
                                    salesEl.innerHTML = `${svgCart} <span><strong style="font-weight:600;">${response.sales ? response.sales : '--'}</strong> Sales</span>`;
                                }
                                
                                if (ratingEl) {
                                    const pathD = "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";
                                    if (response.rating || response.ratingCount) {
                                        const score = response.rating ? parseFloat(response.rating) : 5;
                                        let starsHtml = '<div style="display:flex; gap:2px;">';
                                        
                                        for(let i=1; i<=5; i++) {
                                            const fillP = Math.max(0, Math.min(100, (score - i + 1) * 100));
                                            if (fillP === 100) {
                                                starsHtml += `<svg width="14" height="14" viewBox="0 0 24 24" fill="#f5a623"><path d="${pathD}"/></svg>`;
                                            } else if (fillP === 0) {
                                                starsHtml += `<svg width="14" height="14" viewBox="0 0 24 24" fill="#e9ecef"><path d="${pathD}"/></svg>`;
                                            } else {
                                                // Unique gradient id for fractional star
                                                const gid = `grad-${itemId || 'default'}-${i}-${Date.now()}`;
                                                starsHtml += `<svg width="14" height="14" viewBox="0 0 24 24">
                                                    <defs>
                                                        <linearGradient id="${gid}">
                                                            <stop offset="${fillP}%" stop-color="#f5a623"/>
                                                            <stop offset="${fillP}%" stop-color="#e9ecef"/>
                                                        </linearGradient>
                                                    </defs>
                                                    <path fill="url(#${gid})" d="${pathD}"/>
                                                </svg>`;
                                            }
                                        }
                                        starsHtml += '</div>';
                                        
                                        const exactScoreHtml = response.rating ? `<span style="color: #495057; font-size: 13px; font-weight: 500; margin-left: 6px;">${score.toFixed(2)}</span>` : '';
                                        const badgeCountHtml = response.ratingCount ? `<span style="background: #007bae; color: white; padding: 2px 5px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-left: 6px; letter-spacing: 0.2px;">${response.ratingCount}</span>` : '';
                                        
                                        ratingEl.innerHTML = `${starsHtml} ${exactScoreHtml} ${badgeCountHtml}`;
                                    } else {
                                        let emptyStarsHtml = '<div style="display:flex; gap:2px;">';
                                        for(let i=1; i<=5; i++) {
                                            emptyStarsHtml += `<svg width="14" height="14" viewBox="0 0 24 24" fill="#dee2e6"><path d="${pathD}"/></svg>`;
                                        }
                                        emptyStarsHtml += '</div>';
                                        ratingEl.innerHTML = `${emptyStarsHtml} <span style="color: #868e96; font-size: 13px; font-weight: 500; margin-left: 6px;">(No ratings)</span>`;
                                    }
                                }

                                if (updateEl) {
                                    if (response.lastUpdate) {
                                        updateEl.textContent = `Last updated: ${response.lastUpdate}`;
                                        updateEl.style.display = 'block';
                                    } else {
                                        updateEl.style.display = 'none';
                                    }
                                }
                            };

                            // Cache logic for preserving High-res image across sub-tabs (like /comments)
                            const match = activeTab.url.match(/\/item\/[^\/]+\/(\d+)/);
                            const itemId = match ? match[1] : null;

                            if (itemId) {
                                chrome.storage.local.get([`cachedImg_${itemId}`], function(res) {
                                    let finalImg = response.imageUrl;
                                    
                                    if (response.isHighResImage) {
                                        chrome.storage.local.set({ [`cachedImg_${itemId}`]: response.imageUrl });
                                    } else if (res[`cachedImg_${itemId}`]) {
                                        finalImg = res[`cachedImg_${itemId}`];
                                    }
                                    
                                    renderUI(finalImg);
                                });
                            } else {
                                renderUI(response.imageUrl);
                            }
                        } else {
                            if (loadingText) loadingText.textContent = "General browsing (No frames here)";
                            if (loadingText) loadingText.style.display = 'block';
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

    // Initialize
    checkDomain();
    loadSettings();

    // Listener for tab changes to update UI domain detection
    chrome.tabs.onActivated.addListener(checkDomain);
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.status === 'complete') checkDomain();
    });
});
