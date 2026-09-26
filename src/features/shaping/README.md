# Shaping engine

Framework-independent TypeScript that turns text + a font into positioned glyph outlines.

| File                | Role                                                                        |
| ------------------- | --------------------------------------------------------------------------- |
| `harfbuzz-font.ts`  | HarfBuzz (WebAssembly) shaping: contextual forms, ligatures, marks, kerning |
| `outline-font.ts`   | opentype.js glyph outlines by glyph id                                      |
| `layout.ts`         | Pure multi-line layout: line height, alignment, glyph placement             |
| `engine.ts`         | `ShapingEngine`: load fonts by key, `shape()` and `layout()`                |
| `shaping.worker.ts` | Web Worker hosting the engine; fetches fonts on first use                   |
| `client.ts`         | Main-thread client: LRU cache, de-duplication, timeout, crash recovery      |
| `protocol.ts`       | Worker message types                                                        |
| `types.ts`          | Public, serializable result types                                           |

Rules for this folder:

- No imports from React, the DOM, Fabric.js or other features (except `client.ts`, which only
  needs the Web Worker API): the engine must run in a worker and in Node, and stay publishable as
  a standalone package.
- Every public function is pure or explicitly async, and has tests. `engine.test.ts` shapes real
  text with the bundled fonts in Node.

Next (Phase 3): split glyph outlines into contours and classify them as body, dot (nuqta) or mark.
See [docs/architecture.md](../../../docs/architecture.md#text-pipeline).
