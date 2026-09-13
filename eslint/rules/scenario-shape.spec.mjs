import { ESLint, Linter, RuleTester } from 'eslint';
import assert from 'node:assert/strict';
import { it } from 'node:test';
import { scenarioShape } from './scenario-shape.mjs';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
});

ruleTester.run('scenario-shape', scenarioShape, {
  valid: [
    {
      code: `
        it('should tell a business story', () => {
          const workshop = givenAnOpenWorkshop();

          const result = whenCompletingTheOrder(workshop);

          thenTheOrderIsComplete(result);
        });
      `,
    },
    {
      code: `
        it('should let a helper narrow or throw', () => {
          const gestures = whenCapturingGestures();

          thenGesturesAre(gestures, ['ARRIVEE']);
        });

        const whenCapturingGestures = () => {
          if (decision.kind !== 'GESTES') throw new Error('Expected gestures fixture.');
          return decision.capture();
        };
      `,
    },
    {
      code: `
        it.each(cases)('should handle %s', value => {
          const result = whenDeciding(value);

          thenItMatches(result);
        });
      `,
    },
    {
      code: `it('should allow a concise scenario', () => { workshop.complete(); expect(workshop.state()).toBe('complete'); });`,
    },
    {
      code: `
        it('should allow sequential acts until it asserts', () => {
          whenStartingWork();
          whenPausingWork();

          thenWorkIsPaused();
        });
      `,
      options: [{ order: true }],
    },
    {
      code: `
        it('should allow data after an assertion', () => {
          const state = whenReadingState();

          thenStateIsPaused(state);
          const expected = { paused: true };
          expect(state).toEqual(expected);
        });
      `,
      options: [{ order: true }],
    },
  ],
  invalid: [
    {
      code: `
        it('should refuse a conditional assertion', () => {
          const decision = whenDeciding();

          expect(decision.kind).toBe('GESTES');
          if (decision.kind === 'GESTES') {
            expect(decision.capture()).toHaveLength(2);
          }
        });
      `,
      errors: [{ messageId: 'branchInScenario' }],
    },
    {
      code: `
        it('should refuse a guard that throws', () => {
          const decision = whenDeciding();
          if (decision.kind !== 'GESTES') throw new Error('Expected gestures fixture.');

          thenGesturesAre(decision.capture(), ['ARRIVEE']);
        });
      `,
      errors: [{ messageId: 'branchInScenario' }],
    },
    {
      code: `
        it('should refuse a loop', () => {
          for (const digit of '049') whenEntering(digit);

          thenCodeIs('049');
        });
      `,
      errors: [{ messageId: 'branchInScenario' }],
    },
    {
      code: `
        it('should refuse a teardown wrapped around its assertions', () => {
          const pausing = whenPausingGlobally();

          try {
            thenNoRefusalIsVisible();
          } finally {
            whenReleasingCapture();
          }
        });
      `,
      errors: [{ messageId: 'branchInScenario' }],
    },
    {
      code: `
        it('should refuse a second act after the assertions', () => {
          whenReconciling(refusedFixture);

          thenLatestRefusalNamesTheElement();
          whenDeciding('of-1015');
          thenNoRefusalIsVisible();
        });
      `,
      options: [{ order: true }],
      errors: [{ messageId: 'actionAfterAssertion' }],
    },
    {
      code: `
        it('should refuse a second act declared after the assertions', () => {
          const first = whenDeciding('moule-1015');

          expect(first.intention).toBe(1);
          const second = whenDeciding('of-204');
          expect(second.intention).toBe(2);
        });
      `,
      options: [{ order: true }],
      errors: [{ messageId: 'actionAfterAssertion' }],
    },
  ],
});

const componentFilesFixture = [
  'src/main/webapp/gestion/contexts/supervision-atelier/infrastructure/primary/supervision-atelier.spec.ts',
  'src/main/webapp/gestion/header/header.spec.ts',
  'src/main/webapp/pupitre/app.spec.ts',
  'src/test/webapp/component/gestion/supervision-atelier/SupervisionAtelier.spec.ts',
];

for (const file of componentFilesFixture) {
  it(`should reject a second component action after verification in ${file}`, async () => {
    const messages = await whenLintingSequentialActions(file);

    assert.deepEqual(
      messages.map(message => message.messageId),
      ['actionAfterAssertion'],
    );
  });
}

it('should retain sequential actions and observations in application journeys', async () => {
  const messages = await whenLintingSequentialActions('src/test/webapp/application/gestion/supervision-atelier/SupervisionAtelier.spec.ts');

  assert.deepEqual(messages, []);
});

const whenLintingSequentialActions = async file => {
  const config = await new ESLint().calculateConfigForFile(file);
  return new Linter().verify(
    "it('should update GLM', () => { whenOpening(); thenGlmIsVisible(); whenActivityArrives(); thenGlmIsAbsent(); });",
    {
      plugins: { local: config.plugins.local },
      rules: { 'local/scenario-shape': config.rules['local/scenario-shape'] },
    },
  );
};
