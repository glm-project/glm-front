import { ESLint, Linter, RuleTester } from 'eslint';
import assert from 'node:assert/strict';
import { it } from 'node:test';
import typescript from 'typescript-eslint';
import { maxIfCriteria } from './max-if-criteria.mjs';

const ruleTester = new RuleTester({ languageOptions: { parser: typescript.parser } });
const violation = { messageId: 'extractPredicate' };

ruleTester.run('max-if-criteria', maxIfCriteria, {
  valid: [
    'if (ready) act();',
    'if (!ready) act();',
    'if (((ready))) act();',
    'if (first ?? second ?? fallback) act();',
    'if ((flags & first) | second | third) act();',
    'if (isEligible(first, second, third)) act();',
    'if (items.some(item => item.ready && item.available && item.active)) act();',
    'if (function () { return first && second && third; }) act();',
    'if (class { check() { return first && second && third; } }) act();',
    'if (first) { if (second) act(); }',
    'if (first) act(); else if (second) act();',
    'const isEligible = () => first && second && third;',
    'function isEligible() { return first && second && third; }',
    'const result = first && second && third ? allowed : refused;',
    'while (first && second && third) act();',
    'do { act(); } while (first && second && third);',
    'for (; first && second && third;) act();',
  ],
  invalid: [
    'if (ready && available) act();',
    'if (ready || available) act();',
    'if (((ready) && (available))) act();',
    'if (!(ready && available)) act();',
    'if (!press.accepted || !press.designation.snapshot().canValidate) act();',
    'if ((first && second) as boolean) act();',
    'if (first) act(); else if (second && third) act();',
    'if (first && second && third) act();',
    'if (first || second || third) act();',
    'if (first && second || third) act();',
    'if (first || second && third) act();',
    'if (first && (second || third)) act();',
    'if ((first && second) || third) act();',
    'if ((first || second) && (third || fourth)) act();',
    'if (((first) && ((second) || (third)))) act();',
    'if (!(first && (second || third))) act();',
    'if ((first && second && third) as boolean) act();',
    'if (<boolean>(first && second && third)) act();',
    'if ((first && second && third) satisfies boolean) act();',
    'if ((first && second && third)!) act();',
    'if ((first && second && third) === true) act();',
    'if (Boolean(first && second && third)) act();',
    'if (fallback ?? (first && second && third)) act();',
    'if (first && (second ?? fallback) && third) act();',
    'if (await (first && second && third)) act();',
    'if (available) act(); else if (first && second && third) act();',
    'if (items.some(item => { if (item.ready && item.available && item.active) act(); return item.ready; })) act();',
  ].map(code => ({ code, errors: [violation], output: null })),
});

const eslint = new ESLint();
const linter = new Linter();
const filesFixture = [
  'src/main/webapp/gestion/app.ts',
  'src/main/webapp/pupitre/contexts/atelier/domain/designation/DesignationOperateur.ts',
  'src/main/webapp/pupitre/contexts/atelier/application/CurrentOperateurLifecycle.ts',
  'src/main/webapp/pupitre/shared/authentication/infrastructure/secondary/device/DeviceAuthentication.ts',
  'src/main/webapp/pupitre/contexts/atelier/domain/designation/DesignationOperateur.spec.ts',
  'src/test/webapp/unit/HexagonalArchTest.spec.ts',
  'src/test/webapp/component/pupitre/designation/Designation.spec.ts',
  'src/test/webapp/application/pupitre/shell/Shell.spec.ts',
  'src/test/webapp/utils/DataSelector.ts',
  'scripts/serve-production-pupitre-fixture.mjs',
  'eslint/rules/architecture-harness.mjs',
  'eslint.config.mjs',
];

for (const file of filesFixture) {
  it(`should reject two if criteria through the repository configuration in ${file}`, async () => {
    const config = await eslint.calculateConfigForFile(file);
    assert.deepEqual(config.rules['local/max-if-criteria'], [2]);

    const messages = linter.verify('if (first || second) act();', {
      plugins: { local: config.plugins.local },
      rules: { 'local/max-if-criteria': config.rules['local/max-if-criteria'] },
    });

    assert.equal(messages.length, 1);
    assert.equal(messages[0].messageId, 'extractPredicate');
  });
}

it('should keep generated wire declarations outside the lint policy', async () => {
  assert.equal(await eslint.isPathIgnored('src/main/webapp/app/generated/schema.d.ts'), true);
});
