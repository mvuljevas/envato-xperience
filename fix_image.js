const fs = require('fs');

const contentFile = 'content.js';
let content = fs.readFileSync(contentFile, 'utf8');

const targetOldExtraction = `    // Approach 1: Extremely simple native DOM query based on consistent Envato item layout
    let originalImg = li.querySelector('.download__thumbnail .item-thumbnail__image a img') || 
                      li.querySelector('.download__thumbnail img') ||
                      li.querySelector('.item-thumbnail__image img') ||
                      li.querySelector('.item-thumbnail img') ||
                      li.querySelector('img'); // Ultimate fallback: grab the first image inside the item row
    
    // Fallback: If image still missing, attempt to find a globally unique target matching the ID
    if (!originalImg) {
        originalImg = document.querySelector(\`img[data-item-id="\${itemId}"]\`) || 
                      (document.querySelector(\`a[data-analytics-click-payload*='\\\"item_id\\\":\\\"\${itemId}\\\"']\`) || {}).querySelector?.('img');
    }`;

const targetOldSrcLogic = `    // Safely embed extracted image without blind cloning to bypass lazy loading quirks
    if (originalImg) {
      let srcToUse = originalImg.getAttribute('data-src') || originalImg.src;
      
      // If native src is just a lazy-loading blank pixel, resort to the preview URL string
      if (srcToUse && srcToUse.startsWith('data:image')) {
          srcToUse = originalImg.getAttribute('data-preview-url') || srcToUse;
      }

      // Cache this image in IndexedDB for future visits`;

const replacementExtraction = `    // UNBREAKABLE IMAGE EXTRACTION 
    let finalSrcToUse = null;
    const allImages = Array.from(li.querySelectorAll('img'));
    for (const img of allImages) {
        let candidate = img.getAttribute('data-src') || img.getAttribute('src') || img.src;
        if (candidate && !candidate.startsWith('data:image') && !candidate.includes('placeholder')) {
            finalSrcToUse = candidate;
            break; // Found a valid image URL!
        }
    }
    
    // If img tags failed, check if ANY element in the row holds a data-preview-url (Envato fallback)
    if (!finalSrcToUse) {
        const previewEl = li.querySelector('[data-preview-url]');
        if (previewEl) {
             finalSrcToUse = previewEl.getAttribute('data-preview-url');
        }
    }
    
    // Ultimate fallback using the item ID globally in case the element is completely mutated
    if (!finalSrcToUse && itemId) {
        const globalImg = document.querySelector(\`img[data-item-id="\${itemId}"]\`);
        if (globalImg) finalSrcToUse = globalImg.getAttribute('data-src') || globalImg.getAttribute('src') || globalImg.src;
    }`;

const replacementSrcLogic = `    // Safely embed extracted image without blind cloning to bypass lazy loading quirks
    if (finalSrcToUse) {
      // Cache this image in IndexedDB for future visits
      const srcToUse = finalSrcToUse;`;

content = content.replace(targetOldExtraction, replacementExtraction);
content = content.replace(targetOldSrcLogic, replacementSrcLogic);

fs.writeFileSync(contentFile, content);
console.log("Image extraction updated successfully.");
