import { ESLint } from 'eslint';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import typescript from 'typescript-eslint';
import { inspectTestOnlyProduction, noTestOnlyProduction } from './no-test-only-production.mjs';

const givenProject = files => {
  const root = mkdtempSync(join(tmpdir(), 'production-consumers-'));
  symlinkSync(resolve('node_modules'), join(root, 'node_modules'), 'dir');
  for (const [name, content] of Object.entries(files)) {
    const file = join(root, name);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
  writeFileSync(
    join(root, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        strict: true,
        experimentalDecorators: true,
        skipLibCheck: true,
        types: [],
      },
      angularCompilerOptions: { strictTemplates: true },
    }),
  );
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
};

test('should reject a method and an exported value consumed only by tests or their fixtures', t => {
  const fixture = givenProject({
    'src/main/webapp/model.ts': 'export class Model { useful() { return 1; } testOnly() { return 2; } } export const diagnostic = 3;',
    'src/main/webapp/main.ts': 'import { Model } from "./model"; new Model().useful();',
    'src/test/fixture.ts': 'import { Model, diagnostic } from "../main/webapp/model"; new Model().testOnly(); console.log(diagnostic);',
  });
  t.after(fixture.cleanup);

  const violations = inspectTestOnlyProduction({ root: fixture.root });

  assert.deepEqual(violations.map(value => value.name).sort(), ['diagnostic', 'testOnly']);
});

test('should recognize a production call through a re-export and an abstract port', t => {
  const fixture = givenProject({
    'src/main/webapp/model.ts':
      'export abstract class Port { abstract read(): number; } export class Adapter extends Port { read() { return 1; } } export const value = 2;',
    'src/main/webapp/barrel.ts': 'export { value as amount } from "./model";',
    'src/main/webapp/main.ts':
      'import { Adapter, Port } from "./model"; import { amount } from "./barrel"; const port: Port = new Adapter(); console.log(port.read(), amount);',
    'src/main/webapp/model.spec.ts': 'import { Adapter, value } from "./model"; new Adapter().read(); console.log(value);',
  });
  t.after(fixture.cleanup);

  const violations = inspectTestOnlyProduction({ root: fixture.root });

  assert.deepEqual(violations, []);
});

test('should distinguish identically named members and ignore imports without consumers', t => {
  const fixture = givenProject({
    'src/main/webapp/model.ts':
      'export class Used { read() { return 1; } } export class Unused { read() { return 2; } } export const diagnostic = 3;',
    'src/main/webapp/main.ts': 'import { Used, diagnostic } from "./model"; new Used().read();',
    'src/main/webapp/model.spec.ts': 'import { Unused, diagnostic } from "./model"; new Unused().read(); console.log(diagnostic);',
  });
  t.after(fixture.cleanup);

  const violations = inspectTestOnlyProduction({ root: fixture.root });

  assert.deepEqual(violations.map(value => value.name).sort(), ['diagnostic', 'read']);
});

test('should reject fields only read by tests even when a constructor initializes them', t => {
  const fixture = givenProject({
    'src/main/webapp/model.ts': 'export class Model { diagnostic: number; constructor() { this.diagnostic = 1; } }',
    'src/main/webapp/main.ts': 'import { Model } from "./model"; new Model();',
    'src/main/webapp/model.spec.ts': 'import { Model } from "./model"; console.log(new Model()["diagnostic"]);',
  });
  t.after(fixture.cleanup);

  const violations = inspectTestOnlyProduction({ root: fixture.root });

  assert.deepEqual(
    violations.map(value => value.name),
    ['diagnostic'],
  );
});

test('should reject a mutually recursive chain reached only from tests', t => {
  const fixture = givenProject({
    'src/main/webapp/model.ts': 'export function first() { return second(); } function second() { return first(); }',
    'src/main/webapp/model.spec.ts': 'import { first } from "./model"; first();',
  });
  t.after(fixture.cleanup);

  const violations = inspectTestOnlyProduction({ root: fixture.root });

  assert.deepEqual(violations.map(value => value.name).sort(), ['first', 'second']);
});

test('should recognize production callbacks, shorthand values and literal member access', t => {
  const fixture = givenProject({
    'src/main/webapp/model.ts':
      'export const value = 1; export function callback() { return value; } export class Model { read() { return value; } }',
    'src/main/webapp/main.ts':
      'import { value, callback, Model } from "./model"; console.log({ value }); [1].map(callback); new Model()["read"]();',
    'src/main/webapp/model.spec.ts':
      'import { value, callback, Model } from "./model"; console.log(value, callback(), new Model().read());',
  });
  t.after(fixture.cleanup);

  const violations = inspectTestOnlyProduction({ root: fixture.root });

  assert.deepEqual(violations, []);
});

