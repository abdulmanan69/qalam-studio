/**
 * Build-time configuration. Values can be overridden with Vite env variables
 * (see .env.example) so forks can point links at their own repository.
 */
export const APP_NAME = 'Qalam Studio';

export const APP_VERSION: string = import.meta.env.VITE_APP_VERSION ?? '0.1.0';

export const REPO_URL: string =
  import.meta.env.VITE_REPO_URL ?? 'https://github.com/abdulmanan69/qalam-studio';

/** The developer's GitHub profile (shown in the app footer). */
export const AUTHOR_HANDLE = 'abdulmanan69';
export const AUTHOR_URL = `https://github.com/${AUTHOR_HANDLE}`;

export const DOCS_URL = `${REPO_URL}/tree/main/docs`;
export const USER_GUIDE_URL = `${REPO_URL}/blob/main/docs/user-guide.md`;
export const ISSUES_URL = `${REPO_URL}/issues/new/choose`;
