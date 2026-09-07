import { ESLint, RuleTester } from 'eslint';
import assert from 'node:assert/strict';
import { it } from 'node:test';
import typescript from 'typescript-eslint';
import { noAsUnknown } from './no-as-unknown.mjs';

const ruleTester = new RuleTester({
  languageOptions: {
    parser: typescript.parser,
    parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  },
});

ruleTester.run('no-as-unknown', noAsUnknown, {
  valid: [
    { code: 'const x: unknown = 42;' },
    { code: 'function test(param: unknown): void {}' },
    { code: 'type MyUnknown = unknown;' },
    { code: 'const str = val as string;' },
    { code: 'const num = <number>val;' },
    { code: 'const c = [1, 2] as const;' },
    { code: 'const p = val as Promise<unknown>;' },
    { code: 'interface Probe { data: unknown; }' },
  ],
  invalid: [
    {
      code: 'const a = x as unknown;',
      errors: [{ messageId: 'forbidden' }],
    },
    {
      code: 'const b = x as unknown as string;',
      errors: [{ messageId: 'forbidden' }],
    },
    {
      code: 'const c = <unknown>x;',
      errors: [{ messageId: 'forbidden' }],
    },
    {
      code: 'const d = <string><unknown>x;',
      errors: [{ messageId: 'forbidden' }],
    },
    {
      code: 'const e = (x as unknown);',
      errors: [{ messageId: 'forbidden' }],
    },
  ],
});

const eslint = new ESLint();

it('should apply the no-as-unknown rule to all TypeScript files', async () => {
  const domainConfig = await eslint.calculateConfigForFile('src/main/webapp/pupitre/contexts/atelier/domain/FenetreOperateur.ts');
  const applicationConfig = await eslint.calculateConfigForFile(
    'src/main/webapp/pupitre/contexts/atelier/application/AtelierCoordinator.ts',
  );
  const sharedConfig = await eslint.calculateConfigForFile('src/main/webapp/app/shared/api-client/infrastructure/secondary/ApiClient.ts');
  const specConfig = await eslint.calculateConfigForFile('src/test/webapp/unit/AuthenticationPort.contract.spec.ts');
  const componentConfig = await eslint.calculateConfigForFile('src/test/webapp/component/pupitre/designation/Designation.spec.ts');

  assert.deepEqual(domainConfig.rules['local/no-as-unknown'], [2]);
  assert.deepEqual(applicationConfig.rules['local/no-as-unknown'], [2]);
  assert.deepEqual(sharedConfig.rules['local/no-as-unknown'], [2]);
  assert.deepEqual(specConfig.rules['local/no-as-unknown'], [2]);
  assert.deepEqual(componentConfig.rules['local/no-as-unknown'], [2]);
});
