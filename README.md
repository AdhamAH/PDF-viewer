# EmbedPDF Headless (Vite + React + TS)

Minimal, client-only test project that composes a headless PDF viewer with EmbedPDF core + engine + plugins.

## Install

```bash
npm install
```

If you prefer explicit packages:

```bash
npm install \
  @embedpdf/core @embedpdf/engines \
  @embedpdf/plugin-document-manager @embedpdf/plugin-viewport @embedpdf/plugin-scroll @embedpdf/plugin-render \
  @embedpdf/plugin-interaction-manager @embedpdf/plugin-selection \
  @embedpdf/plugin-annotation @embedpdf/plugin-history \
  @embedpdf/plugin-zoom @embedpdf/plugin-search @embedpdf/plugin-fullscreen
```

## Run

```bash
npm run dev
```

## Architecture (short)

- **Engine**: `usePdfiumEngine()` from `@embedpdf/engines` creates a client-side PDFium engine instance.
- **Plugins**: `createViewerPlugins()` in `src/pdf/plugins.ts` registers core plugins + feature plugins in the recommended order.
- **Viewer tree**:
  - `<EmbedPDF>` provides context + plugin registry
  - `<DocumentContent>` loads the active document
- `<Viewport>` + `<Scroller>` handle layout and paging
- `renderPage()` composes layers inside `<PagePointerProvider>`:
  - `<RenderLayer>`
  - `<SelectionLayer>`
  - `<AnnotationLayer>`
  - `<MarqueeZoom>`
  - `<SearchLayer>`

## Where To Add New Plugins

- Add the plugin package registration in `src/pdf/plugins.ts`.
- If the plugin has a render layer, add it to `renderPage()` in `src/pdf/PDFViewer.tsx`.
- Add UI (controls/hooks) under `src/pdf/toolbar/`.

## Persistence

Annotation state is persisted to `localStorage` in `useAnnotationPersistence()` (`src/pdf/hooks/useAnnotationPersistence.ts`).
Storage key is derived from the document URL when available.

## Known Limitations

- Search/fullscreen hook names are assumed from EmbedPDF's headless patterns. If the package exports differ, update `src/pdf/toolbar/SearchBar.tsx` and `src/pdf/toolbar/FullscreenButton.tsx` accordingly.
- Local file persistence uses the document name/id if no URL is available.

## Feature Checklist

- [x] PDF renders
- [x] Text selection overlay
- [x] Highlight + underline annotations
- [x] Zoom controls
- [x] Marquee (area) zoom toggle
- [x] Search UI (next/prev + count)
- [x] Fullscreen toggle
- [x] Annotation persistence (localStorage)
