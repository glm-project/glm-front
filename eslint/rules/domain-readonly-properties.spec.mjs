import { ESLint, RuleTester } from 'eslint';
import assert from 'node:assert/strict';
import { it } from 'node:test';
import typescript from 'typescript-eslint';
import { domainReadonlyProperties } from './domain-readonly-properties.mjs';

const ruleTester = new RuleTester({
  languageOptions: {
    parser: typescript.parser,
    parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  },
});

ruleTester.run('domain-readonly-properties', domainReadonlyProperties, {
  valid: [
    {
      code: `
        interface Contract {
          readonly id: string;
          readonly nested: { readonly state: string; readonly values: readonly { readonly id: string }[] };
          readonly [key: string]: unknown;
        }
        type Decision = { readonly kind: 'ACCEPTEE'; readonly payload: { readonly id: string } };
      `,
    },
    {
      code: `
        abstract class Port { abstract readonly name: string; }
        class Model {
          public readonly id = 'id';
          readonly values: ReadonlyMap<string, string> = new Map();
          readonly choice = ['one', 'two'] as const;
          readonly #state = '';
          constructor(public readonly code: string, private readonly state: string, protected readonly version: number) {}
          get label(): string { return this.state; }
        }
        interface Callback { readonly capture: () => readonly string[]; }
        interface Tuple { readonly items: readonly [...string[]]; }
        class Cast { readonly items = [] as readonly string[]; }
        const values = [];
        values.push(1);
      `,
    },
  ],
  invalid: [
    {
      code: `interface Contract { id: string; nested: { state: string }; [key: string]: unknown; }`,
      errors: [
        { messageId: 'readonlyProperty' },
        { messageId: 'readonlyProperty' },
        { messageId: 'readonlyProperty' },
        { messageId: 'readonlyProperty' },
      ],
    },
    {
      code: `abstract class Port { abstract name: string; } class Model { value = ''; constructor(public code: string) {} }`,
      errors: [{ messageId: 'readonlyProperty' }, { messageId: 'readonlyProperty' }, { messageId: 'readonlyProperty' }],
    },
    {
      code: `class Model { private value = ''; #secret = ''; private set code(value: string) {} protected set label(value: string) {} accessor version = 1; }`,
      errors: [
        { messageId: 'readonlyProperty' },
        { messageId: 'readonlyProperty' },
        { messageId: 'explicitCommand' },
        { messageId: 'explicitCommand' },
        { messageId: 'explicitCommand' },
      ],
    },
    {
      code: `class Model { private readonly items = []; readonly labels = new Map(); readonly values = new Array<string>(); }`,
      errors: [{ messageId: 'readonlyCollection' }, { messageId: 'readonlyCollection' }, { messageId: 'readonlyCollection' }],
    },
    {
      code: `
        class Model { constructor(private readonly items: string[], private readonly inferred = []) {} }
        interface Contract {
          readonly [id: string]: string[];
          readonly items: string[] | undefined;
          readonly nested: ReadonlyArray<ReadonlyArray<string[]>>;
          readonly capture: () => string[];
          readonly namedTuple: readonly [items: string[]];
          readonly optionalTuple: readonly [string[]?];
          readonly restTuple: readonly [...string[][]];
        }
        abstract class Port { abstract readonly items: string[]; }
      `,
      errors: [
        { messageId: 'readonlyCollection' },
        { messageId: 'readonlyCollection' },
        { messageId: 'readonlyCollection' },
        { messageId: 'readonlyCollection' },
        { messageId: 'readonlyCollection' },
        { messageId: 'readonlyCollection' },
        { messageId: 'readonlyCollection' },
        { messageId: 'readonlyCollection' },
        { messageId: 'readonlyCollection' },
        { messageId: 'readonlyCollection' },
      ],
    },
    {
      code: `interface Contract { readonly items: string[]; } class Model { readonly labels: string[]; }`,
      errors: [{ messageId: 'readonlyCollection' }, { messageId: 'readonlyCollection' }],
    },
    {
      code: `interface Contract { readonly grids: readonly string[][]; }`,
      errors: [{ messageId: 'readonlyCollection' }],
    },
    {
      code: `interface Contract { set label(value: string); } abstract class Model { abstract set label(value: string); }`,
      errors: [{ messageId: 'explicitCommand' }, { messageId: 'explicitCommand' }],
    },
  ],
});

const eslint = new ESLint();

it('should apply the readonly rule to production domain files only', async () => {
  const domainConfig = await eslint.calculateConfigForFile('src/main/webapp/pupitre/contexts/atelier/domain/Contract.ts');
  const gestionDomainConfig = await eslint.calculateConfigForFile('src/main/webapp/gestion/contexts/operateur/domain/Contract.ts');
  const sharedDomainConfig = await eslint.calculateConfigForFile('src/main/webapp/app/shared/pagination/domain/Contract.ts');
  const specConfig = await eslint.calculateConfigForFile('src/main/webapp/pupitre/contexts/atelier/domain/Contract.spec.ts');
  const fixtureConfig = await eslint.calculateConfigForFile('src/test/webapp/unit/pupitre/contexts/atelier/domain/ContractFixture.ts');
  const applicationConfig = await eslint.calculateConfigForFile('src/main/webapp/pupitre/contexts/atelier/application/Contract.ts');

  assert.deepEqual(domainConfig.rules['local/domain-readonly-properties'], [2]);
  assert.deepEqual(gestionDomainConfig.rules['local/domain-readonly-properties'], [2]);
  assert.deepEqual(sharedDomainConfig.rules['local/domain-readonly-properties'], [2]);
  assert.equal(specConfig.rules['local/domain-readonly-properties'], undefined);
  assert.equal(fixtureConfig.rules['local/domain-readonly-properties'], undefined);
  assert.equal(applicationConfig.rules['local/domain-readonly-properties'], undefined);
});
