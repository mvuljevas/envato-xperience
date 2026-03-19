if (window === window.top) {
  const root = document.documentElement;
  const localKey = "envatoXperienceHideAds";

  function applyHideAdsState(enabled) {
    root.dataset.envatoHideAds = enabled ? "true" : "false";
  }

  chrome.storage.local.get([localKey], function (localResult) {
    if (typeof localResult[localKey] === "boolean") {
      applyHideAdsState(localResult[localKey]);
    }
  });

  chrome.storage.sync.get(["hideAds", "hidePromoBar"], function (syncResult) {
    const hideAdsEnabled =
      syncResult.hideAds === true || syncResult.hidePromoBar === true;

    applyHideAdsState(hideAdsEnabled);
    chrome.storage.local.set({ [localKey]: hideAdsEnabled });
  });

  chrome.storage.onChanged.addListener(function (changes, areaName) {
    if (areaName === "local" && changes[localKey]) {
      applyHideAdsState(changes[localKey].newValue === true);
      return;
    }

    if (areaName === "sync" && (changes.hideAds || changes.hidePromoBar)) {
      const nextValue = changes.hideAds
        ? changes.hideAds.newValue === true
        : changes.hidePromoBar.newValue === true;

      applyHideAdsState(nextValue);
      chrome.storage.local.set({ [localKey]: nextValue });
    }
  });
}
