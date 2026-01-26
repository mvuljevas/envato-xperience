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

    /**
     * Tab Switching Logic
     */
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
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
            const isEnvatoSite = activeTab.url &&
                (activeTab.url.includes('preview.themeforest.net') ||
                    activeTab.url.includes('preview.codecanyon.net'));

            if (isEnvatoSite) {
                if (envatoControls) envatoControls.style.display = 'block';
                if (notEnvatoMessage) notEnvatoMessage.style.display = 'none';
            } else {
                if (envatoControls) envatoControls.style.display = 'none';
                if (notEnvatoMessage) notEnvatoMessage.style.display = 'block';
            }
        });
    }

    function loadSettings() {
        chrome.storage.sync.get(['autoRemove'], function (result) {
            if (autoRemoveCheckbox) autoRemoveCheckbox.checked = (result.autoRemove !== false);
        });
    }

    function saveSettings() {
        if (!autoRemoveCheckbox) return;
        chrome.storage.sync.set({ autoRemove: autoRemoveCheckbox.checked });
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
