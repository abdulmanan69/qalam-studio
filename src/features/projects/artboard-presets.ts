import { ARTBOARD_PRESET_IDS, MAX_ARTBOARD_SIZE, MIN_ARTBOARD_SIZE, type ArtboardPresetId } from './schema';

export type ArtboardPresetGroup = 'print' | 'social' | 'screen' | 'custom';

export interface ArtboardPreset {
  id: ArtboardPresetId;
  group: ArtboardPresetGroup;
  /** Size in CSS pixels (96 DPI). Print exports scale by the chosen DPI. */
  width: number;
  height: number;
}

/**
 * Built-in artboard sizes. Print sizes are expressed at 96 DPI so they map
 * 1:1 to screen pixels; A4 = 210 × 297 mm ≈ 794 × 1123 px.
 */
export const ARTBOARD_PRESETS: readonly ArtboardPreset[] = [
  { id: 'a4-portrait', group: 'print', width: 794, height: 1123 },
  { id: 'a4-landscape', group: 'print', width: 1123, height: 794 },
  { id: 'a3-portrait', group: 'print', width: 1123, height: 1587 },
  { id: 'square-post', group: 'social', width: 1080, height: 1080 },
  { id: 'story', group: 'social', width: 1080, height: 1920 },
  { id: 'banner', group: 'social', width: 1500, height: 500 },
  { id: 'hd-landscape', group: 'screen', width: 1920, height: 1080 },
  { id: 'custom', group: 'custom', width: 1000, height: 1000 },
];

export const DEFAULT_PRESET_ID: ArtboardPresetId = 'a4-portrait';

export function getPreset(id: ArtboardPresetId): ArtboardPreset {
  const preset = ARTBOARD_PRESETS.find((p) => p.id === id);
  if (!preset) throw new Error(`Unknown artboard preset: ${id}`);
  return preset;
}

export function isPresetId(value: string): value is ArtboardPresetId {
  return (ARTBOARD_PRESET_IDS as readonly string[]).includes(value);
}

/** Parse a user-typed artboard dimension; `null` if not an integer within limits. */
export function parseDimension(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const n = Number.parseInt(value, 10);
  return n >= MIN_ARTBOARD_SIZE && n <= MAX_ARTBOARD_SIZE ? n : null;
}

/** Find the preset matching exact dimensions, or "custom". */
export function matchPreset(width: number, height: number): ArtboardPresetId {
  return (
    ARTBOARD_PRESETS.find((p) => p.id !== 'custom' && p.width === width && p.height === height)?.id ??
    'custom'
  );
}
