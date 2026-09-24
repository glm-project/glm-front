import { ESLint, Linter } from 'eslint';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const RULE = '@typescript-eslint/no-restricted-imports';
const eslint = new ESLint();
const linter = new Linter();
const angularErrorHandlerImports = [
  "import { ErrorHandler } from '@angular/core';",
  "import { ErrorHandler as FrameworkErrorHandler } from '@angular/core';",
  "export { ErrorHandler } from '@angular/core';",
];
const filesOutsideThePrimaryLayerFixture = [
  'src/main/webapp/gestion/app/app.ts',
  'src/main/webapp/pupitre/contexts/enrolement/infrastructure/primary/pupitre/enrolement/enrolement.ts',
  'src/main/webapp/app/shared/authentication/infrastructure/primary/http-auth.interceptor.ts',
  'src/main/webapp/pupitre/page/page.spec.ts',
  'src/test/webapp/component/pupitre/fixtures/main.ts',
  'src/main/webapp/app/shared/error-handler/domain/ErrorHandlerPort.ts',
  'src/main/webapp/app/shared/error-handler/infrastructure/secondary/ConsoleErrorHandler.ts',
];
const primaryLayerFilesFixture = [
  'src/main/webapp/app/shared/error-handler/infrastructure/primary/AngularErrorHandler.ts',
  'src/main/webapp/app/shared/error-handler/infrastructure/primary/error-handler.provider.spec.ts',
];

describe("Angular's ErrorHandler policy", () => {
  for (const file of filesOutsideThePrimaryLayerFixture) {
    it(`should reject Angular's ErrorHandler in ${file}`, async () => {
      const results = await whenLintingImports(file, angularErrorHandlerImports);

      thenImportsAreRejected(results);
    });
  }

  for (const file of primaryLayerFilesFixture) {
    it(`should let the error-handler primary layer route Angular's ErrorHandler in ${file}`, async () => {
      const results = await whenLintingImports(file, angularErrorHandlerImports);

      thenImportsAreAccepted(results);
    });
  }

  it('should leave the rest of Angular Core to every file', async () => {
    const results = await whenLintingImports('src/main/webapp/gestion/app/app.ts', ["import { inject, Injectable } from '@angular/core';"]);

    thenImportsAreAccepted(results);
  });
});

const whenLintingImports = async (file, sources) => {
  const config = await eslint.calculateConfigForFile(file);
  const lintConfig = {
    plugins: { '@typescript-eslint': config.plugins['@typescript-eslint'] },
    rules: { [RULE]: config.rules[RULE] ?? 'off' },
  };
  return sources.map(source => linter.verify(source, lintConfig));
};
const thenImportsAreRejected = results => {
  for (const messages of results) {
    assert.ok(
      messages.some(message => message.severity === 2 && message.ruleId === RULE),
      JSON.stringify(messages),
    );
  }
};
const thenImportsAreAccepted = results => {
  for (const messages of results) assert.deepEqual(messages, []);
};
