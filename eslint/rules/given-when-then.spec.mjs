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
      code: `test('should allow a concise scenario', () => { workshop.complete(); expect(workshop.state()).toBe('complete'); });`,
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
  ],
});
