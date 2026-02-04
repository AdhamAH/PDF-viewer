import { useState, useRef, useEffect } from 'react';
import { useDocumentState } from '@embedpdf/core/react';
import { useScroll } from '@embedpdf/plugin-scroll/react';
import { useComments } from './CommentsContext';
import type { CommentData } from './types';

interface CommentsSidebarProps {
  documentId: string;
}

interface CommentCardProps {
  comment: CommentData;
  onReply: (commentId: string) => void;
  onEdit: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  onClick: () => void;
  isActive: boolean;
  depth?: number;
}

function CommentCard({
  comment,
  onReply,
  onEdit,
  onDelete,
  onClick,
  isActive,
  depth = 0,
}: CommentCardProps) {
  const { getReplies } = useComments();
  const replies = getReplies(comment.id);
  const date = new Date(comment.created);
  const formattedDate = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="comment-thread" style={{ marginLeft: depth > 0 ? 16 : 0 }}>
      <div
        className={`comment-card ${isActive ? 'comment-card-active' : ''}`}
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
      >
        <div className="comment-header">
          <span className="comment-author">{comment.author || 'Anonymous'}</span>
          <span className="comment-date">{formattedDate}</span>
        </div>
        <div className="comment-content">{comment.content}</div>
        <div className="comment-actions">
          <button type="button" onClick={(e) => { e.stopPropagation(); onReply(comment.id); }}>
            Reply
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(comment.id); }}>
            Edit
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(comment.id); }}>
            Delete
          </button>
        </div>
      </div>
      {replies.map((reply) => (
        <CommentCard
          key={reply.id}
          comment={reply}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
          onClick={onClick}
          isActive={false}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

interface CommentFormProps {
  onSubmit: (content: string, author: string) => void;
  onCancel: () => void;
  initialContent?: string;
  initialAuthor?: string;
  placeholder?: string;
  submitLabel?: string;
}

function CommentForm({
  onSubmit,
  onCancel,
  initialContent = '',
  initialAuthor = '',
  placeholder = 'Write a comment...',
  submitLabel = 'Add Comment',
}: CommentFormProps) {
  const [content, setContent] = useState(initialContent);
  const [author, setAuthor] = useState(initialAuthor);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onSubmit(content.trim(), author.trim());
      setContent('');
    }
  };

  return (
    <form className="comment-form" onSubmit={handleSubmit}>
      <input
        type="text"
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
        placeholder="Your name (optional)"
        className="comment-author-input"
      />
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="comment-textarea"
      />
      <div className="comment-form-actions">
        <button type="submit" disabled={!content.trim()}>
          {submitLabel}
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function CommentsSidebar({ documentId }: CommentsSidebarProps) {
  const documentState = useDocumentState(documentId);
  const scroll = useScroll(documentId);
  const {
    comments,
    activeCommentId,
    pendingAnnotationId,
    addComment,
    addReply,
    updateComment,
    deleteComment,
    setActiveComment,
    getCommentsForPage,
    setPendingAnnotationId,
  } = useComments();

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null);
  const [showNewCommentForm, setShowNewCommentForm] = useState(false);
  const [newCommentPageIndex, setNewCommentPageIndex] = useState<number>(0);

  const pages = documentState?.document?.pages ?? [];
  const totalPages = pages.length;

  // Show form when there's a pending annotation
  useEffect(() => {
    if (pendingAnnotationId) {
      setShowNewCommentForm(true);
    }
  }, [pendingAnnotationId]);

  // Group comments by page
  const commentsByPage: Map<number, CommentData[]> = new Map();
  for (let i = 0; i < totalPages; i++) {
    const pageComments = getCommentsForPage(i);
    if (pageComments.length > 0) {
      commentsByPage.set(i, pageComments);
    }
  }

  const handleCommentClick = (comment: CommentData) => {
    setActiveComment(comment.id);
    // Scroll to the comment's page
    if (scroll?.provides) {
      scroll.provides.scrollToPage({ pageNumber: comment.pageIndex + 1, behavior: 'smooth' });
    }
  };

  const handleReply = (commentId: string) => {
    setReplyToCommentId(commentId);
    setEditingCommentId(null);
  };

  const handleEdit = (commentId: string) => {
    setEditingCommentId(commentId);
    setReplyToCommentId(null);
  };

  const handleDelete = (commentId: string) => {
    deleteComment(commentId);
  };

  const handleAddReply = (content: string, author: string) => {
    if (!replyToCommentId) return;

    addReply(replyToCommentId, content, author || undefined);
    setReplyToCommentId(null);
  };

  const handleEditSubmit = (content: string, author: string) => {
    if (!editingCommentId) return;
    updateComment(editingCommentId, { content, author: author || undefined });
    setEditingCommentId(null);
  };

  const handleNewComment = (content: string, author: string) => {
    // Calculate offset position so sidebar-added comments don't overlap
    // Count existing comments on this page to offset the new one
    const existingOnPage = getCommentsForPage(newCommentPageIndex);
    const offset = existingOnPage.length * 30; // 30px offset per existing comment
    const x = 20 + offset;
    const y = 20 + offset;

    addComment(newCommentPageIndex, { x, y }, content, author || undefined);
    setShowNewCommentForm(false);
    setPendingAnnotationId(null);
  };

  const editingComment = editingCommentId
    ? comments.find((c) => c.id === editingCommentId)
    : null;

  return (
    <div className="comments-sidebar">
      <div className="comments-header">
        <h3>Comments</h3>
        <button
          type="button"
          className="add-comment-btn"
          onClick={() => {
            setShowNewCommentForm(true);
            setNewCommentPageIndex(0);
          }}
        >
          + Add
        </button>
      </div>

      {showNewCommentForm && (
        <div className="comment-form-wrapper">
          <div className="comment-form-header">
            {pendingAnnotationId ? (
              <span>Comment on annotation</span>
            ) : (
              <label>
                Page:{' '}
                <select
                  value={newCommentPageIndex}
                  onChange={(e) => setNewCommentPageIndex(Number(e.target.value))}
                >
                  {Array.from({ length: totalPages }, (_, i) => (
                    <option key={i} value={i}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <CommentForm
            onSubmit={handleNewComment}
            onCancel={() => {
              setShowNewCommentForm(false);
              setPendingAnnotationId(null);
            }}
            placeholder={
              pendingAnnotationId
                ? 'Add a comment to this annotation...'
                : 'Write a comment...'
            }
          />
        </div>
      )}

      {replyToCommentId && (
        <div className="comment-form-wrapper">
          <div className="comment-form-header">Reply to comment</div>
          <CommentForm
            onSubmit={handleAddReply}
            onCancel={() => setReplyToCommentId(null)}
            placeholder="Write a reply..."
            submitLabel="Reply"
          />
        </div>
      )}

      {editingComment && (
        <div className="comment-form-wrapper">
          <div className="comment-form-header">Edit comment</div>
          <CommentForm
            onSubmit={handleEditSubmit}
            onCancel={() => setEditingCommentId(null)}
            initialContent={editingComment.content}
            initialAuthor={editingComment.author || ''}
            submitLabel="Save"
          />
        </div>
      )}

      <div className="comments-list">
        {commentsByPage.size === 0 ? (
          <div className="comments-empty">
            No comments yet. Click &quot;+ Add&quot; to create one.
          </div>
        ) : (
          Array.from(commentsByPage.entries())
            .sort(([a], [b]) => a - b)
            .map(([pageIndex, pageComments]) => (
              <div key={pageIndex} className="comments-page-group">
                <div className="comments-page-header">Page {pageIndex + 1}</div>
                {pageComments.map((comment) => (
                  <CommentCard
                    key={comment.id}
                    comment={comment}
                    onReply={handleReply}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onClick={() => handleCommentClick(comment)}
                    isActive={activeCommentId === comment.id}
                  />
                ))}
              </div>
            ))
        )}
      </div>
    </div>
  );
}
