import type { StorybookConfig } from '@storybook/react-vite';

/** Component workshop: `npm run storybook`. Uses the app's Vite config (aliases, Tailwind). */
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  framework: '@storybook/react-vite',
  addons: [],
  core: { disableTelemetry: true },
  viteFinal: (viteConfig) => ({
    ...viteConfig,
    // The service worker belongs to the app only.
    plugins: (viteConfig.plugins ?? []).flat().filter((plugin) => {
      const name = plugin && typeof plugin === 'object' && 'name' in plugin ? plugin.name : '';
      return !name.startsWith('vite-plugin-pwa');
    }),
  }),
};

export default config;
