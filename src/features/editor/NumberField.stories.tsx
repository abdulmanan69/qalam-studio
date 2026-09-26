import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { NumberField } from './NumberField';

function StatefulNumberField(props: {
  label: string;
  min: number;
  max: number;
  suffix?: string;
  integer?: boolean;
}) {
  const [value, setValue] = useState(48);
  return (
    <div className="w-40">
      <NumberField key={value} id="story-number" value={value} onCommit={setValue} {...props} />
      <p className="mt-2 text-xs text-muted-foreground">Committed: {value}</p>
    </div>
  );
}

const meta = {
  title: 'Editor/Number field',
  component: StatefulNumberField,
  args: { label: 'Font size', min: 4, max: 2000, suffix: 'px' },
} satisfies Meta<typeof StatefulNumberField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FontSize: Story = {};

export const IntegerPercent: Story = {
  args: { label: 'Opacity', min: 0, max: 100, suffix: '%', integer: true },
};
