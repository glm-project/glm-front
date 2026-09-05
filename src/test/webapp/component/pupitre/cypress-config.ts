import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:9001',
    specPattern: 'src/test/webapp/component/pupitre/**/*.spec.ts',
    fixturesFolder: false,
    supportFile: false,
    video: false,
  },
});
