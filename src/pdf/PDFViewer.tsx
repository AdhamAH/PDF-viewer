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
import { SelectionLayer } from '@embedpdf/plugin-selection/react';
import { AnnotationLayer } from '@embedpdf/plugin-annotation/react';
import { SearchLayer } from '@embedpdf/plugin-search/react';
import { MarqueeZoom } from '@embedpdf/plugin-zoom/react';

import { createViewerPlugins, DEFAULT_DOCUMENT_URL } from './plugins';
import Toolbar from './toolbar/Toolbar';
import ThumbnailSidebar from './ThumbnailSidebar';
import { useAnnotationPersistence } from './hooks/useAnnotationPersistence';
import type {
  DocumentManagerCapability,
  DocumentContentPayload,
  DocumentState,
} from './types';
import { isValidPdfUrl } from './types';

const getStorageKey = (documentState: DocumentState | undefined, documentId: string) => {
  const url = documentState?.source?.url ?? documentState?.url;
  if (url) {
    return `embedpdf:annotations:${url}`;
  }
  const name = documentState?.name;
  return `embedpdf:annotations:${name ?? documentId}`;
};

function DocumentViewport({
  documentId,
  documentState,
}: {
  documentId: string;
  documentState?: DocumentState;
}) {
  const storageKey = getStorageKey(documentState, documentId);
  useAnnotationPersistence(documentId, storageKey);

  return (
    <GlobalPointerProvider documentId={documentId}>
      <Viewport documentId={documentId}>
        <Scroller
          documentId={documentId}
          renderPage={({ width, height, pageIndex }) => (
            <div className="page" style={{ width, height }}>
              <PagePointerProvider documentId={documentId} pageIndex={pageIndex}>
                <RenderLayer documentId={documentId} pageIndex={pageIndex} />
                <SelectionLayer documentId={documentId} pageIndex={pageIndex} />
                <AnnotationLayer
                  documentId={documentId}
                  pageIndex={pageIndex}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                  }}
                />
                <MarqueeZoom documentId={documentId} pageIndex={pageIndex} />
                <SearchLayer documentId={documentId} pageIndex={pageIndex} />
              </PagePointerProvider>
            </div>
          )}
        />
      </Viewport>
    </GlobalPointerProvider>
  );
}

function ViewerShell({ activeDocumentId }: { activeDocumentId: string | null }) {
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

      <div className="viewer-wrapper">
        {activeDocumentId && <ThumbnailSidebar documentId={activeDocumentId} />}
        <div className="viewer-container">
          {activeDocumentId ? (
            <DocumentContent documentId={activeDocumentId}>
              {(payload) => {
                const { isLoaded, isLoading, isError, error, documentState } =
                  payload as DocumentContentPayload;

                if (isLoading) {
                  return <div className="viewer-status">Loading document...</div>;
                }
                if (isError || error) {
                  return <div className="viewer-status">Failed to load document.</div>;
                }
                if (!isLoaded) {
                  return <div className="viewer-status">Preparing pages...</div>;
                }
                return (
                  <DocumentViewport
                    documentId={activeDocumentId}
                    documentState={documentState}
                  />
                );
              }}
            </DocumentContent>
          ) : (
            <div className="viewer-status">No document open.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PDFViewer() {
  const { engine, isLoading } = usePdfiumEngine();
  // Plugin creation is intentionally not memoized - React 19 compiler handles this
  const plugins = createViewerPlugins(DEFAULT_DOCUMENT_URL);

  if (isLoading) {
    return <div className="viewer-status">Loading PDF engine...</div>;
  }

  if (!engine) {
    return <div className="viewer-status">PDF engine unavailable.</div>;
  }

  return (
    <EmbedPDF engine={engine} plugins={plugins}>
      {({ activeDocumentId }) => <ViewerShell activeDocumentId={activeDocumentId} />}
    </EmbedPDF>
  );
}
