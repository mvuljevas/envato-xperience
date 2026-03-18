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

                if (envatoDomainText) {
                    let siteName = "Envato";
                    if (activeTab.url.includes('themeforest')) siteName = "ThemeForest";
                    if (activeTab.url.includes('codecanyon')) siteName = "CodeCanyon";
                    if (activeTab.url.includes('videohive')) siteName = "VideoHive";
                    if (activeTab.url.includes('audiojungle')) siteName = "AudioJungle";
                    if (activeTab.url.includes('graphicriver')) siteName = "GraphicRiver";
                    if (activeTab.url.includes('photodune')) siteName = "PhotoDune";
                    if (activeTab.url.includes('3docean')) siteName = "3DOcean";
                    
                    envatoDomainText.textContent = isEnvatoPreview ? `You are viewing a preview on ${siteName}` : `You are browsing ${siteName}`;
                }

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
