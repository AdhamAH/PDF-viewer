import { useState, useRef, useEffect } from 'react';
import { useScroll } from '@embedpdf/plugin-scroll/react';
import { PdfAnnotationSubtype } from '@embedpdf/models';
import type { PdfAnnotationObject, PdfTextAnnoObject } from '@embedpdf/models';
import { useComments, type SidebarAnnotationEntry } from './CommentsContext';

interface CommentsSidebarProps {
  documentId: string;
}

// Get a display label for an annotation type
function getAnnotationTypeLabel(type: PdfAnnotationSubtype): string {
  switch (type) {
    case PdfAnnotationSubtype.TEXT:
      return 'Note';
    case PdfAnnotationSubtype.HIGHLIGHT:
      return 'Highlight';
    case PdfAnnotationSubtype.UNDERLINE:
      return 'Underline';
    case PdfAnnotationSubtype.STRIKEOUT:
      return 'Strikeout';
    case PdfAnnotationSubtype.SQUIGGLY:
      return 'Squiggly';
    case PdfAnnotationSubtype.INK:
      return 'Drawing';
    case PdfAnnotationSubtype.FREETEXT:
      return 'Text Box';
    case PdfAnnotationSubtype.SQUARE:
      return 'Rectangle';
    case PdfAnnotationSubtype.CIRCLE:
      return 'Ellipse';
    case PdfAnnotationSubtype.LINE:
      return 'Line';
    case PdfAnnotationSubtype.POLYGON:
      return 'Polygon';
    case PdfAnnotationSubtype.POLYLINE:
      return 'Polyline';
    case PdfAnnotationSubtype.STAMP:
      return 'Stamp';
    default:
      return 'Annotation';
  }
}

