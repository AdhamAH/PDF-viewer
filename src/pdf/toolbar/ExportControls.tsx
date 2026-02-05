import { useExport } from '@embedpdf/plugin-export/react';
import { useAnnotation } from '@embedpdf/plugin-annotation/react';
import { useState } from 'react';
import { Download, Save } from 'lucide-react';
import type { ExportCapability } from '../types';
import type { AnnotationScope, AnnotationDocumentState } from '@embedpdf/plugin-annotation';

type ExportControlsProps = {
  documentId: string;
};

export default function ExportControls({ documentId }: ExportControlsProps) {
  const [isSaving, setIsSaving] = useState(false);

  // Type assertion through unknown to handle varying library API shapes
  const exportPlugin = useExport(documentId) as unknown as ExportCapability | undefined;
  const provides = exportPlugin?.provides ?? {};

  // Get annotation plugin to commit pending changes before export
  const annotation = useAnnotation(documentId) as
    | { provides: AnnotationScope | null; state: AnnotationDocumentState | null }
    | undefined;
  const annotationProvides = annotation?.provides ?? null;
  const annotationState = annotation?.state ?? null;

  // Helper to commit any pending annotations before saving
  const commitPendingAnnotations = async () => {
    // Log current state before commit
    console.log('[Export] Before commit - annotation state:', {
      hasPendingChanges: annotationState?.hasPendingChanges,
      totalAnnotations: annotationState ? Object.keys(annotationState.byUid).length : 0,
      annotations: annotationState
        ? Object.values(annotationState.byUid).map((t) => ({
            id: t.object.id,
            type: t.object.type,
            commitState: t.commitState,
          }))
        : [],
    });

    if (annotationProvides?.commit) {
      try {
        console.log('[Export] Calling commit()...');
        const result = await annotationProvides.commit().toPromise();
        console.log('[Export] Commit result:', result);
      } catch (error) {
        console.error('[Export] Failed to commit annotations:', error);
      }
    } else {
      console.warn('[Export] No commit method available on annotationProvides');
    }
  };

  const handleDownload = async () => {
    if (!provides.saveAsCopy) return;

    setIsSaving(true);
    try {
      // Commit any pending annotations first
      await commitPendingAnnotations();

      console.log('[Export] Calling saveAsCopy()...');
      const result = provides.saveAsCopy();
      const arrayBuffer = await result.toPromise();
      console.log('[Export] saveAsCopy() completed, PDF size:', arrayBuffer.byteLength);

      // Create a blob with correct MIME type - the library's download() doesn't set this
      const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `document-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download PDF:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCopy = async () => {
    if (!provides.saveAsCopy) return;

    setIsSaving(true);
    try {
      // Commit any pending annotations first
      await commitPendingAnnotations();

      console.log('[Export] Calling saveAsCopy() for Save Copy...');
      const result = provides.saveAsCopy();
      const arrayBuffer = await result.toPromise();
      console.log('[Export] saveAsCopy() completed, PDF size:', arrayBuffer.byteLength);

      // Create a blob and trigger browser download
      const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `document-with-annotations-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to save PDF copy:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="toolbar-btn"
        onClick={handleDownload}
        disabled={!provides.saveAsCopy || isSaving}
        data-tooltip="Download"
      >
        <Download size={18} />
      </button>
      <button
        type="button"
        className="toolbar-btn"
        onClick={handleSaveCopy}
        disabled={!provides.saveAsCopy || isSaving}
        data-tooltip={isSaving ? 'Saving...' : 'Save with Annotations'}
      >
        <Save size={18} />
      </button>
    </>
  );
}
