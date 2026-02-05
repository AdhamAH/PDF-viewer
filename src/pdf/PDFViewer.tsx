import { useState } from 'react';
import { EmbedPDF } from '@embedpdf/core/react';
import { usePdfiumEngine } from '@embedpdf/engines/react';
import {
  DocumentContent,
  useDocumentManagerCapability,
} from '@embedpdf/plugin-document-manager/react';
import { Viewport } from '@embedpdf/plugin-viewport/react';
import { Scroller } from '@embedpdf/plugin-scroll/react';
import { RenderLayer } from '@embedpdf/plugin-render/react';
import {
  GlobalPointerProvider,
  PagePointerProvider,
} from '@embedpdf/plugin-interaction-manager/react';
import { SelectionLayer, useSelectionCapability } from '@embedpdf/plugin-selection/react';
import { AnnotationLayer, useAnnotation } from '@embedpdf/plugin-annotation/react';
import { SearchLayer } from '@embedpdf/plugin-search/react';
import { MarqueeZoom, ZoomGestureWrapper } from '@embedpdf/plugin-zoom/react';
import { Copy } from 'lucide-react';

import { viewerPlugins, DEFAULT_DOCUMENT_URL } from './plugins';
import Toolbar from './toolbar/Toolbar';
import ThumbnailSidebar from './ThumbnailSidebar';
import CommentsSidebar from './CommentsSidebar';
import { CommentsProvider } from './CommentsContext';
import type {
  DocumentManagerCapability,
  DocumentContentPayload,
} from './types';
import { isValidPdfUrl } from './types';

// Selection menu component for text selection (copy action)
function SelectionMenu({ documentId }: { documentId: string }) {
  const selectionCapability = useSelectionCapability();

  const handleCopy = () => {
    const selection = selectionCapability?.provides?.forDocument?.(documentId);
    selection?.copyToClipboard?.();
  };

  return (
    <div className="selection-menu">
      <button
        type="button"
        onClick={handleCopy}
        className="selection-menu-btn"
        data-tooltip="Copy"
      >
        <Copy size={16} />
      </button>
    </div>
  );
}


function DocumentViewport({
  documentId,
}: {
  documentId: string;
}) {
  // Annotations are persisted via autoCommit (default: true) in the annotation plugin.
  // When user clicks "Save", ExportControls.saveAsCopy() exports PDF with annotations.
  // No localStorage needed - annotations live in the PDF engine state during session.

  return (
    <GlobalPointerProvider documentId={documentId}>
      <Viewport documentId={documentId}>
        <ZoomGestureWrapper documentId={documentId} enablePinch={true} enableWheel={true}>
          <Scroller
            documentId={documentId}
            renderPage={({ width, height, pageIndex }) => (
              <div className="page" style={{ width, height }}>
                <PagePointerProvider documentId={documentId} pageIndex={pageIndex}>
                  <RenderLayer documentId={documentId} pageIndex={pageIndex} />
                  <SearchLayer documentId={documentId} pageIndex={pageIndex} />
                  <SelectionLayer
                    documentId={documentId}
                    pageIndex={pageIndex}
                    selectionMenu={() => <SelectionMenu documentId={documentId} />}
                  />
                  <AnnotationLayer
                    documentId={documentId}
                    pageIndex={pageIndex}
                    selectionOutlineColor="#2563eb"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                    }}
                  />
                  <MarqueeZoom documentId={documentId} pageIndex={pageIndex} />
                </PagePointerProvider>
              </div>
            )}
          />
        </ZoomGestureWrapper>
      </Viewport>
    </GlobalPointerProvider>
  );
}

function ViewerContent({ documentId }: { documentId: string }) {
  return (
    <div className="viewer-wrapper">
      <ThumbnailSidebar documentId={documentId} />
      <div className="viewer-container">
        <DocumentViewport documentId={documentId} />
      </div>
      <CommentsSidebar documentId={documentId} />
    </div>
  );
}

function ViewerShellInner({ activeDocumentId }: { activeDocumentId: string | null }) {
  const [urlInput, setUrlInput] = useState(DEFAULT_DOCUMENT_URL);
  const [urlError, setUrlError] = useState<string | null>(null);
  const docManager = useDocumentManagerCapability() as DocumentManagerCapability | undefined;
  const provides = docManager?.provides ?? {};

  const openUrl = () => {
    if (!urlInput) {
      setUrlError('Please enter a URL');
      return;
    }

    if (!isValidPdfUrl(urlInput)) {
      setUrlError('Invalid URL. Only HTTP/HTTPS URLs are allowed.');
      return;
    }

    setUrlError(null);

    if (provides.openDocumentUrl) {
      provides.openDocumentUrl({ url: urlInput });
    } else if (provides.openDocument) {
      provides.openDocument({ source: { url: urlInput } });
    }
  };

  const openFile = () => {
    if (provides.openFileDialog) {
      provides.openFileDialog();
    }
  };

  return (
    <div className="viewer-shell">
      <div className="source-switcher">
        <input
          type="text"
          value={urlInput}
          onChange={(event) => {
            setUrlInput(event.target.value);
            setUrlError(null);
          }}
          placeholder="Paste a PDF URL"
          aria-invalid={urlError ? 'true' : undefined}
        />
        <button type="button" onClick={openUrl}>
          Load
        </button>
        <button type="button" onClick={openFile}>
          Open file
        </button>
        {urlError && <span className="url-error">{urlError}</span>}
      </div>

      <Toolbar documentId={activeDocumentId} />

      {activeDocumentId ? (
        <DocumentContent documentId={activeDocumentId}>
          {(payload) => {
            const { isLoaded, isLoading, isError, error } =
              payload as DocumentContentPayload;

            if (isLoading) {
              return (
                <div className="viewer-wrapper">
                  <div className="viewer-container">
                    <div className="viewer-status">Loading document...</div>
                  </div>
                </div>
              );
            }
            if (isError || error) {
              return (
                <div className="viewer-wrapper">
                  <div className="viewer-container">
                    <div className="viewer-status">Failed to load document.</div>
                  </div>
                </div>
              );
            }
            if (!isLoaded) {
              return (
                <div className="viewer-wrapper">
                  <div className="viewer-container">
                    <div className="viewer-status">Preparing pages...</div>
                  </div>
                </div>
              );
            }
            return <ViewerContent documentId={activeDocumentId} />;
          }}
        </DocumentContent>
      ) : (
        <div className="viewer-wrapper">
          <div className="viewer-container">
            <div className="viewer-status">No document open.</div>
          </div>
        </div>
      )}
    </div>
  );
}

function ViewerShell({ activeDocumentId }: { activeDocumentId: string | null }) {
  // Comments are TEXT annotations managed by the annotation plugin.
  // Persistence: autoCommit saves to engine state; saveAsCopy() exports PDF with annotations.
  return (
    <CommentsProvider documentId={activeDocumentId}>
      <ViewerShellInner activeDocumentId={activeDocumentId} />
    </CommentsProvider>
  );
}

export default function PDFViewer() {
  const { engine, isLoading } = usePdfiumEngine();

  if (isLoading) {
    return <div className="viewer-status">Loading PDF engine...</div>;
  }

  if (!engine) {
    return <div className="viewer-status">PDF engine unavailable.</div>;
  }

  return (
    <EmbedPDF engine={engine} plugins={viewerPlugins}>
      {({ activeDocumentId, pluginsReady }) =>
        activeDocumentId && pluginsReady ? (
          <ViewerShell activeDocumentId={activeDocumentId} />
        ) : (
          <div className="viewer-status">Initializing viewer...</div>
        )
      }
    </EmbedPDF>
  );
}
