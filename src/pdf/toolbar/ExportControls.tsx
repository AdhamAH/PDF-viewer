import { useExport } from '@embedpdf/plugin-export/react';
import { useAnnotation } from '@embedpdf/plugin-annotation/react';
import { useState } from 'react';
import type { ExportCapability } from '../types';
import type { AnnotationCapability } from '@embedpdf/plugin-annotation';

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
    | { provides: AnnotationCapability | null }
    | undefined;
  const annotationProvides = annotation?.provides ?? null;

  // Helper to commit any pending annotations before saving
  const commitPendingAnnotations = async () => {
    if (annotationProvides?.commit) {
      try {
        await annotationProvides.commit().toPromise();
      } catch (error) {
        console.warn('Failed to commit annotations before save:', error);
        // Continue with save even if commit fails
      }
    }
  };

  const handleDownload = async () => {
    if (!provides.saveAsCopy) return;

    setIsSaving(true);
    try {
      // Commit any pending annotations first
      await commitPendingAnnotations();

      const result = provides.saveAsCopy();
      const arrayBuffer = await result.toPromise();

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

      const result = provides.saveAsCopy();
      const arrayBuffer = await result.toPromise();

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
        onClick={handleDownload}
        disabled={!provides.saveAsCopy || isSaving}
        title="Download original PDF"
      >
        Download
      </button>
      <button
        type="button"
        onClick={handleSaveCopy}
        disabled={!provides.saveAsCopy || isSaving}
        title="Save PDF with annotations"
      >
        {isSaving ? 'Saving...' : 'Save Copy'}
      </button>
    </>
  );
}
