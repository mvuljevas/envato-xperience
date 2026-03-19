# Workflow & Development Guide

Este documento dicta cómo debe organizarse, compilarse y testearse la extensión localmente.

## 1. Arquitectura de la Extensión
La herramienta está estructurada pura y netamente para Manifest V3. El flujo de información ideal de desarrollo será:
- `manifest.json`: Punto de entrada que define qué permisos (`storage`, `activeTab`) y en qué URLs se ejecuta el content script.
- `background.js`: Service worker. Duerme la mayor parte del tiempo, se despierta para atender el click en el ícono del navegador y rutear el mensaje a la pestaña activa para mostrar/esconder el panel lateral.
- `marketplace-init.js`: Bootstrap liviano que corre en `document_start` para reflejar cuanto antes el estado de `Hide Ads` sobre `<html>`.
- `marketplace-overrides.css`: Reglas declarativas tempranas para colapsar anuncios soportados de Envato sin depender de una inyección tardía.
- `content.js`: Se inyecta en la(s) web(s) vía permisos expandidos (`<all_urls>`).
   - Posee guardias (`window !== window.top`) para no inyectarse en iframes secundarios nativos de la págia destino y generar inyecciones duplicadas.
   - Lee el DOM nativo en la red Envato para guardar la "Preview Activa" en la memoria de la extensión (`chrome.storage.local`).
   - Navega proactivamente fuera de Envato hacia el enlace final.
   - Usa el `itemId` numérico de Envato como clave estable al reconciliar metadata entre `/item`, `/reviews`, `/comments` y `/support`.
   - Expone metadata adicional del producto (`author`, `category`, `livePreviewUrl`) para alimentar la tarjeta compacta del sidepanel.
   - Analiza el historial local en su próxima ejecución limpia dentro del sitio destino y si encuentra metadata fresca (menos de 2 horas), renderiza estéticamente el **Floating Widget**.
- `sidepanel.html / css / js`: Se encarga exclusivamente de la UI del panel, los toggles de configuración y de pedir a `content.js` que le informe sobre el estatus del entorno.
   - Renderiza una tarjeta de producto compacta con precio, rating, ventas, última actualización y CTA a Live Preview.
   - Expone `Hide Ads` como preferencia sincronizada.
- `fonts/`: Tipografías locales empaquetadas para la UI del panel, evitando dependencias remotas.
- `image-cache.js`: Gestiona el caché local de imágenes en `IndexedDB` para evitar inflar `chrome.storage.local`.

## 2. Pruebas y Desarrollo Local

Dado el entorno de las Extensiones de Chrome, no hay un `npm run dev` nativo o live server funcional directo en la web inyectada. Sigue este ciclo:

1. Modifica o crea el código necesario.
2. Ve a la vista de plugins: `chrome://extensions/`.
3. Activa el **Modo Desarrollador**.
4. Dale a **Cargar extensión sin empaquetar (Load unpacked)** y apunta a `noframevato`.
5. **Si modificaste `content.js`, `manifest.json` o `background.js`**: Debes presionar obligatoriamente el ícono de Rellenar / Recargar (la flecha circular en tu tarjetón de extensión en Chrome) y **después refrescar obligatoriamente la pestaña** web (ThemeForest) donde estabas inyectando la prueba.
6. **Si modificaste `sidepanel.html / css / js`, `fonts/` o `image-cache.js`**: Las modificaciones en el panel visual suelen reflejarse cerrando y volviendo a abrir el panel flotante, pero si no se da el caso, aplica el paso 5 de todas maneras.
7. **Si modificaste `marketplace-init.js` o `marketplace-overrides.css`**: Recarga la extensión y refresca la pestaña completa. Son assets que corren en `document_start`, así que no basta con cerrar y abrir el panel.
8. Valida siempre al menos dos superficies:
   - una página preview de Envato
   - una sub-vista de producto (`reviews`, `comments` o `support`) para confirmar continuidad de metadata e imagen
   - una página de browse/categoría para confirmar que el panel muestre un estado contextual y no un loading muerto
   - una página con promos soportadas para confirmar que `Hide Ads` no deja huecos ni flicker visible

## 3. Directriz de Integración
Cualquier nueva función o corrección de bugs debe revisarse validando que ambas interacciones principales funcionen:
1. El switch por defecto (Auto-Remove): Redirige la ventana destrozando el wrapper de Envato.
2. El modo visual (Floating Widget): Limpia estilos y ancla el panel flotante.
3. La continuidad de datos: el sidepanel debe seguir mostrando el mismo producto correcto aunque cambie la sub-ruta de Envato.
4. La supresión temprana de promos: `Hide Ads` debe entrar antes del paint y no depender de un parche tardío en `content.js`.
No rompas un modo para arreglar otro.
