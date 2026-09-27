import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { ensurePreviewFonts, previewFontStack } from '@/features/fonts/font-faces';
import { resolveFont } from '@/features/fonts/registry';
import { MAX_TEXT_LENGTH, type TextFrame, type TextRun } from '@/features/projects/schema';
import { normalizeText, remapForTextEdit } from '@/features/projects/text-runs';
import { setStoryText } from '@/features/publishing/publishing-ops';

import { useDocumentStore } from '../document-store';
import { useEditorCommands, useEditorStore } from '../editor-store';
import { layerBounds } from '../units';

import type { StageScene } from './artboard-stage';

const COMMIT_DELAY = 300;

/**
 * Typing directly on the canvas: double-clicking a text layer or a text frame
 * opens a right-to-left text box over it, in the layer's font. Changes are
 * applied while typing (the page re-flows underneath); Esc, Ctrl/⌘ + Enter or
 * clicking elsewhere closes it.
 */
export function InlineTextEditor({ scene, zoom }: { scene: StageScene; zoom: number }) {
  const textEditId = useEditorStore((s) => s.textEditId);
  const item = scene.layers.find((l) => l.layer.id === textEditId && !l.readonly);
  const layer = item?.layer;
  if (!layer || (layer.kind !== 'text' && layer.kind !== 'frame')) return null;
  return <Editor key={layer.id} layer={layer} layout={item.layout} zoom={zoom} />;
}

function Editor({
  layer,
  layout,
  zoom,
}: {
  layer: TextRun | TextFrame;
  layout: StageScene['layers'][number]['layout'];
  zoom: number;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLTextAreaElement>(null);
  const story = useDocumentStore((s) =>
    layer.kind === 'frame' ? s.project?.stories.find((st) => st.id === layer.storyId) : undefined,
  );
  const styles = useDocumentStore((s) => s.project?.paragraphStyles);
  const current =
    layer.kind === 'text' ? layer.text : (story?.paragraphs.map((p) => p.text).join('\n') ?? '');
  const [draft, setDraft] = useState(current);
  const latest = useRef({ draft, layer, current });
  useEffect(() => {
    latest.current = { draft, layer, current };
  });

  const style =
    layer.kind === 'frame' ? styles?.find((s) => s.id === story?.paragraphs[0]?.styleId) : undefined;
  const font = resolveFont(layer.kind === 'text' ? layer.fontId : (style?.fontId ?? 'noto-nastaliq-urdu'));
  const language = layer.kind === 'text' ? layer.language : (style?.language ?? 'ur');

  useEffect(() => {
    ensurePreviewFonts([font]);
  }, [font]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.focus();
    element.setSelectionRange(element.value.length, element.value.length);
  }, []);

  // Apply the text shortly after typing pauses, and once more on close.
  useEffect(() => {
    if (draft === current) return;
    const timer = window.setTimeout(() => {
      commit(latest.current);
    }, COMMIT_DELAY);
    return () => {
      window.clearTimeout(timer);
    };
  }, [draft, current]);

  const close = () => {
    commit(latest.current);
    useEditorStore.getState().setTextEdit(null);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape' || (event.key === 'Enter' && (event.ctrlKey || event.metaKey))) {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  };

  // Place the box over the layer (artboard units × zoom).
  const box =
    layer.kind === 'frame'
      ? { x: layer.x, y: layer.y, width: layer.width, height: layer.height }
      : (layerBounds(layer, layout) ?? { x: layer.x, y: layer.y, width: 240, height: 80 });
  const width = Math.max(box.width * zoom, 240);
  const height = Math.max(box.height * zoom, layer.kind === 'frame' ? 120 : 72);
  const size =
    layer.kind === 'text'
      ? Math.min(Math.max(layer.fontSize * Math.abs(layer.scaleY) * zoom * 0.55, 16), 64)
      : Math.min(Math.max((style?.fontSize ?? 16) * zoom, 14), 40);

  return (
    <textarea
      ref={ref}
      value={draft}
      dir="rtl"
      lang={language}
      maxLength={layer.kind === 'text' ? MAX_TEXT_LENGTH : undefined}
      spellCheck={false}
      aria-label={t('editor.inlineEdit.label')}
      title={t('editor.inlineEdit.hint')}
      onChange={(event) => {
        setDraft(event.target.value);
      }}
      onKeyDown={onKeyDown}
      onBlur={close}
      style={{
        left: box.x * zoom,
        top: box.y * zoom,
        width,
        height,
        fontFamily: previewFontStack(font),
        fontSize: size,
      }}
      className="absolute z-10 resize rounded-sm border-2 border-primary bg-white/95 px-2 py-1 leading-[2.2] text-neutral-900 shadow-popover outline-none"
      data-inline-editor=""
    />
  );
}

function commit({ draft, layer, current }: { draft: string; layer: TextRun | TextFrame; current: string }) {
  if (draft === current) return;
  const actions = useEditorCommands.getState().actions;
  if (!actions) return;
  if (layer.kind === 'frame') {
    actions.updateStory(layer.storyId, (story) => {
      setStoryText(story, draft);
    });
    return;
  }
  const next = normalizeText(draft);
  // A text layer cannot be empty; keep the old text until something is typed.
  if (!next || next === layer.text) return;
  actions.patchLayer(layer.id, (l) => {
    if (l.kind === 'text') Object.assign(l, remapForTextEdit(l, next));
  });
}
