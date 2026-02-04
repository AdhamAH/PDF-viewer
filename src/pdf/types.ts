/**
 * Type definitions for EmbedPDF plugin hooks.
 * These provide type safety for the plugin APIs which have varying method names across versions.
 */

import {
  PdfAnnotationSubtype,
  PdfAnnotationIcon,
  PdfAnnotationReplyType,
  PdfTextAnnoObject,
} from '@embedpdf/models';

// Re-export annotation types for convenience
export { PdfAnnotationSubtype, PdfAnnotationIcon, PdfAnnotationReplyType };
export type { PdfTextAnnoObject };

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
  selectAnnotation?: (pageIndex: number, annotationId: string) => void;
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

// Comment types - now based on TEXT annotations
export interface CommentData {
  id: string;
  pageIndex: number;
  position: { x: number; y: number }; // PDF coordinates (points)
  content: string;
  author?: string;
  created: number;
  updated?: number;
  parentAnnotationId?: string; // If attached to highlight/underline (IRT)
  parentCommentId?: string; // If this is a reply to another comment (IRT)
}

export interface CommentStorage {
  load(documentKey: string): Promise<CommentData[]>;
  save(documentKey: string, comments: CommentData[]): Promise<void>;
}

// TEXT annotation helpers

/**
 * Check if an annotation is a TEXT (sticky note) annotation
 */
export function isTextAnnotation(annotation: unknown): annotation is PdfTextAnnoObject {
  if (!annotation || typeof annotation !== 'object') return false;
  return (annotation as { type?: unknown }).type === PdfAnnotationSubtype.TEXT;
}

/**
 * Get all replies to a given annotation (via inReplyToId / IRT)
 */
export function getAnnotationReplies(
  annotations: AnyAnnotation[],
  parentId: string
): AnyAnnotation[] {
  return annotations.filter(
    (a) =>
      a.inReplyToId === parentId &&
      a.replyType === PdfAnnotationReplyType.Reply
  );
}

/**
 * Convert a TEXT annotation to CommentData format
 */
export function textAnnotationToCommentData(
  annotation: PdfTextAnnoObject
): CommentData {
  // The rect is in PDF coordinates [x1, y1, x2, y2]
  // We store position as the top-left of the annotation rect
  const rect = annotation.rect;
  return {
    id: annotation.id,
    pageIndex: annotation.pageIndex,
    position: {
      x: rect.origin.x,
      y: rect.origin.y,
    },
    content: annotation.contents || '',
    author: annotation.author,
    created: annotation.created?.getTime() ?? Date.now(),
    updated: annotation.modified?.getTime(),
    parentCommentId: annotation.inReplyToId,
  };
}

/**
 * Generate a unique UUIDv4 ID for new annotations.
 * Must be UUIDv4 format because the PDFium engine validates/replaces non-UUIDv4 IDs,
 * which causes a state UID mismatch when trying to update annotations.
 */
export function generateAnnotationId(): string {
  // Use native crypto.randomUUID if available (modern browsers, Node 19+)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback: Generate a proper UUIDv4 manually
  // Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  // where x is any hex digit and y is one of 8, 9, a, or b
  const hex = '0123456789abcdef';
  let uuid = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += '-';
    } else if (i === 14) {
      uuid += '4'; // Version 4
    } else if (i === 19) {
      uuid += hex[(Math.random() * 4) | 8]; // Variant bits: 8, 9, a, or b
    } else {
      uuid += hex[(Math.random() * 16) | 0];
    }
  }
  return uuid;
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
