## Diseño visual

Aunque el editor debe ser ligero y tener alto rendimiento, NO quiero que visualmente parezca una herramienta básica, un prototipo técnico o un clon genérico de draw.io.

Quiero que los diagramas se vean modernos, cuidados y propios de Codaru.

La simplicidad arquitectónica no debe traducirse en pobreza visual.

### Principio

Separar completamente:

```text
Semantic Graph
      ↓
Layout
      ↓
Visual Style
      ↓
Renderer
```

El Semantic Graph nunca debe contener detalles decorativos innecesarios.

La apariencia debe resolverse mediante un pequeño sistema visual reutilizable.

## Node visual

Los nodos deben sentirse como componentes modernos de una aplicación macOS actual.

Evitar:

- bordes negros gruesos
- rectángulos completamente planos
- sombras pesadas
- gradients excesivos
- glow exagerado
- efectos glass pesados
- apariencia de Bootstrap
- apariencia clásica de draw.io
- estilos infantiles de whiteboard

Preferir:

- esquinas redondeadas suaves
- borde fino
- contraste sutil entre nodo y canvas
- tipografía limpia
- iconografía pequeña
- padding generoso
- sombra extremadamente sutil cuando aporte separación
- selección elegante

Ejemplo conceptual:

```text
╭──────────────────────────────╮
│  ◇  AuthService             │
│                              │
│  Service                     │
╰──────────────────────────────╯
```

El icono, título y tipo pueden cambiar según `node.type`.

Por ejemplo:

```text
screen
service
database
api
external
class
module
file
folder
component
generic
```

No crear decenas de componentes distintos.

Usar un renderer común basado en un theme/token system.

## Design tokens

Crear algo equivalente a:

```ts
type DiagramTheme = {
  nodeBackground: string
  nodeBorder: string
  nodeText: string
  nodeSecondaryText: string

  selectedBorder: string
  selectedBackground: string

  edge: string
  edgeSelected: string
  edgeHover: string

  canvasBackground: string
  grid: string

  radius: number
  borderWidth: number

  nodeShadow?: string
}
```

Debe integrarse con el sistema de temas que ya tenga Codaru.

No hardcodear estilos por todo el renderer.

## Performance visual

No utilizar efectos CSS costosos por cada nodo.

Evitar especialmente:

```css
backdrop-filter
filter: blur(...)
multiple box-shadow
large glow
```

repetidos cientos de veces.

Si Codaru utiliza una estética inspirada en glass, representar esa sensación mediante:

- transparencias simples
- bordes claros/oscuros sutiles
- pequeños cambios de luminosidad
- backgrounds translúcidos

No utilizar blur real por cada nodo.

Quiero una estética de "glass ligero", no implementar físicamente Liquid Glass completo dentro del canvas.

## Connections

Las conexiones son extremadamente importantes visualmente.

No quiero simples líneas rígidas y feas.

Soportar como mínimo:

### Smooth

```text
┌────────┐              ┌────────┐
│ Node A │─────────────▶│ Node B │
└────────┘              └────────┘
```

con esquinas o curvas suaves cuando cambien de dirección.

### Orthogonal rounded

Conceptualmente:

```text
┌────────┐
│ Node A │──────╮
└────────┘      │
                ╰────────▶┌────────┐
                          │ Node B │
                          └────────┘
```

Usar curvas Bézier o `quadraticCurveTo` únicamente donde aporten suavidad.

No almacenar las curvas en el Semantic Graph.

El path siempre debe calcularse desde:

```text
sourceNode
targetNode
sourcePort
targetPort
layout
```

## Arrowheads

Las puntas de las flechas deben ser pequeñas y modernas.

Evitar triángulos enormes.

Quiero aproximadamente:

```text
───────────────›
```

y no:

```text
──────────────▶
```

si el estilo actual de Codaru funciona mejor con una punta estilizada.

Debe existir suficiente contraste para que la dirección siga siendo obvia.

## Connection anchors

Cuando el usuario selecciona o empieza a conectar un nodo, mostrar anchors discretos:

```text
          ○
          │
     ○ ┌───────┐ ○
       │ Node  │
       └───────┘
          │
          ○
```

Los anchors NO deben estar permanentemente visibles.

Aparecen mediante:

