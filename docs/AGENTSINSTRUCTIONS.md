# Instrucciones para Agentes (Agent Instructions)

Al modificar la extensión NoFrameVato y continuar con su desarrollo, los agentes deben apegarse a las siguientes directrices:

1. **Zero-Dependencies**: No se deben agregar librerías externas o frameworks como React, Vue, jQuery o TailwindCSS. Usa JavaScript (Vanilla JS), HTML5 y CSS3 nativos para mantener el tamaño de la extensión mínimo y su rendimiento óptimo.

2. **Aislamiento Visual (`Shadow DOM`)**: Toda interfaz que la extensión inyecte en el navegador (ej: el panel lateral `sidepanel.html` mediante iframes, o el nuevo *Widget Flotante*) **debe inyectarse** dentro de un `Shadow DOM` (`mode: 'open'`). Esto previene el CSS bleeding: evita que los estilos de la demo rompan el widget, y que el widget rompa la demo.

3. **Desempeño y Mínima Fricción**:
   - Manipula el DOM de la página anfitriona lo menos posible.
   - Si se requiere esperar por elementos (ej. la carga de la top bar de Envato que puede ser construida vía SPA), utiliza `MutationObserver` y no bucles o intervalos estáticos pesados.

4. **Seguridad y Extension API**:
   - Mantener compatibilidad absoluta con el estándar **Manifest V3**.
   - Para preferencias, utilizar `chrome.storage.sync` para que la configuración (como el *Widget Mode*) se comparta entre dispositivos del usuario.
   - Saneamiento estricto: Todo el texto proveniente de la web (como el nombre del producto) debe pasarse por asignación `textContent` o `innerText`. JAMÁS utilices `innerHTML` con variables de terceros para prevenir vulnerabilidades XSS.

5. **Estética y Diseño (IMPORTANTE)**: Mantener siempre la línea "Premium" impulsada por **Glassmorphism**.
   - Utilizar fondos difuminados: `backdrop-filter: blur(12px)`.
   - Implementar bordes sutiles y redondeados (mínimo `border-radius: 8px`).
   - Las interacciones (como `hover`) deben sentirse orgánicas; añade siempre `transition: all 0.2s` mínimo.
