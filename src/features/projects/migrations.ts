import { DEFAULT_PARAGRAPH_STYLES, PROJECT_SCHEMA_VERSION } from './schema';

/**
 * Forward migrations for stored and imported project documents. Each step
 * upgrades exactly one schema version; `migrateProject` runs them in order.
 * Input is untrusted (IndexedDB or a .qalam file), so steps only reshape
 * data — validation happens afterwards with the zod schema.
 */

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const STEPS: Record<number, (doc: UnknownRecord) => UnknownRecord> = {
  // v1 → v2: add calligraphy text runs and artwork rotation.
  1: (doc) => ({
    ...doc,
    schemaVersion: 2,
    assets: Array.isArray(doc.assets)
      ? doc.assets.map((asset: unknown) => (isRecord(asset) ? { angle: 0, ...asset } : asset))
      : doc.assets,
    texts: Array.isArray(doc.texts) ? doc.texts : [],
  }),
  // v2 → v3: one ordered layer list (artwork below text, as it was painted),
  // styles instead of a plain fill, per-part adjustments, kashida, alternates,
  // guides and layer groups.
  2: (doc) => {
    const assets: unknown[] = Array.isArray(doc.assets) ? doc.assets : [];
    const texts: unknown[] = Array.isArray(doc.texts) ? doc.texts : [];
    const common = { locked: false, groupId: null };
    const layers = [
      ...assets.map((asset) => (isRecord(asset) ? { ...common, opacity: 1, ...asset } : asset)),
      ...texts.map((text) => {
        if (!isRecord(text)) return text;
        const { fill, ...rest } = text;
        return {
          ...common,
          name: '',
          parts: {},
          kashida: {},
          features: [],
          ...rest,
          style: {
            fill: { type: 'solid', color: typeof fill === 'string' ? fill : '#1a1a1a' },
            stroke: null,
            opacity: 1,
            shadow: null,
          },
        };
      }),
    ];
    const { assets: _assets, texts: _texts, ...rest } = doc;
    return {
      ...rest,
      schemaVersion: 3,
      artboards: Array.isArray(doc.artboards)
        ? doc.artboards.map((artboard: unknown) =>
            isRecord(artboard) ? { guides: [], ...artboard } : artboard,
          )
        : doc.artboards,
      layers,
      groups: [],
    };
  },
  // v3 → v4: publishing (stories, paragraph styles, page numbering).
  3: (doc) => ({
    ...doc,
    schemaVersion: 4,
    stories: Array.isArray(doc.stories) ? doc.stories : [],
    paragraphStyles: Array.isArray(doc.paragraphStyles)
      ? doc.paragraphStyles
      : structuredClone(DEFAULT_PARAGRAPH_STYLES),
    firstPageNumber: typeof doc.firstPageNumber === 'number' ? doc.firstPageNumber : 1,
  }),
};

export function schemaVersionOf(doc: unknown): number | undefined {
  return isRecord(doc) && typeof doc.schemaVersion === 'number' ? doc.schemaVersion : undefined;
}

/** True if the document was written by a newer version of the app. */
export function isFromNewerApp(doc: unknown): boolean {
  const version = schemaVersionOf(doc);
  return version !== undefined && version > PROJECT_SCHEMA_VERSION;
}

/** Upgrade a document to the current schema version. Unknown shapes are returned unchanged. */
export function migrateProject(doc: unknown): unknown {
  if (!isRecord(doc)) return doc;
  let current: UnknownRecord = doc;
  for (let guard = 0; guard < 100; guard++) {
    const version = schemaVersionOf(current);
    const step = version === undefined ? undefined : STEPS[version];
    if (!step) break;
    current = step(current);
  }
  return current;
}
