# EmbedPDF React Headless Components Documentation

> **Last Updated**: 2026-02-04
> **Source**: https://www.embedpdf.com/docs/react/headless/
> **Purpose**: Local reference for Claude Code and development agents

This document consolidates EmbedPDF React headless component documentation for quick reference during development. It covers core setup patterns, all major plugins, hooks, components, and best practices.

---

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Installation & Setup](#installation--setup)
3. [Engine Initialization](#engine-initialization)
4. [Plugin Registration](#plugin-registration)
5. [Component Architecture](#component-architecture)
6. [Core Plugins](#core-plugins)
   - [Document Manager](#document-manager-plugin)
   - [Viewport](#viewport-plugin)
   - [Scroll](#scroll-plugin)
   - [Render](#render-plugin)
7. [Feature Plugins](#feature-plugins)
   - [Annotation](#annotation-plugin)
   - [Selection](#selection-plugin)
   - [Zoom](#zoom-plugin)
   - [Tiling](#tiling-plugin)
   - [Thumbnail](#thumbnail-plugin)
   - [Pan](#pan-plugin)
   - [Rotate](#rotate-plugin)
   - [Spread](#spread-plugin)
   - [Print](#print-plugin)
   - [Export](#export-plugin)
   - [Capture](#capture-plugin)
   - [Redaction](#redaction-plugin)
8. [Advanced Plugins](#advanced-plugins)
   - [View Manager](#view-manager-plugin)
   - [Commands](#commands-plugin)
   - [Internationalization (i18n)](#internationalization-plugin)
9. [Security & Permissions](#security--permissions)
10. [Common Patterns](#common-patterns)
11. [Troubleshooting](#troubleshooting)

---

## Core Concepts

EmbedPDF's headless library provides an **unopinionated UI toolkit** for building fully customized PDF experiences. Unlike the drop-in viewer, headless components provide:

- **Logic and rendering primitives** with zero styling
- **Composable design** using specialized components and hooks
- **Minimal bundle size** through tree-shaking (import only what you need)

### When to Use Headless Components

- Match your application's design system exactly
- Build specialized viewers (review mode, split-pane layouts)
- Integrate PDF features into existing UI workflows
- Need smallest possible bundle size

### Comparison

| Feature | Drop-in Viewer | Headless Components |
|---------|---------------|---------------------|
| Setup Time | Minutes | Hours |
| UI Customization | Theme colors, toggle features | 100% control |
| Bundle Size | Larger (includes full UI) | Minimal (tree-shakeable) |
| Best For | Standard viewing | Custom apps & design systems |

---

## Installation & Setup

### Core Packages

```bash
npm install @embedpdf/core @embedpdf/engines
```

### Minimum Required Plugins

```bash
npm install @embedpdf/plugin-document-manager @embedpdf/plugin-viewport @embedpdf/plugin-scroll @embedpdf/plugin-render
```

### Common Additional Plugins

```bash
npm install @embedpdf/plugin-zoom @embedpdf/plugin-annotation @embedpdf/plugin-selection @embedpdf/plugin-interaction-manager @embedpdf/plugin-history
```

### Vite Configuration

**Important**: Exclude the engines package from pre-bundling:

```typescript
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    exclude: ['@embedpdf/engines']
  }
});
```

---

## Engine Initialization

The `usePdfiumEngine` hook initializes the PDFium WebAssembly engine.

### Hook Usage

```typescript
import { usePdfiumEngine } from '@embedpdf/engines/react';

const { engine, isLoading, error } = usePdfiumEngine();
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `wasmUrl` | string | CDN URL | Custom WebAssembly file location |
| `worker` | boolean | true | Enable Web Worker execution |
| `logger` | Logger | undefined | Custom logging instance |

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `engine` | PdfEngine \| null | Initialized engine instance |
| `isLoading` | boolean | WebAssembly loading status |
| `error` | Error \| null | Initialization error |

### Important Note

> **The engine is stateless.** Operations performed directly on the engine (like adding annotations) will **not** update your UI or plugin state. Always use plugin APIs for state-dependent operations.

---

## Plugin Registration

### Pattern

Plugins are registered using `createPluginRegistration()` and passed to the `<EmbedPDF>` component.

**CRITICAL**: Define plugins outside the component or memoize them to prevent recreation on every render.

```typescript
import { createPluginRegistration } from '@embedpdf/core';
import { DocumentManagerPluginPackage } from '@embedpdf/plugin-document-manager/react';
import { ViewportPluginPackage } from '@embedpdf/plugin-viewport/react';
import { ScrollPluginPackage } from '@embedpdf/plugin-scroll/react';
import { RenderPluginPackage } from '@embedpdf/plugin-render/react';

// ✅ CORRECT: Define outside component
const plugins = [
  createPluginRegistration(DocumentManagerPluginPackage, {
    initialDocuments: [{ url: 'https://example.com/doc.pdf' }],
  }),
  createPluginRegistration(ViewportPluginPackage),
  createPluginRegistration(ScrollPluginPackage),
  createPluginRegistration(RenderPluginPackage),
];

export const PDFViewer = () => {
  const { engine, isLoading } = usePdfiumEngine();
  // ...
};
```

```typescript
// ❌ WRONG: Creating inside component without memoization
export const PDFViewer = () => {
  const plugins = [ /* ... */ ]; // Recreated every render!
};
```

### Plugin Order

Some plugins have dependencies. Register in this order:

1. **InteractionManagerPluginPackage** (required by Selection, Annotation, Zoom)
2. **SelectionPluginPackage** (required by Annotation)
3. **HistoryPluginPackage** (optional, enables undo/redo)
4. **AnnotationPluginPackage**

---

## Component Architecture

### Hierarchy

```
<EmbedPDF engine={engine} plugins={plugins}>
  {({ activeDocumentId }) =>
    activeDocumentId && (
      <DocumentContent documentId={activeDocumentId}>
        {({ isLoaded }) =>
          isLoaded && (
            <>
              <Toolbar documentId={activeDocumentId} />
              <Viewport documentId={activeDocumentId}>
                <Scroller
                  documentId={activeDocumentId}
                  renderPage={({ pageIndex, width, height }) => (
                    <PagePointerProvider documentId={activeDocumentId} pageIndex={pageIndex}>
                      <RenderLayer documentId={activeDocumentId} pageIndex={pageIndex} />
                      <SelectionLayer documentId={activeDocumentId} pageIndex={pageIndex} />
                      <AnnotationLayer documentId={activeDocumentId} pageIndex={pageIndex} />
                    </PagePointerProvider>
                  )}
                />
              </Viewport>
            </>
          )
        }
      </DocumentContent>
    )
  }
</EmbedPDF>
```

### Key Patterns

1. **Gate on `activeDocumentId`**: Don't render document-dependent UI until a document is active
2. **Gate on `isLoaded`**: Wait for document to be fully loaded before rendering layers
3. **Wrap page layers with `<PagePointerProvider>`**: Required for pointer event handling
4. **Pass `documentId` to all components**: Multi-document support requires explicit document references

---

## Core Plugins

### Document Manager Plugin

**Package**: `@embedpdf/plugin-document-manager`

Manages PDF document lifecycle: opening, closing, tab ordering, and active document tracking. **Required for all viewers.**

#### Registration

```typescript
createPluginRegistration(DocumentManagerPluginPackage, {
  initialDocuments: [
    { url: 'https://example.com/doc1.pdf' },
    { url: 'https://example.com/doc2.pdf' },
  ],
  maxDocuments: 10,
});
```

#### Configuration

| Option | Type | Description |
|--------|------|-------------|
| `initialDocuments` | InitialDocumentOptions[] | Documents to load on init |
| `maxDocuments` | number | Max simultaneous documents |

#### Components

##### `<DocumentContent />`

Wraps document-dependent UI with loading states.

```typescript
<DocumentContent documentId={activeDocumentId}>
  {({ documentState, isLoading, isError, isLoaded }) =>
    isLoaded && <YourUI />
  }
</DocumentContent>
```

#### Hooks

##### `useDocumentManagerCapability()`

```typescript
const { provides: docManager } = useDocumentManagerCapability();

// Open from URL
await docManager.openDocumentUrl({ url: '...', password: 'optional' });

// Open file dialog
await docManager.openFileDialog();

// Close document
docManager.closeDocument(documentId);

// Set active document
docManager.setActiveDocument(documentId);

// Get document info
const doc = docManager.getDocument(documentId);
const state = docManager.getDocumentState(documentId);
const count = docManager.getDocumentCount();
```

##### `useActiveDocument()`

```typescript
const { activeDocumentId, activeDocument } = useActiveDocument();
```

##### `useOpenDocuments(documentIds?)`

```typescript
const documentStates = useOpenDocuments(); // All documents in tab order
```

#### Events

- `onDocumentOpened` - Document loaded successfully
- `onDocumentClosed` - Document closed
- `onActiveDocumentChanged` - Active document switched
- `onDocumentOrderChanged` - Documents reordered
- `onDocumentError` - Load failed

---

### Viewport Plugin

**Package**: `@embedpdf/plugin-viewport`

Provides scrollable container for PDF content. Supports multi-document layouts with independent scroll states.

#### Registration

```typescript
createPluginRegistration(ViewportPluginPackage, {
  viewportGap: 20, // Padding inside viewport (px)
});
```

#### Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `viewportGap` | number | 10 | Padding around content (px) |
| `scrollEndDelay` | number | 300 | ms before marking scroll complete |

#### Components

##### `<Viewport />`

```typescript
<Viewport documentId={activeDocumentId} className="viewer-container">
  <Scroller ... />
</Viewport>
```

| Prop | Type | Description |
|------|------|-------------|
| `documentId` | string | **Required** |
| `children` | ReactNode | Typically `<Scroller />` |
| `className`, `style` | - | Standard div props |

#### Hooks

##### `useViewportCapability()`

```typescript
const { provides: viewportPlugin } = useViewportCapability();
const viewport = viewportPlugin?.forDocument(documentId);

// Scroll to position
viewport?.scrollTo({ x: 0, y: 0, behavior: 'smooth' });

// Get metrics
const metrics = viewport?.getMetrics();

// Check scroll state
const isScrolling = viewport?.isScrolling();
```

##### `useViewportScrollActivity(documentId)`

```typescript
const { isScrolling, isSmoothScrolling } = useViewportScrollActivity(documentId);
```

---

### Scroll Plugin

**Package**: `@embedpdf/plugin-scroll`

Handles page layout, virtualization, and navigation. **Requires Viewport plugin.**

#### Registration

```typescript
import { ScrollPluginPackage, ScrollStrategy } from '@embedpdf/plugin-scroll/react';

createPluginRegistration(ScrollPluginPackage, {
  defaultStrategy: ScrollStrategy.Vertical,
  defaultPageGap: 10,
  defaultBufferSize: 2,
});
```

#### Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `defaultStrategy` | ScrollStrategy | Vertical | Scroll direction |
| `defaultPageGap` | number | 10 | Pixels between pages |
| `defaultBufferSize` | number | 2 | Pages rendered outside viewport |

#### Components

##### `<Scroller />`

```typescript
<Scroller
  documentId={activeDocumentId}
  renderPage={({ pageIndex, width, height, scale }) => (
    <div style={{ width, height, position: 'relative' }}>
      <RenderLayer documentId={activeDocumentId} pageIndex={pageIndex} />
    </div>
  )}
/>
```

| Prop | Type | Description |
|------|------|-------------|
| `documentId` | string | **Required** |
| `renderPage` | function | Receives `{ pageIndex, width, height, scale }` |

#### Hooks

##### `useScroll(documentId)`

```typescript
const { state, provides: scroll } = useScroll(documentId);

// State
console.log(state.currentPage, state.totalPages);

// Navigation
scroll?.scrollToPage({ pageNumber: 5, behavior: 'smooth' });
scroll?.scrollToNextPage();
scroll?.scrollToPreviousPage();

// Change strategy
scroll?.setScrollStrategy(ScrollStrategy.Horizontal);
```

#### Events (via `useScrollCapability()`)

- `onLayoutReady` - Document layout initialized
- `onPageChange` - Current page changed
- `onScroll` - Scroll event with metrics

---

### Render Plugin

**Package**: `@embedpdf/plugin-render`

Visual rendering of PDF pages to canvas.

#### Registration

```typescript
createPluginRegistration(RenderPluginPackage, {
  withForms: true,        // Render form widgets
  withAnnotations: false, // Burn annotations into render
});
```

#### Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `withForms` | boolean | false | Render form appearance |
| `withAnnotations` | boolean | false | Bake annotations into image |

#### Components

##### `<RenderLayer />`

```typescript
<RenderLayer
  documentId={activeDocumentId}
  pageIndex={pageIndex}
  scale={1.0}     // Optional: override document zoom
  dpr={2}         // Optional: device pixel ratio
/>
```

| Prop | Type | Description |
|------|------|-------------|
| `documentId` | string | **Required** |
| `pageIndex` | number | **Required**, zero-based |
| `scale` | number | Override zoom level |
| `dpr` | number | Device pixel ratio |

#### Hooks

##### `useRenderCapability()`

For programmatic rendering (thumbnails, exports):

```typescript
const { provides: renderPlugin } = useRenderCapability();
const renderer = renderPlugin?.forDocument(documentId);

const task = renderer?.renderPage({
  pageIndex: 0,
  options: {
    scaleFactor: 2.0,
    imageType: 'image/png',
    withAnnotations: true,
  }
});

task?.wait(blob => {
  // Handle rendered blob
});
```

---

## Feature Plugins

### Annotation Plugin

**Package**: `@embedpdf/plugin-annotation`

Full annotation support: highlights, drawings, shapes, text, and stamps.

#### Dependencies

```bash
npm install @embedpdf/plugin-annotation @embedpdf/plugin-interaction-manager @embedpdf/plugin-selection @embedpdf/plugin-history
```

#### Registration (Order Matters!)

```typescript
const plugins = [
  createPluginRegistration(InteractionManagerPluginPackage),
  createPluginRegistration(SelectionPluginPackage),
  createPluginRegistration(HistoryPluginPackage), // Optional: undo/redo
  createPluginRegistration(AnnotationPluginPackage, {
    annotationAuthor: 'Jane Doe',
    autoCommit: true,
  }),
];
```

#### Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `annotationAuthor` | string | 'Guest' | Author name for annotations |
| `autoCommit` | boolean | true | Auto-save to engine |
| `tools` | AnnotationTool[] | - | Custom/override tools |
| `colorPresets` | string[] | - | Hex colors for picker |
| `deactivateToolAfterCreate` | boolean | false | Deselect tool after create |
| `selectAfterCreate` | boolean | true | Auto-select new annotation |

#### Default Tools

| Tool Name | ID | Description |
|-----------|----|-------------|
| Highlight | `highlight` | Text highlight |
| Underline | `underline` | Text underline |
| Strikeout | `strikeout` | Text strikethrough |
| Squiggly | `squiggly` | Wavy underline |
| Pen | `ink` | Free-hand drawing |
| Ink Highlighter | `inkHighlighter` | Free-hand with blend |
| Circle | `circle` | Ellipse shape |
| Square | `square` | Rectangle shape |
| Line | `line` | Straight line |
| Arrow | `lineArrow` | Line with arrowhead |
| Polyline | `polyline` | Multi-segment lines |
| Polygon | `polygon` | Closed shapes |
| Free Text | `freeText` | Text box |
| Image | `stamp` | Image stamp |

#### Components

##### `<AnnotationLayer />`

**Must be inside `<PagePointerProvider>`**

```typescript
<PagePointerProvider documentId={documentId} pageIndex={pageIndex}>
  <AnnotationLayer
    documentId={documentId}
    pageIndex={pageIndex}
    selectionMenu={({ context, menuWrapperProps }) => (
      <div {...menuWrapperProps}>
        <button onClick={() => deleteAnnotation(context.annotation)}>
          Delete
        </button>
      </div>
    )}
  />
</PagePointerProvider>
```

| Prop | Type | Description |
|------|------|-------------|
| `documentId` | string | **Required** |
| `pageIndex` | number | **Required** |
| `scale` | number | Zoom level |
| `rotation` | number | Page rotation |
| `selectionMenu` | function | Context menu component |
| `selectionOutlineColor` | string | Default: '#007ACC' |

#### Hooks

##### `useAnnotation(documentId)`

```typescript
const { provides: annotationApi, state } = useAnnotation(documentId);

// State
console.log(state.activeToolId, state.selectedUid);

// Activate tool
annotationApi?.setActiveTool('highlight');
annotationApi?.setActiveTool(null); // Deactivate

// Create annotation programmatically
annotationApi?.createAnnotation(pageIndex, {
  type: PdfAnnotationSubtype.HIGHLIGHT,
  // ... annotation data
});

// Update annotation
annotationApi?.updateAnnotation(pageIndex, annotationId, {
  contents: 'Updated comment',
  modified: new Date(),
});

// Delete annotation
annotationApi?.deleteAnnotation(pageIndex, annotationId);

// Select annotation
annotationApi?.selectAnnotation(pageIndex, annotationId);

// Get selected annotation
const selected = annotationApi?.getSelectedAnnotation();

// Subscribe to events
annotationApi?.onAnnotationEvent((event) => {
  switch (event.type) {
    case 'create':
      console.log('Created:', event.annotation);
      break;
    case 'update':
      console.log('Updated:', event.annotation, event.patch);
      break;
    case 'delete':
      console.log('Deleted:', event.annotation);
      break;
    case 'loaded':
      console.log('Total loaded:', event.total);
      break;
  }
});
```

#### Event Types

```typescript
type AnnotationEvent =
  | { type: 'create'; annotation; pageIndex; ctx?; committed: boolean }
  | { type: 'update'; annotation; pageIndex; patch; committed: boolean }
  | { type: 'delete'; annotation; pageIndex; committed: boolean }
  | { type: 'loaded'; total: number };
```

#### Custom Tools

```typescript
<EmbedPDF onInitialized={(registry) => {
  const annotationApi = registry.getPlugin('annotation')?.provides();
  annotationApi?.addTool({
    id: 'stampApproved',
    name: 'Approved Stamp',
    interaction: { exclusive: false, cursor: 'copy' },
    matchScore: () => 0,
    defaults: {
      type: PdfAnnotationSubtype.STAMP,
      imageSrc: '/images/approved-stamp.png',
    },
  });
}} />
```

---

### Selection Plugin

**Package**: `@embedpdf/plugin-selection`

Text selection with copy support. **Requires Interaction Manager.**

#### Registration

```typescript
createPluginRegistration(InteractionManagerPluginPackage),
createPluginRegistration(SelectionPluginPackage, {
  menuHeight: 40, // Approximate menu height for positioning
}),
```

#### Components

##### `<SelectionLayer />`

```typescript
<SelectionLayer
  documentId={documentId}
  pageIndex={pageIndex}
  background="rgba(33, 150, 243, 0.3)"
  selectionMenu={({ placement }) => (
    <div>
      <button onClick={() => copyToClipboard()}>Copy</button>
    </div>
  )}
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `documentId` | string | **Required** | |
| `pageIndex` | number | **Required** | |
| `background` | string | 'rgba(33,150,243)' | Highlight color |
| `selectionMenu` | function | - | Custom menu |

#### Hooks

##### `useSelectionCapability()`

```typescript
const { provides: selectionPlugin } = useSelectionCapability();
const selection = selectionPlugin?.forDocument(documentId);

// Copy to clipboard
selection?.copyToClipboard();

// Get selected text
const textTask = selection?.getSelectedText();
textTask?.wait(textArray => console.log(textArray));

// Get formatted selection with bounding boxes
const formatted = selection?.getFormattedSelection();

// Clear selection
selection?.clear();

// Events
selection?.onSelectionChange((hasSelection) => {
  setShowCopyButton(hasSelection);
});
```

---

### Zoom Plugin

**Package**: `@embedpdf/plugin-zoom`

Magnification control with presets and marquee zoom. **Requires Interaction Manager.**

#### Registration

```typescript
import { ZoomPluginPackage, ZoomMode } from '@embedpdf/plugin-zoom/react';

createPluginRegistration(ZoomPluginPackage, {
  defaultZoomLevel: ZoomMode.FitPage,
  minZoom: 0.2,
  maxZoom: 60,
});
```

#### Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `defaultZoomLevel` | ZoomMode \| number | ZoomMode.Automatic | Initial zoom |
| `minZoom` | number | 0.2 | Minimum scale |
| `maxZoom` | number | 60 | Maximum scale |
| `presets` | ZoomPreset[] | - | Custom presets |

#### ZoomMode Enum

- `ZoomMode.Automatic` - Fit to viewport
- `ZoomMode.FitPage` - Fit entire page
- `ZoomMode.FitWidth` - Fit page width
- `ZoomMode.ActualSize` - 100% zoom

#### Components

##### `<MarqueeZoom />`

Area selection for zooming:

```typescript
<PagePointerProvider documentId={documentId} pageIndex={pageIndex}>
  <MarqueeZoom
    documentId={documentId}
    pageIndex={pageIndex}
    stroke="#007ACC"
    fill="rgba(0, 122, 204, 0.1)"
  />
</PagePointerProvider>
```

##### `<ZoomGestureWrapper />`

Wrap `<Scroller>` for pinch/wheel zoom:

```typescript
<ZoomGestureWrapper documentId={documentId} enablePinch={true} enableWheel={true}>
  <Scroller ... />
</ZoomGestureWrapper>
```

#### Hooks

##### `useZoom(documentId)`

```typescript
const { provides: zoom, state } = useZoom(documentId);

// State
console.log(state.currentZoomLevel);    // Actual calculated zoom
console.log(state.zoomLevel);           // Requested zoom mode/level
console.log(state.isMarqueeZoomActive); // Area zoom active

// Methods
zoom?.zoomIn();
zoom?.zoomOut();
zoom?.requestZoom(ZoomMode.FitWidth);
zoom?.requestZoom(1.5); // 150%
zoom?.toggleMarqueeZoom();

// Get presets
const presets = zoom?.getPresets();
```

---

### Tiling Plugin

**Package**: `@embedpdf/plugin-tiling`

Performance optimization for large PDFs. Renders pages as tiles instead of single large canvases.

#### Dependencies

Requires: Viewport, Scroll, Render plugins.

#### Registration

```typescript
createPluginRegistration(TilingPluginPackage, {
  tileSize: 768,    // Tile dimensions (px)
  overlapPx: 5,     // Overlap to prevent seams
  extraRings: 0,    // Pre-render outside viewport
});
```

#### Usage Pattern

Combine base layer (low-res, immediate) with tiling layer (high-res tiles):

```typescript
<Scroller
  documentId={activeDocumentId}
  renderPage={({ width, height, pageIndex, scale }) => (
    <div style={{ width, height, position: 'relative' }}>
      {/* Base layer for immediate feedback */}
      <RenderLayer
        documentId={activeDocumentId}
        pageIndex={pageIndex}
        scale={1.0}
      />
      {/* Tiling layer for high-resolution */}
      <TilingLayer
        documentId={activeDocumentId}
        pageIndex={pageIndex}
      />
    </div>
  )}
/>
```

---

### Thumbnail Plugin

**Package**: `@embedpdf/plugin-thumbnail`

Virtualized sidebar with page previews. **Requires Render plugin.**

#### Registration

```typescript
createPluginRegistration(ThumbnailPluginPackage, {
  width: 120,      // Thumbnail width
  gap: 8,          // Vertical spacing
  buffer: 3,       // Off-screen pre-render
  autoScroll: true // Sync with main viewport
});
```

#### Components

```typescript
import { ThumbnailsPane, ThumbImg } from '@embedpdf/plugin-thumbnail/react';

<ThumbnailsPane documentId={documentId}>
  {(m) => (
    <div
      key={m.pageIndex}
      style={{
        position: 'absolute',
        top: m.top,
        height: m.wrapperHeight,
        width: '100%'
      }}
      onClick={() => scroll?.scrollToPage({ pageNumber: m.pageIndex + 1 })}
    >
      <ThumbImg documentId={documentId} meta={m} />
      <span>{m.pageIndex + 1}</span>
    </div>
  )}
</ThumbnailsPane>
```

#### Metadata Properties

| Property | Description |
|----------|-------------|
| `m.top` | Absolute vertical position |
| `m.wrapperHeight` | Item row height |
| `m.width` | Image width |
| `m.height` | Image height |
| `m.pageIndex` | Zero-based page number |

---

### Pan Plugin

**Package**: `@embedpdf/plugin-pan`

Hand tool for click-drag scrolling, particularly useful on touch devices.

#### Dependencies

```bash
npm install @embedpdf/plugin-pan @embedpdf/plugin-viewport @embedpdf/plugin-interaction-manager
```

#### Registration

```typescript
import { PanPluginPackage } from '@embedpdf/plugin-pan/react';

createPluginRegistration(PanPluginPackage, {
  defaultMode: 'mobile',
});
```

#### Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `defaultMode` | string | 'mobile' | Default interaction mode |

**Mode Values:**
- `'mobile'`: Pan on touch devices, text selection on desktop
- `'always'`: Pan mode always default
- `'never'`: Text selection default

#### GlobalPointerProvider

Wrap `<Viewport>` with `<GlobalPointerProvider>` for smooth panning outside viewport boundaries:

```typescript
import { GlobalPointerProvider } from '@embedpdf/plugin-interaction-manager/react';

<GlobalPointerProvider documentId={activeDocumentId}>
  <Viewport documentId={activeDocumentId}>
    <Scroller documentId={activeDocumentId}>
      {/* content */}
    </Scroller>
  </Viewport>
</GlobalPointerProvider>
```

#### Hooks

##### `usePan(documentId)`

```typescript
const { provides: pan, isPanning } = usePan(documentId);

// Toggle
pan?.togglePan();

// Explicit control
pan?.enablePan();
pan?.disablePan();

// Set as default mode
pan?.makePanDefault();

// Check state
const isPanMode = pan?.isPanMode();

// Event
pan?.onPanModeChange((isPanMode) => {
  setToolState(isPanMode ? 'hand' : 'cursor');
});
```

---

### Rotate Plugin

**Package**: `@embedpdf/plugin-rotate`

Document rotation in 90-degree increments.

#### Registration

```typescript
import { RotatePluginPackage } from '@embedpdf/plugin-rotate/react';
import { Rotation } from '@embedpdf/models';

createPluginRegistration(RotatePluginPackage, {
  defaultRotation: Rotation.Degree0,
});
```

#### Rotation Values

| Value | Degrees |
|-------|---------|
| 0 | 0° |
| 1 | 90° |
| 2 | 180° |
| 3 | 270° |

#### Components

##### `<Rotate />`

Wrap page layers for rotation. **Place outside `<PagePointerProvider>`.**

```typescript
<Scroller
  renderPage={({ pageIndex }) => (
    <Rotate documentId={documentId} pageIndex={pageIndex}>
      <PagePointerProvider documentId={documentId} pageIndex={pageIndex}>
        <RenderLayer documentId={documentId} pageIndex={pageIndex} />
      </PagePointerProvider>
    </Rotate>
  )}
/>
```

#### Hooks

##### `useRotate(documentId)`

```typescript
const { rotation, provides: rotate } = useRotate(documentId);

rotate?.rotateForward();  // +90°
rotate?.rotateBackward(); // -90°
rotate?.setRotation(Rotation.Degree180);
```

---

### Spread Plugin

**Package**: `@embedpdf/plugin-spread`

Two-page spread layouts.

#### Registration

```typescript
import { SpreadPluginPackage, SpreadMode } from '@embedpdf/plugin-spread/react';

createPluginRegistration(SpreadPluginPackage, {
  defaultSpreadMode: SpreadMode.None,
});
```

#### SpreadMode Enum

| Mode | Description | Grouping |
|------|-------------|----------|
| `None` | Single pages | `[[p1], [p2], [p3], ...]` |
| `Odd` | Pairs from first page | `[[p1, p2], [p3, p4], ...]` |
| `Even` | Cover standalone, then pairs | `[[p1], [p2, p3], [p4, p5], ...]` |

#### Hooks

##### `useSpread(documentId)`

```typescript
const { spreadMode, provides: spread } = useSpread(documentId);

spread?.setSpreadMode(SpreadMode.Odd);
const mode = spread?.getSpreadMode();
```

---

### Print Plugin

**Package**: `@embedpdf/plugin-print`

Browser native printing.

#### Hooks

##### `usePrint(documentId)`

```typescript
const { provides: print } = usePrint(documentId);

const handlePrint = () => {
  const task = print?.print({
    pageRanges: '1-3, 5, 8', // Optional
    includeAnnotations: true,
  });

  task?.wait(
    () => console.log('Print complete'),
    (error) => console.error('Print failed', error)
  );
};
```

---

### Export Plugin

**Package**: `@embedpdf/plugin-export`

Download/save PDF files.

#### Registration

```typescript
createPluginRegistration(ExportPluginPackage, {
  defaultFileName: 'my-document.pdf',
});
```

#### Hooks

##### `useExport(documentId)`

```typescript
const { provides: exportApi } = useExport(documentId);

// Trigger download
exportApi?.download();

// Get as ArrayBuffer (for custom handling)
const task = exportApi?.saveAsCopy();
task?.wait(arrayBuffer => {
  // Send to server, etc.
});
```

---

### Capture Plugin

**Package**: `@embedpdf/plugin-capture`

Select rectangular areas on PDF pages and export as high-resolution images.

#### Dependencies

```bash
npm install @embedpdf/plugin-capture @embedpdf/plugin-render @embedpdf/plugin-interaction-manager
```

#### Registration

```typescript
createPluginRegistration(CapturePluginPackage, {
  scale: 2.0,
  imageType: 'image/png',
  withAnnotations: true,
});
```

#### Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `scale` | number | 1 | Resolution multiplier |
| `imageType` | string | 'image/png' | Output format |
| `withAnnotations` | boolean | false | Include annotations |

#### Components

##### `<MarqueeCapture />`

Visual selection tool for capture area:

```typescript
<PagePointerProvider documentId={documentId} pageIndex={pageIndex}>
  <MarqueeCapture
    documentId={documentId}
    pageIndex={pageIndex}
    stroke="#007ACC"
    fill="rgba(0, 122, 204, 0.1)"
  />
</PagePointerProvider>
```

#### Hooks

##### `useCapture(documentId)`

```typescript
const { provides: capture, state } = useCapture(documentId);

// Check if capture mode active
console.log(state.isMarqueeCaptureActive);

// Toggle capture mode
capture?.toggleMarqueeCapture();

// Listen for captures
capture?.onCaptureArea((event) => {
  console.log(event.pageIndex);  // Page number
  console.log(event.rect);       // Position/dimensions
  console.log(event.blob);       // Image data
  console.log(event.imageType);  // MIME type
  console.log(event.scale);      // Resolution factor
});

// Programmatic capture
capture?.captureArea(pageIndex, rect);
```

---

### Redaction Plugin

**Package**: `@embedpdf/plugin-redaction`

Permanently remove sensitive content from PDFs. **Destructive and irreversible.**

#### Dependencies

```bash
npm install @embedpdf/plugin-redaction @embedpdf/plugin-selection @embedpdf/plugin-interaction-manager
```

#### Two Operating Modes

1. **Legacy Mode**: Pending redactions in internal state; simple single-session workflows
2. **Annotation Mode**: Redactions stored as PDF REDACT annotations; supports collaboration, colors, undo/redo

#### Registration

```typescript
createPluginRegistration(RedactionPluginPackage, {
  drawBlackBoxes: true,      // Draw black rectangles (legacy mode)
  useAnnotationMode: false,  // Use annotation storage
});
```

#### Components

##### `<RedactionLayer />`

Renders redaction UI including text selection highlights and area marquee:

```typescript
<PagePointerProvider documentId={documentId} pageIndex={pageIndex}>
  <RedactionLayer documentId={documentId} pageIndex={pageIndex} />
</PagePointerProvider>
```

#### Hooks

##### `useRedaction(documentId)`

```typescript
const { provides: redaction, state } = useRedaction(documentId);

// State
console.log(state.isRedacting);   // Active mode
console.log(state.activeType);    // Current mode type
console.log(state.pending);       // Map of pending redactions
console.log(state.pendingCount);  // Total pending
console.log(state.selected);      // Currently selected mark

// Toggle modes
redaction?.toggleRedact();           // Unified (text + area)
redaction?.toggleRedactSelection();  // Text-only
redaction?.toggleMarqueeRedact();    // Area-only

// Manage pending
redaction?.addPending(items);
redaction?.removePending(pageIndex, id);
redaction?.clearPending();

// Apply redactions (DESTRUCTIVE!)
redaction?.commitAllPending();
redaction?.commitPending(pageIndex, id);
```

---

## Advanced Plugins

### View Manager Plugin

**Package**: `@embedpdf/plugin-view-manager`

Advanced layout for split-screen, tabbed groups, and multi-pane layouts.

#### Dependencies

```bash
npm install @embedpdf/plugin-view-manager @embedpdf/plugin-document-manager
```

#### Registration

```typescript
createPluginRegistration(ViewManagerPluginPackage, {
  defaultViewCount: 1,  // Number of views on init
});
```

#### Concepts

- **View Manager**: Global controller
- **View**: Layout container holding document IDs
- **Active Document**: One visible per view
- **Focused View**: Receives user input

#### Components

##### `<ViewContext />`

Headless component connecting view to state:

```typescript
<ViewContext viewId={viewId}>
  {({ view, documentIds, activeDocumentId, isFocused, focus, addDocument, removeDocument, setActiveDocument }) => (
    <div className={isFocused ? 'focused' : ''}>
      {documentIds.map(docId => (
        <Tab
          key={docId}
          active={docId === activeDocumentId}
          onClick={() => setActiveDocument(docId)}
        />
      ))}
    </div>
  )}
</ViewContext>
```

#### Hooks

##### `useAllViews()`

```typescript
const views = useAllViews();
// Render split layout
views.map(view => <ViewPane key={view.id} viewId={view.id} />);
```

##### `useView(viewId)`

```typescript
const { id, documentIds, activeDocumentId } = useView(viewId);
```

##### `useViewManagerCapability()`

```typescript
const { provides: viewManager } = useViewManagerCapability();

// Create/remove views
viewManager?.createView('view-2');
viewManager?.removeView('view-2');

// Manage documents in views
viewManager?.addDocumentToView(viewId, docId, index);
viewManager?.removeDocumentFromView(viewId, docId);
viewManager?.setViewActiveDocument(viewId, docId);
viewManager?.moveDocumentBetweenViews(fromViewId, toViewId, docId);

// Focus management
viewManager?.setFocusedView(viewId);
const focusedId = viewManager?.getFocusedViewId();

// Get all views
const allViews = viewManager?.getAllViews();
```

---

### Commands Plugin

**Package**: `@embedpdf/plugin-commands`

Central registry for viewer actions with keyboard shortcuts and dynamic state.

#### Registration

```typescript
import { CommandsPluginPackage } from '@embedpdf/plugin-commands/react';

createPluginRegistration(CommandsPluginPackage, {
  commands: myCommands,
});
```

#### Command Definition

```typescript
interface Command<TState = any> {
  id: string;
  label?: string;
  icon?: string;
  shortcuts?: string[];
  action: (context: {
    registry: PluginRegistry;
    state: TState;
    documentId: string;
  }) => void;
  disabled?: boolean | ((ctx) => boolean);
  visible?: boolean | ((ctx) => boolean);
  active?: boolean | ((ctx) => boolean);
}
```

#### Example Commands

```typescript
const myCommands = {
  'nav.next': {
    id: 'nav.next',
    label: 'Next Page',
    shortcuts: ['arrowright', 'j'],
    action: ({ registry }) => {
      registry.getPlugin('scroll')?.provides()?.scrollToNextPage();
    },
    disabled: ({ state, documentId }) => {
      const scrollState = state.plugins.scroll.documents[documentId];
      return scrollState?.currentPage >= scrollState?.totalPages;
    },
  },
  'zoom.in': {
    id: 'zoom.in',
    label: 'Zoom In',
    shortcuts: ['=', 'ctrl+='],
    action: ({ registry }) => {
      registry.getPlugin('zoom')?.provides()?.zoomIn();
    },
  },
};
```

#### Hooks

##### `useCommand(commandId, documentId)`

```typescript
const resolved = useCommand('nav.next', documentId);

if (!resolved?.visible) return null;

return (
  <button
    onClick={resolved.execute}
    disabled={resolved.disabled}
    className={resolved.active ? 'active' : ''}
    title={`${resolved.label} (${resolved.shortcuts?.[0]})`}
  >
    {resolved.label}
  </button>
);
```

**ResolvedCommand properties:**
- `execute()` - Trigger the command
- `disabled` - Current disabled state
- `active` - Current active/toggled state
- `visible` - Should display in UI
- `label` - Display label (i18n-aware)
- `shortcuts` - Keyboard shortcuts

##### `useCommandsCapability()`

```typescript
const { provides: commands } = useCommandsCapability();

commands?.registerCommand(cmd);
commands?.execute('nav.next');
commands?.getCommandByShortcut('arrowright');
commands?.getAllCommands();
```

---

### Internationalization Plugin

**Package**: `@embedpdf/plugin-i18n`

Full internationalization support with translations and locale management.

#### Registration

```typescript
createPluginRegistration(I18nPluginPackage, {
  defaultLocale: 'en',
  fallbackLocale: 'en',
  locales: [
    {
      code: 'en',
      name: 'English',
      translations: {
        zoom: {
          in: 'Zoom In',
          out: 'Zoom Out',
          level: 'Zoom Level ({{level}}%)',
        },
        nav: {
          next: 'Next Page',
          prev: 'Previous Page',
        },
      },
    },
    {
      code: 'es',
      name: 'Español',
      translations: {
        zoom: {
          in: 'Acercar',
          out: 'Alejar',
          level: 'Nivel de Zoom ({{level}}%)',
        },
        nav: {
          next: 'Página Siguiente',
          prev: 'Página Anterior',
        },
      },
    },
  ],
});
```

#### Hooks

##### `useTranslations(documentId?)`

```typescript
const { translate, locale } = useTranslations(documentId);

// Basic translation
translate('zoom.in'); // "Zoom In"

// With parameters
translate('zoom.level', { params: { level: 150 } }); // "Zoom Level (150%)"

// With fallback
translate('unknown.key', { fallback: 'Default Text' });
```

##### `useTranslation(key, options?, documentId?)`

Convenience hook for single translations:

```typescript
const label = useTranslation('nav.next'); // "Next Page"
```

##### `useLocale()`

```typescript
const locale = useLocale(); // "en"
```

##### `useI18nCapability()`

```typescript
const { provides: i18n } = useI18nCapability();

// Change locale
i18n?.setLocale('es');

// Get info
const current = i18n?.getLocale();
const available = i18n?.getAvailableLocales();

// Register new locale
i18n?.registerLocale({
  code: 'fr',
  name: 'Français',
  translations: { /* ... */ },
});

// Check if locale exists
const hasSpanish = i18n?.hasLocale('es');
```

#### Components

##### `<Translate />`

```typescript
<Translate k="zoom.level" params={{ level: 150 }} />
// Renders: "Zoom Level (150%)"

// With custom rendering
<Translate k="nav.next">
  {(text) => <strong>{text}</strong>}
</Translate>
```

#### Events

- `onLocaleChange` - Fired when locale switches
- `onParamsChanged` - Fired when translation params change

---

## Security & Permissions

### Concepts

**Encryption**: Real cryptographic security (AES-256, RC4). Requires password to decrypt.

**Permission Flags**: Metadata that viewers choose to honor. **Not cryptographically enforced.**

> Once decrypted, permission flags can be ignored. They are viewer-enforced requests, not technical barriers.

### Permission Resolution Hierarchy

1. **Per-Document Override** (highest priority)
2. **Global Configuration**
3. **Enforce Setting** (`enforceDocumentPermissions`)
4. **PDF Document Flags** (lowest priority)

### Configuration

```typescript
const config = {
  permissions: {
    enforceDocumentPermissions: true, // false = ignore PDF flags
    overrides: {
      print: false,
      modifyContents: false,
    }
  }
};
```

### Available Permissions

- `print` / `printHighQuality`
- `modifyContents`
- `copyContents`
- `modifyAnnotations`
- `fillForms`
- `extractForAccessibility`
- `assembleDocument`

### Hooks

##### `useDocumentPermissions(documentId)`

```typescript
const { canPrint, canCopy, canModifyAnnotations } = useDocumentPermissions(documentId);

return (
  <>
    <button disabled={!canPrint}>Print</button>
    <button disabled={!canCopy}>Copy</button>
  </>
);
```

---

## Common Patterns

### Full Viewer Setup

```typescript
import { createPluginRegistration } from '@embedpdf/core';
import { EmbedPDF } from '@embedpdf/core/react';
import { usePdfiumEngine } from '@embedpdf/engines/react';
import { DocumentContent, DocumentManagerPluginPackage } from '@embedpdf/plugin-document-manager/react';
import { Viewport, ViewportPluginPackage } from '@embedpdf/plugin-viewport/react';
import { Scroller, ScrollPluginPackage } from '@embedpdf/plugin-scroll/react';
import { RenderLayer, RenderPluginPackage } from '@embedpdf/plugin-render/react';

// Define plugins OUTSIDE component
const plugins = [
  createPluginRegistration(DocumentManagerPluginPackage, {
    initialDocuments: [{ url: '/document.pdf' }],
  }),
  createPluginRegistration(ViewportPluginPackage),
  createPluginRegistration(ScrollPluginPackage),
  createPluginRegistration(RenderPluginPackage),
];

export const PDFViewer = () => {
  const { engine, isLoading } = usePdfiumEngine();

  if (isLoading || !engine) {
    return <div>Loading PDF Engine...</div>;
  }

  return (
    <div style={{ height: '100vh' }}>
      <EmbedPDF engine={engine} plugins={plugins}>
        {({ activeDocumentId }) =>
          activeDocumentId && (
            <DocumentContent documentId={activeDocumentId}>
              {({ isLoaded }) =>
                isLoaded && (
                  <Viewport documentId={activeDocumentId}>
                    <Scroller
                      documentId={activeDocumentId}
                      renderPage={({ width, height, pageIndex }) => (
                        <div style={{ width, height }}>
                          <RenderLayer
                            documentId={activeDocumentId}
                            pageIndex={pageIndex}
                          />
                        </div>
                      )}
                    />
                  </Viewport>
                )
              }
            </DocumentContent>
          )
        }
      </EmbedPDF>
    </div>
  );
};
```

### Layer Order (Recommended)

Based on official examples, render layers in this order inside `<PagePointerProvider>`:

1. `<RenderLayer />` - Base PDF content
2. `<TilingLayer />` - High-res tiles (optional)
3. `<SearchLayer />` - Search highlights
4. `<SelectionLayer />` - Text selection
5. `<AnnotationLayer />` - Annotations
6. `<MarqueeZoom />` - Area zoom (optional)

### Annotation Persistence

Subscribe to annotation events and persist:

```typescript
const { provides: annotationApi } = useAnnotation(documentId);

useEffect(() => {
  if (!annotationApi) return;

  const unsubscribe = annotationApi.onAnnotationEvent((event) => {
    if (event.type === 'create' || event.type === 'update' || event.type === 'delete') {
      // Persist to backend or localStorage
      saveAnnotations(documentId, getAnnotationState());
    }
  });

  return unsubscribe;
}, [annotationApi, documentId]);
```

---

## Troubleshooting

### Plugin state resets on re-render

**Cause**: Plugins array recreated every render.

**Fix**: Define plugins outside component or use `useMemo`:

```typescript
// ✅ Outside component
const plugins = [...];

// ✅ Or with useMemo
const plugins = useMemo(() => [...], []);
```

### Hooks return null/undefined

**Cause**: Component rendered before document ready.

**Fix**: Gate on `activeDocumentId` and `isLoaded`:

```typescript
{activeDocumentId && (
  <DocumentContent documentId={activeDocumentId}>
    {({ isLoaded }) => isLoaded && <YourComponent />}
  </DocumentContent>
)}
```

### Annotations not rendering

**Cause**: Missing `<PagePointerProvider>` wrapper.

**Fix**: Wrap `<AnnotationLayer>` with `<PagePointerProvider>`:

```typescript
<PagePointerProvider documentId={documentId} pageIndex={pageIndex}>
  <AnnotationLayer documentId={documentId} pageIndex={pageIndex} />
</PagePointerProvider>
```

### WASM loading issues in Vite

**Cause**: Vite pre-bundling WASM incorrectly.

**Fix**: Add to `vite.config.ts`:

```typescript
optimizeDeps: {
  exclude: ['@embedpdf/engines']
}
```

### Zoom drift with annotations/comments

**Cause**: Storing scaled coordinates instead of using annotation rects.

**Fix**: Use annotation state as source of truth, let `<AnnotationLayer>` handle positioning.

---

## Plugins Not Documented (Headless)

The following plugins exist but don't have dedicated headless documentation pages. Refer to the Drop-in Viewer docs or source code:

- **Search Plugin** (`@embedpdf/plugin-search`) - Text search with highlights. Uses `useSearch(documentId)` hook and `<SearchLayer />` component.
- **History Plugin** (`@embedpdf/plugin-history`) - Undo/redo support. Required by Annotation plugin for history features.
- **Interaction Manager Plugin** (`@embedpdf/plugin-interaction-manager`) - Base plugin for pointer/gesture handling. Required by Selection, Annotation, Zoom, Pan, Capture, and Redaction plugins.

---

## Additional Resources

- [Official Docs](https://www.embedpdf.com/docs/react/headless/introduction)
- [Full Plugin List](https://www.embedpdf.com/docs/react/headless/plugins/plugin-document-manager) (sidebar navigation)
- [GitHub Discussions](https://github.com/embedpdf/embed-pdf-viewer/discussions)
- [Discord Community](https://discord.gg/embedpdf)

---

*This documentation was compiled from the official EmbedPDF documentation site for local development reference. Last updated: 2026-02-04.*
