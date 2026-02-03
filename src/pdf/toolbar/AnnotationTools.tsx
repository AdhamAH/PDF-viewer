import { useAnnotation } from '@embedpdf/plugin-annotation/react';
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

  return (
    <>
      <button
        type="button"
        className={activeTool === HIGHLIGHT_TOOL ? 'active' : ''}
        onClick={() => setTool(HIGHLIGHT_TOOL)}
      >
        Highlight
      </button>
      <button
        type="button"
        className={activeTool === UNDERLINE_TOOL ? 'active' : ''}
        onClick={() => setTool(UNDERLINE_TOOL)}
      >
        Underline
      </button>
      <button type="button" onClick={clearTool}>
        Cancel
      </button>
    </>
  );
}
