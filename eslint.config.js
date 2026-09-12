// ESLint flat config (ESLint 9+). No framework-specific plugins — this is a
// vanilla ES-module app, so the ruleset focuses on correctness (catching
// real bugs: undeclared globals, shadowing, unreachable code, unsafe
// equality) rather than stylistic opinions, which are Prettier's job.
export default [
  {
    ignores: ['data/**', 'assets/**', 'node_modules/**', 'sw.js.bak'],
  },
  {
    files: ['js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        IDBKeyRange: 'readonly',
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        indexedDB: 'readonly',
        fetch: 'readonly',
        console: 'readonly',
        Notification: 'readonly',
        SpeechSynthesisUtterance: 'readonly',
        speechSynthesis: 'readonly',
        AudioContext: 'readonly',
        webkitAudioContext: 'readonly',
        CustomEvent: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        Worker: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        queueMicrotask: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        FileReader: 'readonly',
        File: 'readonly',
        Element: 'readonly',
        performance: 'readonly',
        matchMedia: 'readonly',
        self: 'readonly',
        caches: 'readonly',
        FormData: 'readonly',
        structuredClone: 'readonly',
        getComputedStyle: 'readonly',
        DeviceOrientationEvent: 'readonly',
        Audio: 'readonly',
        AbortController: 'readonly',
        AbortSignal: 'readonly',
        DecompressionStream: 'readonly',
        Response: 'readonly',
        MediaMetadata: 'readonly',
        CSS: 'readonly',
        requestSubmit: 'readonly',
        MessageChannel: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-var': 'error',
      'prefer-const': 'warn',
      eqeqeq: ['error', 'smart'],
      'no-dupe-keys': 'error',
      'no-dupe-args': 'error',
      'no-duplicate-imports': 'error',
      'no-unreachable': 'error',
      'no-fallthrough': 'error',
      'no-const-assign': 'error',
      'no-self-compare': 'error',
      'no-shadow-restricted-names': 'error',
      'no-implicit-globals': 'error',
      'no-return-await': 'off',
      'no-async-promise-executor': 'error',
      'no-await-in-loop': 'off',
      // Layer boundaries live in the scoped blocks below (domain/ui/views).
    },
  },
  {
    files: ['js/domain/**/*.js'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../app/*', '../services/*', '../ui/*', '../views/*'],
              message:
                'domain/ is pure: core/* only (compass.js sensor access is the sanctioned exception).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['js/ui/**/*.js'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../domain/*'],
              message:
                'ui may import domain ONLY via localeContent/completedCards — add an eslint-disable comment naming the sanction (layer rule).',
            },
            {
              group: ['../services/*'],
              message: 'ui must not import services/ — resolve in the app layer and pass in.',
            },
            { group: ['../views/*'], message: 'ui must not import views/.' },
            {
              group: ['../app/*'],
              message: 'ui must not import app/ — pass data via params (layer rule).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['js/views/**/*.js'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [{ group: ['../app/*'], message: 'views must not import app/ (layer rule).' }],
        },
      ],
    },
  },
  {
    files: ['sw.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        self: 'readonly',
        caches: 'readonly',
        fetch: 'readonly',
        console: 'readonly',
        URL: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        indexedDB: 'readonly',
        Notification: 'readonly',
        TimestampTrigger: 'readonly', // Notification Triggers API (Chromium, feature-detected)
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'error',
    },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
      },
    },
  },
  {
    // Playwright specs run in a real browser: document/window/Buffer are
    // provided by the browser + Playwright runtime, not the app.
    files: ['tests/e2e/**/*.spec.js', 'playwright.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        document: 'readonly',
        window: 'readonly',
        Buffer: 'readonly',
        process: 'readonly',
      },
    },
  },
];
