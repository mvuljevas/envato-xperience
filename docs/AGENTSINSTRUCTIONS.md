# Instrucciones para Agentes (Agent Instructions)

Al modificar la extensión Envato Xperience y continuar con su desarrollo, los agentes deben apegarse a las siguientes directrices:

1. **Zero-Dependencies**: No se deben agregar librerías externas o frameworks como React, Vue, jQuery o TailwindCSS. Usa JavaScript (Vanilla JS), HTML5 y CSS3 nativos para mantener el tamaño de la extensión mínimo y su rendimiento óptimo.

2. **Aislamiento Visual (`Shadow DOM`)**: Toda interfaz que la extensión inyecte en el navegador (ej: el panel lateral `sidepanel.html` mediante iframes, o el nuevo *Widget Flotante*) **debe inyectarse** dentro de un `Shadow DOM` (`mode: 'open'`). Esto previene el CSS bleeding: evita que los estilos de la demo rompan el widget, y que el widget rompa la demo.

3. **Desempeño y Mínima Fricción**:
   - Manipula el DOM de la página anfitriona lo menos posible.
   - Si se requiere esperar por elementos (ej. la carga de la top bar de Envato que puede ser construida vía SPA), utiliza `MutationObserver` y no bucles o intervalos estáticos pesados.
   - Usa el `itemId` numérico de Envato como identificador canónico del producto. No tomes decisiones de caché o reconciliación basadas en títulos o slugs si el ID está disponible.
   - Si una supresión visual debe entrar antes del paint, prioriza un asset CSS empaquetado en `document_start` y un flag en `data-*` sobre la raíz del documento, en lugar de inyectar estilos tardíamente desde `content.js`.

4. **Seguridad y Extension API**:
   - Mantener compatibilidad absoluta con el estándar **Manifest V3**.
   - Para preferencias, utilizar `chrome.storage.sync` para que la configuración (como el *Floating Widget*) se comparta entre dispositivos del usuario.
   - Saneamiento estricto: Todo el texto proveniente de la web (como el nombre del producto) debe pasarse por asignación `textContent` o `innerText`. JAMÁS utilices `innerHTML` con variables de terceros para prevenir vulnerabilidades XSS.
   - No guardar imágenes o blobs pesados en `chrome.storage.local`. Para caché de assets, usar `IndexedDB`.

5. **Estética y Diseño (IMPORTANTE)**: Mantener siempre la línea "Premium" impulsada por **Glassmorphism**.
   - Utilizar fondos difuminados: `backdrop-filter: blur(12px)`.
   - Implementar bordes sutiles y redondeados (mínimo `border-radius: 8px`).
   - Las interacciones (como `hover`) deben sentirse orgánicas; añade siempre `transition: all 0.2s` mínimo.
   - Priorizar `Oswald` como tipografía de display en headings, tabs, labels y estados del panel. Si se necesita consistencia total, empaquetar la fuente localmente en la extensión; no depender de fuentes remotas.
   - Al retocar CSS del panel, lee primero los estilos existentes y evita pisar ajustes manuales del workspace si puedes encapsular el cambio con clases nuevas o archivos dedicados.

6. **Persistencia de Contexto Operativo**:
   - Al final de cada iteración relevante, actualizar `docs/ITERATIONLOG.md` con un resumen corto pero útil.
   - Si se cambia arquitectura, flujo de carga, UX principal o compliance, actualizar también la doc viva correspondiente en la misma iteración.
   - Al cerrar cada respuesta al usuario, indicar qué quedó validado, qué no quedó validado y sugerir el siguiente paso lógico.
   - Si se generan snapshots o logs temporales para debugging, mencionarlos en el cierre de iteración y limpiar los que ya no aporten valor.
