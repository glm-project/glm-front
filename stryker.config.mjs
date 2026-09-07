export default {
  mutate: [
    'src/main/webapp/**/domain/**/*.ts',
    '!src/main/webapp/**/domain/**/*.spec.ts',
    '!src/main/webapp/**/domain/**/*.d.ts',
    '!src/main/webapp/**/domain/**/package-info.ts',
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
    fileName: 'reports/mutation/domain.html',
  },
  jsonReporter: {
    fileName: 'reports/mutation/domain.json',
  },
  thresholds: {
    high: 100,
    low: 100,
    break: 100,
  },
};
