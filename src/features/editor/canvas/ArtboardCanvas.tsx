import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Artboard, SvgAsset, TextRun } from '@/features/projects/schema';
import type { TextLayout } from '@/features/shaping/types';

import { ArtboardStage, type StageChange, type StageTextLayer } from './artboard-stage';

function isCanvasSupported(): boolean {
  try {
    return document.createElement('canvas').getContext('2d') !== null;
  } catch {
    return false;
  }
}

interface ArtboardCanvasProps {
  artboard: Artboard;
  assets: readonly SvgAsset[];
  texts: readonly TextRun[];
  layouts: ReadonlyMap<string, TextLayout>;
  zoom: number;
  interactive: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (change: StageChange) => void;
}

/** React wrapper around the Fabric.js artboard stage. */
export function ArtboardCanvas({
  artboard,
  assets,
  texts,
  layouts,
  zoom,
  interactive,
  selectedId,
  onSelect,
  onChange,
}: ArtboardCanvasProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<ArtboardStage | null>(null);
  const [supported] = useState(isCanvasSupported);
  const callbacks = useRef({ onSelect, onChange });

  useEffect(() => {
    callbacks.current = { onSelect, onChange };
  });

  // Fabric wraps the <canvas> in its own elements, so the canvas is created
  // imperatively inside a container React never re-renders.
  useEffect(() => {
    const container = containerRef.current;
    if (!supported || !container) return;
    const element = document.createElement('canvas');
    container.appendChild(element);
    const stage = new ArtboardStage(element, {
      onSelect: (id) => {
        callbacks.current.onSelect(id);
      },
      onChange: (change) => {
        callbacks.current.onChange(change);
      },
    });
    stageRef.current = stage;
    return () => {
      stage.dispose();
      stageRef.current = null;
      container.replaceChildren();
    };
  }, [supported]);

  useEffect(() => {
    stageRef.current?.setViewport(artboard.width, artboard.height, zoom);
  }, [artboard.width, artboard.height, zoom]);

  useEffect(() => {
    stageRef.current?.setBackground(artboard.background);
  }, [artboard.background]);

  useEffect(() => {
    stageRef.current?.setInteractive(interactive);
  }, [interactive]);

  useEffect(() => {
    const textLayers: StageTextLayer[] = texts.map((run) => ({ run, layout: layouts.get(run.id) }));
    stageRef.current?.sync(assets, textLayers);
    stageRef.current?.select(selectedId);
  }, [assets, texts, layouts, selectedId]);

  if (!supported) {
    return (
      <p className="absolute inset-0 flex items-center justify-center p-4 text-center text-xs text-black/60">
        {t('editor.canvasUnsupported')}
      </p>
    );
  }
  return <div ref={containerRef} className="absolute inset-0" data-canvas-root="" />;
}
