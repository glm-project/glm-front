import css from '@eslint/css';
import angular from 'angular-eslint';
import { ESLint, RuleTester } from 'eslint';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import typescript from 'typescript-eslint';
import { noComments } from './no-comments.mjs';

const scripts = new RuleTester({
  languageOptions: {
    parser: typescript.parser,
    parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  },
});
const templates = new RuleTester({ languageOptions: { parser: angular.templateParser } });
const stylesheets = new RuleTester({ plugins: { css }, language: 'css/css' });
const refused = [{ messageId: 'forbidden' }];

scripts.run('no-comments in scripts', noComments, {
  valid: [
    {
      name: 'code without comments',
      code: 'export const answer = 42;',
    },
    {
      name: 'comment markers inside strings, template literals and regular expressions',
      code: "const url = 'https://example.org'; const glob = `src/**/*.ts`; const opening = /\\/\\*/;",
    },
  ],
  invalid: [
    {
      name: 'line comment',
      code: '// why\nconst value = 1;',
      errors: refused,
    },
    {
      name: 'trailing line comment',
      code: 'const value = 1; // why',
      errors: refused,
    },
    {
      name: 'block comment',
      code: 'const value = /* why */ 1;',
      errors: refused,
    },
    {
      name: 'documentation comment',
      code: '/** What it is. */\nexport const value = 1;',
      errors: refused,
    },
    {
      name: 'triple-slash directive',
      code: '/// <reference types="vitest" />\nexport {};',
      errors: refused,
    },
    {
      name: 'TypeScript directive',
      code: "// @ts-expect-error\nconst value: number = '1';",
      errors: refused,
    },
    {
      name: 'mutation waiver',
      code: '// Stryker disable next-line ConditionalExpression\nexport const value = 1 > 0;',
      errors: refused,
    },
    {
      name: 'every comment of a file',
      code: '/* first */\nconst value = 1; // second',
      errors: [...refused, ...refused],
    },
  ],
});

templates.run('no-comments in templates', noComments, {
  valid: [
    {
      name: 'template without comments',
      code: '<p>{{ total }}</p>',
    },
    {
      name: 'comment markers inside text and attributes',
      code: '<a title="&lt;!-- label --&gt;" href="//example.org">/* text */ // text</a>',
    },
  ],
  invalid: [
    {
      name: 'HTML comment',
      code: '<!-- prettier-ignore -->\n<p></p>',
      errors: refused,
    },
    {
      name: 'multi-line HTML comment',
      code: '<p>\n  <!--\n    why\n  -->\n</p>',
      errors: refused,
    },
  ],
});

stylesheets.run('no-comments in stylesheets', noComments, {
  valid: [
    {
      name: 'stylesheet without comments',
      code: 'a {\n  color: var(--color-ink);\n}',
    },
    {
      name: 'comment markers inside strings and URLs',
      code: 'a::before {\n  content: "/* label */";\n  background: url(//example.org/mark.svg);\n}',
    },
  ],
  invalid: [
    {
      name: 'comment before a rule',
      code: '/* why */\na {\n  color: red;\n}',
      errors: refused,
    },
    {
      name: 'comment inside a rule',
      code: 'a {\n  /* why */\n  color: red;\n}',
      errors: refused,
    },
  ],
});

const eslint = new ESLint();
const filesFixture = [
  'src/main/webapp/pupitre/contexts/atelier/domain/journal-du-pupitre/JournalDuPupitreProjection.ts',
  'src/main/webapp/pupitre/contexts/atelier/infrastructure/primary/pupitre/designation/designation.ts',
  'src/main/webapp/deployment.d.ts',
  'src/test/webapp/unit/HexagonalArchTest.spec.ts',
  'src/test/webapp/application/gestion/poste/PostesDeTravail.spec.ts',
  'src/main/webapp/gestion/index.html',
  'src/main/webapp/pupitre/page/page.html',
  'src/main/webapp/styles.css',
  'src/main/webapp/gestion/header/header.css',
  'eslint.config.mjs',
  'eslint/rules/no-comments.spec.mjs',
  'scripts/check-runtime.mjs',
  'functions/api/_middleware.js',
  '.lintstagedrc.cjs',
  'vitest.config.ts',
];

describe('Comment policy', () => {
  for (const file of filesFixture) {
    it(`should refuse comments in ${file}`, async () => {
      const config = await whenResolvingTheConfigOf(file);

      thenCommentsAreRefused(config);
    });
  }

  const directivesFixture = [
    ['scripts/check-runtime.mjs', '/* eslint-disable */\nexport const value = 1;\n'],
    ['src/main/webapp/gestion/index.html', '<!-- eslint-disable -->\n<p></p>\n'],
    ['src/main/webapp/styles.css', '/* eslint-disable */\na {\n  color: red;\n}\n'],
  ];

  for (const [file, source] of directivesFixture) {
    it(`should refuse the directive that would silence the policy in ${file}`, async () => {
      const messages = await whenLinting(file, source);

      thenOneCommentIsRefused(messages);
    });
  }

  it('should refuse a comment in an inline template', async () => {
    const messages = await whenLinting(
      'src/main/webapp/app/shared/design-system/infrastructure/primary/icon/icon.spec.ts',
      "import { Component } from '@angular/core';\n\n@Component({ selector: 'glm-fixture', template: '<!-- why --><p></p>' })\nexport class Fixture {}\n",
    );

    thenOneCommentIsRefused(messages);
  });
});

const whenResolvingTheConfigOf = file => eslint.calculateConfigForFile(file);
const whenLinting = async (filePath, source) => {
  const [result] = await eslint.lintText(source, { filePath });
  return result.messages;
};
const thenCommentsAreRefused = config => {
  assert.deepEqual(config.rules['local/no-comments'], [2]);
};
const thenOneCommentIsRefused = messages => {
  assert.deepEqual(
    messages.filter(message => message.ruleId === 'local/no-comments').map(message => message.severity),
    [2],
    JSON.stringify(messages),
  );
};
