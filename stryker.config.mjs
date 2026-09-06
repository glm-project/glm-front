export default {
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
  testRunner: 'command',
  commandRunner: {
    command: 'ng test --watch=false',
  },
  checkers: ['typescript'],
  tsconfigFile: 'tsconfig.stryker.json',
  ignorers: ['angular'],
  coverageAnalysis: 'off',
  concurrency: 1,
  reporters: ['clear-text', 'progress', 'html', 'json'],
  htmlReporter: {
    fileName: 'reports/mutation/project.html',
  },
  jsonReporter: {
    fileName: 'reports/mutation/project.json',
  },
  thresholds: {
    high: 100,
    low: 100,
    break: 100,
  },
};
