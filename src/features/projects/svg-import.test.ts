import { describe, expect, it } from 'vitest';

import { baseName, DEFAULT_SVG_SIZE, MAX_SVG_BYTES, parseSvg } from './svg-import';

function parseOk(text: string) {
  const result = parseSvg(text);
  if (!result.ok) throw new Error(`Expected success, got ${result.error}`);
  return result.value;
}

describe('parseSvg', () => {
  it('reads explicit width and height', () => {
    const value = parseOk('<svg xmlns="http://www.w3.org/2000/svg" width="200px" height="100"><rect/></svg>');
    expect(value.width).toBe(200);
    expect(value.height).toBe(100);
  });

  it('falls back to the viewBox, then to a default size', () => {
    expect(parseOk('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 150"/>')).toMatchObject({
      width: 300,
      height: 150,
    });
    expect(parseOk('<svg xmlns="http://www.w3.org/2000/svg" width="100%"/>')).toMatchObject({
      width: DEFAULT_SVG_SIZE,
      height: DEFAULT_SVG_SIZE,
    });
  });

  it('removes scripts, event handlers and javascript: links', () => {
    const { svg } = parseOk(`
      <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="10" height="10" onload="alert(1)">
        <script>alert(1)</script>
        <foreignObject><div>html</div></foreignObject>
        <a href="javascript:alert(1)"><rect onclick="alert(2)" width="5" height="5"/></a>
        <use xlink:href="https://evil.example/x.svg#a"/>
        <use href="#local"/>
        <animate attributeName="href" values="javascript:alert(3)"/>
      </svg>`);
    expect(svg).not.toMatch(/script/i);
    expect(svg).not.toMatch(/onload|onclick/i);
    expect(svg).not.toMatch(/javascript:/i);
    expect(svg).not.toMatch(/foreignObject/);
    expect(svg).not.toMatch(/evil\.example/);
    expect(svg).toContain('href="#local"');
  });

  it('rejects markup that is not SVG', () => {
    expect(parseSvg('<html><body/></html>')).toEqual({ ok: false, error: 'invalidSvg' });
    expect(parseSvg('not xml at all <')).toEqual({ ok: false, error: 'invalidSvg' });
  });

  it('rejects oversized files', () => {
    const huge = `<svg xmlns="http://www.w3.org/2000/svg"><!--${'x'.repeat(MAX_SVG_BYTES)}--></svg>`;
    expect(parseSvg(huge)).toEqual({ ok: false, error: 'tooLarge' });
  });
});

describe('baseName', () => {
  it('strips the extension only', () => {
    expect(baseName('ornament.border.svg')).toBe('ornament.border');
    expect(baseName('.hidden')).toBe('.hidden');
    expect(baseName('noext')).toBe('noext');
  });
});
