import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import type { ReactNode } from 'react';
import { useAnnotation } from '@embedpdf/plugin-annotation/react';
import {
  getSidebarAnnotationsWithRepliesGroupedByPage,
  type SidebarAnnotationEntry,
  type AnnotationDocumentState,
  type AnnotationScope,
} from '@embedpdf/plugin-annotation';
import {
  PdfAnnotationSubtype,
  PdfAnnotationIcon,
  PdfAnnotationReplyType,
} from '@embedpdf/models';
import type { PdfTextAnnoObject, PdfAnnotationObject } from '@embedpdf/models';
import { generateAnnotationId } from './types';

// Re-export SidebarAnnotationEntry for use in CommentsSidebar
export type { SidebarAnnotationEntry };

interface CommentsContextValue {
  // Grouped annotations with their replies, keyed by page
  annotationsByPage: Record<number, SidebarAnnotationEntry[]>;
  // Currently selected annotation ID
  selectedAnnotationId: string | null;
  // Add a TEXT annotation (sticky note comment) at a position
  addComment: (
    pageIndex: number,
    position: { x: number; y: number },
    content: string,
    author?: string
  ) => void;
  // Add a reply to an annotation
  addReply: (parentAnnotationId: string, pageIndex: number, content: string, author?: string) => void;
  // Update an annotation's contents
  updateAnnotationContents: (pageIndex: number, annotationId: string, contents: string) => void;
  // Delete an annotation
  deleteAnnotation: (pageIndex: number, annotationId: string) => void;
  // Select an annotation
  selectAnnotation: (pageIndex: number, annotationId: string) => void;
  // Deselect
  deselectAnnotation: () => void;
}

const CommentsContext = createContext<CommentsContextValue | null>(null);

interface CommentsProviderProps {
  children: ReactNode;
  documentId: string | null;
}

// Default size for comment icons (in PDF points)
const COMMENT_ICON_SIZE = 24;

export function CommentsProvider({ children, documentId }: CommentsProviderProps) {
  // Get annotation scope from the annotation plugin (document-scoped API)
  const annotation = useAnnotation(documentId ?? '') as
    | { provides: AnnotationScope | null; state: AnnotationDocumentState | null }
    | undefined;

  const annotationProvides = annotation?.provides ?? null;
  const annotationState = annotation?.state ?? null;

  // Use the official selector to get sidebar annotations grouped by page
  const annotationsByPage = useMemo<Record<number, SidebarAnnotationEntry[]>>(() => {
    if (!annotationState) {
      return {};
    }
    return getSidebarAnnotationsWithRepliesGroupedByPage(annotationState);
  }, [annotationState]);

  // Selected annotation ID from state
  const selectedAnnotationId = annotationState?.selectedUid ?? null;

  // Keep a ref for accessing state in callbacks
  const stateRef = useRef<AnnotationDocumentState | null>(null);
  stateRef.current = annotationState;

  const addComment = useCallback(
    (
      pageIndex: number,
      position: { x: number; y: number },
      content: string,
      author?: string
    ) => {
      if (!annotationProvides) {
        console.warn('Annotation plugin not available');
        return;
      }

      const id = generateAnnotationId();
      const now = new Date();

      // Create a TEXT annotation (sticky note)
      const textAnnotation: PdfTextAnnoObject = {
        type: PdfAnnotationSubtype.TEXT,
        id,
        pageIndex,
        rect: {
          origin: { x: position.x, y: position.y },
          size: { width: COMMENT_ICON_SIZE, height: COMMENT_ICON_SIZE },
        },
        contents: content,
        author: author || undefined,
        icon: PdfAnnotationIcon.Comment,
        created: now,
        modified: now,
        color: '#FFEB3B', // Yellow sticky note color
        opacity: 1,
      };

      annotationProvides.createAnnotation(pageIndex, textAnnotation);
      annotationProvides.selectAnnotation(pageIndex, id);
    },
    [annotationProvides]
  );

  const addReply = useCallback(
    (parentAnnotationId: string, pageIndex: number, content: string, author?: string) => {
      if (!annotationProvides) {
        console.warn('Annotation plugin not available');
        return;
      }

      const id = generateAnnotationId();
      const now = new Date();

      // Get parent annotation to position reply near it
      const parentTracked = stateRef.current?.byUid[parentAnnotationId];
      const parentRect = (parentTracked?.object as PdfAnnotationObject)?.rect;
      const position = parentRect?.origin ?? { x: 0, y: 0 };

      // Create a reply TEXT annotation with IRT (In-Reply-To)
      const replyAnnotation: PdfTextAnnoObject = {
        type: PdfAnnotationSubtype.TEXT,
        id,
        pageIndex,
        rect: {
          origin: { x: position.x, y: position.y },
          size: { width: COMMENT_ICON_SIZE, height: COMMENT_ICON_SIZE },
        },
        contents: content,
        author: author || undefined,
        icon: PdfAnnotationIcon.Comment,
        created: now,
        modified: now,
        color: '#FFEB3B',
        opacity: 1,
        inReplyToId: parentAnnotationId,
        replyType: PdfAnnotationReplyType.Reply,
      };

      annotationProvides.createAnnotation(pageIndex, replyAnnotation);
    },
    [annotationProvides]
  );

  const updateAnnotationContents = useCallback(
    (pageIndex: number, annotationId: string, contents: string) => {
      if (!annotationProvides) {
        console.warn('Annotation plugin not available');
        return;
      }

      annotationProvides.updateAnnotation(pageIndex, annotationId, {
        contents,
        modified: new Date(),
      });
    },
    [annotationProvides]
  );

  const deleteAnnotation = useCallback(
    (pageIndex: number, annotationId: string) => {
      if (!annotationProvides) {
        console.warn('Annotation plugin not available');
        return;
      }

      annotationProvides.deleteAnnotation(pageIndex, annotationId);
    },
    [annotationProvides]
  );

  const selectAnnotation = useCallback(
    (pageIndex: number, annotationId: string) => {
      if (!annotationProvides) {
        return;
      }
      annotationProvides.selectAnnotation(pageIndex, annotationId);
    },
    [annotationProvides]
  );

  const deselectAnnotation = useCallback(() => {
    if (!annotationProvides) {
      return;
    }
    annotationProvides.deselectAnnotation();
  }, [annotationProvides]);

  const value: CommentsContextValue = useMemo(
    () => ({
      annotationsByPage,
      selectedAnnotationId,
      addComment,
      addReply,
      updateAnnotationContents,
      deleteAnnotation,
      selectAnnotation,
      deselectAnnotation,
    }),
    [
      annotationsByPage,
      selectedAnnotationId,
      addComment,
      addReply,
      updateAnnotationContents,
      deleteAnnotation,
      selectAnnotation,
      deselectAnnotation,
    ]
  );

  return (
    <CommentsContext.Provider value={value}>{children}</CommentsContext.Provider>
  );
}

export function useComments(): CommentsContextValue {
  const context = useContext(CommentsContext);
  if (!context) {
    throw new Error('useComments must be used within a CommentsProvider');
  }
  return context;
}