- hover
- selección
- modo connector

Mantenerlos pequeños y claros.

## Connector interaction

Mientras arrastro una conexión quiero feedback visual.

Ejemplo:

```text
Node A ●─────────────╮
                     ╰───── pointer
```

Cuando se acerca a un nodo válido:

- mostrar highlight sutil del nodo
- resaltar el anchor objetivo
- aplicar snapping visual

Al entrar en el rango de snapping:

```text
pointer
   ↓

○ target anchor
```

la conexión debe quedar magnéticamente asociada al puerto.

No hacer que el usuario tenga que acertar exactamente sobre un pixel.

## Node selection

Seleccionar un nodo debe usar un borde/accent elegante.

No quiero el típico bounding box azul grueso de un editor web.

Preferir:

```text
      ·──────────────·
      │              │
      │     Node     │
      │              │
      ·──────────────·
```

con pequeños handles únicamente cuando sean necesarios.

## Hover

Hover debe ser barato.

Preferir:

- ligero cambio de borde
- ligero cambio de background
- cursor

Evitar animaciones continuas o filtros.

Transiciones cortas pueden existir si no afectan la interacción.

## Typography

Usar las fuentes existentes de Codaru.

Mantener aproximadamente:

```text
Node title
13-14px
medium / semibold

Metadata/type
11-12px
regular
```

Evitar nodos llenos de texto.

Truncar o adaptar contenido cuando sea necesario.

## Canvas

El canvas debe sentirse integrado con Codaru.

Puede utilizar:

- fondo limpio
- grid extremadamente sutil
- dot grid opcional

Ejemplo:

```text
·       ·       ·       ·

    ·       ·       ·

·       ·       ·       ·
```

El grid debe desaparecer visualmente cuando no sea necesario.

No debe competir con los nodos.

## Node types

Quiero que diferentes tipos puedan distinguirse sin convertir el editor en un arcoíris.

Utilizar principalmente:

- icono
- label secundario
- pequeños accents

y no pintar cada nodo entero de un color diferente.

Ejemplo:

```text
◇ AuthService
  Service
```

```text
▣ LoginView
  Screen
```

```text
◉ Firebase
  External
```

```text
▤ UserDatabase
  Database
```

El color debe ser información secundaria.

La estructura debe seguir siendo entendible en escala de grises.

## Icons

Usar iconos vectoriales simples y consistentes.

No usar emojis como iconos reales del producto.

Si Codaru ya tiene un icon system, reutilizarlo.

De lo contrario, crear únicamente los iconos mínimos necesarios.

No añadir una dependencia enorme solo para iconos.

## Detail levels

Preparar el renderer para poder simplificar los nodos dependiendo del zoom.

Por ejemplo:

### Zoom alto

```text
╭─────────────────────────╮
│ ◇ AuthService          │
│                         │
│ Service                 │
│ Sources/Auth/...swift   │
╰─────────────────────────╯
```

### Zoom medio

```text
╭─────────────────────────╮
│ ◇ AuthService          │
│ Service                 │
╰─────────────────────────╯
```

### Zoom bajo

```text
╭───────────────╮
│ AuthService   │
╰───────────────╯
```

No hace falta implementar todo el Level of Detail en el primer commit, pero la arquitectura del renderer no debe impedirlo.

## Animations

Las animaciones deben ser muy limitadas.

Se permiten para:

- selección
- snapping
- aparición de anchors

Duración corta, aproximadamente 100-180 ms.

NO animar conexiones constantemente.

NO añadir partículas.

NO añadir backgrounds animados.

NO utilizar animación para esconder latency.

## Objetivo visual

Quiero que alguien vea un diagrama de Codaru y piense:

"Esto pertenece a Codaru."

No:

"Esto es draw.io simplificado."

No:

"Esto es Excalidraw sin freehand."

No:

"Esto parece una librería React genérica."

El editor debe verse diseñado, pero el renderer debe seguir siendo pequeño y rápido.

Cuando haya una decisión entre:

- efecto visual sofisticado y caro
- solución visual sencilla que consigue casi el mismo resultado

elige la segunda.

Mantener aproximadamente esta prioridad:

```text
claridad
    >
identidad visual
    >
interacción
    >
decoración
```

pero SIN sacrificar una apariencia cuidada.