interface AnnotationCardProps {
  entry: SidebarAnnotationEntry;
  isSelected: boolean;
  onSelect: () => void;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function AnnotationCard({
  entry,
  isSelected,
  onSelect,
  onReply,
  onEdit,
  onDelete,
}: AnnotationCardProps) {
  const annotation = entry.annotation.object as PdfAnnotationObject;
  const typeLabel = getAnnotationTypeLabel(annotation.type);
  const contents = annotation.contents || '';
  const author = annotation.author || 'Anonymous';
  const created = annotation.created;
  const formattedDate = created
    ? new Date(created).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <div className="comment-thread">
      <div
        className={`comment-card ${isSelected ? 'comment-card-active' : ''}`}
        onClick={onSelect}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect();
          }
        }}
      >
        <div className="comment-header">
          <span className="comment-type">{typeLabel}</span>
          <span className="comment-author">{author}</span>
          <span className="comment-date">{formattedDate}</span>
        </div>
        {contents && <div className="comment-content">{contents}</div>}
        <div className="comment-actions">
          <button type="button" onClick={(e) => { e.stopPropagation(); onReply(); }}>
            Reply
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
            Edit
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
            Delete
          </button>
        </div>
      </div>

      {/* Render replies */}
      {entry.replies.map((reply) => {
        const replyObj = reply.object as PdfTextAnnoObject;
        const replyAuthor = replyObj.author || 'Anonymous';
        const replyDate = replyObj.created
          ? new Date(replyObj.created).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '';

        return (
          <div key={replyObj.id} className="comment-card reply" style={{ marginLeft: 16 }}>
            <div className="comment-header">
              <span className="comment-author">{replyAuthor}</span>
              <span className="comment-date">{replyDate}</span>
            </div>
            <div className="comment-content">{replyObj.contents || ''}</div>
          </div>
        );
      })}
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
  submitLabel = 'Add',
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
  const scroll = useScroll(documentId);
  const {
    annotationsByPage,
    selectedAnnotationId,
    addComment,
    addReply,
    updateAnnotationContents,
    deleteAnnotation,
    selectAnnotation,
  } = useComments();

  const [replyToEntry, setReplyToEntry] = useState<SidebarAnnotationEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<SidebarAnnotationEntry | null>(null);
  const [showNewCommentForm, setShowNewCommentForm] = useState(false);
  const [newCommentPageIndex, setNewCommentPageIndex] = useState<number>(0);

  // Get sorted page indices
  const pageIndices = Object.keys(annotationsByPage)
    .map(Number)
    .sort((a, b) => a - b);

  const totalPages = Math.max(...pageIndices, 0) + 1;

  const handleAnnotationClick = (entry: SidebarAnnotationEntry) => {
    const annotation = entry.annotation.object as PdfAnnotationObject;
    selectAnnotation(entry.page, annotation.id);
    // Scroll to the annotation's page
    if (scroll?.provides) {
      scroll.provides.scrollToPage({ pageNumber: entry.page + 1, behavior: 'smooth' });
    }
  };

  const handleReply = (entry: SidebarAnnotationEntry) => {
    setReplyToEntry(entry);
    setEditingEntry(null);
    setShowNewCommentForm(false);
  };

  const handleEdit = (entry: SidebarAnnotationEntry) => {
    setEditingEntry(entry);
    setReplyToEntry(null);
    setShowNewCommentForm(false);
  };

  const handleDelete = (entry: SidebarAnnotationEntry) => {
    const annotation = entry.annotation.object as PdfAnnotationObject;
    deleteAnnotation(entry.page, annotation.id);
  };

  const handleAddReply = (content: string, author: string) => {
    if (!replyToEntry) return;
    const parentAnnotation = replyToEntry.annotation.object as PdfAnnotationObject;
    addReply(parentAnnotation.id, replyToEntry.page, content, author || undefined);
    setReplyToEntry(null);
  };

  const handleEditSubmit = (content: string, _author: string) => {
    if (!editingEntry) return;
    const annotation = editingEntry.annotation.object as PdfAnnotationObject;
    updateAnnotationContents(editingEntry.page, annotation.id, content);
    setEditingEntry(null);
  };

  const handleNewComment = (content: string, author: string) => {
    // Position new comment at top-left with offset based on existing comments
    const existingOnPage = annotationsByPage[newCommentPageIndex] || [];
    const offset = existingOnPage.length * 30;
    const x = 20 + offset;
    const y = 20 + offset;

    addComment(newCommentPageIndex, { x, y }, content, author || undefined);
    setShowNewCommentForm(false);
  };

  const editingAnnotation = editingEntry?.annotation.object as PdfAnnotationObject | undefined;

  return (
    <div className="comments-sidebar">
      <div className="comments-header">
        <h3>Comments</h3>
        <button
          type="button"
          className="add-comment-btn"
          onClick={() => {
            setShowNewCommentForm(true);
            setReplyToEntry(null);
            setEditingEntry(null);
            setNewCommentPageIndex(0);
          }}
        >
          + Add
        </button>
      </div>

      {showNewCommentForm && (
        <div className="comment-form-wrapper">
          <div className="comment-form-header">
            <label>
              Page:{' '}
              <select
                value={newCommentPageIndex}
                onChange={(e) => setNewCommentPageIndex(Number(e.target.value))}
              >
                {Array.from({ length: totalPages || 1 }, (_, i) => (
                  <option key={i} value={i}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <CommentForm
            onSubmit={handleNewComment}
            onCancel={() => setShowNewCommentForm(false)}
            placeholder="Write a note..."
          />
        </div>
      )}

      {replyToEntry && (
        <div className="comment-form-wrapper">
          <div className="comment-form-header">Reply to {getAnnotationTypeLabel((replyToEntry.annotation.object as PdfAnnotationObject).type)}</div>
          <CommentForm
            onSubmit={handleAddReply}
            onCancel={() => setReplyToEntry(null)}
            placeholder="Write a reply..."
            submitLabel="Reply"
          />
        </div>
      )}

      {editingEntry && editingAnnotation && (
        <div className="comment-form-wrapper">
          <div className="comment-form-header">Edit {getAnnotationTypeLabel(editingAnnotation.type)}</div>
          <CommentForm
            onSubmit={handleEditSubmit}
            onCancel={() => setEditingEntry(null)}
            initialContent={editingAnnotation.contents || ''}
            submitLabel="Save"
          />
        </div>
      )}

      <div className="comments-list">
        {pageIndices.length === 0 ? (
          <div className="comments-empty">
            No annotations yet. Use the annotation tools to add highlights, notes, or drawings.
          </div>
        ) : (
          pageIndices.map((pageIndex) => {
            const entries = annotationsByPage[pageIndex] || [];
            if (entries.length === 0) return null;

            return (
              <div key={pageIndex} className="comments-page-group">
                <div className="comments-page-header">Page {pageIndex + 1}</div>
                {entries.map((entry) => {
                  const annotation = entry.annotation.object as PdfAnnotationObject;
                  return (
                    <AnnotationCard
                      key={annotation.id}
                      entry={entry}
                      isSelected={selectedAnnotationId === annotation.id}
                      onSelect={() => handleAnnotationClick(entry)}
                      onReply={() => handleReply(entry)}
                      onEdit={() => handleEdit(entry)}
                      onDelete={() => handleDelete(entry)}
                    />
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