test('should recognize Angular templates and lifecycle callbacks while rejecting a test-template-only method', t => {
  const fixture = givenProject({
    'src/main/webapp/model.ts': `import { Component, OnDestroy } from '@angular/core';
      @Component({ selector: 'glm-model', templateUrl: './model.html' })
      export class Model implements OnDestroy {
        title() { return 'Hello'; } diagnostic() { return 'debug'; } ngOnDestroy() {}
      }`,
    'src/main/webapp/model.html': '{{ title() }}',
    'src/main/webapp/model.spec.ts': `import { Component } from '@angular/core'; import { Model } from './model';
      @Component({ selector: 'glm-fixture', template: '{{ model.diagnostic() }}' })
      class Fixture { model = new Model(); }
      new Model().title(); new Model().ngOnDestroy();`,
  });
  t.after(fixture.cleanup);

  const violations = inspectTestOnlyProduction({ root: fixture.root });

  assert.deepEqual(
    violations.map(value => value.name),
    ['diagnostic'],
  );
});

test('should preserve members potentially used by untyped Angular template contexts', t => {
  const fixture = givenProject({
    'src/main/webapp/model.ts': 'export class Model { duration() { return 1; } }',
    'src/main/webapp/page.ts': `import { Component } from '@angular/core';
      @Component({ selector: 'glm-page', template: '<ng-template let-row>{{ row.duration() }}</ng-template>' }) export class Page {}`,
    'src/main/webapp/model.spec.ts': 'import { Model } from "./model"; new Model().duration();',
  });
  t.after(fixture.cleanup);

  const violations = inspectTestOnlyProduction({ root: fixture.root });

  assert.deepEqual(violations, []);
});

test('should recognize Angular configured replacement exports as consumers of the original contract', t => {
  const fixture = givenProject({
    'angular.json': JSON.stringify({
      fileReplacements: [{ replace: 'src/main/webapp/environment.ts', with: 'src/main/webapp/environment.local.ts' }],
    }),
    'src/main/webapp/environment.ts': 'export const environment = { production: true };',
    'src/main/webapp/environment.local.ts': 'export const environment = { production: false };',
    'src/main/webapp/main.ts': 'import { environment } from "./environment"; console.log(environment);',
    'src/main/webapp/environment.spec.ts': 'import { environment } from "./environment.local"; console.log(environment.production);',
  });
  t.after(fixture.cleanup);

  const violations = inspectTestOnlyProduction({ root: fixture.root });

  assert.deepEqual(violations, []);
});

test('should fail ESLint at the production declaration when only a test calls it', async t => {
  const fixture = givenProject({
    'src/main/webapp/model.ts': 'export class Model { diagnostic() { return 1; } }',
    'src/main/webapp/model.spec.ts': 'import { Model } from "./model"; new Model().diagnostic();',
  });
  t.after(fixture.cleanup);

  const results = await whenLintingFixture(fixture);

  assert.equal(results[0].errorCount, 1);
  assert.equal(results[0].messages[0].ruleId, 'local/no-test-only-production');
  assert.match(results[0].messages[0].message, /diagnostic is consumed only by tests/);
});

test('should enable the production-consumer gate for both fronts and exclude their specs', async () => {
  const eslint = new ESLint();

  const configurations = await Promise.all([
    eslint.calculateConfigForFile('src/main/webapp/gestion/contexts/poste/domain/PosteDeTravail.ts'),
    eslint.calculateConfigForFile('src/main/webapp/pupitre/contexts/atelier/application/AtelierCoordinator.ts'),
    eslint.calculateConfigForFile('src/main/webapp/gestion/contexts/poste/domain/FormulairePosteDeTravail.spec.ts'),
  ]);

  assert.equal(configurations[0].rules['local/no-test-only-production'][0], 2);
  assert.equal(configurations[1].rules['local/no-test-only-production'][0], 2);
  assert.equal(configurations[2].rules['local/no-test-only-production'], undefined);
});

const whenLintingFixture = fixture =>
  new ESLint({
    cwd: fixture.root,
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ['**/*.ts'],
        languageOptions: { parser: typescript.parser },
        plugins: { local: { rules: { 'no-test-only-production': noTestOnlyProduction } } },
        rules: { 'local/no-test-only-production': 'error' },
      },
    ],
  }).lintFiles(['src/main/webapp/model.ts']);
