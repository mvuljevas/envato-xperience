# Image Cache Architecture

## What IndexedDB Is

`IndexedDB` is the browser's built-in structured database. Unlike `chrome.storage.local`, it is designed for larger datasets and can safely store records, metadata, and binary blobs such as images.

For Envato XPerience, this makes it a better fit for cached product previews:
- `chrome.storage.sync`: settings only
- `chrome.storage.local`: small runtime context only
- `IndexedDB`: image blobs and image metadata

## Why We Do Not Store Images in chrome.storage.local

`chrome.storage.local` is convenient for settings, but it is the wrong place for a growing image cache:
- it mixes configuration and heavy cached content
- it is easier to bloat accidentally
- it is not a purpose-built blob store

The extension now keeps cached product images in `IndexedDB` through `image-cache.js`.

## Current Cache Design

Each cached image record stores:
- `itemId`
- `sourceUrl`
- `blob`
- `checksum` (`SHA-256`)
- `size`
- `contentType`
- `createdAt`
- `updatedAt`
- `lastAccessedAt`
- `expiresAt`

## Cache Rules

`itemId` is the canonical Envato item identifier extracted from the item URL, for example `/item/.../60748688`. The same ID should also be recoverable from sub-routes such as `/item/.../reviews/60748688`, `/comments/60748688`, or `/support/60748688`. The cache and the sidepanel should treat this numeric ID as the stable key for product data and images.

- Time-to-live: 7 days
- Max entries: 80
- Max total size: 50 MB
- Cleanup policy:
  - remove expired entries first
  - if limits are still exceeded, evict least-recently-used entries

## Runtime Flow

1. The sidepanel requests item details from `content.js`.
2. If the current page exposes a high-resolution image, the extension fetches that image and stores it in `IndexedDB`.
3. On lower-fidelity pages such as comments/reviews tabs, the extension first tries to reuse the cached image for the same product.
4. If cache lookup fails, the extension falls back to the source URL from the current page.

## Storage Safety Goal

The goal is simple:
- settings should remain tiny and predictable
- preview context should remain short-lived
- images should live in a separate cache with explicit retention and eviction rules

This keeps `chrome.storage.local` from becoming an unbounded asset bucket.
