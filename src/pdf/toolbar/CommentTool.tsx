import { useComments } from '../CommentsContext';

export default function CommentTool() {
  const { commentModeActive, setCommentModeActive } = useComments();

  const handleClick = () => {
    setCommentModeActive(!commentModeActive);
  };

  return (
    <button
      type="button"
      className={commentModeActive ? 'active' : ''}
      onClick={handleClick}
      title={commentModeActive ? 'Click on page to add comment' : 'Enable comment mode'}
    >
      {commentModeActive ? 'Comment (ON)' : 'Comment'}
    </button>
  );
}
