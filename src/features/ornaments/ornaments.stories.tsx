import type { Meta, StoryObj } from '@storybook/react-vite';

import { DEFAULT_ORNAMENT_COLOR, ORNAMENTS } from './ornaments';

function OrnamentGallery({ color, size }: { color: string; size: number }) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3">
      {ORNAMENTS.map((ornament) => (
        <li key={ornament.id} className="grid gap-1 rounded-md border border-border bg-white p-2">
          <img
            alt={ornament.id}
            className="aspect-square w-full object-contain"
            src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(ornament.build(size, size, color))}`}
          />
          <span className="text-xs text-black/70">
            {ornament.id} · {ornament.category}
          </span>
        </li>
      ))}
    </ul>
  );
}

const meta = {
  title: 'Assets/Ornaments, frames and patterns',
  component: OrnamentGallery,
  args: { color: DEFAULT_ORNAMENT_COLOR, size: 400 },
  argTypes: {
    color: { control: 'color' },
    size: { control: { type: 'range', min: 100, max: 1200, step: 50 } },
  },
} satisfies Meta<typeof OrnamentGallery>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Gallery: Story = {};

export const DeepGreen: Story = { args: { color: '#2f5d50' } };
