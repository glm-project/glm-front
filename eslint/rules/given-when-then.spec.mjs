import { RuleTester } from 'eslint';
import { givenWhenThen } from './given-when-then.mjs';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
});

ruleTester.run('given-when-then', givenWhenThen, {
  valid: [
    {
      code: `
        it('should tell a business story', async () => {
          const order = orderFixture();

          await givenAnOpenWorkshop(order);

          const result = whenCompletingTheOrder(order);

          await thenTheOrderIsComplete(result);
        });

        const thenTheOrderIsComplete = result => expect(result).toEqual('complete');
      `,
    },
    {
      code: `
        test('should allow sequential actions', () => {
          whenStartingWork();
          thenWorkIsInProgress();

          whenPausingWork();
          thenWorkIsPaused();
        });
      `,
    },
    {
      code: `
        it.each(cases)('should handle %s', value => {
          const result = valueFixture(value);

          return thenItMatches(result);
        });
      `,
    },
    {
      code: `
        it('should allow a local helper', () => {
          const thenItWorks = () => expect(value).toBe(true);

          thenItWorks();
        });
      `,
    },
    {
      code: `
        it('should allow assertions in callbacks owned by a then helper', () => { thenEveryValueMatches(); });
        const thenEveryValueMatches = () => values.forEach(value => expect(value).toBe(true));
      `,
    },
    {
      code: `test('should allow a concise named step', () => thenItWorks());`,
    },
    {
      code: `
        it('should allow a deferred action asserted by a then helper', () => { thenItRefuses(() => required(value)); });
        const thenItRefuses = action => expect(action).toThrow();
      `,
    },
    {
      code: `
        expect.extend(matchers);
        const valueFixture = expect.objectContaining({ state: 'complete' });
        it('should allow expect configuration and asymmetric fixtures', () => { thenItMatches(valueFixture); });
      `,
    },
  ],
  invalid: [
    {
      code: `it('should not assert directly', () => { expect(value).toBe(true); });`,
      errors: [{ messageId: 'assertionOutsideThen' }],
    },
    {
      code: `
        const checkResult = () => expect(value).toBe(true);
        it('should name assertion helpers', () => { checkResult(); });
      `,
      errors: [{ messageId: 'assertionOutsideThen' }, { messageId: 'unnamedScenarioStep' }],
    },
    {
      code: `it('should hide its action', () => { workshop.complete(); });`,
      errors: [{ messageId: 'unnamedScenarioStep' }],
    },
    {
      code: `it('should inspect concise scenarios', () => workshop.complete());`,
      errors: [{ messageId: 'unnamedScenarioStep' }],
    },
    {
      code: `it('should not hide its action in a declaration', () => { const result = workshop.complete(); thenItIsComplete(result); });`,
      errors: [{ messageId: 'unnamedScenarioStep' }],
    },
    {
      code: `it('should name a called use case', () => { const result = completeWorkshop(); thenItIsComplete(result); });`,
      errors: [{ messageId: 'unnamedScenarioStep' }],
    },
    {
      code: `it('should not hide an action in a then argument', () => { thenItIsComplete(workshop.complete()); });`,
      errors: [{ messageId: 'unnamedScenarioStep' }],
    },
    {
      code: `it('should hide TestBed', () => { TestBed.inject(Service).run(); });`,
      errors: [{ messageId: 'technicalDetail' }],
    },
    {
      code: `it('should hide Cypress', () => { cy.get('[data-test=submit]').click(); });`,
      errors: [{ messageId: 'technicalDetail' }],
    },
    {
      code: `it('should not hide technical access in a declaration', () => { const service = TestBed.inject(Service); thenItWorks(service); });`,
      errors: [{ messageId: 'technicalDetail' }],
    },
    {
      code: `
        const observeResult = () => expect(value).toBe(true);
        test('should keep assertions in then helpers', () => { thenItWorks(); });
      `,
      errors: [{ messageId: 'assertionOutsideThen' }],
    },
    {
      code: `
        const givenAResult = () => assert.equal(actual, expected);
        test('should recognize assert members', () => { givenAResult(); });
      `,
      errors: [{ messageId: 'assertionOutsideThen' }],
    },
    {
      code: `
        const givenAResult = () => expect.soft(actual).toBe(expected);
        test('should recognize soft expectations', () => { givenAResult(); });
      `,
      errors: [{ messageId: 'assertionOutsideThen' }],
    },
    {
      code: `
        const whenReadingEventually = () => expect.poll(readValue).toBe(expected);
        test('should recognize polled expectations', () => { whenReadingEventually(); });
      `,
      errors: [{ messageId: 'assertionOutsideThen' }],
    },
    {
      code: `it('should keep control flow out of the story', () => { if (ready) whenStarting(); });`,
      errors: [{ messageId: 'unnamedScenarioStep' }],
    },
  ],
});
