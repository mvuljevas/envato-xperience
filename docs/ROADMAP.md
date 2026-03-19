# Roadmap: Envato Xperience

## Fase 1: Contexto y UX del Panel (Completado)
- **Objetivo**: Brindar feedback claro al usuario sobre lo que la extensión está detectando.
- **Acciones**:
  - Mensajes dinámicos en el panel lateral ("No estás en Envato", "Estás en ThemeForest", "Estás viendo el producto X").
  - Extracción de metadata de la página actual para personalizar la UI.

## Fase 2: Nuevo Modo de Visualización "Floating Widget" (Completado)
- **Objetivo**: Mejorar la experiencia de compra manteniendo el contexto original del producto en Envato.
- **Solución implementada**:
  - Mantenemos el contenido alojado sin redirigir de inmediato, pero ocultamos la anticuada barra de Envato.
  - Inyectamos un **Widget Flotante** discreto utilizando Shadow DOM.
  - El widget ofrece acciones vitales: "Volver a detalles del producto" y "Comprar ahora".
  - Implementado como un modo opcional ("Floating Widget").

## Fase 3: Refinamiento de UI "Premium E-commerce" (Completado)
- **Objetivo**: Elevar la estética de la tarjeta de producto en el sidepanel al nivel nativo de Envato.
- **Solución implementada**:
  - Reestructuración Flexbox top-right "pixel-perfect".
  - Parsers robustos en `content.js` para extraer precios tachados (descuentos) y cuentas de rating.
  - Motor de renderización SVG paramétrica con `linearGradient` para pintar fracciones exactas de estrellas (4.84 = 84%).

## Fase 4: Hardening de Producto y Compliance (Completado)
- **Objetivo**: Hacer más robusta la continuidad de datos entre sub-vistas de Envato y mantener el proyecto alineado con MV3.
- **Solución implementada**:
  - Rebranding completo a **Envato Xperience** en manifiesto, UI y documentación.
  - Eliminación de assets remotos en páginas de extensión para mantener el panel autocontenido.
  - Render seguro en panel/widget con DOM APIs en lugar de `innerHTML`.
  - Caché de imágenes en `IndexedDB` con TTL y límites explícitos.
  - Uso del `itemId` de Envato como clave estable entre item, reviews, comments y support.
  - Supresión temprana de anuncios soportados mediante `document_start`, con CSS empaquetado para reducir flicker visible.

## Fase 5: Refinamiento del Sidepanel "Marketplace Card" (Completado)
- **Objetivo**: Acercar la tarjeta del sidepanel al patrón compacto de Envato y aumentar la utilidad previa al clic.
- **Solución implementada**:
  - Tarjeta compacta con título, autor, categoría, precio, rating, ventas y última actualización.
  - CTA directo a **Live Preview** cuando la URL está disponible en la página del item.
  - Ajustes de layout y espaciado en Settings para mantener consistencia entre toggles.

## Fase 6: Próximos Pasos (Futuro)
- Integrar sección de "Related Products" (Productos Relacionados) dentro del panel lateral en las vistas de producto.
- Permitir al usuario arrastrar el widget flotante a distintas esquinas de la pantalla.
- Refinamientos en la carga asíncrona de datos en previews especialmente lentas.
- Soporte extendido a más subdominios de Envato si surgen en el futuro.
- Añadir soporte multi-idioma (i18n) para internacionalizar la extensión de forma correcta.
