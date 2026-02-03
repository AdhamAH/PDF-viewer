import AnnotationTools from './AnnotationTools';
import CommentTool from './CommentTool';
import ExportControls from './ExportControls';
import FullscreenButton from './FullscreenButton';
import HistoryControls from './HistoryControls';
import PanButton from './PanButton';
import SearchBar from './SearchBar';
import ZoomControls from './ZoomControls';

type ToolbarProps = {
  documentId: string | null;
};

export default function Toolbar({ documentId }: ToolbarProps) {
  if (!documentId) {
    return null;
  }

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <label>Zoom</label>
        <ZoomControls documentId={documentId} />
      </div>
      <div className="toolbar-group">
        <label>Search</label>
        <SearchBar documentId={documentId} />
      </div>
      <div className="toolbar-group">
        <label>Annotations</label>
        <AnnotationTools documentId={documentId} />
      </div>
      <div className="toolbar-group">
        <label>Comments</label>
        <CommentTool />
      </div>
      <div className="toolbar-group">
        <label>History</label>
        <HistoryControls documentId={documentId} />
      </div>
      <div className="toolbar-group">
        <label>Mode</label>
        <PanButton documentId={documentId} />
      </div>
      <div className="toolbar-group">
        <label>View</label>
        <FullscreenButton documentId={documentId} />
      </div>
      <div className="toolbar-group">
        <label>Export</label>
        <ExportControls documentId={documentId} />
      </div>
    </div>
  );
}
