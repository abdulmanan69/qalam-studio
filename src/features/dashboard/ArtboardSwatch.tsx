import type { Artboard } from '@/features/projects/schema';
import { cn } from '@/lib/utils';

interface ArtboardSwatchProps {
  artboard: Artboard | undefined;
  size?: number;
  className?: string;
}

/** Tiny proportional preview of an artboard (size + background color). */
export function ArtboardSwatch({ artboard, size = 28, className }: ArtboardSwatchProps) {
  const w = artboard?.width ?? 1;
  const h = artboard?.height ?? 1;
  const scale = (size - 4) / Math.max(w, h);
  return (
    <span
      className={cn(
        'checkerboard inline-flex shrink-0 items-center justify-center rounded-sm border border-border',
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span
        className="block border border-black/10"
        style={{
          width: Math.max(3, w * scale),
          height: Math.max(3, h * scale),
          background: artboard?.background ?? '#ffffff',
        }}
      />
    </span>
  );
}
