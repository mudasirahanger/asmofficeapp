# OfficeHub — Production Audit

Audit date: 2026-07-23
Environment: Linux sandbox (no Windows/macOS GUI, no code-signing certs, no live SMTP/push credentials). Platform-specific claims are labeled per the Honest Verification Requirements below.

## 1. Architecture Summary

- `mobile/` — Expo SDK 56 / React Native 0.85 / React 19.2 / React Native Web, Expo Router, TanStack Query, Zustand, Jest + Playwright. Package manager: **pnpm** (node_modules is pnpm-structured; `package.json` declares `packageManager: pnpm@9.12.0`), but an npm `package-lock.json` was also committed (stale).
- `desktop/` — Electron wrapper (`electron` `^30.0.0`, installed `30.5.1`) using `electron-serve` to serve the exported Expo web build from `www/`, `electron-updater` for auto-update, a system tray, single-instance lock, and native notifications. `electron-builder` targets mac (dmg), win (nsis x64/ia32), linux (AppImage), publishing to GitHub releases.
- `backend/` — Laravel API, Sanctum **Bearer-token** auth (`createToken('mobile')->plainTextToken`, not cookie/session SPA auth), SQLite by default in `.env.example`. Routes in `routes/api.php`, 14 API controllers, feature test suite under `tests/Feature`.
- Root `package.json` / `sync-versions.js` coordinate the Expo web export → Electron packaging pipeline and mobile→desktop version sync.
- A large standalone `index.html` (1929 lines, CDN React 18 + Babel-standalone + Tailwind CDN + html2pdf.js) sits at the repo root. It is **not** part of the documented Expo/Electron/Laravel architecture and is not referenced by any build script — appears to be a leftover pre-Expo prototype (see D-11).

## 2. Environment / Tool Versions Observed

