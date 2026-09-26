import type {
  FontMetrics,
  LayoutOptions,
  LineLayout,
  PositionedGlyph,
  ShapedGlyph,
  ShapeOptions,
  TextLayout,
} from './types';

/** What the layout needs from a loaded font. Implemented by the engine; faked in tests. */
export interface LayoutFont {
  metrics(): FontMetrics;
  shape(text: string, options: ShapeOptions): ShapedGlyph[];
  glyphPath(glyphId: number, x: number, y: number, fontSize: number): string;
}

interface LineSlice {
  text: string;
  start: number;
}

/** Split on CR, LF or CRLF, keeping each line's UTF-16 offset in the full text. */
export function splitLines(text: string): LineSlice[] {
  const lines: LineSlice[] = [];
  const pattern = /\r\n|\n|\r/g;
  let start = 0;
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    lines.push({ text: text.slice(start, match.index), start });
    start = match.index + match[0].length;
  }
  lines.push({ text: text.slice(start), start });
  return lines;
}

function alignOffset(options: LayoutOptions, boxWidth: number, lineWidth: number): number {
  const free = boxWidth - lineWidth;
  const align = options.align ?? 'start';
  if (align === 'center') return free / 2;
  const rtl = (options.direction ?? 'rtl') === 'rtl';
  // "start" hugs the right edge for right-to-left scripts.
  return (align === 'start') === rtl ? free : 0;
}

/**
 * Shape and place multi-line text. Pure function: same input, same output.
 *
 * The layout box starts at (0, 0) top-left. The first baseline sits one
 * ascent below the top; each further line is `lineAdvance` lower, where
 * lineAdvance = (ascent + descent) × lineHeight.
 */
export function layoutText(font: LayoutFont, text: string, options: LayoutOptions): TextLayout {
  const metrics = font.metrics();
  const scale = options.fontSize / metrics.unitsPerEm;
  const ascent = metrics.ascender * scale;
  const descent = -metrics.descender * scale;
  const lineAdvance = (ascent + descent) * (options.lineHeight ?? 1);

  const shapedLines = splitLines(text).map((slice) => {
    const glyphs = font.shape(slice.text, options);
    const width = glyphs.reduce((sum, g) => sum + g.xAdvance, 0) * scale;
    return { slice, glyphs, width };
  });

  const width = Math.max(0, ...shapedLines.map((l) => l.width));
  const height = ascent + descent + Math.max(0, shapedLines.length - 1) * lineAdvance;

  const lines: LineLayout[] = [];
  const glyphs: PositionedGlyph[] = [];

  shapedLines.forEach(({ slice, glyphs: shaped, width: lineWidth }, lineIndex) => {
    const baseline = ascent + lineIndex * lineAdvance;
    const x0 = alignOffset(options, width, lineWidth);
    let pen = x0;
    for (const g of shaped) {
      const x = pen + g.xOffset * scale;
      const y = baseline - g.yOffset * scale;
      glyphs.push({
        glyphId: g.glyphId,
        cluster: slice.start + g.cluster,
        line: lineIndex,
        kind: g.kind,
        x,
        y,
        advance: g.xAdvance * scale,
        path: font.glyphPath(g.glyphId, x, y, options.fontSize),
      });
      pen += g.xAdvance * scale;
    }
    lines.push({
      start: slice.start,
      end: slice.start + slice.text.length,
      x: x0,
      width: lineWidth,
      baseline,
    });
  });

  return { width, height, fontSize: options.fontSize, ascent, descent, lineAdvance, lines, glyphs };
}
