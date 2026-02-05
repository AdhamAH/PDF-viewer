import { useAnnotation } from '@embedpdf/plugin-annotation/react';
import { useEffect, useCallback } from 'react';
import { Highlighter, Underline, X, Trash2 } from 'lucide-react';
import type { AnnotationCapability, AnnotationState } from '../types';

type AnnotationToolsProps = {
  documentId: string;
};

const HIGHLIGHT_TOOL = 'highlight';
const UNDERLINE_TOOL = 'underline';

function resolveToolId(tool: unknown): string | null {
  if (!tool) {
    return null;
  }
  if (typeof tool === 'string') {
    return tool;
  }
  if (typeof tool === 'object' && 'id' in tool) {
    return (tool as { id?: string }).id ?? null;
  }
  return null;
}

function getActiveTool(state: AnnotationState): string | null {
  return (
    resolveToolId(state.activeToolId) ??
    resolveToolId(state.activeTool) ??
    resolveToolId(state.activeToolName)
  );
}

export default function AnnotationTools({ documentId }: AnnotationToolsProps) {
  // Type assertion through unknown to handle varying library API shapes
  const annotation = useAnnotation(documentId) as unknown as AnnotationCapability | undefined;
  const state: AnnotationState = annotation?.state ?? {};
  const provides = annotation?.provides ?? {};

  // React 19 compiler handles memoization
  const activeTool = getActiveTool(state);

  // Check if any annotations are selected
  const hasSelection = (state.selectedUids?.length ?? 0) > 0 || state.selectedUid != null;

  const setTool = (tool: string | null) => {
    if (provides.setActiveTool) {
      provides.setActiveTool(tool);
      return;
    }
    if (provides.setAnnotationTool) {
      provides.setAnnotationTool(tool);
      return;
    }
    if (provides.activateTool) {
      provides.activateTool(tool);
    }
  };

  const clearTool = () => {
    if (provides.clearActiveTool) {
      provides.clearActiveTool();
      return;
    }
    setTool(null);
  };

  const deleteSelected = useCallback(() => {
    if (!provides.deleteAnnotation) return;

    // Get selected annotations
    const selected = provides.getSelectedAnnotations?.() ?? [];
    if (selected.length === 0 && provides.getSelectedAnnotation) {
      const single = provides.getSelectedAnnotation();
      if (single) {
        selected.push(single);
      }
    }

    if (selected.length === 0) return;

    // Delete each selected annotation
    for (const tracked of selected) {
      const ann = tracked.object;
      const pageIndex = ann.pageIndex;
      const id = ann.id ?? ann.uid;
      if (pageIndex != null && id != null) {
        provides.deleteAnnotation(pageIndex as number, id as string);
      }
    }

    // Clear selection after deletion
    provides.deselectAnnotation?.();
  }, [provides]);

  // Keyboard shortcut: Delete/Backspace to remove selected annotation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Don't delete if user is typing in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return;
        }
        if (hasSelection) {
          e.preventDefault();
          deleteSelected();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasSelection, deleteSelected]);

  return (
    <>
      <button
        type="button"
        className={`toolbar-btn ${activeTool === HIGHLIGHT_TOOL ? 'active' : ''}`}
        onClick={() => setTool(HIGHLIGHT_TOOL)}
        data-tooltip="Highlight"
      >
        <Highlighter size={18} />
      </button>
      <button
        type="button"
        className={`toolbar-btn ${activeTool === UNDERLINE_TOOL ? 'active' : ''}`}
        onClick={() => setTool(UNDERLINE_TOOL)}
        data-tooltip="Underline"
      >
        <Underline size={18} />
      </button>
      <button type="button" className="toolbar-btn" onClick={clearTool} data-tooltip="Cancel">
        <X size={18} />
      </button>
      <button
        type="button"
        className="toolbar-btn"
        onClick={deleteSelected}
        disabled={!hasSelection}
        data-tooltip="Delete Selection"
      >
        <Trash2 size={18} />
      </button>
    </>
  );
}
