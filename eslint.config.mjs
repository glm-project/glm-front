import eslint from '@eslint/js';
import angular from 'angular-eslint';
import cypress from 'eslint-plugin-cypress';
import globals from 'globals';
import typescript from 'typescript-eslint';
import { givenWhenThen } from './eslint/rules/given-when-then.mjs';

const TOOLING_DIRECTIVE = /^\s*(eslint-|@ts-|prettier-ignore|\/)/;

const TAILWIND_COLOR_FAMILIES = [
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
];

const COLOR_UTILITY = '(?:bg|text|border|ring|outline|divide|shadow|decoration|caret|accent|fill|stroke|from|via|to)';

const TOKEN_BYPASS = new RegExp(
  `\\b${COLOR_UTILITY}-(?:${TAILWIND_COLOR_FAMILIES.join('|')})-\\d{2,3}\\b`
    + `|\\b${COLOR_UTILITY}-(?:white|black)\\b`
    + `|\\b${COLOR_UTILITY}-\\[#[0-9a-fA-F]{3,8}\\]`
    + `|\\btext-\\[[\\d.]+(?:px|rem|em|pt)\\]`,
  'g',
);

const FRONTS = ['gestion', 'pupitre'];
const FORBIDDEN_ANGULAR_EFFECTS = {
  name: '@angular/core',
  importNames: ['effect', 'afterRenderEffect'],
  message: 'Angular effects hide orchestration: use application commands or a one-shot render hook — see documentation/code-style.md.',
};
const FORBIDDEN_DYNAMIC_ANGULAR_IMPORTS = [
  "ImportExpression[source.value='@angular/core']",
  "ImportExpression > TemplateLiteral[expressions.length=0] > TemplateElement[value.cooked='@angular/core']",
].map(selector => ({
  selector,
  message: 'Import Angular Core statically so ESLint can forbid effects — see documentation/code-style.md.',
}));

const namedAnywherePattern = fronts => `(^|\\/)(${fronts.join('|')})(\\/|$)`;
const namedOutsideAppPattern = fronts => `^(?!.*(^|\\/)app\\/).*(^|\\/)(${fronts.join('|')})(\\/|$)`;

const lazyRouteSelectors = forbiddenPathPattern => [
  `ImportExpression > Literal[value=/${forbiddenPathPattern}/]`,
  `ImportExpression > TemplateLiteral > TemplateElement[value.cooked=/${forbiddenPathPattern}/]`,
];

const boundary = (files, restrictions) => ({
  files,
  rules: {
    'no-restricted-imports': ['error', { paths: [FORBIDDEN_ANGULAR_EFFECTS], patterns: restrictions }],
    'no-restricted-syntax': [
      'error',
      ...FORBIDDEN_DYNAMIC_ANGULAR_IMPORTS,
      ...restrictions.flatMap(({ regex, message }) =>
        lazyRouteSelectors(regex).map(selector => ({ selector, message: `Lazy route: ${message}` })),
      ),
    ],
  },
});

const otherFrontsOf = front => FRONTS.filter(candidate => candidate !== front);

const noOtherFront = front => ({
  regex: namedAnywherePattern(otherFrontsOf(front)),
  message: `${front} must not import from ${otherFrontsOf(front).join(' or ')}: each front ships its own bundle, and what both need belongs under app/.`,
});

const noFrontAtAll = {
  regex: namedAnywherePattern(FRONTS),
  message: `app/ must not import from ${FRONTS.join(' or ')}: dependencies point one way, a root imports from app/ and never the reverse. Only app/<context>/infrastructure/primary/<front>/ may name a front, and only to reach its own zone.`,
};

const noCompositionRoot = {
  regex: namedOutsideAppPattern(FRONTS),
  message: `this zone may name its front to reach its own zone, never to leave app/: what ${FRONTS.join(' and ')} wire is their own, and app/ ships in both bundles. A path that names a front without passing through app/ is a composition root.`,
};

