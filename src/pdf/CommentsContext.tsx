import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { CommentData } from './types';

interface CommentsContextValue {
  comments: CommentData[];
  activeCommentId: string | null;
  commentModeActive: boolean;
  pendingAnnotationId: string | null;
  addComment: (comment: Omit<CommentData, 'id' | 'created'>) => void;
  updateComment: (id: string, updates: Partial<Pick<CommentData, 'content' | 'author'>>) => void;
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
  storageKey: string;
}

function generateId(): string {
  return `comment-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function CommentsProvider({ children, storageKey }: CommentsProviderProps) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [commentModeActive, setCommentModeActive] = useState(false);
  const [pendingAnnotationId, setPendingAnnotationId] = useState<string | null>(null);
  const loadedKeyRef = useRef<string | null>(null);

  // Load comments from localStorage
  useEffect(() => {
    if (loadedKeyRef.current === storageKey) {
      return;
    }

    loadedKeyRef.current = storageKey;

    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as CommentData[];
        if (Array.isArray(parsed)) {
          setComments(parsed);
        }
      } catch (error) {
        console.warn('Failed to parse stored comments:', error);
        localStorage.removeItem(storageKey);
      }
    } else {
      setComments([]);
    }
  }, [storageKey]);

  // Save comments to localStorage
  useEffect(() => {
    if (loadedKeyRef.current !== storageKey) {
      return;
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify(comments));
    } catch (error) {
      console.error('Failed to save comments to localStorage:', error);
    }
  }, [comments, storageKey]);

  const addComment = useCallback((commentData: Omit<CommentData, 'id' | 'created'>) => {
    const newComment: CommentData = {
      ...commentData,
      id: generateId(),
      created: Date.now(),
    };
    setComments((prev) => [...prev, newComment]);
    setActiveCommentId(newComment.id);
    setPendingAnnotationId(null);
  }, []);

  const updateComment = useCallback(
    (id: string, updates: Partial<Pick<CommentData, 'content' | 'author'>>) => {
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === id ? { ...comment, ...updates, updated: Date.now() } : comment
        )
      );
    },
    []
  );

  const deleteComment = useCallback((id: string) => {
    setComments((prev) => {
      // Also delete all replies to this comment
      const idsToDelete = new Set<string>([id]);

      function collectReplies(parentId: string) {
        for (const comment of prev) {
          if (comment.parentCommentId === parentId) {
            idsToDelete.add(comment.id);
            collectReplies(comment.id);
          }
        }
      }

      collectReplies(id);
      return prev.filter((comment) => !idsToDelete.has(comment.id));
    });
    setActiveCommentId(null);
  }, []);

  const setActiveComment = useCallback((id: string | null) => {
    setActiveCommentId(id);
  }, []);

  const getCommentsForPage = useCallback(
    (pageIndex: number) => {
      return comments.filter(
        (comment) => comment.pageIndex === pageIndex && !comment.parentCommentId
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

  const value: CommentsContextValue = {
    comments,
    activeCommentId,
    commentModeActive,
    pendingAnnotationId,
    addComment,
    updateComment,
    deleteComment,
    setActiveComment,
    setCommentModeActive,
    setPendingAnnotationId,
    getCommentsForPage,
    getReplies,
  };

  return <CommentsContext.Provider value={value}>{children}</CommentsContext.Provider>;
}

export function useComments(): CommentsContextValue {
  const context = useContext(CommentsContext);
  if (!context) {
    throw new Error('useComments must be used within a CommentsProvider');
  }
  return context;
}
