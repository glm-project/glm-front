/// <reference types="vitest" />

import tsconfigPaths from 'vite-tsconfig-paths';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    reporters: ['verbose', ['vitest-sonar-reporter', { outputFile: 'target/test-results/TESTS-results-sonar.xml' }]],
    globals: true,
    logHeapUsage: true,
    maxWorkers: 2,
    environment: 'jsdom',
    cache: false,
    coverage: {
      thresholds: {
        perFile: true,
        autoUpdate: true,
        100: true,
      },
      exclude: [
        ...configDefaults.exclude,
        '*.html',
        // Code spartan-ng vendorise par le generateur helm : non ecrit et non modifie par l'equipe.
        // Le seuil a 100 % protege le code du projet, pas les dependances copiees dans le depot.
        'src/main/webapp/app/design-system/**',
      ],
      provider: 'istanbul',
      reportsDirectory: 'target/test-results/',
      reporter: ['html', 'json', 'json-summary', 'text', 'text-summary', 'lcov', 'clover'],
      watermarks: {
        statements: [100, 100],
        branches: [100, 100],
        functions: [100, 100],
        lines: [100, 100],
      },
    },
  },
});
