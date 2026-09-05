import { defineConfig } from 'cypress';

const mode = process.env['PUPITRE_OFFLINE_MODE'] ?? 'service-worker';

export default defineConfig({
  allowCypressEnv: false,
  e2e: {
    baseUrl: process.env['PUPITRE_OFFLINE_BASE_URL'] ?? 'http://localhost:9010',
    specPattern: `src/test/webapp/application/pupitre/production-offline/${mode}.spec.ts`,
    fixturesFolder: false,
    supportFile: false,
    video: false,
  },
  reporter: 'junit',
  reporterOptions: {
    mochaFile: `artifacts/production-offline/${mode}-[hash].xml`,
    toConsole: true,
  },
});
