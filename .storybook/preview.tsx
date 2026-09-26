import '@fontsource-variable/inter';
import '@fontsource-variable/noto-sans-arabic';
import '../src/styles/globals.css';

import type { Decorator, Preview } from '@storybook/react-vite';

import { AppContext } from './AppContext';

/** Toolbar-driven UI language (with right-to-left layout) and theme. */
const withAppContext: Decorator = (Story, context) => (
  <AppContext
    locale={String(context.globals.locale ?? 'en')}
    theme={String(context.globals.theme ?? 'light')}
  >
    <Story />
  </AppContext>
);

const preview: Preview = {
  decorators: [withAppContext],
  globalTypes: {
    locale: {
      description: 'UI language',
      toolbar: {
        title: 'Language',
        icon: 'globe',
        items: [
          { value: 'en', title: 'English' },
          { value: 'ur', title: 'اردو' },
          { value: 'ar', title: 'العربية' },
          { value: 'fa', title: 'فارسی' },
        ],
        dynamicTitle: true,
      },
    },
    theme: {
      description: 'Color theme',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: ['light', 'dark'],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { locale: 'en', theme: 'light' },
  parameters: {
    controls: { matchers: { color: /(background|color)$/i } },
  },
};

export default preview;
