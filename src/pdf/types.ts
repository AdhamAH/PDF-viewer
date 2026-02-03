/**
 * Type definitions for EmbedPDF plugin hooks.
 * These provide type safety for the plugin APIs which have varying method names across versions.
 */

// Document Manager types
export interface DocumentManagerProvides {
  openDocumentUrl?: (params: { url: string }) => void;
  openDocument?: (params: { source: { url: string } }) => void;
  openFileDialog?: () => void;
}

export interface DocumentManagerCapability {
  provides?: DocumentManagerProvides;
}

// Search types
export interface SearchState {
  query?: string;
  keyword?: string;
  totalMatches?: number;
  totalResults?: number;
  matchCount?: number;
  matches?: unknown[];
  results?: unknown[];
  activeMatchIndex?: number;
  activeMatch?: number;
  activeResultIndex?: number;
}

export interface SearchProvides {
  searchAllPages?: (query: string) => void;
  search?: (query: string) => void;
  requestSearch?: (query: string) => void;
  setSearchQuery?: (query: string) => void;
  setSearchTerm?: (query: string) => void;
  startSearch?: () => void;
  nextResult?: () => void;
  nextMatch?: () => void;
  goToNextMatch?: () => void;
  goToNextResult?: () => void;
  previousResult?: () => void;
  previousMatch?: () => void;
  prevMatch?: () => void;
  goToPreviousMatch?: () => void;
  goToPreviousResult?: () => void;
}

export interface SearchCapability {
  state?: SearchState;
  provides?: SearchProvides;
}

// Zoom types
export interface ZoomState {
  currentZoomLevel?: number;
  zoomLevel?: number;
  isMarqueeZoomActive?: boolean;
}

export interface ZoomProvides {
  zoomIn?: () => void;
  zoomOut?: () => void;
  requestZoom?: (level: number | unknown) => void;
  setZoomMode?: (mode: unknown) => void;
  toggleMarqueeZoom?: () => void;
}

export interface ZoomCapability {
  state?: ZoomState;
  provides?: ZoomProvides;
}

// Annotation types
export type AnyAnnotation = Record<string, unknown>;

export interface TrackedAnnotation {
  object: AnyAnnotation & { pageIndex?: number };
  commitState?: string;
}

export interface AnnotationState {
  activeToolId?: string | { id?: string };
  activeTool?: string | { id?: string };
  activeToolName?: string | { id?: string };
  selectedUids?: string[];
  selectedUid?: string | null;
}

export interface AnnotationProvides {
  setActiveTool?: (tool: string | null) => void;
  setAnnotationTool?: (tool: string | null) => void;
  activateTool?: (tool: string | null) => void;
  clearActiveTool?: () => void;
  importAnnotations?: (annotations: AnyAnnotation[]) => void;
  onAnnotationEvent?: (handler: (event: AnnotationEvent) => void) => (() => void) | undefined;
  getSelectedAnnotations?: () => TrackedAnnotation[];
  getSelectedAnnotation?: () => TrackedAnnotation | null;
  deleteAnnotation?: (pageIndex: number, annotationId: string) => void;
  deselectAnnotation?: () => void;
}

export interface AnnotationCapability {
  state?: AnnotationState;
  provides?: AnnotationProvides;
}

export interface AnnotationEvent {
  type?: 'create' | 'update' | 'delete' | 'loaded';
  annotation?: AnyAnnotation;
  patch?: Partial<AnyAnnotation>;
  committed?: boolean;
}

// History types
export interface HistoryScope {
  canUndo?: () => boolean;
  canRedo?: () => boolean;
  onHistoryChange?: (handler: () => void) => (() => void) | undefined;
}

export interface HistoryProvides extends HistoryScope {
  forDocument?: (documentId: string) => HistoryScope | undefined;
  undo?: () => void;
  redo?: () => void;
  onHistoryChange?: (handler: (event: { documentId: string }) => void) => (() => void) | undefined;
}

export interface HistoryCapability {
  provides?: HistoryProvides;
}

// Fullscreen types
export interface FullscreenState {
  isFullscreen?: boolean;
  isActive?: boolean;
}

export interface FullscreenProvides {
  toggleFullscreen?: () => void;
  enterFullscreen?: () => void;
  exitFullscreen?: () => void;
}

export interface FullscreenCapability {
  state?: FullscreenState;
  provides?: FullscreenProvides;
}

// Pan types
export interface PanProvides {
  togglePan?: () => void;
  enablePan?: () => void;
  disablePan?: () => void;
}

export interface PanCapability {
  isPanning?: boolean;
  provides?: PanProvides;
}

// Document state
export interface DocumentState {
  name?: string;
  url?: string;
  source?: {
    url?: string;
  };
}

// Document content payload
export interface DocumentContentPayload {
  isLoaded?: boolean;
  isLoading?: boolean;
  isError?: boolean;
  error?: Error;
  documentState?: DocumentState;
}

// Export types
export interface ExportProvides {
  download?: () => void;
  saveAsCopy?: () => { toPromise: () => Promise<ArrayBuffer> };
  forDocument?: (documentId: string) => ExportProvides | undefined;
}

export interface ExportCapability {
  provides?: ExportProvides;
}

// URL validation helper
export function isValidPdfUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}
