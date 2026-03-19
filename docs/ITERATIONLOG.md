# Iteration Log

Registro corto de cambios relevantes para evitar pérdida de contexto entre sesiones largas.

## Template

### YYYY-MM-DD - Título corto
- Objetivo:
- Archivos:
- Validación:
- Riesgos pendientes:
- Próximo paso lógico:

## Entries

### 2026-03-19 - Sidepanel compacto y Hide Ads temprano
- Objetivo: acercar la tarjeta del sidepanel al patrón compacto de Envato y reducir flicker al ocultar promos con `document_start`.
- Archivos: `content.js`, `content.css`, `manifest.json`, `marketplace-init.js`, `marketplace-overrides.css`, `sidepanel.html`, `sidepanel.css`, `sidepanel.js`.
- Validación: `python3 -m json.tool manifest.json`; `node --check marketplace-init.js`; `node --check content.js`; `node --check sidepanel.js`; recarga manual de la extensión requerida para validar visualmente.
- Riesgos pendientes: revisar visualmente selectores de promos si Envato cambia clases; afinar estilos del panel según referencias de UI.
- Próximo paso lógico: seguir iterando ajustes visuales finos del sidepanel antes de abrir la sección de `Support`.

### 2026-03-19 - Nuevos ads de hosting partner
- Objetivo: ampliar `Hide Ads` para cubrir bloques promocionales de hosting y descarga inmediata detectados en sidebars de páginas de producto.
- Archivos: `marketplace-overrides.css`.
- Validación: revisión de selectores DOM reportados en captura; requiere recarga manual de la extensión y de la página para confirmar supresión temprana.
- Riesgos pendientes: Envato puede renombrar estas clases; falta smoke visual posterior a recarga.
- Próximo paso lógico: verificar visualmente que no quede hueco lateral y continuar con el siguiente bloque promocional que aparezca.

### 2026-03-19 - Colapso de sidebar promocional
- Objetivo: ocultar el `sidebar-right` completo cuando solo aporta promociones y recuperar ancho para el contenedor principal de items; además ocultar promos inline de downloads.
- Archivos: `marketplace-overrides.css`.
- Validación: ajuste basado en clases observadas en capturas (`sidebar-s sidebar-right`, `download__promotions`); requiere recarga completa para confirmar que no rompa layouts de cuenta o downloads.
- Riesgos pendientes: el ensanchamiento conservador de `.content-l`, `.content-r` y `.content-main` puede necesitar ajuste fino en vistas menos comunes.
- Próximo paso lógico: smoke visual en páginas de downloads/cuenta y, si el layout queda estable, seguir cerrando anuncios residuales por selector específico.

### 2026-03-19 - Consolidación de helpers compartidos
- Objetivo: reducir duplicación entre `marketplace-init.js`, `content.js` y `sidepanel.js` centralizando hosts Envato, parsing de `itemId` y compatibilidad del setting `Hide Ads`.
- Archivos: `envato-shared.js`, `manifest.json`, `marketplace-init.js`, `content.js`, `sidepanel.js`, `sidepanel.css`, `background.js`, `README.md`, `docs/WORKFLOW.md`, `docs/COMPLIANCE.md`.
- Validación: `python3 -m json.tool manifest.json`; `node --check envato-shared.js`; `node --check marketplace-init.js`; `node --check content.js`; `node --check sidepanel.js`; `node --check background.js`.
- Riesgos pendientes: falta smoke visual tras recargar la extensión; permanece un asset binario viejo no referenciado que no se pudo borrar automáticamente por política del entorno.
- Próximo paso lógico: hacer smoke manual de `Hide Ads` y del sidepanel para confirmar que la consolidación no alteró comportamiento observable.

### 2026-03-19 - Ensanche de downloads sin sidebar
- Objetivo: remover el ancho fijo residual de `.content-l` en layouts de downloads/cuenta cuando `Hide Ads` ya colapsó el sidebar derecho.
- Archivos: `marketplace-overrides.css`.
- Validación: ajuste basado en DOM inspeccionado (`.fixed-layout .content-l { width: 766px; }`); requiere recarga completa para confirmar expansión real del contenedor principal.
- Riesgos pendientes: puede existir otra restricción puntual más abajo en la jerarquía si alguna subvista mantiene widths internos adicionales.
- Próximo paso lógico: recargar extensión y página de downloads para confirmar que el listado ocupe el ancho recuperado; si no, seguir bajando por la jerarquía del layout.

