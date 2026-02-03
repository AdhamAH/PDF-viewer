import { usePan } from '@embedpdf/plugin-pan/react';
import type { PanCapability } from '../types';

type PanButtonProps = {
  documentId: string;
};

export default function PanButton({ documentId }: PanButtonProps) {
  const pan = usePan(documentId) as unknown as PanCapability | undefined;
  const isPanning = pan?.isPanning ?? false;
  const provides = pan?.provides ?? {};

  const handleToggle = () => {
    if (provides.togglePan) {
      provides.togglePan();
    }
  };

  return (
    <button
      type="button"
      className={isPanning ? 'active' : ''}
      onClick={handleToggle}
      disabled={!provides.togglePan}
    >
      {isPanning ? 'Hand (ON)' : 'Hand (OFF)'}
    </button>
  );
}
