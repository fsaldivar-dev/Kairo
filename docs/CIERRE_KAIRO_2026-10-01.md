# Correcciones y ampliación del ejemplo de Kairo

El objetivo de esta entrega es conservar una librería TypeScript/SVG ligera y hacer que el ejemplo Tauri permita probar sus capacidades sin buscar acciones entre iconos anónimos.

## Correcciones de la auditoría

| Hallazgo | Cambio y evidencia |
| --- | --- |
| 1. React/Vue controlados | `binding.ts` ignora ecos equivalentes y silencia cargas externas. Los ejemplos usan estado controlado real; editar emite una vez y conserva selección y Deshacer. La acción Svelte comparte la misma sincronización. |
| 2. Pérdida de estilos en layouts | Se conservan marcadores, discontinuidad y posición/desplazamiento de etiquetas al recalcular puertos; también en composición y fusión. |
| 3. Simplificar desconecta ciclos | Cada candidato se evalúa contra el grafo que quedaría tras los descartes anteriores. Se retienen aristas con condiciones, relaciones, etiquetas o tags. La regresión compara alcanzabilidad de todos los pares en 60 grafos deterministas. |
| 4. Web Component pierde ediciones | Conserva una copia del documento al desconectarse; volver a montarlo restaura títulos y posiciones. |
| 5. Solo lectura incompleto | Una barrera de edición cubre inspector, menús, biblioteca, paleta de comandos, contexto, importaciones y acciones nuevas. El API imperativo conserva su contrato para los hosts. |
| 6. Etiquetas SVG fuera de ruta | Exportación calcula posición por longitud del mismo path M/L/Q/C usado por el editor. La comprobación compara geometría nativa en los tres estilos, cuatro puertos, tres posiciones y bucles. |
| 7. SVG recortado | Los límites incluyen curvas, etiquetas, grupos y carriles. |
| 8. IDs de draw.io | Namespaces separados para raíces, nodos, grupos y aristas; `kairoId` conserva los IDs originales durante ida/vuelta. |
| 9. Arrastre de grupo colapsado | Actualiza sus cajas compactas durante el gesto; grupo, miembros y conexión se desplazan juntos. |
| 10. BT/RL | Refleja el eje principal tanto en layouts como al importar Mermaid. |
| 11. DOT no dirigido | Autodetección distingue `graph G { a -- b; }` de `graph TD`. |
| 12. Benchmark roto | Importa layout y exportación desde sus módulos correspondientes. |

Además, el layout jerárquico condensa componentes fuertemente conexos: una rama de reintento ya no provoca que las etapas siguientes aparezcan en la primera columna. Los ciclos comparten nivel y las etapas posteriores mantienen su orden.

## Cómo probar el editor

1. Ejecutar `npm run dev` y abrir http://127.0.0.1:1420, o `npm run dev:tauri` para persistencia nativa.
2. **Explorar ejemplos** ofrece nueve escenas con miniaturas y tareas: decisiones, conexiones, arquitectura, grupos anidados, carriles, CI/CD, microservicios, estados y 100 nodos. Deshacer recupera el documento anterior.
3. **Probar Kairo** permite cambiar reglas de conexión, aplicar layout en cuatro direcciones y reproducir el recorrido por pasos. No evalúa las condiciones; muestra conectividad.
4. **Texto / vista previa** permite modificar 18 formatos, comprobar errores, conservar posiciones y aplicar o insertar el resultado como un paso de historial. No cambia el lienzo mientras se escribe. JSON conserva el contrato completo; los demás formatos pueden omitir metadatos y estilos.
5. El taller descarga SVG editable o PNG; las flechas animadas son opcionales y respetan movimiento reducido. Abrir y aplicar el texto sin editar conserva incluso los puertos personalizados.
6. La biblioteca tiene búsqueda, filtros y arrastre al lienzo. El inspector permite editar forma, tags, tamaño, posición, grupo, carril y destino de una nueva conexión. Los menús tienen nombres visibles.
7. Solo lectura deshabilita los controles de edición. Guardar/abrir usa Rust en Tauri y localStorage en navegador. No hay IPC durante gestos.

