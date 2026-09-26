import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useTranslation } from 'react-i18next';

import type { Guide } from '@/features/projects/schema';
import { isEditableTarget } from '@/lib/hotkeys';
import { cn } from '@/lib/utils';

import { ArtboardCanvas } from './canvas/ArtboardCanvas';
import type { StageCallbacks, StageScene } from './canvas/artboard-stage';
import { useEditorStore } from './editor-store';
import { Ruler } from './Ruler';
import { computeFitZoom, maxZoomForArtboard, RULER_SIZE, VIEWPORT_PADDING } from './zoom';

interface CanvasViewportProps {
  scene: StageScene;
  callbacks: StageCallbacks;
  onAddGuide: (axis: Guide['axis'], position: number) => void;
}

/**
 * Scrollable, zoomable view of one artboard. Owns zoom (fit, Ctrl/⌘ + wheel
 * at the cursor, two-finger pinch), panning (hand tool, Space, middle mouse)
 * and the rulers; the Fabric.js canvas inside handles selection and transforms.
 */
export function CanvasViewport({ scene, callbacks, onAddGuide }: CanvasViewportProps) {
  const { t } = useTranslation();
  const viewportRef = useRef<HTMLDivElement>(null);
  const artboardRef = useRef<HTMLDivElement>(null);
  const zoom = useEditorStore((s) => s.zoom);
  const tool = useEditorStore((s) => s.tool);
  const fitRequest = useEditorStore((s) => s.fitRequest);
  const rulers = useEditorStore((s) => s.view.rulers);
  const setZoom = useEditorStore((s) => s.setZoom);
  const setMaxZoom = useEditorStore((s) => s.setMaxZoom);
  const select = useEditorStore((s) => s.select);

  const [spaceHeld, setSpaceHeld] = useState(false);
  const [panning, setPanning] = useState(false);
  const [scrollTick, setScrollTick] = useState(0);
  const panStart = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  /** Zoom anchor: keep this artboard point under this screen point after re-render. */
  const anchor = useRef<{ artX: number; artY: number; screenX: number; screenY: number } | null>(null);

  const { artboard } = scene;
  const handActive = tool === 'hand' || spaceHeld;
  const { width: artW, height: artH } = artboard;

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

  // Ctrl/⌘ + wheel (and trackpad pinch, reported as ctrl+wheel) zooms at the cursor;
  // two-finger touch pinch zooms at the fingers' midpoint.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const zoomAt = (clientX: number, clientY: number, next: number) => {
      const current = useEditorStore.getState().zoom;
      const rect = el.getBoundingClientRect();
      const screenX = clientX - rect.left;
      const screenY = clientY - rect.top;
      anchor.current = {
        artX: (el.scrollLeft + screenX - VIEWPORT_PADDING) / current,
        artY: (el.scrollTop + screenY - VIEWPORT_PADDING) / current,
        screenX,
        screenY,
      };
      setZoom(next);
    };
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      zoomAt(event.clientX, event.clientY, useEditorStore.getState().zoom * Math.exp(-event.deltaY * 0.0025));
    };
    let pinch: { distance: number; zoom: number } | null = null;
    const touchInfo = (touches: TouchList) => {
      const a = touches[0];
      const b = touches[1];
      if (!a || !b) return null;
      return {
        distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        x: (a.clientX + b.clientX) / 2,
        y: (a.clientY + b.clientY) / 2,
      };
    };
    const onTouchStart = (event: TouchEvent) => {
      const info = touchInfo(event.touches);
      if (info && event.touches.length === 2) {
        pinch = { distance: Math.max(1, info.distance), zoom: useEditorStore.getState().zoom };
      }
    };
    const onTouchMove = (event: TouchEvent) => {
      const info = touchInfo(event.touches);
      if (!pinch || !info || event.touches.length !== 2) return;
      event.preventDefault();
      zoomAt(info.x, info.y, pinch.zoom * (info.distance / pinch.distance));
    };
    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length < 2) pinch = null;
    };
    const onScroll = () => {
      setScrollTick((n) => n + 1);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
    el.addEventListener('touchend', onTouchEnd, { capture: true });
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart, { capture: true });
      el.removeEventListener('touchmove', onTouchMove, { capture: true });
      el.removeEventListener('touchend', onTouchEnd, { capture: true });
      el.removeEventListener('scroll', onScroll);
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
  const empty = scene.layers.length === 0;

  return (
    // The canvas is a drawing surface with an x axis to the right, also in right-to-left UIs.
    <div
      dir="ltr"
      className="relative grid min-h-0 min-w-0 flex-1"
      style={{
        gridTemplateColumns: rulers ? `${String(RULER_SIZE)}px minmax(0,1fr)` : 'minmax(0,1fr)',
        gridTemplateRows: rulers ? `${String(RULER_SIZE)}px minmax(0,1fr)` : 'minmax(0,1fr)',
      }}
    >
      {rulers && (
        <>
          <div className="border-e border-b border-border bg-card" aria-hidden />
          <Ruler
            axis="x"
            zoom={zoom}
            viewportRef={viewportRef}
            artboardRef={artboardRef}
            tick={scrollTick}
            onAddGuide={(position) => {
              onAddGuide('x', position);
            }}
          />
          <Ruler
            axis="y"
            zoom={zoom}
            viewportRef={viewportRef}
            artboardRef={artboardRef}
            tick={scrollTick}
            onAddGuide={(position) => {
              onAddGuide('y', position);
            }}
          />
        </>
      )}
      <div
        ref={viewportRef}
        role="region"
        aria-label={t('editor.canvas')}
        className={cn(
          'checkerboard relative min-h-0 min-w-0 overflow-auto',
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
            ref={artboardRef}
            className={cn(
              'relative shrink-0 shadow-popover',
              handActive && '[&_[data-canvas-root]]:pointer-events-none',
            )}
            style={{ width: scaledW, height: scaledH, background: artboard.background }}
            role="group"
            aria-label={t('editor.artboardLabel', { name: artboard.name, width: artW, height: artH })}
            data-testid="artboard"
          >
            <ArtboardCanvas scene={scene} zoom={zoom} callbacks={callbacks} />
            {empty && (
              <p className="pointer-events-none absolute inset-0 flex items-center justify-center p-4 text-center text-xs text-black/55">
                {t('editor.emptyArtboard')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
