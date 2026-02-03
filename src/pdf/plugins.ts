import { createPluginRegistration } from '@embedpdf/core';
import { DocumentManagerPluginPackage } from '@embedpdf/plugin-document-manager/react';
import { ViewportPluginPackage } from '@embedpdf/plugin-viewport/react';
import { ScrollPluginPackage } from '@embedpdf/plugin-scroll/react';
import { RenderPluginPackage } from '@embedpdf/plugin-render/react';
import { InteractionManagerPluginPackage } from '@embedpdf/plugin-interaction-manager/react';
import { PanPluginPackage } from '@embedpdf/plugin-pan/react';
import { SelectionPluginPackage } from '@embedpdf/plugin-selection/react';
import { HistoryPluginPackage } from '@embedpdf/plugin-history/react';
import { AnnotationPluginPackage } from '@embedpdf/plugin-annotation/react';
import { ZoomMode, ZoomPluginPackage } from '@embedpdf/plugin-zoom/react';
import { SearchPluginPackage } from '@embedpdf/plugin-search/react';
import { FullscreenPluginPackage } from '@embedpdf/plugin-fullscreen/react';
import { ExportPluginPackage } from '@embedpdf/plugin-export/react';

export const DEFAULT_DOCUMENT_URL = 'https://snippet.embedpdf.com/ebook.pdf';
export const DEFAULT_DOCUMENT_ID = 'sample-doc';

export function createViewerPlugins(initialUrl: string = DEFAULT_DOCUMENT_URL) {
  return [
    createPluginRegistration(DocumentManagerPluginPackage, {
      initialDocuments: [
        {
          documentId: DEFAULT_DOCUMENT_ID,
          name: 'Sample PDF',
          url: initialUrl,
        },
      ],
    }),
    createPluginRegistration(ViewportPluginPackage),
    createPluginRegistration(ScrollPluginPackage),
    createPluginRegistration(RenderPluginPackage),

    createPluginRegistration(InteractionManagerPluginPackage),
    // Pan plugin controls click-drag behavior: 'never' means text selection is default
    // Use 'mobile' to enable pan on touch devices, 'always' to always pan
    createPluginRegistration(PanPluginPackage, {
      defaultMode: 'never',
    }),
    createPluginRegistration(SelectionPluginPackage),
    createPluginRegistration(HistoryPluginPackage),
    createPluginRegistration(AnnotationPluginPackage),
    createPluginRegistration(ZoomPluginPackage, {
      defaultZoomLevel: ZoomMode.FitPage,
    }),
    createPluginRegistration(SearchPluginPackage),
    createPluginRegistration(FullscreenPluginPackage),
    createPluginRegistration(ExportPluginPackage),
  ];
}
