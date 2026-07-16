# Development notes for ncrm-frontend

These notes cover project-specific details not obvious from a first glance at the
repo. Basic React/Vite knowledge is assumed.

## Build / configuration

- Stack: React 18 + Vite 6 + MUI 6, plain JS (`.jsx`), no TypeScript.
- `npm install` then `npm run dev` (serves on **port 3000**, fixed in `vite.config.js`).
  `npm run build` produces `dist/`. `npm run preview` serves the production build.
- The dev server proxies `/api/*` to `http://localhost:8080` (see `vite.config.js`).
  The backend must be running locally for anything beyond static UI checks to work;
  there is no mock/stub backend in this repo.
- Runtime config is via Vite env vars, see `.env.example` (copy to `.env`):
  - `VITE_AUTH_MODE`: `basic` (HTTP Basic against backend `local` profile — users
    `owner` / `rep` / `customer`, password `test`) or `keycloak`.
  - `VITE_KEYCLOAK_URL` / `VITE_KEYCLOAK_REALM` / `VITE_KEYCLOAK_CLIENT_ID`: only
    relevant when `VITE_AUTH_MODE=keycloak`.
- `__APP_VERSION__` is a global injected at build time from `package.json`
  `version` field (see `define` in `vite.config.js`); it is used for the footer.
  Bump `version` in `package.json`, not a separate constant.
- No linter/formatter config is committed (no ESLint/Prettier config files) —
  match the existing style in the file you're touching (see "Code style" below).

## Testing

There was no test tooling in the repo originally. **Vitest** has been added as a
devDependency and wired up as the test runner (no separate config file needed —
Vite's own config already covers JS/JSX transform via `@vitejs/plugin-react`):

- Run all tests: `npm test` (= `vitest run`, single run, CI-friendly).
- Watch mode while developing: `npx vitest` (interactive).
- Run a single file: `npx vitest run src/utils/format.test.js`.

Conventions:
- Co-locate tests next to the source file: `foo.js` → `foo.test.js` (or
  `.jsx`/`.test.jsx`), no separate `__tests__` or `test/` directory currently exists.
- For plain utility modules (`src/utils/*.js`), plain `describe`/`it`/`expect` from
  `vitest` is enough, no extra setup.
- For component tests (nothing exists yet under `src/components` or `src/pages`),
  you'd additionally need `@testing-library/react`, `jsdom` as the Vitest
  environment (`test: { environment: 'jsdom' }` in `vite.config.js`), and a DOM
  matcher lib (`@testing-library/jest-dom`) — none of this is installed yet since
  no component test exists; add it only when you actually write one.
- Watch out: `formatMoney` (in `src/utils/format.js`) uses
  `Intl.NumberFormat('cs-CZ', ...)`, which renders a **non-breaking space** (`\u00a0`)
  as the thousands separator, not a regular space. Don't compare its output with a
  plain-space string literal — use a regex (`/1.000,00.Kč/`) or normalize whitespace
  first, otherwise an apparently-correct assertion fails.

Example (was created, run successfully, then removed per task instructions —
recreate similarly when adding real coverage for `src/utils/format.js`):

```js
import { describe, expect, it } from 'vitest';
import { formatDate, formatMoney } from './format';

describe('format utils', () => {
  it('formats money using cs-CZ locale and CZK by default', () => {
    expect(formatMoney(1000)).toMatch(/1.000,00.Kč/);
  });

  it('returns a placeholder for missing values', () => {
    expect(formatMoney(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
  });
});
```

## Additional development notes

- Domain language mix: UI strings/comments in code describing business behavior
  are largely in **Czech** (labels, status maps in `src/utils/format.js`, README),
  while code identifiers and technical comments are in **English**. Follow the
  same split when adding new UI text vs. code comments.
- Auth/role gating is centralized: `useAuth()` (`src/auth/AuthContext.jsx`) exposes
  `isOwner`; role-specific data (e.g. company list in
  `src/company/CompanyContext.jsx`) is only fetched/managed when the current role
  requires it — follow this pattern (guard clause + early return) rather than
  fetching unconditionally and hiding UI.
- `CompanyContext` persists the active company id in `sessionStorage`
  (`STORAGE_KEY = 'ncrm-active-company'`), not `localStorage` — intentional, so
  the selection doesn't leak across browser sessions/tabs long-term.
- `src/api/client.js` is a single shared Axios instance; auth headers are set
  imperatively via `setAuthHeader()` from `AuthContext`, not per-request — add new
  API calls through this instance rather than creating new Axios instances.
- No CI config (no `.github/workflows`, etc.) is present in this repo; running
  `npm run build` and `npm test` locally before submitting changes is currently
  the only verification available.
