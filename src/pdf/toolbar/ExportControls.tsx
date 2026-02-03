import { useExport } from '@embedpdf/plugin-export/react';
import { useState } from 'react';
import type { ExportCapability } from '../types';

type ExportControlsProps = {
  documentId: string;
};

export default function ExportControls({ documentId }: ExportControlsProps) {
  const [isSaving, setIsSaving] = useState(false);

  // Type assertion through unknown to handle varying library API shapes
  const exportPlugin = useExport(documentId) as unknown as ExportCapability | undefined;
  const provides = exportPlugin?.provides ?? {};

  const handleDownload = async () => {
    if (!provides.saveAsCopy) return;

    setIsSaving(true);
    try {
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
