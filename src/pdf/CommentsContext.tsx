import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import type { ReactNode } from 'react';
import { useAnnotation } from '@embedpdf/plugin-annotation/react';
import {
  PdfAnnotationSubtype,
  PdfAnnotationIcon,
  PdfAnnotationReplyType,
} from '@embedpdf/models';
import type { PdfTextAnnoObject } from '@embedpdf/models';
import type {
  AnnotationScope,
  AnnotationDocumentState,
} from '@embedpdf/plugin-annotation';
import {
  isTextAnnotation,
  generateAnnotationId,
  textAnnotationToCommentData,
} from './types';
import type { CommentData } from './types';

interface CommentsContextValue {
  comments: CommentData[];
  activeCommentId: string | null;
  commentModeActive: boolean;
  pendingAnnotationId: string | null;
  addComment: (
    pageIndex: number,
    position: { x: number; y: number },
    content: string,
    author?: string
  ) => void;
  addReply: (parentCommentId: string, content: string, author?: string) => void;
  updateComment: (
    id: string,
    updates: Partial<Pick<CommentData, 'content' | 'author'>>
  ) => void;
  deleteComment: (id: string) => void;
  setActiveComment: (id: string | null) => void;
  setCommentModeActive: (active: boolean) => void;
  setPendingAnnotationId: (id: string | null) => void;
  getCommentsForPage: (pageIndex: number) => CommentData[];
  getReplies: (commentId: string) => CommentData[];
}

const CommentsContext = createContext<CommentsContextValue | null>(null);

interface CommentsProviderProps {
  children: ReactNode;
  documentId: string | null;
}

// Default size for comment icons (in PDF points)
const COMMENT_ICON_SIZE = 24;

