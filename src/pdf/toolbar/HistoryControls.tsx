import { useEffect, useState } from 'react';
import { useHistoryCapability } from '@embedpdf/plugin-history/react';
import { Undo2, Redo2 } from 'lucide-react';
import type { HistoryCapability, HistoryProvides, HistoryScope } from '../types';

type HistoryControlsProps = {
  documentId: string;
};

export default function HistoryControls({ documentId }: HistoryControlsProps) {
  // Type assertion through unknown to handle varying library API shapes
  const history = useHistoryCapability() as unknown as HistoryCapability | undefined;
  const provides: HistoryProvides | undefined = history?.provides ?? undefined;
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    if (!provides) {
      setCanUndo(false);
      setCanRedo(false);
      return;
    }

    const scope: HistoryScope | undefined = provides.forDocument
      ? provides.forDocument(documentId)
      : provides;

    const updateState = () => {
      setCanUndo(Boolean(scope?.canUndo?.()));
      setCanRedo(Boolean(scope?.canRedo?.()));
    };

    updateState();

    let unsubscribe: (() => void) | undefined;
    if (scope?.onHistoryChange) {
      const result = scope.onHistoryChange(() => updateState());
      unsubscribe = typeof result === 'function' ? result : undefined;
    } else if (provides.onHistoryChange) {
      const result = provides.onHistoryChange((event: { documentId: string }) => {
        if (!event?.documentId || event.documentId === documentId) {
          updateState();
        }
      });
      unsubscribe = typeof result === 'function' ? result : undefined;
    }

    return () => {
      unsubscribe?.();
    };
  }, [documentId, provides]);

  const handleUndo = () => {
    if (provides?.forDocument) {
      const scope = provides.forDocument(documentId);
      if (scope && 'undo' in scope && typeof scope.undo === 'function') {
        scope.undo();
        return;
      }
    }
    provides?.undo?.();
  };

  const handleRedo = () => {
    if (provides?.forDocument) {
      const scope = provides.forDocument(documentId);
      if (scope && 'redo' in scope && typeof scope.redo === 'function') {
        scope.redo();
        return;
      }
    }
    provides?.redo?.();
  };

  return (
    <>
      <button type="button" className="toolbar-btn" onClick={handleUndo} disabled={!canUndo} data-tooltip="Undo">
        <Undo2 size={18} />
      </button>
      <button type="button" className="toolbar-btn" onClick={handleRedo} disabled={!canRedo} data-tooltip="Redo">
        <Redo2 size={18} />
      </button>
    </>
  );
}
