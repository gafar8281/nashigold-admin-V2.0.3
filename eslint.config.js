import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // This app fetches Firestore data directly in effects (no react-query
      // layer) using the "start loading, then setState in the async
      // continuation" pattern from React's own data-fetching docs
      // (react.dev/learn/synchronizing-with-effects#fetching-data). That
      // pattern is exactly what this rule flags, including in shadcn's own
      // generated use-mobile.ts hook — treating it as a hard error would
      // force distorting every data-fetching hook in the app for a pattern
      // that isn't actually a bug.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    // Vendored shadcn/ui primitives (generated via `npx shadcn add`) —
    // several intentionally co-export a component with a cva variants
    // function or hook (e.g. buttonVariants, useSidebar). Not hand-edited,
    // so not worth chasing this rule here.
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
