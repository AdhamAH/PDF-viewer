import { useEffect, useRef } from 'react';
import { useAnnotation } from '@embedpdf/plugin-annotation/react';
import type { AnyAnnotation, AnnotationCapability, AnnotationEvent } from '../types';

function getAnnotationId(annotation: AnyAnnotation | undefined): string | undefined {
  const directId = annotation?.id as string | undefined;
  const objectId = (annotation?.object as { id?: string } | undefined)?.id;
  return directId ?? objectId;
}

function upsertAnnotation(list: AnyAnnotation[], next: AnyAnnotation): AnyAnnotation[] {
  const id = getAnnotationId(next);
  if (!id) {
    return [...list, next];
  }
  const index = list.findIndex((item) => getAnnotationId(item) === id);
  if (index === -1) {
    return [...list, next];
  }
  const updated = [...list];
  updated[index] = { ...list[index], ...next };
  return updated;
}

export function useAnnotationPersistence(
  documentId: string | null,
  storageKey: string | null
): void {
  // Type assertion through unknown to handle varying library API shapes
  const annotation = useAnnotation(documentId ?? '') as unknown as AnnotationCapability | undefined;
  const annotationsRef = useRef<AnyAnnotation[]>([]);
  const loadedKeyRef = useRef<string | null>(null);

  // Combined effect for loading - fixes the race condition by handling both
  // storageKey changes and annotation provider availability in one effect
  useEffect(() => {
    // Reset when storage key changes
    if (loadedKeyRef.current !== storageKey) {
      loadedKeyRef.current = null;
      annotationsRef.current = [];
    }

    // Guard: need both storageKey and import capability
    if (!storageKey || !annotation?.provides?.importAnnotations) {
      return;
    }

    // Already loaded for this key
    if (loadedKeyRef.current === storageKey) {
      return;
    }

    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as AnyAnnotation[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Validate that annotations have the required structure
          const validAnnotations = parsed.filter(
            (ann) =>
              ann &&
              typeof ann === 'object' &&
              typeof ann.pageIndex === 'number' &&
              ann.id !== undefined
          );
          if (validAnnotations.length > 0) {
            annotationsRef.current = validAnnotations;
            try {
              annotation.provides.importAnnotations(validAnnotations);
            } catch (importError) {
              // Format incompatible - clear storage and start fresh
              localStorage.removeItem(storageKey);
              annotationsRef.current = [];
            }
          } else {
            // Clear invalid data from storage
            localStorage.removeItem(storageKey);
          }
        }
      } catch (error) {
        console.warn('Failed to parse stored annotations:', error);
        // Clear corrupted data
        localStorage.removeItem(storageKey);
      }
    }

    loadedKeyRef.current = storageKey;
  }, [annotation?.provides, storageKey]);

  // Effect for subscribing to annotation events
  useEffect(() => {
    if (!storageKey || !annotation?.provides?.onAnnotationEvent) {
      return;
    }

    const handleEvent = (event: AnnotationEvent) => {
      if (!event) {
        return;
      }
      // Ignore uncommitted changes (e.g., in-progress annotations)
      if (event.committed === false) {
        return;
      }

      let list = annotationsRef.current;

      if (event.type === 'delete') {
        const id = getAnnotationId(event.annotation);
        if (id) {
          list = list.filter((item) => getAnnotationId(item) !== id);
        }
      } else if (event.annotation) {
        list = upsertAnnotation(list, event.annotation);
      } else if (event.patch) {
        list = upsertAnnotation(list, event.patch as AnyAnnotation);
      }

      annotationsRef.current = list;

      try {
        localStorage.setItem(storageKey, JSON.stringify(list));
      } catch (error) {
        // Log storage failures - this helps users know their annotations aren't being saved
        // Common causes: localStorage full (5-10MB limit) or private browsing mode
        console.error('Failed to save annotations to localStorage:', error);
      }
    };

    const unsubscribe = annotation.provides.onAnnotationEvent(handleEvent);

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [annotation?.provides, storageKey]);
}