Se conservan el identificador de Tauri y la clave de almacenamiento histórica. Las importaciones ahora se pueden deshacer y quedan pendientes de guardar. No se migraron ni sobrescribieron documentos del usuario para probar esta entrega.

## Verificación

- TypeScript, build de librería/bridge/ejemplo, 488 pruebas unitarias y 7 pruebas Rust aprobadas.
- 340 pruebas UI aprobadas en Chromium y WebKit con `KAIRO_PREVIEW_PORT=1425 npm run test:ui`. Una primera ejecución fue interrumpida por la terminación del servidor del puerto 1421; se conservó el log y se repitió la suite completa en un puerto independiente.
- Tras los últimos ajustes visuales y de importación, las 20 regresiones UI nuevas volvieron a pasar con el código final.
- Consumidor independiente instalado desde los `.tgz`, sin aliases a fuentes: core, IO, layout, SVG editable, análisis y exports del bridge correctos.
- Bundle macOS `target/release/bundle/macos/Kairo.app` compilado en release: 9,98 MiB. La ventana nativa antigua pasó a tener 8 nodos/7 conexiones y cambios sin guardar durante la revisión; no se cerró ni se recargó. La nueva aplicación queda aparte. El IPC completo no se verificó manualmente en ese bundle; Rust y la compilación sí se comprobaron.
- Las 11 reproducciones independientes de la auditoría pasan; el benchmark (hallazgo 12) también termina correctamente.
- Benchmark local de 2.000 nodos: parse 3,2 ms, layout 9,1 ms y SVG 44,5 ms en la ejecución registrada. Es una medición de estas operaciones, no una garantía de FPS ni de la fluidez de cualquier grafo.
- Núcleo + CSS: 19,57 KiB gzip, cero dependencias de ejecución. IO, layout, exportación, análisis y adaptadores se cargan por subpaths optativos; la interfaz del ejemplo queda fuera del núcleo.
- Revisión visual de editor, galería y taller en claro/oscuro, con ventanas de 1440 px y 960 px. En tamaño compacto el minimapa se separó de la barra de herramientas.

Evidencia nueva: `artifacts/upgrade-2026-10-01/`. La auditoría original en `artifacts/audit-2026-10-01/` conserva las reproducciones fallidas anteriores. `before-changes.tar.gz` contiene una copia de las fuentes anteriores a esta intervención. La carpeta no es un repositorio Git.

Reproducir los hallazgos corregidos, con el servidor dev encendido:

```sh
npm run build
node artifacts/upgrade-2026-10-01/data-repro.mjs
node artifacts/upgrade-2026-10-01/browser-repro.mjs
node artifacts/upgrade-2026-10-01/visual-repro.mjs
node artifacts/upgrade-2026-10-01/assert-results.mjs
node scripts/bench.mjs
```

## Entregables

- `artifacts/upgrade-2026-10-01/kairo-diagram-0.1.0.tgz`: librería y módulos optativos.
- `artifacts/upgrade-2026-10-01/kairo-plugin-0.1.0.tgz`: puente de Tauri; el crate Rust se integra por ruta como explica el README.
- `target/release/bundle/macos/Kairo.app`: aplicación macOS actualizada. Guardar los cambios de la instancia antigua antes de sustituirla o reiniciarla. No está notarizada para distribución pública.
- `artifacts/upgrade-2026-10-01/source-hashes.json`: huellas de las fuentes al cierre.

## Alcance pendiente

Los parsers cubren subconjuntos de sus formatos; esta entrega no certifica compatibilidad completa con las aplicaciones externas. No se comprobó Windows/Linux ni un compilador Svelte real; se prueba su contrato de acción. Los paquetes siguen en versión 0.1.0 y no se publicaron en npm/crates.io. Las condiciones siguen siendo texto; añadir evaluación o simulación de reglas requiere definir ese contrato por separado.
