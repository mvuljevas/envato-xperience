# Workflow & Development Guide

Este documento dicta cómo debe organizarse, compilarse y testearse la extensión localmente.

## 1. Arquitectura de la Extensión
La herramienta está estructurada pura y netamente para Manifest V3. El flujo de información ideal de desarrollo será:
- `manifest.json`: Punto de entrada que define qué permisos (`storage`, `activeTab`) y en qué URLs se ejecuta el content script.
- `background.js`: Service worker. Duerme la mayor parte del tiempo, se despierta para atender el click en el ícono del navegador y rutear el mensaje a la pestaña activa para mostrar/esconder el panel lateral.
- `content.js`: Se inyecta en la(s) web(s) vía permisos expandidos (`<all_urls>`).
   - Posee guardias (`window !== window.top`) para no inyectarse en iframes secundarios nativos de la págia destino y generar inyecciones duplicadas.
   - Lee el DOM nativo en la red Envato para guardar la "Preview Activa" en la memoria de la extensión (`chrome.storage.local`).
   - Navega proactivamente fuera de Envato hacia el enlace final.
   - Analiza el historial local en su próxima ejecución limpia dentro del sitio destino y si encuentra metadata fresca (menos de 2 horas), renderiza estéticamente el **Widget Flotante**.
- `sidepanel.html / css / js`: Se encarga exclusivamente de la UI del panel, los toggles de configuración y de pedir a `content.js` que le informe sobre el estatus del entorno.

## 2. Pruebas y Desarrollo Local

Dado el entorno de las Extensiones de Chrome, no hay un `npm run dev` nativo o live server funcional directo en la web inyectada. Sigue este ciclo:

1. Modifica o crea el código necesario.
2. Ve a la vista de plugins: `chrome://extensions/`.
3. Activa el **Modo Desarrollador**.
4. Dale a **Cargar extensión sin empaquetar (Load unpacked)** y apunta a `noframevato`.
5. **Si modificaste `content.js`, `manifest.json` o `background.js`**: Debes presionar obligatoriamente el ícono de Rellenar / Recargar (la flecha circular en tu tarjetón de extensión en Chrome) y **después refrescar obligatoriamente la pestaña** web (ThemeForest) donde estabas inyectando la prueba.
6. **Si modificaste `sidepanel.html / css / js`**: Las modificaciones en el panel visual suelen reflejarse cerrando y volviendo a abrir el panel flotante, pero si no se da el caso, aplica el paso 5 de todas maneras.

## 3. Directriz de Integración
Cualquier nueva función o corrección de bugs debe revisarse validando que ambas interacciones principales funcionen:
1. El switch por defecto (Auto-Remove): Redirige la ventana destrozando el wrapper de Envato.
2. El modo visual (Widget Mode): Limpia estilos y ancla el panel flotante.
No rompas un modo para arreglar otro.
