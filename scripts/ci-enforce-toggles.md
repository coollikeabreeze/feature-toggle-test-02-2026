# CI enforcement for feature toggles — design

## Goal

Warn in CI when code uses toggle keys that aren’t in the source of truth (build does not fail).

## Concepts

1. **Source of truth (manifest)**  
   A single file (e.g. `entitlements-manifest.json` or `feature-toggles.json`) lists every toggle key the backend/entitlements system supports. This file is owned by the team that defines entitlements and is the contract for “valid keys.”

2. **Extract usage**  
   Scan the repo for calls to your toggle hook (e.g. `useReleaseToggle('key')`, `useReleaseToggle("key")`) and collect the string literals used as the first argument. Optionally also scan for other patterns (e.g. a config object keyed by toggle names).

3. **Compare**  
   - **Used keys** = keys found in the codebase.  
   - **Defined keys** = keys from the manifest.  
   - **Unknown** = used but not in manifest → **warn** (build continues).  
   - **Unused** (optional) = in manifest but never used → warn or ignore, depending on policy.

4. **Run in CI or locally (Husky)**  
   - **CI**: Add a step (e.g. `node scripts/enforce-toggles.js` or `npm run enforce-toggles`) that logs a warning if there are unknown keys but always exits 0.  
   - **Pre-commit (Husky)**: A `.husky/pre-commit` hook runs `npm run enforce-toggles` on every commit so you see the same warning locally before pushing.

## Optional extensions

- **Strict mode**: Also fail if the manifest contains keys that are never used (dead toggles).
- **Naming convention**: Enforce a prefix/suffix for toggle keys (e.g. `FEATURE_*`).
- **Docs**: Require each manifest entry to have a `description` or `owner` field and enforce that in CI.
