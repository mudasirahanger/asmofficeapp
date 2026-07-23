# OfficeHub — Test Report

Session date: 2026-07-23. Environment: Linux (aarch64) sandbox, no GUI, no Windows/macOS, no root/apt access, no PHP/Composer preinstalled, network access to the npm registry available.

**Update (same-day follow-up session):** a real headless Chromium was successfully obtained and run in this sandbox despite the above constraints (see "Real browser E2E — follow-up session" near the end of this file), and the desktop white-screen root cause reported by the user was found, fixed, and documented as PRODUCTION_AUDIT.md D-16. Real PHP/Laravel and real Electron execution remain blocked in this specific sandbox for reasons detailed in PRODUCTION_AUDIT.md sections 4b/4c (not general limitations — a normal dev machine or CI runner doesn't have either problem).

## Environment versions actually used

- `node -v` → `v22.22.3`
- `npm -v` → `10.9.8`
- pnpm → not globally installed; `npm install -g pnpm` failed (no write permission to the global prefix) and `corepack enable` failed (missing directory in this sandbox). Used `npx --yes pnpm@9.12.0` successfully instead (matches `mobile/package.json`'s `packageManager` field).
- `php` / `composer` → **not installed**, and could not be installed (`apt-get update` failed with `Permission denied` on `/var/lib/apt/lists/lock`, no sudo). Backend PHP tooling is **BLOCKED** in this environment end-to-end.
- Electron: not launched (no GUI in this sandbox). `desktop/node_modules/electron` reports `30.5.1` (matches `devDependencies`).

## Mobile (`mobile/`)

| Command | Result | Notes |
|---|---|---|
| `pnpm install --frozen-lockfile` (via `npx pnpm@9.12.0`) | **Timed out** in this sandbox (45s tool limit) but `node_modules/.pnpm` was already present and consistent with `pnpm-lock.yaml` (verified by mtime and `.pnpm` structure) — did not need a fresh install to proceed | PARTIALLY VERIFIED |
| `node_modules/.bin/tsc --noEmit` (before fixes) | **31 errors across 8 files** | VERIFIED — see PRODUCTION_AUDIT.md D-15 |
| `node_modules/.bin/tsc --noEmit` (after fixes) | **Exit 0, 0 errors** | VERIFIED |
| `node_modules/.bin/jest --silent` (before fixing `jest.config.js`) | **6 suites failed, 0 tests ran** — `SyntaxError: Cannot use import statement outside a module` in `@react-native/jest-preset`'s own `setup.js`, plus `e2e/*.spec.ts` (Playwright specs) being picked up as Jest suites | VERIFIED — root cause and fix in PRODUCTION_AUDIT.md D-13 |
| `node_modules/.bin/jest --silent` (after fix) | **4 suites passed, 17 tests passed** (`__tests__/store/authStore.test.ts`, `__tests__/store/syncStore.test.ts`, `__tests__/store/uiStore.test.ts`, `__tests__/services/api.test.ts`) | VERIFIED |
| `node_modules/.bin/expo export -p web --output-dir <tmp>` | **Failed** initially: `Cannot find module '../lightningcss.linux-arm64-gnu.node'` — the mounted `node_modules` is missing the `linux-arm64-gnu` native binding for two different `lightningcss` versions pulled in transitively (nativewind's CSS pipeline). This is a sandbox artifact (the folder was synced from the user's own machine/architecture, not freshly installed for this Linux ARM64 sandbox), not a project defect — **not documented as a PRODUCTION_AUDIT.md item**. Fetched the two missing native bindings from the npm registry and placed them manually to unblock verification. | After the local workaround: **Web Bundled 5414ms · 1582 modules · export succeeded**, producing `index.html` + JS/CSS bundles + assets in the output dir |
| Static export served locally (`python3 -m http.server`) and fetched | `HTTP 200`, correct `<title>Office Hub</title>` and expected `#root` reset styles in the HTML | VERIFIED at the HTTP/HTML level |
| Full in-browser console-error check of the exported build (Playwright) | **Not completed** — `@playwright/test`'s browser automation module wasn't resolvable via a quick ad hoc script in the time available, and no Chromium binary was cached in this sandbox (`~/.cache/ms-playwright` doesn't exist) | NOT VERIFIED |
| `mobile/e2e/*.spec.ts` (Playwright test suite, against a real running app + backend) | **Not run** — requires a live backend (PHP unavailable) and a real browser | BLOCKED |
| `expo-doctor` | **Not run** — not attempted in this pass; not part of the existing `package.json` scripts either | NOT VERIFIED |

## Desktop (`desktop/`)

| Command | Result | Notes |
|---|---|---|
| `npm install` (to add the new `jest` devDependency) | Succeeded — `added 234 packages` | VERIFIED |
| `npx jest --silent` | **2 suites passed, 9 tests passed** (`__tests__/preload.test.js`, `__tests__/main-ipc.test.js`) | VERIFIED — new tests for D-3/D-7 |
| `electron .` (dev launch) | **Not run** — no GUI/display in this sandbox | BLOCKED |
| `npm run build` (electron-builder, mac/win/linux) | **Not run** — electron-builder needs platform-native tooling (Wine for Windows NSIS from Linux is not installed; no macOS host for signed `.dmg`); attempting an unsigned Linux AppImage build alone was judged out of scope for the time available and wouldn't validate the Windows/macOS claims anyway | BLOCKED |
| `npm run build:legacy` (Electron 22.3.27 Windows-8 pipeline) | **Not run** — same packaging limitations, plus it's bash-only and Windows-target-only | BLOCKED |
| Packaged-app smoke test (installer launch, tray, notifications, single-instance) | **Not run** — no Windows/macOS/Linux GUI runner available | BLOCKED |

## Backend (`backend/`)

| Command | Result | Notes |
|---|---|---|
| `composer install` | **Not run** — Composer not installed, no root to install PHP/Composer | BLOCKED |
| `php artisan migrate` (isolated test DB) | **Not run** | BLOCKED |
| `vendor/bin/phpunit` / `php artisan test` | **Not run** | BLOCKED — this includes the new `test_login_is_rate_limited_after_repeated_failures` test added for D-2, which is **written but not executed**. The `throttle:6,1` Laravel middleware syntax used is standard/well-documented, and the route change was reviewed by hand, but treat D-2 as **code-reviewed, not test-verified** until this is run in an environment with PHP. |
| Route inspection (`php artisan route:list`) | **Not run** (no PHP) — done by reading `routes/api.php` and controller source directly instead | PARTIALLY VERIFIED (manual code read, not tool-verified) |
| `composer audit` | **Not run** | BLOCKED |

## Cross-cutting checks

| Check | Result |
|---|---|
| `git status` at session start | Clean working tree, up to date with `origin/main` |
| `git ls-files \| grep DS_Store` | No matches — confirmed `.DS_Store` was never actually a tracked-file problem (see PRODUCTION_AUDIT.md D-12) |
| `git ls-files \| grep backend/test` | Confirmed the 6 debug scripts (D-1) were tracked before removal |
| Git write operations (`git rm`, `git add`, `git commit`) | **Blocked at the filesystem level** in this session — `.git/index.lock` could not be created/removed (`Operation not permitted`), and file deletion inside the mounted project folder required an explicit one-time permission grant (`allow_cowork_file_delete`) before `rm` would succeed. All deletions in this report were done via plain filesystem operations after that grant; **nothing in this session was committed to git** — the working tree has the fixes applied but uncommitted. The user (or a follow-up session with working git) will need to review and commit. |

## Real browser E2E — follow-up session (2026-07-23, same day)

### Getting a real headless Chromium working in this sandbox

| Step | Command / action | Result |
|---|---|---|
| Install browser deps via Playwright | `npx playwright install chromium --with-deps` | Failed — requires `sudo`, unavailable |
| Download browser binary only | `npx playwright install chromium` | Hung indefinitely (background job died silently across tool-call boundaries) |
| Manual download | `curl -sL -C - -o chromium-linux-arm64.zip https://cdn.playwright.dev/dbazure/download/playwright/builds/chromium/1228/chromium-linux-arm64.zip` (resumed across 3 calls due to per-call time limits) | **VERIFIED** — 196,280,473 bytes, matches `Content-Length` exactly |
| Extract to Playwright's expected cache path | `unzip -q chromium-linux-arm64.zip -d ~/.cache/ms-playwright/chromium-1228` | VERIFIED |
| First launch attempt | `chromium.launch({ executablePath: '.../chrome-linux/chrome' })` | Failed: `error while loading shared libraries: libXdamage.so.1: cannot open shared object file` |
| Diagnose full missing-lib list | `ldd chrome-linux/chrome \| grep "not found"` | Exactly one missing library: `libXdamage.so.1` |
| Obtain the missing lib without root | `curl -sL -o libxdamage1.deb http://archive.ubuntu.com/ubuntu/pool/main/libx/libxdamage/libxdamage1_1.1.6-1build1_arm64.deb && dpkg-deb -x libxdamage1.deb .` | VERIFIED — extracted `libXdamage.so.1` with no install/root step |
| Launch with `LD_LIBRARY_PATH` pointed at the extracted lib | `LD_LIBRARY_PATH=~/extra-libs chromium.launch(...)` | **VERIFIED — launched, navigated, rendered content correctly** |

This is a one-time, sandbox-specific workaround (`mobile/e2e/mocked.playwright.config.ts` only applies it when `PW_SANDBOX_CHROME=1` is set — a no-op everywhere else).

### E2E suite against the production export

```
cd mobile
rm -rf dist && npx expo export -p web --output-dir dist   # VERIFIED — completes cleanly
PW_SANDBOX_CHROME=1 LD_LIBRARY_PATH=~/extra-libs npx playwright test --config=e2e/mocked.playwright.config.ts
```
Final result: **4 passed, 0 failed** (`mobile/e2e/mocked-production-build.spec.ts`):
1. `logs in and reaches the dashboard` — also asserts zero browser console/page errors during a normal login+dashboard load.
2. `shows an error toast on invalid credentials and does not navigate`.
3. `"Mark Complete" calls the dedicated /complete endpoint, not a plain update (D-14 regression)` — asserts via `page.waitForRequest` that the real network call is `PATCH .../projects/{id}/complete`, and that the UI reflects the server's completed state afterward.
4. `refreshing on a nested route does not blank-screen (SPA fallback)`.

**This run caught a real bug** (PRODUCTION_AUDIT.md D-17) partway through — test 3 initially crashed the app with `Cannot read properties of undefined (reading 'badge')` because the mock fixture used a department color (`'indigo'`) that isn't one of the app's defined palette keys, and three call sites (`[id].tsx`, `billing.tsx` ×2) didn't guard against that case the way `ProjectCard.tsx` already did. Fixed in the app code (not just the mock), re-verified: all 4 tests green afterward, and `tsc --noEmit` / mobile `jest` / desktop `jest` all still pass (re-run after these fixes, see below).

### Full regression re-check after the follow-up session's fixes

```
cd mobile && npx tsc --noEmit          # exit 0
cd mobile && npx jest --silent          # 4 suites / 17 tests passed
cd desktop && npx jest --silent         # 2 suites / 13 tests passed (was 9 — 4 new D-16 diagnostic tests)
```
All **VERIFIED** with actual command output in this session.

### What remains blocked (see PRODUCTION_AUDIT.md 4b/4c for the detailed attempts made)

- **Real Electron launch**: binary download blocked by this sandbox's network allowlist (GitHub redirects release assets to `release-assets.githubusercontent.com`, which returns 403 here, unlike `objects.githubusercontent.com` which Playwright's CDN happened to use). BLOCKED.
- **Real Laravel backend**: no root for `apt`/PHP; static PHP binary downloads blocked by the same allowlist; the one npm-native-PHP package found (`@platformatic/php-node`) doesn't publish arm64 Linux builds. BLOCKED.
- Because of the above, `mobile/e2e/auth.spec.ts` and `dashboard.spec.ts` (pre-existing, require a live backend) were still not executed this session.

## Summary

- **Fixed and verified with actual command output in this session:** D-1 (debug scripts removed), D-3/D-7 (desktop navigation hardening + Jest tests passing), D-5/D-6 (lockfile/cross-platform script — reviewed, not independently re-run beyond the scripts existing correctly), D-8, D-13 (Jest suite unblocked), D-14 (ProjectCard crash fix, verified via clean `tsc`+`jest`), D-15 (all 31 tsc errors resolved to 0).
- **Fixed but not runtime-verified due to environment limits:** D-2 (Laravel throttle — PHP unavailable to run `phpunit`), D-4 (electron-builder artifactName — no packaging environment to actually build installers).
- **Documented, intentionally not changed:** D-9 (CORS), D-10 (preload listener cleanup), D-11 (orphan `index.html`).
- **Structurally blocked in this sandbox, requiring the user's own machine or CI:** all PHP/Composer/Laravel tooling, all Electron packaging and packaged-app smoke tests, all Windows/macOS-specific verification, live-backend-dependent Playwright E2E.
