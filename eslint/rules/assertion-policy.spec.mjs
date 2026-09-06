import { ESLint } from 'eslint';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const eslint = new ESLint();
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
    it('should reject non-null and definite-assignment assertions', async () => {
      const [result] = await eslint.lintText(
        `
          class Probe {
            value!: string;
          }
          let deferred!: () => void;
          declare const optional: string | undefined;
          optional!.trim();
        `,
        { filePath: file },
      );

      assert.deepEqual(
        result.messages
          .filter(message => ['@typescript-eslint/no-non-null-assertion', 'no-restricted-syntax'].includes(message.ruleId ?? ''))
          .map(message => message.ruleId),
        ['no-restricted-syntax', 'no-restricted-syntax', '@typescript-eslint/no-non-null-assertion'],
      );
    });
  });
}
