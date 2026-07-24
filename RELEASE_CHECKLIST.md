# OfficeHub — Release Checklist

Use this for every release. Items marked (manual) require a human decision; items marked (cmd) are copy-pasteable.

## 1. Pre-flight

- [ ] `git status` clean, on `main`, all intended PRs merged.
- [ ] Review `PRODUCTION_AUDIT.md` — confirm no open P0/P1 items for the areas touched by this release.
- [ ] Decide the target version number (see versioning below).

## 2. Version bump (single source of truth: `mobile/package.json`)

- [ ] Bump `mobile/package.json` `"version"`.
- [ ] Run: `node sync-versions.js` (cmd) — copies the version into `desktop/package.json`. Root `package.json`'s own `"version"` is currently independent (`office-hub`, `1.1.7` at time of writing) — decide (manual) whether to also sync it or drop it, since it isn't read by any build script today.
- [ ] Confirm `app.json` (Expo config) version/build numbers are updated if it tracks its own version field.
- [ ] Tag the release in git only after the checklist below passes: `git tag vX.Y.Z && git push --tags` (cmd).

## 3. Backend (Laravel)

- [ ] `composer install --no-dev --optimize-autoloader` (cmd, production).
- [ ] Review pending migrations: `php artisan migrate:status` (cmd). Never run `migrate:fresh`/`migrate:refresh` against a production database.
- [ ] **Back up the database before this specific release**: `2026_07_24_000002_add_client_id_to_projects_table` does a one-time data backfill (creates a `clients` row per distinct existing `projects.client` string, merging case/whitespace variants into one canonical client, then links every project's new `client_id`). Like any migration, Laravel's `migrations` table prevents it from re-running automatically — but it is **not** safe to manually re-run against an already-migrated database (it would create duplicate `clients` rows), so don't roll it back and reapply casually. Back up first regardless, since it touches every existing project row.
- [ ] `php artisan migrate --force` (cmd, production only, after a DB backup).
- [ ] Confirm `.env` in production has `APP_ENV=production`, `APP_DEBUG=false`, a real `APP_KEY`, and correct `SANCTUM_STATEFUL_DOMAINS`/CORS origins for the actual deployed frontend domain(s).
- [ ] Confirm the web server document root is `backend/public` — **not** `backend/`. (This is the exact condition that made D-1's debug scripts a real exposure risk.)
- [ ] Run the test suite: `php artisan test` or `vendor/bin/phpunit` (cmd) — must be green. **Not verified in this audit environment (no PHP available) — must be run before shipping.**
- [ ] `composer audit` (cmd) for known-vulnerable dependencies.
- [ ] Clear/rebuild caches: `php artisan config:cache && php artisan route:cache` (cmd, production).

## 4. Frontend (Expo web export)

- [ ] `cd mobile && pnpm install --frozen-lockfile` (cmd).
- [ ] `pnpm exec tsc --noEmit` (cmd) — must exit 0.
- [ ] `pnpm test` (cmd, Jest) — must be all green.
- [ ] `pnpm exec expo export -p web` (cmd) — must complete without errors.
- [ ] `pnpm test:e2e` (cmd, Playwright) against a locally-served production export **and** a real backend — must be green. (Not run against a live backend in this audit; requires PHP.)
- [ ] Spot-check the exported build in an actual browser for console errors (not just HTTP 200).

## 5. Desktop packaging

- [ ] From repo root: `npm run build` (cmd) — runs `expo export`, `scripts/sync-web-build.js`, then `electron-builder --mac --win --linux`.
- [ ] **Windows 10/11** (x64 + ia32): build on a Windows machine or Windows CI runner. Verify the installer launches, the app isn't blank, tray/notifications work.
- [ ] **Windows 8/8.1 (legacy, best-effort)**: from `desktop/`, run `npm run build:legacy` (Git Bash/WSL required on Windows — this script does not run under plain PowerShell/cmd.exe). Verify the artifact filename is the `Win8Legacy` variant and does not overwrite the mainline installer. This path has not been validated on real Windows 8 hardware/VM as part of this audit.
- [ ] **macOS**: build on a macOS machine or macOS CI runner (`electron-builder --mac`). Verify DMG mounts and the app launches (Gatekeeper will block an unsigned/unnotarized build on other people's Macs — see signing below).
- [ ] **Linux**: build the AppImage (works from this Linux sandbox in principle, but was not executed in this audit due to time — see TEST_REPORT.md). Verify it launches and is marked executable.
- [ ] Confirm build artifacts land in `downloads/` with version+arch in the filename (per `artifactName` set in `desktop/package.json`).
- [ ] Generate checksums for each artifact (e.g. `shasum -a 256 downloads/*` (cmd)) and include them in the release notes.

## 6. Signing & notarization (manual, requires credentials this audit does not have)

- [ ] **Windows code signing**: obtain an EV or standard code-signing certificate; configure `electron-builder`'s `win.certificateFile`/`certificatePassword` (or `CSC_LINK`/`CSC_KEY_PASSWORD` env vars) in CI. Unsigned Windows builds will trigger SmartScreen warnings.
- [ ] **Apple signing & notarization**: requires an active Apple Developer account, a Developer ID Application certificate, and `electron-builder`'s notarization config (`APPLE_ID`/`APPLE_APP_SPECIFIC_PASSWORD`/`APPLE_TEAM_ID` env vars, or `notarize: true` with `electron-builder`'s built-in notarytool integration). Unsigned/unnotarized macOS builds will be blocked by Gatekeeper for most users.
- [ ] Neither of the above was available in this audit environment — treat as **BLOCKED**, required before any public distribution.

## 7. Auto-update metadata

- [ ] Confirm `electron-builder`'s `publish` config (`desktop/package.json` → GitHub provider, `mudasirahanger/asmofficeapp`) matches the actual release repo.
- [ ] After publishing a GitHub Release with the built artifacts, verify `latest.yml`/`latest-mac.yml`/`latest-linux.yml` (generated by `electron-builder`) are attached to the release — `electron-updater` reads these to detect new versions.
- [ ] Manually trigger "Check for Updates" in a previous-version build against the new release and confirm: update detected → download → install-and-restart all work, and that a deliberately broken/unreachable update URL surfaces `update-error` to the renderer instead of hanging silently (the `AppUpdater` component already has a 10s "stuck checking" timeout — confirm it still feels reasonable).

## 8. Release notes

- [ ] Summarize user-facing changes (features, fixes) in plain language.
- [ ] Call out any P0/P1 fixes from `PRODUCTION_AUDIT.md` that are security-relevant, without over-disclosing exploit details (e.g. "removed an internal debug endpoint" rather than describing exactly what it exposed).
- [ ] Link build artifact checksums.

## 9. Rollback process

- [ ] Keep the previous release's artifacts and `latest*.yml` files available (don't delete old GitHub Releases immediately).
- [ ] To roll back auto-update: republish the previous version's `latest*.yml` as the current release asset (or delete/unpublish the broken release) so `electron-updater` stops offering the bad version to new checks. Already-updated clients need a forward-fix release, not a downgrade (Electron auto-update generally isn't designed for silent downgrades).
- [ ] Backend: if a migration shipped with the release needs to be reverted, use `php artisan migrate:rollback` (cmd) against a **backed-up** database, never destructive resets in place.
- [ ] Document the specific rollback steps taken in the release's GitHub issue/notes for traceability.

## 10. Post-release smoke tests

- [ ] Fresh install (not upgrade) on each platform actually released: app launches, login works, one core workflow (e.g. view a project) succeeds.
- [ ] Upgrade path: install previous version, trigger auto-update, confirm it lands on the new version cleanly.
- [ ] Backend health check endpoint (add one if it doesn't exist yet — not found in `routes/api.php` during this audit) returns healthy.
- [ ] Confirm no P0 regressions reported within the first 24 hours before considering the release final.

## Notes specific to this repository (from PRODUCTION_AUDIT.md)

- `mobile/` is pnpm-only now — do not run plain `npm install` there (see D-5).
- The root `build`/`start` scripts now call `scripts/sync-web-build.js` instead of `rm -rf`/`cp -r`, so they should work from PowerShell/cmd.exe/bash alike (D-6) — but this has only been reviewed, not run on an actual Windows machine.
- No health-check endpoint currently exists in `backend/routes/api.php` — recommended addition for step 10 above (not added in this pass; flagged for a future iteration).
