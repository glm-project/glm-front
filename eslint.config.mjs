import eslint from '@eslint/js';
import angular from 'angular-eslint';
import cypress from 'eslint-plugin-cypress';
import sonarjs from 'eslint-plugin-sonarjs';
import globals from 'globals';
import typescript from 'typescript-eslint';
import { domainReadonlyProperties } from './eslint/rules/domain-readonly-properties.mjs';
import { givenWhenThen } from './eslint/rules/given-when-then.mjs';

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
const INLINE_STYLE_TOKEN_BYPASS =
  /\bstyle\s*=\s*(['"])[^'"]*\b(?:color|background(?:-color)?|font-size)\s*:\s*(?:#[0-9a-fA-F]{3,8}|[\d.]+(?:px|rem|em|pt))/g;

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
const FORBIDDEN_ANGULAR_NAMESPACES = {
  selector: "ImportDeclaration[source.value='@angular/core'] > ImportNamespaceSpecifier",
  message: 'Import Angular Core through named static imports — see documentation/code-style.md.',
};
const FORBIDDEN_DEFINITE_ASSIGNMENT_ASSERTIONS = {
  selector: ':matches(PropertyDefinition, VariableDeclarator)[definite=true]',
  message: 'Definite-assignment assertions hide an uninitialized value: initialize it or model its possible absence.',
};
const restrictedSyntax = (...additionalRestrictions) => [
  'error',
  ...FORBIDDEN_DYNAMIC_ANGULAR_IMPORTS,
  FORBIDDEN_ANGULAR_NAMESPACES,
  FORBIDDEN_DEFINITE_ASSIGNMENT_ASSERTIONS,
  ...additionalRestrictions,
];

const namedAnywherePattern = fronts => `(^|\\/)(${fronts.join('|')})(\\/|$)`;

const lazyRouteSelectors = forbiddenPathPattern => [
  `ImportExpression > Literal[value=/${forbiddenPathPattern}/]`,
  `ImportExpression > TemplateLiteral > TemplateElement[value.cooked=/${forbiddenPathPattern}/]`,
];

const boundary = (files, restrictions, allowsPresentationEffects = false) => ({
  files,
  rules: {
    'no-restricted-imports': ['error', { paths: allowsPresentationEffects ? [] : [FORBIDDEN_ANGULAR_EFFECTS], patterns: restrictions }],
    'no-restricted-syntax': restrictedSyntax(
      ...restrictions.flatMap(({ regex, message }) =>
        lazyRouteSelectors(regex).map(selector => ({ selector, message: `Lazy route: ${message}` })),
      ),
    ),
  },
});

const otherFrontsOf = front => FRONTS.filter(candidate => candidate !== front);

const noOtherFront = front => ({
  regex: namedAnywherePattern(otherFrontsOf(front)),
  message: `${front} must not import from ${otherFrontsOf(front).join(' or ')}: each front ships its own bundle, and what both need belongs under app/.`,
});

const noFrontAtAll = {
  regex: namedAnywherePattern(FRONTS),
  message: `app/ contains common technical code and must not import from ${FRONTS.join(' or ')}.`,
};

const noBusinessContext = front => ({
  regex: `(^|\\/)(?:${front}\\/)?contexts(\\/|$)`,
  message: `${front}/shared contains technical code and must not import a business context.`,
});

const local = {
  rules: {
    'no-token-bypass': {
      create: context => ({
        Program: () =>
          [...context.sourceCode.text.matchAll(new RegExp(`${TOKEN_BYPASS.source}|${INLINE_STYLE_TOKEN_BYPASS.source}`, 'g'))].forEach(
            bypass =>
              context.report({
                loc: context.sourceCode.getLocFromIndex(bypass.index),
                message: `'${bypass[0]}' steps outside the design tokens: name a role — see documentation/design-system.md.`,
              }),
          ),
      }),
    },
    'given-when-then': givenWhenThen,
    'domain-readonly-properties': domainReadonlyProperties,
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
    ...sonarjs.configs.recommended,
    files: ['src/**/*.ts'],
    rules: {
      ...sonarjs.configs.recommended.rules,
      'sonarjs/argument-type': 'off',
      'sonarjs/cognitive-complexity': ['error', 7],
      'sonarjs/function-return-type': 'off',
      'sonarjs/null-dereference': 'off',
    },
  },
  {
    files: ['src/test/webapp/application/**/*.ts'],
    extends: [...typescript.configs.recommendedTypeChecked, cypress.configs.recommended],
    languageOptions: {
      parserOptions: {
        project: ['src/test/webapp/application/tsconfig.json'],
      },
    },
    rules: {
      'sonarjs/prefer-specific-assertions': 'off',
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
      'sonarjs/prefer-specific-assertions': 'off',
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
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      'no-restricted-imports': ['error', { paths: [FORBIDDEN_ANGULAR_EFFECTS] }],
      'no-restricted-syntax': restrictedSyntax(),
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
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      'arrow-body-style': 'error',
      'no-restricted-imports': ['error', { paths: [FORBIDDEN_ANGULAR_EFFECTS] }],
      'no-restricted-syntax': restrictedSyntax(),
    },
  },
  {
    files: ['src/main/webapp/app/BusinessContext.ts', 'src/main/webapp/app/SharedKernel.ts'],
    rules: {
      '@typescript-eslint/no-extraneous-class': ['error', { allowEmpty: true }],
    },
  },
  boundary(['src/main/webapp/app/**/*.ts'], [noFrontAtAll]),
  ...FRONTS.map(front => boundary([`src/main/webapp/${front}/**/*.ts`], [noOtherFront(front)])),
  ...FRONTS.map(front => boundary([`src/main/webapp/${front}/shared/**/*.ts`], [noOtherFront(front), noBusinessContext(front)])),
  ...FRONTS.map(front => boundary([`src/main/webapp/${front}/contexts/**/infrastructure/primary/**/*.ts`], [noOtherFront(front)], true)),
  ...FRONTS.map(front =>
    boundary([`src/main/webapp/${front}/shared/**/infrastructure/primary/**/*.ts`], [noOtherFront(front), noBusinessContext(front)], true),
  ),
  boundary(['src/main/webapp/app/shared/**/infrastructure/primary/**/*.ts'], [noFrontAtAll], true),
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
  },
  {
    files: ['src/**/*.ts', 'src/**/*.html'],
    plugins: { local },
    rules: {
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
  {
    files: ['src/main/webapp/**/domain/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    plugins: { local },
    rules: {
      'local/domain-readonly-properties': 'error',
    },
  },
);
