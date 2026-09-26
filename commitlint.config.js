export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      1,
      'always',
      [
        'app',
        'editor',
        'shaping',
        'fonts',
        'projects',
        'templates',
        'dashboard',
        'ui',
        'i18n',
        'ci',
        'deps',
        'docs',
      ],
    ],
  },
};
