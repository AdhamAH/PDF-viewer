import { useState, useEffect, useRef } from 'react';
import { useDocumentState } from '@embedpdf/core/react';
import { useScroll } from '@embedpdf/plugin-scroll/react';
import { useRenderCapability } from '@embedpdf/plugin-render/react';

type ThumbnailSidebarProps = {
  documentId: string;
};

type ThumbnailProps = {
  documentId: string;
  pageIndex: number;
  width: number;
  height: number;
  isActive: boolean;
  onClick: () => void;
};

const THUMBNAIL_WIDTH = 120;

function Thumbnail({ documentId, pageIndex, width, height, isActive, onClick }: ThumbnailProps) {
  const { provides: renderProvides } = useRenderCapability();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  // Calculate scale to fit thumbnail width
  const scale = THUMBNAIL_WIDTH / width;
  const thumbnailHeight = height * scale;

  useEffect(() => {
    if (!renderProvides) return;

    const task = renderProvides.forDocument(documentId).renderPage({
      pageIndex,
      options: {
        scaleFactor: scale,
        dpr: 1, // Lower DPR for thumbnails to save memory
      },
    });

    task.wait(
      (blob) => {
        const url = URL.createObjectURL(blob);
        setImageUrl(url);
        urlRef.current = url;
      },
      () => {
        // Ignore errors
      }
    );

    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [documentId, pageIndex, scale, renderProvides]);

  return (
    <button
      type="button"
      className={`thumbnail ${isActive ? 'thumbnail-active' : ''}`}
      onClick={onClick}
      style={{
        width: THUMBNAIL_WIDTH,
        height: thumbnailHeight,
      }}
    >
      {imageUrl && (
        <img
          src={imageUrl}
          alt={`Page ${pageIndex + 1}`}
          style={{ width: '100%', height: '100%' }}
        />
      )}
      <span className="thumbnail-label">{pageIndex + 1}</span>
    </button>
  );
}

export default function ThumbnailSidebar({ documentId }: ThumbnailSidebarProps) {
  const documentState = useDocumentState(documentId);
  const scroll = useScroll(documentId);
  const [currentPage, setCurrentPage] = useState(0);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const pages = documentState?.document?.pages ?? [];
  const totalPages = pages.length;

  // Subscribe to page changes
  useEffect(() => {
    if (!scroll?.provides) return;

    setCurrentPage(scroll.provides.getCurrentPage() - 1); // Convert to 0-indexed

    return scroll.provides.onPageChange((event) => {
      setCurrentPage(event.pageNumber - 1); // Convert to 0-indexed
    });
  }, [scroll?.provides]);

  // Scroll active thumbnail into view
  useEffect(() => {
    if (!sidebarRef.current) return;
    const activeThumb = sidebarRef.current.querySelector('.thumbnail-active');
    if (activeThumb) {
      activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentPage]);

  const handleThumbnailClick = (pageIndex: number) => {
    if (scroll?.provides) {
      scroll.provides.scrollToPage({ pageNumber: pageIndex + 1, behavior: 'smooth' });
    }
  };

  if (totalPages === 0) {
    return null;
  }

  return (
    <div className="thumbnail-sidebar" ref={sidebarRef}>
      {pages.map((page, index) => (
        <Thumbnail
          key={index}
          documentId={documentId}
          pageIndex={index}
          width={page?.size?.width ?? 612}
          height={page?.size?.height ?? 792}
          isActive={index === currentPage}
          onClick={() => handleThumbnailClick(index)}
        />
      ))}
    </div>
  );
}
