import { describe, expect, it } from 'vitest';

import { ARTBOARD_PRESETS, getPreset, isPresetId, matchPreset, parseDimension } from './artboard-presets';
import { ARTBOARD_PRESET_IDS } from './schema';

describe('artboard presets', () => {
  it('defines every preset id exactly once', () => {
    expect(ARTBOARD_PRESETS.map((p) => p.id).sort()).toEqual([...ARTBOARD_PRESET_IDS].sort());
  });

  it('uses A4 at 96 DPI', () => {
    expect(getPreset('a4-portrait')).toMatchObject({ width: 794, height: 1123 });
  });

  it('matches dimensions back to presets', () => {
    expect(matchPreset(1123, 794)).toBe('a4-landscape');
    expect(matchPreset(1000, 1000)).toBe('custom');
  });

  it('validates preset ids', () => {
    expect(isPresetId('banner')).toBe(true);
    expect(isPresetId('poster')).toBe(false);
  });

  it('parses user-entered dimensions', () => {
    expect(parseDimension(' 1080 ')).toBe(1080);
    expect(parseDimension('15')).toBeNull();
    expect(parseDimension('10001')).toBeNull();
    expect(parseDimension('12.5')).toBeNull();
    expect(parseDimension('abc')).toBeNull();
  });
});
