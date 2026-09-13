import { RuleTester } from 'eslint';
import { givenWhenThen } from './given-when-then.mjs';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
});

ruleTester.run('given-when-then', givenWhenThen, {
  valid: [
    {
      code: `const thenOpeningIsRefused = () => expect(() => whenOpening()).toThrow('Already open'); it('should refuse a duplicate opening', () => thenOpeningIsRefused());`,
    },
    {
      code: `const thenPresenceIsVisible = () => expect(tile.querySelector('[data-selector=presence]').textContent).toBe('Présent'); it('should show presence', () => { thenPresenceIsVisible(); });`,
    },
    {
      code: `function whenFocusing() { button.focus(); } const givenThePage = () => cy.visit('/'); it('should focus', () => { givenThePage(); whenFocusing(); thenItIsFocused(); });`,
    },
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
      code: `it('should hide computed DOM access', () => { expect(element['textContent']).toBe('Présent'); });`,
      errors: [{ messageId: 'technicalDetail' }],
    },
    ...[
      'click',
      'blur',
      'dispatchEvent',
      'navigateByUrl',
      'navigate',
      'visit',
      'type',
      'trigger',
      'scrollTo',
      'scrollIntoView',
      'tick',
      'setSystemTime',
      'advanceTimersByTime',
      'advanceTimersByTimeAsync',
      'runAllTimers',
    ].map(gesture => ({
      code: `function thenItIsVisible() { browser.${gesture}(); } it('should observe', () => thenItIsVisible());`,
      errors: [{ messageId: 'actionInThen' }],
    })),
    {
      code: `const thenItIsVisible = () => cy.then(() => button['click']()); it('should observe', () => thenItIsVisible());`,
      errors: [{ messageId: 'actionInThen' }],
    },
    {
      code: `const thenItIsVisible = async () => { await whenOpening(); }; it('should observe', () => thenItIsVisible());`,
      errors: [{ messageId: 'actionInThen' }],
    },
    {
      code: `const thenItIsVisible = () => givenThePage(); it('should observe', () => thenItIsVisible());`,
      errors: [{ messageId: 'actionInThen' }],
    },
    {
      code: `const thenItIsVisible = () => cy.get('[data-selector=button]').invoke('focus'); it('should observe', () => thenItIsVisible());`,
      errors: [{ messageId: 'actionInThen' }],
    },
    {
      code: `const thenRefreshIsFocused = () => { cy.get('[data-selector=refresh]').focus(); }; it('should show focus', () => { thenRefreshIsFocused(); });`,
      errors: [{ messageId: 'actionInThen' }],
    },
    ...['querySelectorAll', 'getAttribute', 'getBoundingClientRect', 'innerHTML', 'nativeElement'].map(member => ({
      code: `it('should hide DOM access', () => { expect(element.${member}).toBeDefined(); });`,
      errors: [{ messageId: 'technicalDetail' }],
    })),
    {
      code: `it('should hide selector construction', () => { expect(elements(dataSelector('activity'))).toHaveLength(2); });`,
      errors: [{ messageId: 'technicalDetail' }],
    },
    {
      code: `it('should hide DOM text access in callbacks', () => { expect(elements('activity').map(element => element.textContent)).toEqual(['Moule 1015']); });`,
      errors: [{ messageId: 'technicalDetail' }],
    },
    {
      code: `it('should hide DOM queries', () => { expect(tileFor('alice').querySelector('[data-selector=presence]').textContent).toBe('Présent'); });`,
      errors: [{ messageId: 'technicalDetail' }],
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
  ],
});
