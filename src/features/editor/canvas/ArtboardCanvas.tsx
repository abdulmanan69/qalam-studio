import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ArtboardStage, type StageCallbacks, type StageScene } from './artboard-stage';

function isCanvasSupported(): boolean {
  try {
    return document.createElement('canvas').getContext('2d') !== null;
  } catch {
    return false;
  }
}

interface ArtboardCanvasProps {
  scene: StageScene;
  zoom: number;
  callbacks: StageCallbacks;
}

/** React wrapper around the Fabric.js artboard stage. */
export function ArtboardCanvas({ scene, zoom, callbacks }: ArtboardCanvasProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<ArtboardStage | null>(null);
  const [supported] = useState(isCanvasSupported);
  const callbacksRef = useRef(callbacks);

  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  // Fabric wraps the <canvas> in its own elements, so the canvas is created
  // imperatively inside a container React never re-renders.
  useEffect(() => {
    const container = containerRef.current;
    if (!supported || !container) return;
    const element = document.createElement('canvas');
    container.appendChild(element);
    const forward = <K extends keyof StageCallbacks>(key: K) =>
      ((...args: Parameters<StageCallbacks[K]>) => {
        (callbacksRef.current[key] as (...a: Parameters<StageCallbacks[K]>) => void)(...args);
      }) as StageCallbacks[K];
    const stage = new ArtboardStage(element, {
      selectLayers: forward('selectLayers'),
      selectUnits: forward('selectUnits'),
      drillDown: forward('drillDown'),
      exitEdit: forward('exitEdit'),
      changeLayers: forward('changeLayers'),
      changeParts: forward('changeParts'),
      addGuide: forward('addGuide'),
      moveGuide: forward('moveGuide'),
      previewKashida: forward('previewKashida'),
      commitKashida: forward('commitKashida'),
      createFrame: forward('createFrame'),
      createShape: forward('createShape'),
    });
    stageRef.current = stage;
    if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
      (window as unknown as { __qalamStage?: ArtboardStage }).__qalamStage = stage;
    }
    return () => {
      stage.dispose();
      stageRef.current = null;
      container.replaceChildren();
    };
  }, [supported]);

  useEffect(() => {
    stageRef.current?.setViewport(scene.artboard.width, scene.artboard.height, zoom);
  }, [scene.artboard.width, scene.artboard.height, zoom]);

  useEffect(() => {
    stageRef.current?.sync(scene);
  }, [scene]);

  if (!supported) {
    return (
      <p className="absolute inset-0 flex items-center justify-center p-4 text-center text-xs text-black/60">
        {t('editor.canvasUnsupported')}
      </p>
    );
  }
  return <div ref={containerRef} className="absolute inset-0" data-canvas-root="" />;
}
