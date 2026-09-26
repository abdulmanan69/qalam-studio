# Security Policy

## Supported versions

Qalam Studio is a static web application. Only the latest release on `main` (the deployed site)
receives security fixes.

| Version | Supported |
| ------- | --------- |
| latest  | ✅        |
| older   | ❌        |

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report privately through GitHub: on the repository page, open the **Security** tab and choose
**Report a vulnerability** (GitHub private vulnerability reporting). Include:

- a description of the issue and its impact,
- steps to reproduce, ideally with a minimal `.qalam` or `.svg` file,
- the browser and app version (Help → About).

We aim to acknowledge reports within **3 working days** and to ship a fix or mitigation for
confirmed issues within **30 days**, coordinating disclosure with you.

## Security model

Knowing what is in scope helps us triage faster:

- **No backend.** The app is static files. There are no accounts, servers, or databases to attack;
  all data stays in the user's browser (IndexedDB, plus localStorage for UI preferences).
- **Untrusted input** is limited to files the user opens: `.qalam` project files and SVG images
  (and, from Phase 2, font files). These are the main attack surface:
  - `.qalam` files are parsed as JSON and validated against a strict schema before use.
  - Imported SVGs are sanitized on import (scripts, event handlers, `foreignObject`, external and
    `javascript:` links are removed) and only ever rendered through `<img>`, which never executes
    scripts.
- **Dependencies** are monitored by Dependabot.

In scope: script execution or data exfiltration through crafted project/SVG/font files, stored
XSS through project names, supply-chain issues in our build. Out of scope: attacks that require a
compromised browser or device, and self-XSS through the browser's developer tools.
