import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useTranslation } from 'react-i18next';

import type { Artboard, SvgAsset, TextRun } from '@/features/projects/schema';
import type { TextLayout } from '@/features/shaping/types';
import { isEditableTarget } from '@/lib/hotkeys';
import { cn } from '@/lib/utils';

import { ArtboardCanvas } from './canvas/ArtboardCanvas';
import type { StageChange } from './canvas/artboard-stage';
import { useEditorStore } from './editor-store';
import { computeFitZoom, maxZoomForArtboard, VIEWPORT_PADDING } from './zoom';

interface CanvasViewportProps {
  artboard: Artboard;
  assets: readonly SvgAsset[];
  texts: readonly TextRun[];
  layouts: ReadonlyMap<string, TextLayout>;
  onChange: (change: StageChange) => void;
}

/**
 * Scrollable, zoomable view of one artboard. Owns zoom (fit, Ctrl/⌘ + wheel
 * at the cursor, pinch) and panning (hand tool, Space, middle mouse); the
 * Fabric.js canvas inside handles selection and transforms.
 */
export function CanvasViewport({ artboard, assets, texts, layouts, onChange }: CanvasViewportProps) {
  const { t } = useTranslation();
  const viewportRef = useRef<HTMLDivElement>(null);
  const zoom = useEditorStore((s) => s.zoom);
  const tool = useEditorStore((s) => s.tool);
  const fitRequest = useEditorStore((s) => s.fitRequest);
  const selectedId = useEditorStore((s) => s.selectedId);
  const setZoom = useEditorStore((s) => s.setZoom);
  const setMaxZoom = useEditorStore((s) => s.setMaxZoom);
  const select = useEditorStore((s) => s.select);

  const [spaceHeld, setSpaceHeld] = useState(false);
  const [panning, setPanning] = useState(false);
  const panStart = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  /** Zoom anchor: keep this artboard point under this screen point after re-render. */
  const anchor = useRef<{ artX: number; artY: number; screenX: number; screenY: number } | null>(null);

  const handActive = tool === 'hand' || spaceHeld;
  const { width: artW, height: artH } = artboard;

  // Keep the canvas within browser size limits for this artboard.
  useEffect(() => {
    setMaxZoom(maxZoomForArtboard({ width: artW, height: artH }, window.devicePixelRatio));
  }, [artW, artH, setMaxZoom]);

  // Fit artboard to viewport when requested (on open, "fit" command) or when its size changes.
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    setZoom(
      computeFitZoom({ width: artW, height: artH }, { width: el.clientWidth, height: el.clientHeight }),
    );
  }, [fitRequest, artW, artH, setZoom]);

  // Restore the zoom anchor after the content has been resized.
  useLayoutEffect(() => {
    const el = viewportRef.current;
    const a = anchor.current;
    if (!el || !a) return;
    anchor.current = null;
    el.scrollLeft = VIEWPORT_PADDING + a.artX * zoom - a.screenX;
    el.scrollTop = VIEWPORT_PADDING + a.artY * zoom - a.screenY;
  }, [zoom]);

  // Ctrl/⌘ + wheel (and trackpad pinch, which browsers report as ctrl+wheel) zooms at the cursor.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const current = useEditorStore.getState().zoom;
      const rect = el.getBoundingClientRect();
      const screenX = event.clientX - rect.left;
      const screenY = event.clientY - rect.top;
      anchor.current = {
        artX: (el.scrollLeft + screenX - VIEWPORT_PADDING) / current,
        artY: (el.scrollTop + screenY - VIEWPORT_PADDING) / current,
        screenX,
        screenY,
      };
      setZoom(current * Math.exp(-event.deltaY * 0.0025));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, [setZoom]);

  // Hold Space for a temporary hand tool.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !isEditableTarget(e.target)) {
        e.preventDefault();
        setSpaceHeld(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceHeld(false);
    };
    const blur = () => {
      setSpaceHeld(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const el = viewportRef.current;
    if (!el) return;
    if (handActive || event.button === 1) {
      event.preventDefault();
      el.setPointerCapture(event.pointerId);
      panStart.current = { x: event.clientX, y: event.clientY, left: el.scrollLeft, top: el.scrollTop };
      setPanning(true);
      return;
    }
    // Clicks on the canvas are handled by Fabric; clicks on the pasteboard deselect.
    const onCanvas = event.target instanceof Element && event.target.closest('[data-canvas-root]');
    if (event.button === 0 && !onCanvas) select(null);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const el = viewportRef.current;
    const start = panStart.current;
    if (!el || !start) return;
    el.scrollLeft = start.left - (event.clientX - start.x);
    el.scrollTop = start.top - (event.clientY - start.y);
  };

  const endPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!panStart.current) return;
    panStart.current = null;
    setPanning(false);
    viewportRef.current?.releasePointerCapture(event.pointerId);
  };

  const scaledW = artW * zoom;
  const scaledH = artH * zoom;
  const empty = assets.length === 0 && texts.length === 0;

  return (
    <div
      ref={viewportRef}
      role="region"
      aria-label={t('editor.canvas')}
      className={cn(
        'checkerboard relative min-h-0 min-w-0 flex-1 overflow-auto',
        handActive && (panning ? 'cursor-grabbing' : 'cursor-grab'),
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPan}
      onPointerCancel={endPan}
    >
      <div
        className="flex min-h-full min-w-full items-center justify-center"
        style={{ width: scaledW + VIEWPORT_PADDING * 2, height: scaledH + VIEWPORT_PADDING * 2 }}
      >
        <div
          className={cn(
            'relative shrink-0 shadow-popover',
            handActive && '[&_[data-canvas-root]]:pointer-events-none',
          )}
          style={{ width: scaledW, height: scaledH, background: artboard.background }}
          role="group"
          aria-label={t('editor.artboardLabel', { name: artboard.name, width: artW, height: artH })}
          data-testid="artboard"
        >
          <ArtboardCanvas
            artboard={artboard}
            assets={assets}
            texts={texts}
            layouts={layouts}
            zoom={zoom}
            interactive={!handActive}
            selectedId={selectedId}
            onSelect={select}
            onChange={onChange}
          />
          {empty && (
            <p className="pointer-events-none absolute inset-0 flex items-center justify-center p-4 text-center text-xs text-black/55">
              {t('editor.emptyArtboard')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