### 2026-03-19 - Preparación de credenciales locales para Playwright
- Objetivo: habilitar debugging autenticado del DOM real de Envato sin trackear credenciales en git.
- Archivos: `.env.local`, `.env.local.example`.
- Validación: `.env.local` sigue ignorado por `.gitignore`; `.env.local.example` queda trackeado como plantilla.
- Riesgos pendientes: falta cargar credenciales de prueba para ejecutar el flujo autenticado con Playwright.
- Próximo paso lógico: completar `.env.local` y continuar con inspección autenticada de `Downloads`.

### 2026-03-19 - DOM autenticado de Downloads y corrección del selector raíz
- Objetivo: validar el árbol real de `Downloads` autenticado y corregir el override que debía expandir `content-l` al ocultar el sidebar promocional.
- Archivos: `marketplace-overrides.css`, `.env.local.example`.
- Validación: inspección autenticada con Playwright; `fixed-layout` confirmado en `<html>`; `#content > .grid-container.h-mb3 > div` confirmado con hijos `.content-l` y `.sidebar-s.sidebar-right`; simulación manual con CSS corregido expandiendo `content-l` a `1004px` y colapsando el sidebar a `0px`.
- Riesgos pendientes: falta comprobar el navegador del usuario con la extensión recargada para confirmar que el flag `data-envato-hide-ads=\"true\"` está presente y la hoja nueva quedó cargada.
- Próximo paso lógico: recargar la extensión en Chrome y confirmar en DevTools que la regla ya aparece bajo `html.fixed-layout[data-envato-hide-ads=\"true\"]`.

### 2026-03-19 - Top Sellers y promos compartidas
- Objetivo: ampliar `Hide Ads` para cubrir el sidebar compartido de `Featured Authors` y el bloque promocional `shared-elements-search_block_component__root` detectados en `top-sellers` de varios marketplaces.
- Archivos: `marketplace-overrides.css`.
- Validación: inspección en vivo con Playwright sobre `themeforest.net/top-sellers` y `3docean.net/top-sellers`; patrón confirmado con `.shared-items_grid_with_sidebar_component__sidebar` y `.shared-items_grid_with_sidebar_component__itemsGrid`.
- Riesgos pendientes: `graphicriver.net` respondió con challenge de Cloudflare en Playwright, así que queda por validar manualmente en navegador real aunque el patrón parece compartido entre marketplaces.
- Próximo paso lógico: recargar la extensión y revisar `top-sellers` en Chrome para confirmar que desaparecen el sidebar y el bloque promo sin romper el grid principal.

### 2026-03-19 - Smoke automation estándar para extensiones
- Objetivo: estandarizar un smoke runner local para la extensión usando Playwright, perfil persistente reutilizable y un bridge mínimo para abrir el panel sin depender del icono del navegador.
- Archivos: `package.json`, `package-lock.json`, `.gitignore`, `.env.local.example`, `scripts/playwright.extension.config.cjs`, `scripts/extension-smoke.spec.cjs`, `content.js`, `README.md`, `docs/WORKFLOW.md`.
- Validación: `npm install`; `npx playwright install chromium`; `node --check content.js`; `node --check scripts/playwright.extension.config.cjs`; `node --check scripts/extension-smoke.spec.cjs`; `npm run smoke:extension` con 2/3 casos pasando (`item page panel`, `top-sellers hide ads`) y el caso autenticado de `downloads` quedando acotado a sesión/layout de cuenta.
- Riesgos pendientes: el smoke autenticado depende de sesión válida o de credenciales funcionales en `/.env.local`; si se quiere reutilizar un perfil ya abierto de Chrome, falta pasar su ruta real por `PLAYWRIGHT_EXTENSION_PROFILE_DIR`.
- Próximo paso lógico: decidir si el smoke de cuenta debe reutilizar el perfil de desarrollo existente o seguir con login automático hasta estabilizar `Downloads`.

### 2026-03-19 - Smoke automation estabilizado
- Objetivo: cerrar el smoke autenticado de `Downloads` con login automático fiable y fallback de navegación real vía popover del usuario.
- Archivos: `scripts/extension-smoke.spec.cjs`, `README.md`, `docs/WORKFLOW.md`.
- Validación: `node --check scripts/extension-smoke.spec.cjs`; `npm run smoke:extension` con `3 passed`; validación explícita de `item page`, `top-sellers`, y `downloads` autenticado.
- Riesgos pendientes: no se puede reutilizar un perfil real de Chrome mientras el `user data dir` global siga bloqueado por otra instancia; para attach real hace falta `--remote-debugging-port`.
- Próximo paso lógico: commitear este bloque y dejar el smoke como baseline para futuras iteraciones funcionales.