export function CommentsProvider({ children, documentId }: CommentsProviderProps) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [commentModeActive, setCommentModeActive] = useState(false);
  const [pendingAnnotationId, setPendingAnnotationId] = useState<string | null>(
    null
  );

  // Get annotation scope from the annotation plugin (document-scoped API)
  const annotation = useAnnotation(documentId ?? '') as
    | { provides: AnnotationScope | null; state: AnnotationDocumentState | null }
    | undefined;

  const annotationProvides = annotation?.provides ?? null;
  const annotationState = annotation?.state ?? null;

  // Debug: log annotation state changes
  useEffect(() => {
    if (annotationState) {
      console.log('[Comments] Annotation state updated:', {
        pages: Object.keys(annotationState.pages),
        totalAnnotations: Object.keys(annotationState.byUid).length,
        annotations: Object.values(annotationState.byUid).map((t) => ({
          id: t.object.id,
          type: t.object.type,
          commitState: t.commitState,
        })),
      });
    }
  }, [annotationState]);

  // Use a ref to track comments for callbacks to avoid stale closure issues
  const commentsRef = useRef<CommentData[]>([]);

  // Sync comments from annotation state - this is the single source of truth
  // We removed the separate event subscription to avoid dual-sync race conditions
  useEffect(() => {
    if (!annotationState || !documentId) {
      console.log('[Comments] No annotation state or documentId, clearing comments');
      setComments([]);
      commentsRef.current = [];
      return;
    }

    // Get all TEXT annotations from the annotation state
    const textAnnotations: CommentData[] = [];

    for (const annotationIds of Object.values(annotationState.pages)) {
      for (const uid of annotationIds) {
        const tracked = annotationState.byUid[uid];
        if (tracked && isTextAnnotation(tracked.object)) {
          textAnnotations.push(textAnnotationToCommentData(tracked.object));
        }
      }
    }

    console.log('[Comments] Synced TEXT annotations:', textAnnotations.length, textAnnotations);
    setComments(textAnnotations);
    commentsRef.current = textAnnotations;
  }, [annotationState, documentId]);

  // Clear any old localStorage data on mount (cleanup from previous buggy implementation)
  useEffect(() => {
    if (documentId) {
      // Clean up old localStorage entries that might be causing issues
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('embedpdf:annotations:') || key?.startsWith('embedpdf:comments:')) {
          keysToRemove.push(key);
        }
      }
      if (keysToRemove.length > 0) {
        console.log('[Comments] Cleaning up old localStorage entries:', keysToRemove);
        keysToRemove.forEach((key) => localStorage.removeItem(key));
      }
    }
  }, [documentId]);

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

      // Create a TEXT annotation
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
      setActiveCommentId(id);
      setPendingAnnotationId(null);
      setCommentModeActive(false);
    },
    [annotationProvides]
  );

  const addReply = useCallback(
    (parentCommentId: string, content: string, author?: string) => {
      if (!annotationProvides) {
        console.warn('Annotation plugin not available');
        return;
      }

      // Use ref to get current comments and avoid stale closure
      const parentComment = commentsRef.current.find((c) => c.id === parentCommentId);
      if (!parentComment) {
        console.warn('Parent comment not found:', parentCommentId);
        return;
      }

      const id = generateAnnotationId();
      const now = new Date();

      // Create a reply TEXT annotation with IRT (In-Reply-To)
      const replyAnnotation: PdfTextAnnoObject = {
        type: PdfAnnotationSubtype.TEXT,
        id,
        pageIndex: parentComment.pageIndex,
        // Reply annotations are positioned at the same location as parent
        rect: {
          origin: { x: parentComment.position.x, y: parentComment.position.y },
          size: { width: COMMENT_ICON_SIZE, height: COMMENT_ICON_SIZE },
        },
        contents: content,
        author: author || undefined,
        icon: PdfAnnotationIcon.Comment,
        created: now,
        modified: now,
        color: '#FFEB3B',
        opacity: 1,
        // IRT fields for threading
        inReplyToId: parentCommentId,
        replyType: PdfAnnotationReplyType.Reply,
      };

      annotationProvides.createAnnotation(parentComment.pageIndex, replyAnnotation);
    },
    [annotationProvides]
  );

  const updateComment = useCallback(
    (id: string, updates: Partial<Pick<CommentData, 'content' | 'author'>>) => {
      if (!annotationProvides) {
        console.warn('Annotation plugin not available');
        return;
      }

      // Use ref to get current comments and avoid stale closure
      const comment = commentsRef.current.find((c) => c.id === id);
      if (!comment) {
        console.warn('Comment not found:', id);
        return;
      }

      const patch: Partial<PdfTextAnnoObject> = {
        modified: new Date(),
      };

      if (updates.content !== undefined) {
        patch.contents = updates.content;
      }
      if (updates.author !== undefined) {
        patch.author = updates.author || undefined;
      }

      console.log('[Comments] Updating annotation:', {
        id,
        pageIndex: comment.pageIndex,
        patch,
        currentContent: comment.content,
        newContent: updates.content,
      });

      annotationProvides.updateAnnotation(comment.pageIndex, id, patch);
    },
    [annotationProvides]
  );

  const deleteComment = useCallback(
    (id: string) => {
      if (!annotationProvides) {
        console.warn('Annotation plugin not available');
        return;
      }

      // Use ref to get current comments and avoid stale closure
      const currentComments = commentsRef.current;
      const comment = currentComments.find((c) => c.id === id);
      if (!comment) {
        console.warn('Comment not found:', id);
        return;
      }

      // Collect all replies to delete (they'll be orphaned)
      const idsToDelete: Array<{ id: string; pageIndex: number }> = [
        { id, pageIndex: comment.pageIndex },
      ];

      function collectReplies(parentId: string) {
        for (const c of currentComments) {
          if (c.parentCommentId === parentId) {
            idsToDelete.push({ id: c.id, pageIndex: c.pageIndex });
            collectReplies(c.id);
          }
        }
      }

      collectReplies(id);

      // Delete all annotations
      for (const item of idsToDelete) {
        annotationProvides.deleteAnnotation(item.pageIndex, item.id);
      }

      setActiveCommentId(null);
    },
    [annotationProvides]
  );

  const setActiveComment = useCallback((id: string | null) => {
    setActiveCommentId(id);
  }, []);

  const getCommentsForPage = useCallback(
    (pageIndex: number) => {
      // Return top-level comments only (no parentCommentId)
      return comments.filter(
        (comment) =>
          comment.pageIndex === pageIndex && !comment.parentCommentId
      );
    },
    [comments]
  );

  const getReplies = useCallback(
    (commentId: string) => {
      return comments
        .filter((comment) => comment.parentCommentId === commentId)
        .sort((a, b) => a.created - b.created);
    },
    [comments]
  );

  const value: CommentsContextValue = useMemo(
    () => ({
      comments,
      activeCommentId,
      commentModeActive,
      pendingAnnotationId,
      addComment,
      addReply,
      updateComment,
      deleteComment,
      setActiveComment,
      setCommentModeActive,
      setPendingAnnotationId,
      getCommentsForPage,
      getReplies,
    }),
    [
      comments,
      activeCommentId,
      commentModeActive,
      pendingAnnotationId,
      addComment,
      addReply,
      updateComment,
      deleteComment,
      setActiveComment,
      getCommentsForPage,
      getReplies,
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
