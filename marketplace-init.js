if (window === window.top) {
  const shared = window.EnvatoXperienceShared;
  if (!shared) {
    console.warn("[Envato Xperience] Shared helpers unavailable in marketplace-init.");
  }

  const root = document.documentElement;
  const localKey = shared ? shared.STORAGE_KEYS.hideAdsMirror : "envatoXperienceHideAds";
  const hideAdsKey = shared ? shared.STORAGE_KEYS.hideAds : "hideAds";
  const legacyHideAdsKey = shared ? shared.STORAGE_KEYS.legacyHideAds : "hidePromoBar";
  const hostMirrorKey = `${localKey}:host`;

  function applyHideAdsState(enabled) {
    root.dataset.envatoHideAds = enabled ? "true" : "false";
  }

  function readHostMirror() {
    try {
      const value = window.localStorage.getItem(hostMirrorKey);
      if (value === "true") return true;
      if (value === "false") return false;
    } catch (error) {
      console.warn("[Envato Xperience] Unable to read host hide-ads mirror.", error);
    }

    return null;
  }

  function writeHostMirror(enabled) {
    try {
      window.localStorage.setItem(hostMirrorKey, enabled ? "true" : "false");
    } catch (error) {
      console.warn("[Envato Xperience] Unable to write host hide-ads mirror.", error);
    }
  }

  const mirroredHideAds = readHostMirror();
  if (typeof mirroredHideAds === "boolean") {
    applyHideAdsState(mirroredHideAds);
  }

  chrome.storage.local.get([localKey], function (localResult) {
    if (typeof localResult[localKey] === "boolean") {
      applyHideAdsState(localResult[localKey]);
      writeHostMirror(localResult[localKey]);
    }
  });

  chrome.storage.sync.get([hideAdsKey, legacyHideAdsKey], function (syncResult) {
    const hideAdsEnabled = shared
      ? shared.readHideAdsPreference(syncResult)
      : syncResult.hideAds === true || syncResult.hidePromoBar === true;

    applyHideAdsState(hideAdsEnabled);
    writeHostMirror(hideAdsEnabled);
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
      const nextValue = changes[localKey].newValue === true;
      applyHideAdsState(nextValue);
      writeHostMirror(nextValue);
      return;
    }

    if (areaName === "sync" && changes[hideAdsKey]) {
      const nextValue = changes[hideAdsKey].newValue === true;
      applyHideAdsState(nextValue);
      writeHostMirror(nextValue);
      chrome.storage.local.set({ [localKey]: nextValue });
    }
  });
}
