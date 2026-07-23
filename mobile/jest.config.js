// The RN/Expo-ecosystem allowlist of packages that ship untranspiled
// ESM/modern syntax and must be run through babel-jest instead of being
// treated as pre-built CJS.
//
// This used to be a single pattern copied from an npm-flat-node_modules
// project. Under this project's actual package manager (pnpm), every
// package is nested as node_modules/.pnpm/<name>@<version>/node_modules/
// <name>/..., so a pattern written only for the flat npm layout matches
// (and therefore *ignores*/skips transforming) the .pnpm/<pkg>@<version>
// segment itself — which never matches any allowlist entry — long before
// it reaches the real package name. That silently broke transformation for
// every RN/Expo package (e.g. @react-native/jest-preset's own setup.js),
// causing "Cannot use import statement outside a module" and every test
// suite failing to even start. See PRODUCTION_AUDIT.md D-13.
const RN_ECOSYSTEM_SLASH =
  '(jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg';
// pnpm's store directory names use `+` instead of `/` for scoped packages
// (e.g. `@react-native+jest-preset@0.85.3_...`), so the same allowlist
// needs a `+`-joined variant to match there too.
const RN_ECOSYSTEM_PLUS =
  '(jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?\\+.*|@expo-google-fonts\\+.*|react-navigation|@react-navigation\\+.*|@unimodules\\+.*|unimodules|sentry-expo|native-base|react-native-svg';

module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    `node_modules/(?:\\.pnpm/(?!(?:${RN_ECOSYSTEM_PLUS}))|(?!\\.pnpm)(?!(?:${RN_ECOSYSTEM_SLASH})))`,
  ],
  // e2e/**/*.spec.ts are Playwright specs (run via `pnpm test:e2e`), not
  // Jest tests — without this, `pnpm test` tried to execute them as Jest
  // suites and failed immediately (Playwright's `test()`/`expect` globals
  // aren't Jest's). See PRODUCTION_AUDIT.md D-13.
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
};
