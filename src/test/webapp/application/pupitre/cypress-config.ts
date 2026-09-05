import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:9001',
    specPattern: 'src/test/webapp/application/pupitre/**/*.(spec|cy).ts',
    excludeSpecPattern: 'src/test/webapp/application/pupitre/production-offline/**',
    fixturesFolder: false,
    supportFile: false,
    video: false,
  },
});
