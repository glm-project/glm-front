import { ESLint, Linter } from 'eslint';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const eslint = new ESLint();
const linter = new Linter();

const CONSUMER_FILES = [
  'src/main/webapp/gestion/contexts/atelier/infrastructure/primary/atelier/Atelier.ts',
  'src/main/webapp/pupitre/contexts/atelier/infrastructure/primary/pupitre/designation/designation.ts',
  'src/main/webapp/gestion/shared/design-system/infrastructure/primary/icon/icon.ts',
  'src/main/webapp/pupitre/shared/authentication/package-info.ts',
  'src/main/webapp/app/shared/error-handler/package-info.ts',
  'src/main/webapp/gestion/app/app.ts',
  'src/test/webapp/unit/HexagonalArchTest.spec.ts',
  'scripts/check-runtime.mjs',
];
const DATE_FORMAT_FILE = 'src/main/webapp/app/shared/date-format/infrastructure/primary/DateFormats.ts';
const DATE_FORMAT_SPEC = 'src/main/webapp/app/shared/date-format/infrastructure/primary/DateFormats.spec.ts';
const TEMPLATE_FILE = 'src/main/webapp/gestion/contexts/atelier/infrastructure/primary/atelier/Atelier.html';

const SCRIPT_SYNTAX_VIOLATIONS = [
  "export const format = new Intl.DateTimeFormat('fr-FR');",
  "export const format = Intl.DateTimeFormat('fr-FR');",
  'export const text = (date) => date.toLocaleDateString();',
  'export const text = (date) => date.toLocaleTimeString();',
  'export const text = (date) => date.toLocaleString();',
];
const DATE_IMPORT_VIOLATIONS = [
  "import { DatePipe } from '@angular/common';",
  "import { formatDate as format } from '@angular/common';",
  "export { DatePipe } from '@angular/common';",
];

const lintScript = async (file, source) => {
  const config = await eslint.calculateConfigForFile(file);
  return linter.verify(source, {
    rules: { 'no-restricted-imports': config.rules['no-restricted-imports'], 'no-restricted-syntax': config.rules['no-restricted-syntax'] },
  });
};

const lintTemplate = async source => {
  const config = await eslint.calculateConfigForFile(TEMPLATE_FILE);
  return linter.verify(
    source,
    {
      files: ['**/*.html'],
      languageOptions: config.languageOptions,
      rules: { 'no-restricted-syntax': config.rules['no-restricted-syntax'] },
    },
    { filename: TEMPLATE_FILE },
  );
};

const thenRejected = messages =>
  assert.ok(
    messages.some(message => message.severity === 2 && message.ruleId !== null),
    JSON.stringify(messages),
  );
const thenAccepted = messages => assert.deepEqual(messages, []);

for (const file of CONSUMER_FILES) {
  describe(`Date formatting policy in ${file}`, () => {
    for (const source of SCRIPT_SYNTAX_VIOLATIONS) {
      it(`should reject ${source}`, async () => {
        thenRejected(await lintScript(file, source));
      });
    }

    for (const source of DATE_IMPORT_VIOLATIONS) {
      it(`should reject ${source}`, async () => {
        thenRejected(await lintScript(file, source));
      });
    }

    it('should allow numbers, collation and the Angular Common imports that format nothing', async () => {
      const messages = await lintScript(
        file,
        [
          "import { NgTemplateOutlet } from '@angular/common';",
          "export const euros = new Intl.NumberFormat('fr-FR');",
          "export const collator = new Intl.Collator('fr');",
          "export const lower = (text) => text.toLocaleLowerCase('fr-FR');",
        ].join('\n'),
      );

      thenAccepted(messages);
    });
  });
}

describe('Date formatting policy in the shared date-format module', () => {
  for (const file of [DATE_FORMAT_FILE, DATE_FORMAT_SPEC]) {
    for (const source of SCRIPT_SYNTAX_VIOLATIONS) {
      it(`should allow ${source} in ${file}`, async () => {
        thenAccepted(await lintScript(file, source));
      });
    }

    for (const source of DATE_IMPORT_VIOLATIONS) {
      it(`should keep refusing ${source} in ${file}`, async () => {
        thenRejected(await lintScript(file, source));
      });
    }

    it(`should keep refusing a front import and an Angular effect in ${file}`, async () => {
      thenRejected(await lintScript(file, "import { App } from '@/gestion/app/app';"));
      thenRejected(await lintScript(file, "import { effect } from '@angular/core';"));
      thenRejected(await lintScript(file, "import * as core from '@angular/core';"));
    });
  }
});

describe('Date formatting policy in templates', () => {
  it('should reject the date pipe', async () => {
    thenRejected(await lintTemplate('<span>{{ instant | date: "short" }}</span>'));
    thenRejected(await lintTemplate('<span [title]="instant | date">{{ a }}</span>'));
  });

  it('should accept other pipes and plain bindings', async () => {
    thenAccepted(await lintTemplate('<span>{{ amount | currency }} {{ label | uppercase }} {{ instant }}</span>'));
  });
});
