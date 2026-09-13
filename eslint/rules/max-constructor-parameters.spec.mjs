import { ESLint, RuleTester } from 'eslint';
import assert from 'node:assert/strict';
import { it } from 'node:test';
import typescript from 'typescript-eslint';
import { maxConstructorParameters } from './max-constructor-parameters.mjs';

const tester = new RuleTester({ languageOptions: { parser: typescript.parser } });
tester.run('max-constructor-parameters', maxConstructorParameters, {
  valid: [
    'class Example {}',
    'class Example { constructor(a, b, c) {} }',
    'class Example { constructor(readonly data: { a: string; b: string; c: string; d: string }) {} }',
    'class Example { method(a, b, c, d) {} }',
    'function example(a, b, c, d) {}',
  ],
  invalid: [
    'class Example { constructor(a, b, c, d) {} }',
    'class Example { constructor(a, b, c, d = 1) {} }',
    'class Example { constructor(a: string, b: string, c: string, d?: string) {} }',
    'class Example { private constructor(readonly a: string, readonly b: string, readonly c: string, readonly d: string) {} }',
    'class Example { constructor(...args: string[]) {} }',
  ].map(code => ({ code, errors: [{ messageId: 'useNamedParameters' }] })),
});

const eslint = new ESLint();
for (const file of ['src/main/webapp/gestion/app.ts', 'src/test/webapp/unit/HexagonalArchTest.spec.ts', 'eslint.config.mjs']) {
  it(`should enforce the constructor limit through the repository configuration in ${file}`, async () => {
    const [result] = await eslint.lintText('class Example { constructor(a, b, c, d) {} }', { filePath: file });
    const messages = result.messages.filter(message => message.ruleId === 'local/max-constructor-parameters');

    assert.equal(messages.length, 1);
    assert.equal(messages[0].severity, 2);
    assert.equal(messages[0].messageId, 'useNamedParameters');
  });
}
