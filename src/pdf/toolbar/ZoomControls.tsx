import { useZoom, ZoomMode } from '@embedpdf/plugin-zoom/react';
import { Minus, Plus, Maximize2, ScanSearch } from 'lucide-react';
import type { ZoomCapability } from '../types';

type ZoomControlsProps = {
  documentId: string;
};

function getZoomLabel(state: { currentZoomLevel?: number; zoomLevel?: number }): string {
  const level = state.currentZoomLevel ?? state.zoomLevel ?? 1;
  const percent = Math.round(level * 100);
  return `${percent}%`;
}

export default function ZoomControls({ documentId }: ZoomControlsProps) {
  // Type assertion through unknown to handle varying library API shapes
  const zoom = useZoom(documentId) as unknown as ZoomCapability | undefined;
  const state = zoom?.state ?? {};
  const provides = zoom?.provides ?? {};
  const isMarqueeZoomActive = Boolean(state.isMarqueeZoomActive);

  // React 19 compiler handles memoization
  const zoomLabel = getZoomLabel(state);

  const handleZoomIn = () => {
    if (provides.zoomIn) {
      provides.zoomIn();
      return;
    }
    if (provides.requestZoom) {
      const next = (state.currentZoomLevel ?? 1) + 0.1;
      provides.requestZoom(next);
    }
  };

  const handleZoomOut = () => {
    if (provides.zoomOut) {
      provides.zoomOut();
      return;
    }
    if (provides.requestZoom) {
      const next = Math.max(0.1, (state.currentZoomLevel ?? 1) - 0.1);
      provides.requestZoom(next);
    }
  };

  const handleReset = () => {
    if (provides.requestZoom) {
      provides.requestZoom(1);
      return;
    }
    if (provides.setZoomMode) {
      // ZoomMode.Custom may not exist in all versions - use numeric fallback
      provides.setZoomMode((ZoomMode as Record<string, unknown>).Custom ?? 0);
    }
  };

  const handleFitPage = () => {
    if (provides.requestZoom) {
      provides.requestZoom(ZoomMode.FitPage);
      return;
    }
    if (provides.setZoomMode) {
      provides.setZoomMode(ZoomMode.FitPage);
    }
  };

  return (
    <>
      <button type="button" className="toolbar-btn" onClick={handleZoomOut} data-tooltip="Zoom Out">
        <Minus size={18} />
      </button>
      <button type="button" className="toolbar-btn" onClick={handleZoomIn} data-tooltip="Zoom In">
        <Plus size={18} />
      </button>
      <button type="button" className="toolbar-btn toolbar-btn-text" onClick={handleReset} data-tooltip="Reset Zoom">
        {zoomLabel}
      </button>
      <button type="button" className="toolbar-btn" onClick={handleFitPage} data-tooltip="Fit Page">
        <Maximize2 size={18} />
      </button>
      <button
        type="button"
        className={`toolbar-btn ${isMarqueeZoomActive ? 'active' : ''}`}
        onClick={() => provides.toggleMarqueeZoom?.()}
        disabled={!provides.toggleMarqueeZoom}
        data-tooltip="Area Zoom"
      >
        <ScanSearch size={18} />
      </button>
    </>
  );
}