const local = {
  rules: {
    'no-comments': {
      create: context => ({
        Program: () =>
          context.sourceCode
            .getAllComments()
            .filter(comment => !TOOLING_DIRECTIVE.test(comment.value))
            .forEach(comment =>
              context.report({ node: comment, message: 'Code carries its own intent: no comments — see documentation/code-style.md.' }),
            ),
      }),
    },
    'no-token-bypass': {
      create: context => ({
        Program: () =>
          [...context.sourceCode.text.matchAll(TOKEN_BYPASS)].forEach(bypass =>
            context.report({
              loc: context.sourceCode.getLocFromIndex(bypass.index),
              message: `'${bypass[0]}' steps outside the design tokens: name a role — see documentation/design-system.md.`,
            }),
          ),
      }),
    },
    'given-when-then': givenWhenThen,
  },
};

export default typescript.config(
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    ignores: ['target/', '.angular/', 'src/main/webapp/app/generated/schema.d.ts'],
  },
  eslint.configs.recommended,
  {
    files: ['src/test/webapp/application/**/*.ts'],
    extends: [...typescript.configs.recommendedTypeChecked, cypress.configs.recommended],
    languageOptions: {
      parserOptions: {
        project: ['src/test/webapp/application/tsconfig.json'],
      },
    },
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
  {
    files: ['src/test/webapp/component/**/*.ts'],
    extends: [...typescript.configs.recommendedTypeChecked, cypress.configs.recommended],
    languageOptions: {
      parserOptions: {
        project: ['src/test/webapp/component/tsconfig.json'],
      },
    },
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
  {
    files: ['src/test/webapp/utils/**/*.ts'],
    extends: [...typescript.configs.recommendedTypeChecked, cypress.configs.recommended],
    languageOptions: {
      parserOptions: {
        project: ['src/test/webapp/utils/tsconfig.json'],
      },
    },
  },
  {
    files: ['src/test/webapp/unit/**/*.ts'],
    extends: [...typescript.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.spec.json'],
      },
    },
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { paths: [FORBIDDEN_ANGULAR_EFFECTS] }],
      'no-restricted-syntax': ['error', ...FORBIDDEN_DYNAMIC_ANGULAR_IMPORTS],
    },
  },
  {
    files: ['src/main/webapp/**/*.ts'],
    extends: [...typescript.configs.strictTypeChecked, ...typescript.configs.stylistic, ...angular.configs.tsRecommended],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        project: ['./tsconfig.app.json', './tsconfig.spec.json'],
      },
    },
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/component-class-suffix': 'off',
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'glm',
          style: 'kebab-case',
        },
      ],
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'glm',
          style: 'camelCase',
        },
      ],
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      'arrow-body-style': 'error',
      'no-restricted-imports': ['error', { paths: [FORBIDDEN_ANGULAR_EFFECTS] }],
      'no-restricted-syntax': ['error', ...FORBIDDEN_DYNAMIC_ANGULAR_IMPORTS],
    },
  },
  boundary(['src/main/webapp/app/**/*.ts'], [noFrontAtAll]),
  ...FRONTS.map(front => boundary([`src/main/webapp/${front}/**/*.ts`], [noOtherFront(front)])),
  ...FRONTS.map(front => boundary([`src/main/webapp/app/**/primary/${front}/**/*.ts`], [noOtherFront(front), noCompositionRoot])),
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
  },
  {
    files: ['src/**/*.ts', 'src/**/*.html'],
    plugins: { local },
    rules: {
      'local/no-comments': 'error',
      'local/no-token-bypass': 'error',
    },
  },
  {
    files: ['src/**/*.spec.ts'],
    ignores: ['src/test/webapp/unit/HexagonalArchTest.spec.ts'],
    plugins: { local },
    rules: {
      'local/given-when-then': 'error',
    },
  },
);