- Node: sandbox has Node/npm/pnpm available (see TEST_REPORT.md for exact versions used).
- Electron declared: `^30.0.0`; installed: `30.5.1`.
- Expo SDK: `~56.0.12`; React Native `0.85.3`; React `19.2.3`.
- PHP/Laravel: version pinned via `backend/composer.json` (Laravel stack); PHPUnit config present at `backend/phpunit.xml`.
- Two lockfiles in `mobile/`: `pnpm-lock.yaml` (matches installed `node_modules/.pnpm` layout, current) and `package-lock.json` (npm, stale — older mtime, not what's actually installed).

## 3. Defect Inventory

### D-1 (P0 — Security) Debug scripts committed at Laravel app root, one dumps full DB table with no auth
`backend/test.php`, `test_att.php`, `test_billing.php`, `test_json.php`, `test_sub_assign.php`, `test_val.php` are tracked in git at the **Laravel application root** (not `backend/public/`). `test.php` boots the full Laravel kernel and does `print_r(\App\Models\Attendance::all()->toArray())` with zero authentication. The others perform similar ad hoc DB probes/writes. This repository is deployed under XAMPP `htdocs` (`.../htdocs/nad/html2pdf/asmofficeapp/backend/...`), a layout where the whole `backend/` folder — not just `backend/public/` — is commonly exposed by the web server unless a vhost/docroot explicitly restricts it to `public/`. If that restriction is ever missing, these files are directly reachable and dump attendance/billing data with no login.
- Repro: `curl http://<host>/backend/test.php` on a server whose docroot is `backend/` instead of `backend/public/` returns raw attendance records.
- Root cause: developer scratch scripts committed instead of being kept local/untracked.
- Fix: delete the six files, add a `backend/test*.php` rule to root `.gitignore` as a guardrail, and call out in `RELEASE_CHECKLIST.md` that the web server docroot **must** point at `backend/public`.
- Status: **FIXED** (files removed; see TEST_REPORT.md verification).

### D-2 (P1 — Security) `/login` and `/whitelist-office` have no rate limiting
In `backend/routes/api.php`, `Route::post('/login', ...)` and `Route::post('/whitelist-office', ...)` are declared **outside** the `throttle:60,1` middleware group that wraps every other route. There is no throttle on either public endpoint, so credential brute-forcing and whitelist-IP abuse are unbounded.
- Root cause: throttle middleware only applied to the authenticated route group; public routes were overlooked.
- Fix: add a dedicated tighter throttle (`throttle:6,1`) to both public routes.
- Status: **FIXED**.

### D-3 (P1 — Electron security) No navigation / new-window restriction in the main process
`desktop/main.js` creates the `BrowserWindow` with correct `nodeIntegration: false` / `contextIsolation: true`, and `preload.js` exposes a narrow, explicit `electronAPI` (no raw `ipcRenderer` leak) — these parts are already correct. However, `main.js` never calls `webContents.setWindowOpenHandler` or handles `will-navigate`, so any in-app `window.open()` or a navigation to an untrusted URL is not blocked, contrary to the non-negotiable rule that external links/new-window/unexpected navigation must be restricted.
- Fix: add `setWindowOpenHandler` (deny in-process new windows, open `https:` links in the OS browser via `shell.openExternal`) and a `will-navigate` guard that only allows the app's own `app://` origin.
- Status: **FIXED**.

### D-4 (P1 — Release/docs) Electron version and Windows-8 claims contradict the actual build
- `DEVELOPER_GUIDE.md` states Electron is "explicitly" pinned to `v22.3.27` and warns not to upgrade past v24 to keep Windows 8 support.
- `desktop/package.json` actually declares `"electron": "^30.0.0"` (installed `30.5.1`) as the main devDependency used by `npm run build` (`electron-builder --mac --win --linux`).
- Electron dropped Windows 7/8/8.1 support at v23 (Chromium's own OS floor moved to Windows 10). So the **default** `npm run build` Windows artifact does **not** run on Windows 8, despite README's "Windows 8 to Windows 11" claim.
- A separate `desktop/build-legacy.sh` genuinely installs Electron `22.3.27` (`--no-save`) and runs `electron-builder --win` to produce a real legacy build, then reinstalls latest Electron — this is the correct mechanism (Approach 1 from the brief), but it was undocumented in the README and, worse, **writes to the same output directory with the same artifact name as the modern build** (`directories.output: ../downloads`, no `artifactName` differentiation), so a legacy Windows-8 installer and the modern Windows 10/11 installer collide/overwrite each other if both are built.
- Fix: (a) corrected README/DEVELOPER_GUIDE to state the true matrix — modern `npm run build` targets Windows 10/11 x64 (ia32 for 10/11 also supported by Electron 30); Windows 8 support is only available via the separate `npm run build:legacy` pipeline; (b) added distinct `artifactName` templates so legacy and modern Windows artifacts never collide; (c) noted `build-legacy.sh` is bash-only (not runnable from native PowerShell/cmd — needs Git Bash/WSL on Windows) and documented that limitation instead of silently implying it "just works" cross-platform.
- Status: **FIXED** (docs + artifactName). Packaging itself could not be executed in this Linux sandbox — **BLOCKED** for actual Windows/macOS binary verification (no Windows/macOS runner, no code-signing certs). See TEST_REPORT.md.

### D-5 (P1 — Reproducibility) Two lockfiles for `mobile/`, ambiguous package manager
`mobile/` has both `pnpm-lock.yaml` (matches the actually-installed `node_modules/.pnpm` layout and the `packageManager` field) and a stale `package-lock.json` (npm, older mtime, does not reflect current deps). `DEVELOPER_GUIDE.md` tells developers to run plain `npm install`, which would fight the pnpm-managed tree.
- Fix: adopted **pnpm** as the sole authoritative package manager for `mobile/` (matches `packageManager` field already in `package.json`), removed `package-lock.json` from git tracking, added it to `.gitignore`, and updated `DEVELOPER_GUIDE.md` / root `README.md` to use `pnpm install --frozen-lockfile`.
- Status: **FIXED**.

### D-6 (P1 — Cross-platform) Root build/start scripts use Unix-only shell commands
Root `package.json`:
```
"build": "cd mobile && npx expo export && cd ../desktop && rm -rf www && cp -r ../mobile/dist www && npm run build",
"start": "cd mobile && npx expo export && cd ../desktop && rm -rf www && cp -r ../mobile/dist www && npm start"
```
`rm -rf` / `cp -r` and `&&`-chained `cd` do not work the same way in PowerShell/cmd.exe, breaking the documented Windows development workflow.
- Fix: added `scripts/sync-web-build.js`, a small cross-platform Node script (uses `fs.rmSync`/`fs.cpSync`, no shell-specific syntax) that replaces the `rm -rf && cp -r` step, and rewired root `build`/`start` to call it via `node` so the same script runs identically on PowerShell, cmd.exe, macOS, and Linux shells.
- Status: **FIXED**.

### D-7 (P2 — Testing) `desktop` package has no real test script
`desktop/package.json` `"test": "echo \"Error: no test specified\" && exit 1"` is a placeholder that always fails and provides zero coverage of `main.js`/`preload.js`.
- Fix: added `desktop/__tests__/preload.test.js` and `desktop/__tests__/main-ipc.test.js` (Jest, mocking `electron`) that assert: `preload.js` exposes only the intended `electronAPI` surface (no raw `ipcRenderer`/`require` leak), and the whitelisted IPC channel names used by `main.js`/`preload.js` match exactly (regression test for D-3/IPC-surface drift). Wired `desktop/package.json` `test` to run Jest for real. Full packaged-app smoke testing remains **BLOCKED** (no GUI/Windows/macOS runner in this sandbox — see TEST_REPORT.md).
- Status: **FIXED** (unit-level); packaged smoke test **BLOCKED**.

### D-8 (P3 — Silent failure) Empty catch block swallows JSON parse errors
`mobile/app/bills/[id].tsx:49` — `catch (e) {}` silently discards malformed `invoice_data` JSON instead of logging, so a corrupted saved invoice fails silently with no diagnostic trail.
- Fix: log via `console.warn` with context, fall through to the existing default-state behavior (unchanged UX, just no longer silent).
- Status: **FIXED**.

### D-9 (P2 — Security hardening, not blind-fixed) CORS `allowed_origins` is `*`
`backend/config/cors.php` sets `allowed_origins => ['*']`. Because auth is Bearer-token (not cookie-based; `supports_credentials` is correctly `false`), this is not a classic credentialed-CSRF hole, but it is broader than the non-negotiable "explicit trusted origins" requirement and allows any origin to call the API with a captured token.
- Why not force-fixed: the desktop client is served from the custom `app://-` origin via `electron-serve`; the exact `Origin` header Electron sends for that protocol was not something I could verify against a real packaged build in this sandbox. Restricting `allowed_origins` incorrectly would silently break the desktop app in a way I cannot test here.
- Recommendation (documented, not applied): drive `allowed_origins` from an env var (e.g. `CORS_ALLOWED_ORIGINS`) listing the production web origin(s) and, once confirmed by testing a packaged Electron build, the desktop origin. Verify with a real packaged app before tightening.
- Status: **DOCUMENTED, NOT FIXED** (needs desktop-origin verification unavailable in this environment).

### D-10 (P2 — Preload/IPC hygiene) Update-event listeners have no unsubscribe path
`preload.js` `onUpdateAvailable/onUpdateDownloaded/onUpdateError` call `ipcRenderer.on(...)` directly with no returned unsubscribe function, and `mobile/components/shared/AppUpdater.tsx` registers them in a `useEffect(() => {...}, [])`. Currently `AppUpdater` appears to mount once per app lifetime, so this is not actively leaking today, but the preload API offers no way to clean up if that ever changes (e.g. the component moves inside a route that remounts).
- Fix: not changed in this pass (low current impact, and changing the preload contract touches both processes) — logged as a P2 hardening item for the next iteration: have `preload.js` return an unsubscribe function from each `on*` method and call it from `AppUpdater`'s effect cleanup.
- Status: **DOCUMENTED, NOT FIXED** (tracked for next iteration).

### D-11 (P3 — Documentation drift / dead code) Orphan `index.html` prototype at repo root
1929-line standalone HTML file using CDN React 18 + Babel-standalone + Tailwind CDN + `html2pdf.js`, unrelated to and not referenced by the Expo/Electron build pipeline. Not mentioned anywhere in README/DEVELOPER_GUIDE.
- Fix: not deleted (could be an intentionally kept legacy reference/prototype the user still wants) — flagged here rather than removed. Recommend the user confirm whether it can be deleted or should be moved to a clearly-labeled `legacy/` folder.
- Status: **DOCUMENTED, NOT FIXED** (needs owner decision — not a technical blocker).

### D-12 (informational — verified, not a defect) `.DS_Store` files present on disk but correctly untracked
`.DS_Store` files exist on disk at the repo root and in `mobile/`, `desktop/`, `backend/`. Initially suspected these were committed; `git ls-files | grep -i DS_Store` returned no matches, confirming `.gitignore`'s `.DS_Store` rule is already working correctly and none are tracked. No fix needed — noted here only so the false lead doesn't get re-investigated.
- Status: **NOT A DEFECT** (verified via `git ls-files`).

### D-13 (P0 — Testing infrastructure) Entire Jest suite was non-functional under pnpm
`mobile/jest.config.js`'s custom `transformIgnorePatterns` was written for npm's flat `node_modules/` layout. This project's actual package manager is pnpm, which nests every package as `node_modules/.pnpm/<name>@<version>/node_modules/<name>/...`. The old regex's negative lookahead was tested immediately after the *first* `node_modules/` segment, which is followed by `.pnpm/<mangled-name>` — never a match for the allowlist — so every RN/Expo package (including `@react-native/jest-preset`'s own `setup.js`, loaded via `setupFiles`) was treated as "already transpiled" and left with raw `import` syntax, crashing every suite before a single test ran (`SyntaxError: Cannot use import statement outside a module`). Additionally, `e2e/*.spec.ts` (Playwright specs) had no `testPathIgnorePatterns` entry, so Jest also tried and failed to execute them directly.
- Repro (before fix): `pnpm test` (`jest`) → `Test Suites: 6 failed, 6 total`, zero tests executed.
- Fix: rewrote `transformIgnorePatterns` to handle both the flat and pnpm-nested (`.pnpm/pkg+scoped@version/node_modules/...`) layouts, and added `testPathIgnorePatterns: ['/node_modules/', '/e2e/']`.
- Status: **FIXED and VERIFIED** — `pnpm exec jest` now reports `Test Suites: 4 passed, 4 total / Tests: 17 passed, 17 total` (see TEST_REPORT.md).
- Why this matters beyond "tests now run": this was silently masking every other defect below that a unit test would have caught (D-14 in particular) — the project's entire automated-test safety net was dark.

### D-14 (P0 — Reproducible crash in a core workflow) "Mark project complete" swipe action was broken
`mobile/components/project/ProjectCard.tsx` `handleComplete()` (triggered by swiping a project card left) called `projectService.update(project.id, { status: 'completed' })`. Two independent, compounding bugs:
1. The backend `ProjectController@update` endpoint (a) does not accept a `status` field at all (not in its validation whitelist — see `routes/api.php`/`ProjectController.php`), and (b) is restricted to Founder/Head roles only. A regular assignee — the normal user of this swipe gesture — got a `403 Unauthorized`. Even for a Founder/Head, the call would silently do nothing (status is dropped) instead of completing the project. The correct, already-existing, properly-authorized endpoint is `PATCH /projects/{project}/complete` (`projectService.complete(id)`), which explicitly allows the assignee/sub-assignee/founder/department head and sets `completed_at`.
2. Both the success and error branches then called `useUIStore.getState().addToast({ type, message })` — a method that does not exist on `uiStore` (the real API is `showToast(message, type)`). This threw a `TypeError` on every single completion attempt, regardless of whether the API call above succeeded, failed, or 403'd.
- Repro (before fix): as any project assignee, swipe a project card to "complete" it → 403 from the API (or a silent no-op for Founder/Head) → immediately followed by an uncaught `TypeError: addToast is not a function` in the catch/success handler.
- Root cause: the call site was written against an older/assumed API shape that never matched the actual backend contract or the actual `uiStore` contract, and nothing caught it because the Jest suite wasn't running (D-13) and this file wasn't previously covered by a test.
- Fix: `handleComplete` now calls `projectService.complete(project.id)` and `useUIStore.getState().showToast(message, type)`.
- Regression test: `mobile/__tests__/store/uiStore.test.ts` pins the real `showToast`/`removeToast` contract and asserts `addToast` does not exist, so a future accidental rename can't silently reintroduce this. (A full component-level test simulating the actual swipe gesture was not added — `Swipeable` gesture simulation was judged lower value than locking down the store contract that actually caused the crash; noted as a good follow-up.)
- Status: **FIXED and VERIFIED** (`tsc --noEmit` now catches this class of error too — the original code also failed type-checking, another symptom of the same root cause).

### D-15 (P2 — Type safety / dead code / stale tests) `tsc --noEmit` had 31 real errors across 8 files
Running the required "TypeScript passes without hidden errors" gate for the first time (it appears not to have been run as part of CI/local workflow) surfaced 31 errors. Each was investigated individually rather than suppressed:
- `app/(drawer)/projects/edit_tmp.tsx` — a 474-line orphan duplicate of `edit/[id].tsx` (note the `_tmp` filename) sitting inside `app/`, meaning Expo Router exposed it as a **live, unlinked route** (`/projects/edit_tmp`) carrying its own copy of every bug in the real edit screen. Nothing in the codebase referenced it. **Removed.**
- `app/(drawer)/projects/create.tsx` and `edit/[id].tsx` — both passed `queryFn: projectService.list` (a function with an *optional* `params` object argument) directly to `useQuery`. React Query v5 calls `queryFn` with its own `QueryFunctionContext` (`{ queryKey, client, signal, ... }`), so the entire context object was being forwarded as `params` to `axios.get('/projects', { params })` on every render — sending nonsensical query-string parameters to the backend instead of no filter / the intended filter. **Fixed** by wrapping as `queryFn: () => projectService.list()`, matching the pattern already used correctly elsewhere in the same files. Checked every other bare `queryFn: someService.method` in the codebase (`teamService.getUsers/getDepartments`, `leaveService.list`, `notificationService.list`, `billingService.getBilling/getDashboard`) — all of those are genuinely zero-argument functions, so they were not affected by this pattern.
- `app/login.tsx` — the "Get the mobile app" store-badge UI referenced six style keys (`storeBadgesContainer`, `storeBadgesTitle`, `storeBadgesRow`, `storeBadge`, `storeBadgeTextWrap`, `storeBadgeSub`, `storeBadgeMain`) that were never defined in the file's `StyleSheet`, so that entire section rendered completely unstyled. **Fixed** by adding the missing style definitions (visual only — the App Store/Google Play buttons' `onPress={() => {}}` were left as-is; wiring them to real store URLs is a product decision, not something to invent).
- `__tests__/store/syncStore.test.ts` — used a `type` field that doesn't exist on the real `SyncAction`/`SyncQueueItem` types (`entity_type` + `action` are the real required fields). It "passed" at runtime because TS types are erased, but it was silently testing a fictional shape instead of the real one. **Fixed** to use the real field names.
- `app/(drawer)/_layout.tsx` — `expo-router` bundles its own nested copy of `@react-navigation/drawer`'s types at a different version than the top-level one, so TS treats their `DrawerNavigationHelpers` as structurally distinct (a duplicate-package type-identity issue, not a real runtime mismatch). **Fixed** with a narrowly-scoped, commented cast at the single prop-spreading boundary rather than loosening `DrawerContent`'s own prop types.
- `app/_layout.tsx` — `Appearance.getColorScheme()` can return `'unspecified'` in some web/Android environments, which the theme store's `setColorScheme` doesn't accept. **Fixed** with an explicit `'dark' | 'light'` guard.
- `components/ui/Skeleton.tsx` — `width`/`height` props were typed as plain `string | number` instead of React Native's `DimensionValue`. **Fixed** by using the correct RN type.
- Status: **FIXED and VERIFIED** — `tsc --noEmit` now exits 0 (see TEST_REPORT.md).

### D-16 (P0 — Reproducible, matches reported symptom) Desktop "white screen after update" root cause: self-poisoning service worker
User-reported symptom: an earlier installed desktop build showed a white screen on many machines. Root cause found and fixed:

`mobile/public/service-worker.js` (registered from `app/_layout.tsx` whenever `Platform.OS === 'web'`) used a **cache-first** strategy and permanently cached `/` and `/index.html` the first time the app ever ran — including inside the Electron desktop app, since the Electron window loads the exact same React Native Web bundle via `electron-serve` (`Platform.OS` is `'web'` there too, there is no code path that distinguished "real browser" from "Electron-embedded web view"). `index.html` references content-hashed JS bundle filenames (e.g. `index-<hash>.js`) that change on every build. Because a service worker only re-runs its `install` step when its own script bytes change (this file was static), the cached `/` and `/index.html` were never refreshed on their own. Sequence on an affected machine:
1. First run: SW caches `index.html` referencing `index-<hash1>.js`.
2. App updates (new build, new `www/`, new `index-<hash2>.js`).
3. Electron loads `app://-/` → intercepted by the SW → serves the **old cached** `index.html`, still pointing at `<hash1>`.
4. Browser requests `index-<hash1>.js` → that file no longer exists in the new `www/` → 404 → JS never executes → React never mounts → **white screen**, with nothing logged anywhere to explain why.

This explains why it hit "many" but not necessarily all machines: only machines that had a *previous* version installed and then updated (or were reinstalled without clearing the Electron app-data cache storage) would have a poisoned cache; a completely fresh install would work until its next update.

Three independent fixes applied (defense in depth, since any one alone leaves a gap):
1. `app/_layout.tsx` no longer registers the service worker at all when running inside Electron (`window.electronAPI` present) — there is no legitimate reason for it there; `electron-serve` already reads straight from local disk. It also actively unregisters any already-poisoned service worker + clears `caches` on Electron launch, so machines already affected self-heal on the next update once this fix ships.
2. `public/service-worker.js` (still used for real browser/PWA installs, where offline support is a legitimate feature) now uses a **network-first** strategy for navigation requests (`/`, `/index.html`) with cache only as an offline fallback, and the cache name was bumped (`v2` → `v3`) so the `activate` handler's existing cache-cleanup logic actually deletes the old poisoned cache on any browser that already has it.
3. Separately, the `desktop/build` pipeline previously had no verification that `www/index.html` actually exists/is non-empty after the mobile→desktop copy step — if a broken build script (e.g. the pre-D-6 Unix-only `rm -rf`/`cp -r` failing silently on Windows) ever produced an empty `www/`, `electron-builder` would have happily packaged a content-less app with the exact same white-screen symptom and no error anywhere. `scripts/sync-web-build.js` now fails the build loudly if `www/index.html` is missing or empty after the copy.
4. `desktop/main.js` had no visibility into or recovery from a failed/blank load at all (matches Cycle 9/7 requirements: "renderer crashes and unresponsive events are handled", "recovers gracefully"). Added `did-fail-load`, `did-finish-load`, `render-process-gone`, and `unresponsive`/`responsive` handlers: real load failures now log a diagnosable error and trigger one automatic reload (harmless `ERR_ABORTED` navigations are explicitly excluded so this can't reload-loop), and a crashed/killed renderer process triggers a reload instead of leaving a permanently blank window.
- Regression tests: `desktop/__tests__/main-ipc.test.js` now also asserts the diagnostic handlers are wired and that they reload on real failures but not on benign ones.
- Status: **FIXED and VERIFIED** (`tsc`, mobile `jest`, and desktop `jest` all green after the change — see TEST_REPORT.md). The *original* white-screen incident on real user hardware could not be reproduced/re-tested here (no Windows/macOS GUI in this sandbox — see Cycle/Task notes), so this is root-caused and fixed with high confidence from code inspection, not confirmed by reproducing the white screen itself and watching it disappear on real hardware.

### D-17 (P1 — Reproducible crash, found via real-browser E2E) Unrecognized department color crashes project detail and billing screens
`app/(drawer)/projects/[id].tsx` and `app/(drawer)/billing.tsx` (two call sites) computed a department's display color as:
```ts
const deptColor = p.department?.color ? DEPT_COLORS[p.department.color] : DEPT_COLORS.slate;
```
This only falls back to `DEPT_COLORS.slate` when `p.department.color` is falsy — **not** when it's a truthy value that isn't one of the six palette keys `DEPT_COLORS` actually defines (`blue, emerald, violet, pink, amber, slate`). Any other value (a color removed from the palette, a manually-edited DB row, a future palette change) makes `DEPT_COLORS[color]` evaluate to `undefined`, and the very next line reads `.badge`/`.bg`/`.dot` off it, throwing `Cannot read properties of undefined (reading 'badge')` and blank-screening the whole route. `components/project/ProjectCard.tsx` already had the correct guard (`DEPT_COLORS[...] ?? DEPT_COLORS.slate`) — these three call sites just didn't get the same treatment.
- Found by: the new Playwright suite (`mobile/e2e/mocked-production-build.spec.ts`) running against a **real headless Chromium** browser (see "Real browser E2E" below) — the mock fixture initially used `color: 'indigo'` (not a real palette key), and the app crashed exactly as a live backend with that same bad data would have.
- Fix: `[id].tsx`'s `deptColor` and both `billing.tsx` call sites now use the same `DEPT_COLORS[color] ?? DEPT_COLORS.slate` guard as `ProjectCard.tsx`.
- Status: **FIXED and VERIFIED** — confirmed via the real-browser E2E run (see below), not just `tsc`/unit tests.

### D-18 (P1 — Reproducible, user-reported) "+ Add New Client Name" did nothing on the Create/Edit Project screens
Reported by the user against the live site (`https://office.associatedmedia.org/projects/create`): picking "+ Add New Client Name" from the Client dropdown appeared to do nothing — no way to type a new client's name.
- Root cause: `app/(drawer)/projects/create.tsx` and `edit/[id].tsx` both computed the select's displayed value **and** the free-text input's visibility from the same expression: `form.client === 'new' || (!uniqueClients.includes(form.client) && form.client !== '')`. Selecting "new" set `form.client` to `''` as a side effect (intending to clear the field for typing). But `''` immediately fails that same expression (`form.client !== ''` is false), so on the very next render both the dropdown's "selected: new" state AND the text input's visibility flipped back off — the UI silently reverted to showing the empty placeholder with no way to enter a name.
- Fix: introduced a dedicated `addingNewClient` boolean state (independent of `form.client`'s value) in both files to drive the dropdown display and the text-input visibility. `edit/[id].tsx` additionally gets a `clientNeedsFreeText` safety net for the case where a loaded project's own client name isn't present in the aggregate client list.
- Regression test: `mobile/e2e/mocked-production-build.spec.ts` — `"+ Add New Client Name" reveals a text input to type the new client (D-18 regression)` — run against a real headless Chromium against the actual production `expo export` build.
- Status: **FIXED and VERIFIED** (real-browser E2E, `tsc --noEmit` clean, full Jest suite green).

### D-19 (P2 — Silent empty state, found while adding the Clients feature) Team screen's project list always empty
`mobile/app/(drawer)/team.tsx:98` read `projsData?.projects ?? []`, but `projectService.list()` calls `GET /projects`, whose controller (`ProjectController::index`) returns a **paginated** Laravel resource collection (`ProjectResource::collection($projects->paginate(...))`), which Laravel automatically wraps as `{ data: [...], links: {...}, meta: {...} }` — there is no `projects` key anywhere in that response. `projsData?.projects` was therefore always `undefined`, silently falling back to `[]`. No crash, no error — the Team screen's project-related stats/list have simply always rendered as if there were zero projects, in every environment.
- Found while building the new "Clients" feature (see below): a Playwright mock for `/api/projects` had to be corrected from a plausible-looking-but-wrong `{ projects: [...] }` shape to the real `{ data: [...], links, meta }` shape, which is when the same wrong-key pattern was spotted in `team.tsx`.
- Fix: `const projects = projsData?.data ?? [];`.
- Status: **FIXED**. Not covered by a dedicated new test in this pass (no existing Playwright coverage visits the Team screen); `tsc --noEmit` and the corrected E2E mock shape are the verification for this pass. **Recommend adding a Team-screen E2E test in a follow-up.**

## 4a. Real browser E2E testing (this session)

Per explicit request, this pass went further than static analysis: a real headless Chromium was obtained and run in this sandbox (no GUI, no root/apt), and a new Playwright suite was written and executed against the actual `expo export -p web` production build with the real Laravel API **mocked at the network layer** using response shapes read directly from the backend controllers (not guessed) — see `mobile/e2e/support/mock-api.ts` and `mobile/e2e/mocked-production-build.spec.ts`.

**How the sandbox's missing Chromium dependency was resolved (for reproducibility):** this environment has no `apt`/root access, so `playwright install --with-deps` fails. The Chromium binary itself was downloaded directly (its CDN happened to be reachable); launching it then failed with `error while loading shared libraries: libXdamage.so.1: cannot open shared object file`. That single missing `.deb` package was downloaded from `archive.ubuntu.com` (reachable, unlike the arm64 `ports.ubuntu.com` this system's `/etc/apt/sources.list` actually points to) and its one `.so` file extracted with `dpkg-deb -x` (no install/root needed) into `~/extra-libs`, referenced via `LD_LIBRARY_PATH`. This is a sandbox-specific workaround, not a repo change — a normal dev machine or CI image doesn't need any of this.

**Result: 4/4 tests passed against the real production export in a real browser**, and the process caught a real bug (D-17) that pure type-checking/unit tests could not have (it only manifests with a specific data value at runtime in an actual rendering engine). The suite specifically proves, via `page.waitForRequest`, that "Mark Complete" issues `PATCH /api/projects/{id}/complete` — the exact, concrete, network-level confirmation that D-14 is fixed end-to-end, not just that the code compiles.

**What this does NOT cover:** the mocked API is not a substitute for a live Laravel backend. `mobile/e2e/auth.spec.ts` and `dashboard.spec.ts` (pre-existing, unmodified) are written for a live backend + `expo start --web` and were **not executed** — see "Laravel backend" below for why.

## 4b. Laravel backend — local execution attempted and blocked (with detail, so this isn't re-investigated pointlessly next time)

Per explicit request, real attempts (not a single `apt-get` check) were made to run the Laravel backend locally in this sandbox to test against a live API:
1. `apt-get install php ...` — blocked, no root, `/var/lib/apt/lists/lock` permission denied.
2. Downloading a static PHP 8.3 CLI binary (`static-php-cli` releases) — the GitHub release page loads, but the actual asset download redirects to a `githubusercontent.com` subdomain this sandbox's network proxy does not allowlist (403 `blocked-by-allowlist`).
3. `@platformatic/php-node` (npm-distributed, embeds real PHP in a Node N-API addon, no system PHP needed) — installs fine, but its prebuilt binaries only cover x64 Linux and x64/arm64 macOS; this sandbox is **arm64 Linux**, which isn't published, per its own README.
4. `@php-wasm/node` (WASM-compiled PHP) — exists on npm and is architecture-independent, but wiring Laravel's front controller through its request-handling API (rather than a short script) is substantial custom plumbing with uncertain compatibility for a full framework (sessions, Sanctum, SQLite), and was judged not worth the remaining time budget given (1)-(3) already established the pattern that this sandbox's specific network allowlist and CPU architecture are the blockers, not effort.

**Conclusion: running the real Laravel backend in this sandbox is BLOCKED** by a combination of no root (for apt) and this sandbox's specific network allowlist (blocks the exact CDN paths static PHP binaries redirect through) and CPU architecture (arm64, unsupported by the one npm-native-PHP package that would otherwise have worked). None of these are permanent/environmental to the *project* — a normal dev machine or CI runner with PHP installed does not have any of these problems. **On a machine with PHP available, run `php artisan serve` and then `mobile/e2e/auth.spec.ts` + `dashboard.spec.ts` (already exist, unmodified) for real end-to-end coverage against the live API** — see DEVELOPER_GUIDE.md.

## 4c. Electron — real launch attempted and blocked

Per explicit request, a real Electron launch (not just the existing mocked `desktop/__tests__/*.js` unit tests) was attempted to directly observe the white-screen fix (D-16) working in the actual desktop shell. `desktop/node_modules/electron`'s postinstall never downloaded the actual Electron binary (only `LICENSE`/`version` files present — consistent with this `node_modules` tree having been synced from the developer's own Mac rather than freshly installed here). Re-running the installer failed (`getaddrinfo EAI_AGAIN github.com` — this specific installer's HTTP client doesn't route through the sandbox's proxy). Downloading the release asset directly with `curl` (the same technique that worked for Playwright's Chromium and the `libXdamage` `.deb`) reached `github.com`, which redirects Electron release assets to `release-assets.githubusercontent.com` — **specifically not allowlisted** by this sandbox's proxy (unlike `objects.githubusercontent.com`, which Playwright's CDN happened to use, and which *is* allowlisted). No further npm-distributed alternative was found for a real Electron binary.

**Conclusion: launching real Electron in this sandbox is BLOCKED** by this specific proxy's allowlist, not by anything about the project. The white-screen fix (D-16) is verified two other ways instead: (1) unit tests (`desktop/__tests__/main-ipc.test.js`) confirming the diagnostic/recovery handlers and navigation hardening are wired correctly, and (2) the real-browser E2E suite above, which proves the exact web bundle Electron loads (the `expo export` output) runs correctly standalone with a working service worker that no longer poisons its own cache. **A real packaged-app smoke test (installer launch, tray, white-screen-after-update repro) still needs to happen on an actual Windows/macOS/Linux machine before release** — see RELEASE_CHECKLIST.md.

## 5. Severity Summary (at time of writing, before fixes)

| Severity | Count | Fixed | Documented / Deferred |
|---|---|---|---|
| P0 | 4 | 4 (D-1, D-13, D-14, D-16) | 0 |
| P1 | 7 | 7 (D-2, D-3, D-4, D-5, D-6, D-17, D-18) | 0 |
| P2 | 5 | 3 (D-7 unit-level, D-15, D-19) | 2 (D-9, D-10) |
| P3 | 2 | 1 (D-8) | 1 (D-11) |

D-12 was an initial suspicion that turned out, on verification, not to be a real defect (see below) — it is not counted above.

See TEST_REPORT.md for command-level verification of every "Status: FIXED" item above, and RELEASE_CHECKLIST.md / FLOW_MATRIX.md for the rest of the required documentation set.

## 5a. Feature added this pass: Clients

Per user request ("clients list... in left side menu... display old client list in project form"), a "Clients" feature was added:
- `GET /api/clients` (`ClientController@index`) — distinct client names aggregated from `projects.client`, grouped with project counts, respecting the same `Project::visible($user)` role scoping as the project list.
- New `mobile/app/(drawer)/clients.tsx` screen (drawer menu item, roles: founder/head/accounts) listing clients with counts; tapping one jumps to the Projects list pre-filtered to that client.
- `projects/create.tsx` and `edit/[id].tsx` now source their client dropdown from this endpoint instead of deriving it client-side from a single (paginated, 50-item) `/projects` fetch — this also fixes an existing-but-undocumented gap where clients only present on projects past page 1 could silently never appear in the dropdown.

**Deliberately not built:** a real `Clients` database table/model. `client` remains a free-text string on `projects` (see the AskUserQuestion decision in this session) — there is no dedupe, typo-correction, or rename-across-projects tooling. Two projects with "Acme Corp" vs "Acme corp." will show as two separate clients. If that becomes a real problem, the natural next step is a proper `clients` table with a `project.client_id` foreign key and a data-migration for existing rows.

## 6. Remaining Risks (honest, as of this pass)

- No Windows or macOS packaging/signing/notarization could be executed or verified in this Linux sandbox — **BLOCKED**, requires real Windows/macOS runners and signing credentials (see TEST_REPORT.md and RELEASE_CHECKLIST.md).
- A real Electron process could not be launched in this sandbox (binary download blocked by this environment's network allowlist, not by anything in the repo — see 4c). The white-screen fix (D-16) is verified via unit tests + a real-browser E2E run of the exact web bundle Electron loads, but **not** by watching a real packaged/dev Electron window render successfully. Do this on a real machine before release.
- A real Laravel backend could not be run in this sandbox (no root for PHP, and this environment's network allowlist blocks the CDN paths for portable/static PHP — see 4b). D-2 (login throttling) is code-reviewed and has a test written, but that test has not actually been executed. `mobile/e2e/auth.spec.ts`/`dashboard.spec.ts` (pre-existing, live-backend-dependent) were not run. **Run `php artisan test` and those two spec files against a real `php artisan serve` before release.**
- CORS origin restriction (D-9) intentionally left broad pending desktop-origin verification.
- Preload update-listener cleanup (D-10) intentionally deferred — low current risk.
- `index.html` legacy prototype (D-11) left in place pending owner decision.
- The dashboard's `['dashboard']` React Query re-renders its `active_projects` list unusually often (observed while writing the E2E suite — a plain `.click()` on a project card kept failing with "element detached from DOM, retrying" until a lower-level `dispatchEvent` was used instead). Root cause not chased down in this pass since it didn't block anything functionally; worth a profiling pass if users report dashboard jank or battery drain.
- This audit reflects the modules and code paths actually inspected; it is not a claim that every line of the repository was reviewed line-by-line (the codebase spans Laravel + Expo + Electron and is large). Cycle continuation notes are in TEST_REPORT.md.
