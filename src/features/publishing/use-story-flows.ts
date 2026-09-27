import { useEffect, useMemo, useState } from 'react';

import type { Project } from '@/features/projects/schema';
import type { FlowRequest } from '@/features/shaping/client';
import type { FlowFrameResult, FlowResult } from '@/features/shaping/flow';
import type { TextLayout } from '@/features/shaping/types';

import { tryGetShapingClient } from '../editor/canvas/use-text-layouts';

import { storyFlowRequest } from './pages';

export interface StoryFlows {
  /** Lines per frame id. */
  frames: ReadonlyMap<string, FlowFrameResult>;
  /** Flow result per story id (overflow, word counts). */
  stories: ReadonlyMap<string, FlowResult>;
}

/** Flow every story of the project; results are cached per request in the client. */
export async function computeStoryFlows(
  project: Pick<Project, 'layers' | 'artboards' | 'paragraphStyles' | 'stories'>,
  layouts: ReadonlyMap<string, TextLayout>,
): Promise<StoryFlows> {
  const client = tryGetShapingClient();
  const frames = new Map<string, FlowFrameResult>();
  const stories = new Map<string, FlowResult>();
  if (!client) return { frames, stories };
  await Promise.all(
    project.stories.map(async (story) => {
      const request = storyFlowRequest(project, story, layouts);
      if (!request) return;
      const result = await client.flow(request);
      stories.set(story.id, result);
      for (const frame of result.frames) frames.set(frame.id, frame);
    }),
  );
  return { frames, stories };
}

/**
 * Flow all stories in the worker. While a story is re-flowed after an edit,
 * its previous lines stay on screen.
 */
export function useStoryFlows(
  project: Pick<Project, 'layers' | 'artboards' | 'paragraphStyles' | 'stories'>,
  layouts: ReadonlyMap<string, TextLayout>,
): StoryFlows {
  const client = useMemo(() => tryGetShapingClient(), []);
  const requests = useMemo(
    () =>
      project.stories
        .map((story) => ({ id: story.id, request: storyFlowRequest(project, story, layouts) }))
        .filter((r): r is { id: string; request: FlowRequest } => r.request !== null),
    [project, layouts],
  );
  const [resolved, setResolved] = useState<Record<string, FlowResult>>({});

  useEffect(() => {
    if (!client) return;
    let active = true;
    for (const { id, request } of requests) {
      if (client.peekFlow(request)) continue;
      client.flow(request).then(
        (result) => {
          if (active) setResolved((previous) => ({ ...previous, [id]: result }));
        },
        (error: unknown) => {
          console.error('Text flow failed', error);
        },
      );
    }
    return () => {
      active = false;
    };
  }, [client, requests]);

  return useMemo(() => {
    const frames = new Map<string, FlowFrameResult>();
    const stories = new Map<string, FlowResult>();
    for (const { id, request } of requests) {
      const result = client?.peekFlow(request) ?? resolved[id];
      if (!result) continue;
      stories.set(id, result);
      for (const frame of result.frames) frames.set(frame.id, frame);
    }
    return { frames, stories };
  }, [client, requests, resolved]);
}
