# Contributing to Qalam Studio

Thank you for helping build an open calligraphy tool for Arabic-script languages. This guide
covers how to set up the project, the standards we follow, and how changes get merged.

By participating you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to contribute

- **Bug reports** — use the _Bug report_ issue form. Include the exact text involved for
  rendering or shaping problems.
- **Features** — open a _Feature request_ first for anything non-trivial, so we can agree on the
  approach before you invest time.
- **Code** — pick an issue labelled `good first issue` or `help wanted`, comment that you are
  working on it, then open a pull request.
- **Fonts** — only fonts under the SIL Open Font License (or compatible). See
  [docs/adding-fonts.md](docs/adding-fonts.md).
- **Translations** — Urdu, Arabic and Persian UI translations arrive in Phase 6; native speakers
  are especially welcome to review them.

## Development setup

```bash
nvm use            # Node 22, from .nvmrc
npm install        # also installs the git hooks (Husky)
npm run dev
```

Before pushing, run the same checks as CI:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e   # first time: npx playwright install chromium
```

## Branches and commits

- Branch from `main`: `feat/kashida-handle`, `fix/search-rtl`, `docs/font-guide`.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/), enforced by
  commitlint:

  ```
  feat(editor): add zoom to selection
  fix(projects): keep artboard ids when importing .qalam files
  docs: explain the font registry
  ```

  Scopes: `app`, `editor`, `shaping`, `fonts`, `projects`, `templates`, `dashboard`, `ui`, `i18n`,
  `ci`, `deps`, `docs`.

- The pre-commit hook runs ESLint and Prettier on staged files. Do not bypass it.

## Code standards

- **TypeScript strict mode**, no `any`. Validate untrusted data (files, storage) with zod.
- **Feature folders**: code lives in `src/features/<feature>`. Shared UI goes in
  `src/components`, framework-free helpers in `src/lib`.
- **The shaping engine stays framework-free** (`src/features/shaping`): no React, no DOM, so it
  can run in a Web Worker and be published as its own package.
- **UI text goes through i18n** (`src/i18n/locales/en.json`). Never hard-code user-facing strings.
- **RTL-safe layout**: use logical utilities (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`,
  `text-start`) rather than left/right.
- **Colors come from design tokens** (`src/styles/tokens.css`). Don't use raw hex values in components.
- **Accessibility is a requirement**: every control is keyboard reachable, has an accessible
  name, and meets WCAG 2.1 AA contrast. Prefer Radix primitives for interactive widgets.
- **Tests**: unit-test pure logic next to the code (`*.test.ts`); test components through user
  behavior with Testing Library (roles and labels, not class names); add a Playwright test for new
  end-to-end flows.

## Pull requests

1. Keep PRs focused; one logical change per PR.
2. Fill in the PR template, including screenshots for UI changes (light, dark, and RTL if the
   layout changed).
3. CI must be green. A maintainer reviews within a few days.
4. We squash-merge; the PR title becomes the commit message, so make it a Conventional Commit.

## Releasing (maintainers)

1. Update `CHANGELOG.md` (move _Unreleased_ items under the new version).
2. Bump `version` in `package.json`.
3. Tag `vX.Y.Z` on `main` and publish a GitHub release with the changelog section.
