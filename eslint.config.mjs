import eslint from '@eslint/js';
import angular from 'angular-eslint';
import cypress from 'eslint-plugin-cypress';
import globals from 'globals';
import typescript from 'typescript-eslint';

const TOOLING_DIRECTIVE = /^\s*(eslint-|@ts-|prettier-ignore|\/)/;

const FRONTS = ['gestion', 'pupitre'];

const lazyRouteSelectors = pathSegment => [
  `ImportExpression > Literal[value=/${pathSegment}/]`,
  `ImportExpression > TemplateLiteral > TemplateElement[value.cooked=/${pathSegment}/]`,
];

const forbidOtherFrontImports = front => {
  const otherFronts = FRONTS.filter(candidate => candidate !== front);
  const otherFrontSegment = `(^|\\/)(${otherFronts.join('|')})(\\/|$)`;
  const message = `${front} must not import from ${otherFronts.join(' or ')}: each front ships its own bundle, and what both need belongs under app/.`;
  return {
    files: [`src/main/webapp/${front}/**/*.ts`, `src/main/webapp/app/**/primary/${front}/**/*.ts`],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: otherFronts.flatMap(other => [`**/${other}`, `**/${other}/**`]), message }] },
      ],
      'no-restricted-syntax': [
        'error',
        ...lazyRouteSelectors(otherFrontSegment).map(selector => ({ selector, message: `Lazy route: ${message}` })),
      ],
    },
  };
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
    ignores: ['target/', '.angular/'],
  },
  eslint.configs.recommended,
  {
    files: ['src/test/webapp/e2e/**/*.ts'],
    extends: [...typescript.configs.recommendedTypeChecked, cypress.configs.recommended],
    languageOptions: {
      parserOptions: {
        project: ['src/test/webapp/e2e/tsconfig.json'],
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
    files: ['src/test/webapp/unit/**/*.ts'],
    extends: [...typescript.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.spec.json'],
      },
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
    },
  },
  ...FRONTS.map(forbidOtherFrontImports),
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
  },
  {
    files: ['src/**/*.ts', 'src/**/*.html'],
    plugins: { local },
    rules: {
      'local/no-comments': 'error',
    },
  },
);
