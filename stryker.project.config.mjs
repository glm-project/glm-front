import baseConfig from './stryker.config.mjs';

export default {
  ...baseConfig,
  mutate: [
    'src/main/webapp/**/*.ts',
    '!src/main/webapp/**/*.spec.ts',
    '!src/main/webapp/**/*.d.ts',
    '!src/main/webapp/**/main.ts',
    '!src/main/webapp/**/environments/**',
    '!src/main/webapp/**/*.provider*.ts',
    '!src/main/webapp/**/package-info.ts',
    '!src/main/webapp/app/generated/**',
  ],
  htmlReporter: {
    fileName: 'reports/mutation/project.html',
  },
  jsonReporter: {
    fileName: 'reports/mutation/project.json',
  },
  thresholds: {
    high: 80,
    low: 60,
    break: null,
  },
};
