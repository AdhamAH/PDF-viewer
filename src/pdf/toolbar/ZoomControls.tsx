import { useZoom, ZoomMode } from '@embedpdf/plugin-zoom/react';
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
      <button type="button" onClick={handleZoomOut}>
        -
      </button>
      <button type="button" onClick={handleZoomIn}>
        +
      </button>
      <button type="button" onClick={handleReset}>
        {zoomLabel}
      </button>
      <button type="button" onClick={handleFitPage}>
        Fit Page
      </button>
      <button
        type="button"
        className={isMarqueeZoomActive ? 'active' : ''}
        onClick={() => provides.toggleMarqueeZoom?.()}
        disabled={!provides.toggleMarqueeZoom}
      >
        Area Zoom
      </button>
    </>
  );
}
