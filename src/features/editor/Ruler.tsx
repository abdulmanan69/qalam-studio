import { useEffect, useRef, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import { RULER_SIZE, rulerStep } from './zoom';

interface RulerProps {
  axis: 'x' | 'y';
  zoom: number;
  viewportRef: RefObject<HTMLDivElement | null>;
  artboardRef: RefObject<HTMLDivElement | null>;
  /** Changes when the viewport scrolls, to redraw. */
  tick: number;
  /** Click on the ruler: add a guide at this artboard position. */
  onAddGuide: (position: number) => void;
}

function cssVar(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/** Horizontal (x) or vertical (y) ruler in artboard pixels. Click to add a guide. */
export function Ruler({ axis, zoom, viewportRef, artboardRef, tick, onAddGuide }: RulerProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const viewport = viewportRef.current;
    const artboard = artboardRef.current;
    if (!canvas || !viewport || !artboard) return;
    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const length = axis === 'x' ? rect.width : rect.height;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);
      const artRect = artboard.getBoundingClientRect();
      // Screen position of artboard coordinate 0 along this ruler.
      const origin = axis === 'x' ? artRect.left - rect.left : artRect.top - rect.top;
      const step = rulerStep(zoom);
      const minor = step / 5;
      const first = Math.floor(-origin / zoom / minor) * minor;
      const last = (length - origin) / zoom;
      ctx.strokeStyle = cssVar('--muted-foreground', '#667');
      ctx.fillStyle = ctx.strokeStyle;
      ctx.font = '9px system-ui, sans-serif';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let v = first; v <= last; v += minor) {
        const rounded = Math.round(v / minor) * minor;
        const pos = Math.round(origin + rounded * zoom) + 0.5;
        const major = Math.abs(rounded / step - Math.round(rounded / step)) < 1e-6;
        const size = major ? RULER_SIZE * 0.6 : RULER_SIZE * 0.25;
        if (axis === 'x') {
          ctx.moveTo(pos, RULER_SIZE);
          ctx.lineTo(pos, RULER_SIZE - size);
          if (major) ctx.fillText(String(Math.round(rounded)), pos + 2, 9);
        } else {
          ctx.moveTo(RULER_SIZE, pos);
          ctx.lineTo(RULER_SIZE - size, pos);
          if (major) {
            ctx.save();
            ctx.translate(9, pos - 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText(String(Math.round(rounded)), 0, 0);
            ctx.restore();
          }
        }
      }
      ctx.stroke();
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(viewport);
    return () => {
      observer.disconnect();
    };
  }, [axis, zoom, viewportRef, artboardRef, tick]);

  const onClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const artboard = artboardRef.current;
    if (!artboard) return;
    const artRect = artboard.getBoundingClientRect();
    const position =
      axis === 'x' ? (event.clientX - artRect.left) / zoom : (event.clientY - artRect.top) / zoom;
    onAddGuide(Math.round(position));
  };

  return (
    <canvas
      ref={canvasRef}
      className={
        axis === 'x'
          ? 'h-5 w-full cursor-col-resize border-b border-border bg-card'
          : 'h-full w-5 cursor-row-resize border-e border-border bg-card'
      }
      title={axis === 'x' ? t('editor.guides.addVertical') : t('editor.guides.addHorizontal')}
      aria-hidden
      onClick={onClick}
    />
  );
}
