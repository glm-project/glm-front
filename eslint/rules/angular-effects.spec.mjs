import { ESLint, Linter } from 'eslint';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const eslint = new ESLint();
const linter = new Linter();
const filesFixture = [
  'src/main/webapp/pupitre/contexts/atelier/application/OfflinePupitre.ts',
  'src/main/webapp/gestion/app.ts',
  'src/main/webapp/pupitre/app.ts',
  'src/test/webapp/component/pupitre/designation/Designation.spec.ts',
  'src/test/webapp/application/pupitre/EffectPolicyFixture.spec.ts',
  'src/test/webapp/unit/HexagonalArchTest.spec.ts',
];

for (const file of filesFixture) {
  describe(`Angular effects policy in ${file}`, () => {
    it('should reject static effects including aliases and reexports', async () => {
      const results = await whenLintingImports(file, [
        "import { effect } from '@angular/core';",
        "import { afterRenderEffect as observe } from '@angular/core';",
        "import * as angular from '@angular/core'; angular.effect(() => undefined);",
        "export { effect as observe } from '@angular/core';",
      ]);

      thenImportsAreRejected(results);
    });

    it('should reject effects reached through dynamic Angular Core imports', async () => {
      const results = await whenLintingImports(file, [
        "export async function install() { const ng = await import('@angular/core'); return ng.effect(() => undefined); }",
        'export async function install() { const ng = await import(`@angular/core`); return ng.afterRenderEffect(() => undefined); }',
      ]);

      thenImportsAreRejected(results);
    });

    it('should allow signals and explicit render callbacks', async () => {
      const results = await whenLintingImports(file, [
        "import { signal, computed, afterNextRender } from '@angular/core';",
        "import { effect } from 'another-library';",
        "export async function load() { return import('another-library'); }",
      ]);

      thenImportsAreAccepted(results);
    });
  });
}

it('should preserve the existing boundaries between fronts', async () => {
  const results = await whenLintingImports('src/main/webapp/gestion/app.ts', [
    "import { App } from '@/pupitre/app';",
    "export async function load() { return import('@/pupitre/app'); }",
  ]);

  thenImportsAreRejected(results);
});

const presentationPrimaryFiles = [
  [
    'src/main/webapp/pupitre/contexts/atelier/infrastructure/primary/pupitre/designation/designation.ts',
    "import { App } from '@/gestion/app';",
  ],
  [
    'src/main/webapp/pupitre/shared/authentication/infrastructure/primary/http-device-authorization.interceptor.ts',
    "import { App } from '@/gestion/app';",
  ],
  ['src/main/webapp/app/shared/design-system/infrastructure/primary/icon/icon.ts', "import { App } from '@/pupitre/app';"],
];

for (const [file, forbiddenImport] of presentationPrimaryFiles) {
  it(`should allow a presentation effect while retaining the boundary in ${file}`, async () => {
    const effects = await whenLintingImports(file, ["import { effect, afterRenderEffect } from '@angular/core';"]);
    const foreignFront = await whenLintingImports(file, [forbiddenImport]);
    const angularNamespace = await whenLintingImports(file, ["import * as angular from '@angular/core';"]);

    thenImportsAreAccepted(effects);
    thenImportsAreRejected(foreignFront);
    thenImportsAreRejected(angularNamespace);
  });
}

it('should reject business imports from app-specific shared code', async () => {
  const results = await whenLintingImports('src/main/webapp/pupitre/shared/authentication/package-info.ts', [
    "import { JournalDuPupitre } from '@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre';",
    "export { projectReferentiel } from '../../contexts/atelier/domain/journal-du-pupitre/JournalDuPupitreProjection';",
    "export async function load() { return import('@/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitre'); }",
  ]);

  thenImportsAreRejected(results);
});

it('should reject a static inline token bypass', async () => {
  const config = await eslint.calculateConfigForFile('src/main/webapp/pupitre/app.ts');
  const results = linter.verify(`const template = '<div style="color: #ff0000"></div>';`, {
    plugins: { local: config.plugins.local },
    rules: { 'local/no-token-bypass': config.rules['local/no-token-bypass'] },
  });

  thenImportsAreRejected([results]);
});

const whenLintingImports = async (file, sources) => {
  const config = await eslint.calculateConfigForFile(file);
  const rules = {
    'no-restricted-imports': config.rules['no-restricted-imports'],
    'no-restricted-syntax': config.rules['no-restricted-syntax'] ?? 'off',
  };
  return sources.map(source => linter.verify(source, { rules }));
};
const thenImportsAreRejected = results => {
  for (const messages of results) {
    assert.ok(
      messages.some(message => message.severity === 2 && message.ruleId !== null),
      JSON.stringify(messages),
    );
  }
};
const thenImportsAreAccepted = results => {
  for (const messages of results) assert.deepEqual(messages, []);
};
