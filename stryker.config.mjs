export default {
  mutate: ['src/main/webapp/pupitre/contexts/atelier/domain/PupitreReplayPolicy.ts'],
  testRunner: 'command',
  commandRunner: {
    command: "ng test --watch=false --include 'src/main/webapp/pupitre/contexts/atelier/domain/PupitreReplayPolicy.spec.ts'",
  },
  checkers: ['typescript'],
  tsconfigFile: 'tsconfig.stryker.json',
  coverageAnalysis: 'off',
  concurrency: 1,
  reporters: ['clear-text', 'progress', 'html', 'json'],
  htmlReporter: {
    fileName: 'reports/mutation/replay.html',
  },
  jsonReporter: {
    fileName: 'reports/mutation/replay.json',
  },
  thresholds: {
    high: 100,
    low: 100,
    break: 100,
  },
};
