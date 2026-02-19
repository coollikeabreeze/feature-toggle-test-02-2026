# Feature Toggle Test Repo — Summary & Proposal Documentation

Technical summary of this proof-of-concept for use in proposal documentation.

---

## 1. Repo Overview

| Component | Purpose |
|-----------|---------|
| **Base** | React + Vite app (standard template) |
| **Feature toggle hook** | `useReleaseToggle` in `src/utils/useReleaseToggle.jsx` |
| **Manifest** | `config/entitlements-manifest.json` — list of valid toggle keys |
| **CI / Husky** | `scripts/enforce-toggles.js` + `.husky/pre-commit` |

The app expects entitlements (release toggles) from a backend and uses Redux (`state.common.entitlements`). This repo has no Redux setup; it only demonstrates the pattern.

---

## 2. Hooks — What They Do and Why They're Used

### 2.1 Direct vs. Hook Usage

**Direct usage:**
```js
// Scattered across many components
const entitlements = useSelector((state) => state.common.entitlements);
const isOn = entitlements?.['myFeature'] ?? true;  // Inconsistent fallback
```

**Hook usage:**
```js
const isOn = useReleaseToggle('myFeature', { defaultValue: true });
```

### 2.2 What the Hook Provides (vs. raw flag value)

1. **Centralized data source**  
   Single place that reads `state.common.entitlements` from Redux.

2. **Safe key lookup**  
   Uses `Object.prototype.hasOwnProperty.call(entitlements, toggleKey)` to avoid prototype pollution and `undefined` vs `false` confusion.

3. **Edge-case handling**  
   - `entitlements` is null/undefined → returns `defaultValue`.  
   - Key not in entitlements → returns `defaultValue` instead of `undefined`.

4. **Configurable fallback**  
   `defaultValue` (default: `true`) for when key is unknown.

5. **Optional unknown-key tracking**  
   `alertIfUnknown: true` (default) triggers a `useEffect` when the key isn't in entitlements. The implementation currently has a stub comment; in production this would send events (e.g. analytics) for usage tracking.

### 2.3 Why Hooks Elevate Beyond Raw Flag Values

| Aspect | Raw flag value | Hook |
|--------|----------------|------|
| Where logic lives | Scattered in components | One utility |
| Missing/unknown keys | Easy to get `undefined` or inconsistent behavior | Uses `defaultValue` |
| Safe access | Easy to forget `hasOwnProperty` | Built-in |
| Usage tracking | None | Possible via `alertIfUnknown` |
| Future changes | Update many call sites | Change one hook |

---

## 3. Manifest and Backend as Source of Truth

### 3.1 Current Setup

`config/entitlements-manifest.json` holds the list of valid keys:

```json
["exampleFeature", "anotherToggle"]
```

### 3.2 Proposal: Manifest from Backend

The proposal is to use the full list of release toggles from a backend service as the manifest. Conceptually:

1. Backend exposes the list of supported toggle keys (e.g. `/entitlements` or `/feature-toggles`).
2. That response (or a derived file) becomes the manifest.
3. Build-time or CI scripts use this manifest to validate what the frontend uses.

Flow:

```
Backend service  →  List of supported keys  →  Manifest (JSON file or build artifact)
                                                    ↓
Frontend code  →  useReleaseToggle('foo')  →  CI / enforce-toggles  →  Compare vs manifest
```

The manifest is the contract: "These are the keys that exist." CI compares frontend usage against this list.

### 3.3 Implementation Options

- **Build-time fetch** — Script fetches from backend before build, writes `entitlements-manifest.json`.
- **CI fetch** — CI job fetches manifest and runs enforce-toggles.
- **Shared config** — Backend and frontend both consume a shared config package or API.

The enforce script supports a custom manifest path via `ENTITLEMENTS_MANIFEST`.

---

## 4. CI / Husky Implementation — Concept and Usefulness

### 4.1 How It Works

1. **Manifest**  
   Load valid toggle keys from `entitlements-manifest.json` (or path from `ENTITLEMENTS_MANIFEST`).

2. **Scan**  
   Walk `src/` and use regex to find `useReleaseToggle('key')`, `useReleaseToggle("key")`, `useReleaseToggle(\`key\`)` and collect the string literals.

3. **Compare**  
   - Used keys = keys found in source.  
   - Defined keys = keys in manifest.  
   - Unknown = used but not in manifest.

4. **Result**  
   - If unknown keys exist → `console.warn` and exit 0.  
   - Otherwise → `console.log` success and exit 0.  
   The process **never exits 1** (never fails the build).

### 4.2 Where It Runs

- **Husky pre-commit** — `.husky/pre-commit` runs `npm run enforce-toggles` on every commit.
- **CI** — Same script can be added as a CI step.

### 4.3 Strengths

- Catches typos and invalid keys (e.g. `useReleaseToggle('exmapleFeature')` vs `exampleFeature`).
- Catches use of keys that no longer exist on the backend.
- Enforces single source of truth (manifest).
- Lightweight; no extra dependencies.
- Non-blocking: warns but does not fail, so teams can fix gradually.

### 4.4 Limitations

- **Regex-based** — Misses dynamic keys like `useReleaseToggle(someVariable)`. More robust approaches use an AST (Babel/TypeScript parser).
- **Warn-only** — Build never fails; warnings can be ignored. Strict mode would need `process.exit(1)` on unknown keys.
- **Pre-commit UX** — Runs on every commit; noisy or false-positive warnings may lead to developers bypassing or removing the hook.
- **Manifest freshness** — If manifest is not kept in sync with the backend, you get false positives or negatives.

### 4.5 Is It Actually Useful?

**Yes, with caveats.** It provides:

- **Early signal** — Developers see warnings locally before pushing.
- **Visibility** — Makes unknown or deprecated keys obvious.
- **Low friction** — Non-blocking, easy to adopt.

It is most useful when:

- The manifest is kept in sync with the backend.
- The team treats unknown keys as real issues.
- The codebase uses string literals for toggle keys (regex can find them).

To make it stricter and more reliable:

- Move from regex to AST-based extraction.
- Add an option to fail on unknown keys in CI.
- Automate manifest updates from the backend.

---

## 5. File Map

| Path | Role |
|------|------|
| `src/utils/useReleaseToggle.jsx` | Hook: reads entitlements, safe lookup, defaultValue, optional unknown-key handling |
| `config/entitlements-manifest.json` | Manifest of valid toggle keys |
| `scripts/enforce-toggles.js` | CI script: scan source, compare vs manifest, warn on unknown keys |
| `.husky/pre-commit` | Runs enforce-toggles on commit |
| `scripts/ci-enforce-toggles.md` | Design notes for CI enforcement |

---

## 6. Gaps in This PoC

- No Redux store; hook expects `state.common.entitlements`.
- No backend integration; entitlements are not fetched.
- `alertIfUnknown` has a stub `useEffect`; no real logging or tracking.
- No demo components using the hook.
- Manifest is static; not wired to backend.

These are intentional for a proof-of-concept; they would be filled in when applying this pattern in a larger codebase.
