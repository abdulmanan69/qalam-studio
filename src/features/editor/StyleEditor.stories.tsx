import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { DEFAULT_TEXT_STYLE, type LayerStyle } from '@/features/projects/schema';

import { StyleEditor } from './StyleEditor';

function StatefulStyleEditor({ initial }: { initial: LayerStyle }) {
  const [style, setStyle] = useState(initial);
  return (
    <div className="grid w-72 gap-4">
      <StyleEditor style={style} onChange={setStyle} />
      <pre className="overflow-auto rounded-md bg-muted p-2 text-[0.6875rem]" dir="ltr">
        {JSON.stringify(style, null, 2)}
      </pre>
    </div>
  );
}

const meta = {
  title: 'Editor/Style editor',
  component: StatefulStyleEditor,
  args: { initial: DEFAULT_TEXT_STYLE },
} satisfies Meta<typeof StatefulStyleEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Solid: Story = {};

export const GoldGradientWithShadow: Story = {
  args: {
    initial: {
      fill: {
        type: 'linear',
        angle: 90,
        stops: [
          { offset: 0, color: '#b8862b' },
          { offset: 1, color: '#7a5418' },
        ],
      },
      stroke: { color: '#3a2a18', width: 1 },
      opacity: 1,
      shadow: { color: '#000000', opacity: 0.3, blur: 6, offsetX: 2, offsetY: 3 },
    },
  },
};
