import { useComments } from './CommentsContext';

interface CommentLayerProps {
  documentId: string;
  pageIndex: number;
  pageWidth: number;
  pageHeight: number;
}

export default function CommentLayer({
  pageIndex,
  pageWidth,
  pageHeight,
}: CommentLayerProps) {
  const {
    getCommentsForPage,
    activeCommentId,
    commentModeActive,
    setActiveComment,
    addComment,
    setCommentModeActive,
  } = useComments();

  const pageComments = getCommentsForPage(pageIndex);

  const handleLayerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!commentModeActive) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    addComment({
      pageIndex,
      position: { x, y },
      content: 'New comment',
    });

    setCommentModeActive(false);
  };

  const handlePinClick = (e: React.MouseEvent, commentId: string) => {
    e.stopPropagation();
    setActiveComment(commentId);
  };

  return (
    <div
      className={`comment-layer ${commentModeActive ? 'comment-mode-active' : ''}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: commentModeActive ? 'auto' : 'none',
      }}
      onClick={handleLayerClick}
    >
      {pageComments.map((comment) => {
        const left = (comment.position.x / 100) * pageWidth;
        const top = (comment.position.y / 100) * pageHeight;

        return (
          <div
            key={comment.id}
            className={`comment-pin ${activeCommentId === comment.id ? 'comment-pin-active' : ''}`}
            style={{
              position: 'absolute',
              left,
              top,
              pointerEvents: 'auto',
            }}
            onClick={(e) => handlePinClick(e, comment.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setActiveComment(comment.id);
              }
            }}
            title={comment.content}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
          </div>
        );
      })}
    </div>
  );
}
