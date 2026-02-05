import { useRef } from 'react';
import { useFullscreen } from '@embedpdf/plugin-fullscreen/react';
import { Maximize, Minimize } from 'lucide-react';
import type { FullscreenCapability } from '../types';

type FullscreenButtonProps = {
  documentId: string;
};

export default function FullscreenButton({ documentId }: FullscreenButtonProps) {
  // Type assertion through unknown to handle varying library API shapes
  const fullscreen = useFullscreen() as unknown as FullscreenCapability | undefined;
  const provides = fullscreen?.provides ?? {};
  const state = fullscreen?.state ?? {};
  const isFullscreen = state.isFullscreen ?? state.isActive ?? false;
  const fallbackTargetRef = useRef<HTMLDivElement | null>(null);

  const enterNativeFullscreen = async () => {
    const target = fallbackTargetRef.current ?? document.documentElement;
    if (!document.fullscreenElement && target.requestFullscreen) {
      await target.requestFullscreen();
    }
  };

  const exitNativeFullscreen = async () => {
    if (document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen();
    }
  };

  const toggleFullscreen = async () => {
    if (provides.toggleFullscreen) {
      provides.toggleFullscreen();
      return;
    }
    if (provides.enterFullscreen && provides.exitFullscreen) {
      if (isFullscreen) {
        provides.exitFullscreen();
      } else {
        provides.enterFullscreen();
      }
      return;
    }

    if (isFullscreen) {
      await exitNativeFullscreen();
    } else {
      await enterNativeFullscreen();
    }
  };

  return (
    <>
      <div ref={fallbackTargetRef} style={{ display: 'none' }} />
      <button
        type="button"
        className="toolbar-btn"
        onClick={toggleFullscreen}
        data-tooltip={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
      >
        {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
      </button>
    </>
  );
}
