const fs = require('fs');

const contentFile = 'content.js';
let content = fs.readFileSync(contentFile, 'utf8');

const target = `    let originalImg = li.querySelector('.download__thumbnail .item-thumbnail__image a img') || 
                      li.querySelector('.download__thumbnail img') ||
                      li.querySelector('.item-thumbnail__image img') ||
                      li.querySelector('.item-thumbnail img');`;

const replacement = `    let originalImg = li.querySelector('.download__thumbnail .item-thumbnail__image a img') || 
                      li.querySelector('.download__thumbnail img') ||
                      li.querySelector('.item-thumbnail__image img') ||
                      li.querySelector('.item-thumbnail img') ||
                      li.querySelector('img'); // Ultimate fallback: grab the first image inside the item row`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(contentFile, content);
    console.log("content.js updated successfully.");
} else {
    console.error("Target logic not found in content.js");
}
