import { ESLint, RuleTester } from 'eslint';
import assert from 'node:assert/strict';
import { it } from 'node:test';
import typescript from 'typescript-eslint';
import { noEslintDisable } from './no-eslint-disable.mjs';

const ruleTester = new RuleTester({
  languageOptions: {
    parser: typescript.parser,
    parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  },
  plugins: {
    local: {
      rules: {
        'any-rule': { create: () => ({}) },
      },
    },
  },
});

ruleTester.run('no-eslint-disable', noEslintDisable, {
  valid: [
    {
      name: 'file without comments',
      code: 'const answer = 42;',
    },
    {
      name: 'regular comment discussing eslint-disable in narrative text',
      code: '// A tooling directive like eslint-disable is not used here.',
    },
    {
      name: 'regular block comment with descriptive text',
      code: `
        /**
         * Explains why we do not use eslint-disable directives.
         */
        const value = 10;
      `,
    },
  ],
  invalid: [
    {
      name: 'line comment with eslint-disable-next-line',
      code: `
        // eslint-disable-next-line local/any-rule -- reason
        const value = 1;
      `,
      errors: [{ messageId: 'forbidden' }],
    },
    {
      name: 'line comment with eslint-disable-line',
      code: `
        const value = 1; // eslint-disable-line local/any-rule
      `,
      errors: [{ messageId: 'forbidden' }],
    },
    {
      name: 'block comment with eslint-disable for a rule',
      code: `
        /* eslint-disable local/any-rule */
        const value = 1;
      `,
      errors: [{ messageId: 'forbidden' }],
    },
    {
      name: 'block comment with eslint-enable',
      code: `
        /* eslint-enable local/any-rule */
        const value = 1;
      `,
      errors: [{ messageId: 'forbidden' }],
    },
  ],
});

const eslint = new ESLint();

it('should apply no-eslint-disable to typescript files', async () => {
  const config = await eslint.calculateConfigForFile('src/main/webapp/pupitre/contexts/atelier/application/AtelierCoordinator.ts');
  assert.deepEqual(config.rules['local/no-eslint-disable'], [2]);
});
