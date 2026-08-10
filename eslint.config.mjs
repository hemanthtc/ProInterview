import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// First-pass config: uses eslint-config-next's defaults as-is (which already
// treat `any` and unused vars as warnings). There is a pre-existing backlog
// of ~60 hard errors (react-hooks/rules-of-hooks false positives on a
// non-hook function named `useMockFallbackRoadmap`, require()-style imports
// in a couple of API routes, react/no-unescaped-entities, etc.) — see
// REPORT.md for the tracked list. `npm run lint` is intentionally wired with
// a high --max-warnings threshold and CI runs it with continue-on-error so
// this doesn't block builds while the backlog is paid down incrementally.
export default defineConfig([
    ...nextVitals,
    ...nextTypescript,
    {
        rules: {
            // typescript-eslint/recommended treats `any` as a hard error; this
            // codebase relies on `any` heavily for now (Gemini/Mongo payloads,
            // legacy API shapes). Downgrade to warning until that debt is paid
            // down — see REPORT.md.
            "@typescript-eslint/no-explicit-any": "warn",
        },
    },
    globalIgnores([
        ".next/**",
        "out/**",
        "build/**",
        "next-env.d.ts",
        "amplify/**",
        "node_modules/**",
    ]),
]);
