import AnnotationTools from './AnnotationTools';
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
        <ZoomControls documentId={documentId} />
      </div>
      <div className="toolbar-divider" />
      <div className="toolbar-group">
        <SearchBar documentId={documentId} />
      </div>
      <div className="toolbar-divider" />
      <div className="toolbar-group">
        <AnnotationTools documentId={documentId} />
      </div>
      <div className="toolbar-divider" />
      <div className="toolbar-group">
        <HistoryControls documentId={documentId} />
      </div>
      <div className="toolbar-divider" />
      <div className="toolbar-group">
        <PanButton documentId={documentId} />
        <FullscreenButton documentId={documentId} />
      </div>
      <div className="toolbar-divider" />
      <div className="toolbar-group">
        <ExportControls documentId={documentId} />
      </div>
    </div>
  );
}
