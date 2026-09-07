import typescriptParser from '@typescript-eslint/parser';
import { ESLint, Linter } from 'eslint';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const eslint = new ESLint();
const linter = new Linter();
const filesFixture = [
  'src/main/webapp/app/shared/authentication/domain/AuthenticationPort.ts',
  'src/main/webapp/gestion/app.ts',
  'src/main/webapp/pupitre/app.ts',
  'src/test/webapp/component/pupitre/designation/Designation.spec.ts',
  'src/test/webapp/application/pupitre/shell/Shell.spec.ts',
  'src/test/webapp/unit/fixtures/SignalFixture.ts',
];

for (const file of filesFixture) {
  describe(`Type assertion policy in ${file}`, () => {
    it('should reject non-null, definite-assignment and unknown assertions', async () => {
      const config = await eslint.calculateConfigForFile(file);
      const messages = linter.verify(
        `
        class Probe {
          value!: string;
        }
        let deferred!: () => void;
        declare const optional: string | undefined;
        optional!.trim();
        const forbidden = optional as unknown;
      `,
        {
          languageOptions: { parser: typescriptParser },
          plugins: {
            '@typescript-eslint': config.plugins['@typescript-eslint'],
            local: config.plugins['local'],
          },
          rules: {
            '@typescript-eslint/no-non-null-assertion': config.rules['@typescript-eslint/no-non-null-assertion'],
            'no-restricted-syntax': config.rules['no-restricted-syntax'],
            'local/no-as-unknown': config.rules['local/no-as-unknown'],
          },
        },
      );

      assert.deepEqual(
        messages.map(message => message.ruleId),
        ['no-restricted-syntax', 'no-restricted-syntax', '@typescript-eslint/no-non-null-assertion', 'local/no-as-unknown'],
      );
    });
  });
}
