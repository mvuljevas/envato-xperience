if (window === window.top) {
  const shared = window.EnvatoXperienceShared;
  if (!shared) {
    console.warn("[Envato Xperience] Shared helpers unavailable in marketplace-init.");
  }

  const root = document.documentElement;
  const localKey = shared ? shared.STORAGE_KEYS.hideAdsMirror : "envatoXperienceHideAds";
  const hideAdsKey = shared ? shared.STORAGE_KEYS.hideAds : "hideAds";
  const legacyHideAdsKey = shared ? shared.STORAGE_KEYS.legacyHideAds : "hidePromoBar";

  function applyHideAdsState(enabled) {
    root.dataset.envatoHideAds = enabled ? "true" : "false";
  }

  chrome.storage.local.get([localKey], function (localResult) {
    if (typeof localResult[localKey] === "boolean") {
      applyHideAdsState(localResult[localKey]);
    }
  });

  chrome.storage.sync.get([hideAdsKey, legacyHideAdsKey], function (syncResult) {
    const hideAdsEnabled = shared
      ? shared.readHideAdsPreference(syncResult)
      : syncResult.hideAds === true || syncResult.hidePromoBar === true;

    applyHideAdsState(hideAdsEnabled);
    chrome.storage.local.set({ [localKey]: hideAdsEnabled });

    if (shared && shared.hasLegacyHideAdsPreference(syncResult)) {
      const patch = {};
      if (hideAdsEnabled && syncResult[hideAdsKey] !== true) {
        patch[hideAdsKey] = true;
      }
      chrome.storage.sync.remove(legacyHideAdsKey, function () {
        if (Object.keys(patch).length > 0) {
          chrome.storage.sync.set(patch);
        }
      });
    }
  });

  chrome.storage.onChanged.addListener(function (changes, areaName) {
    if (areaName === "local" && changes[localKey]) {
      applyHideAdsState(changes[localKey].newValue === true);
      return;
    }

    if (areaName === "sync" && changes[hideAdsKey]) {
      const nextValue = changes[hideAdsKey].newValue === true;
      applyHideAdsState(nextValue);
      chrome.storage.local.set({ [localKey]: nextValue });
    }
  });
}
