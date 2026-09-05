import { dataSelector } from '../../../utils/DataSelector';
import { requiredFixture } from '../../../utils/RequiredFixture';

interface TouchPointFixture {
  x: number;
  y: number;
}

const longCodeFixture = '0123456789'.repeat(5);

const dispatchTouchFixture = (type: string, touchPoints: TouchPointFixture[]): Promise<void> =>
  Cypress.automation('remote:debugger:protocol', { command: 'Input.dispatchTouchEvent', params: { type, touchPoints } });

describe('Designation keypad in a browser', () => {
  beforeEach(() => {
    cy.viewport(1024, 768);
  });

  it('should enter each digit once using real touchscreen presses and resolve the operator locally', () => {
    givenTheKeypad();

    whenTouching('digit-0');
    thenCodeIs('0');
    whenTouching('digit-4');
    thenCodeIs('04');
    whenTouching('digit-9');
    thenCodeIs('049');
    whenTouching('validate');

    thenJeanIsDesignated();
  });

  it('should follow a long code on one line and let the operator scroll back to its beginning', () => {
    givenTheKeypad();

    whenTyping(longCodeFixture);

    thenCodeIs(longCodeFixture);
    thenLastDigitsAreVisibleOnOneLine();
    whenScrollingToTheBeginning();
    thenFirstDigitsAreVisible();
  });

  it('should not act again when a held touch is released after expiration', () => {
    givenTheKeypad();
    givenAControlledClock();

    whenHolding('digit-0');
    whenTimePasses(0);
    thenCodeIs('0');
    whenTimePasses(30_000);
    thenCodeIs('');
    whenReleasing();
    thenCodeIs('');
    whenTouching('digit-9');
    whenTimePasses(0);
    thenCodeIs('9');
  });

  it('should erase and validate with native physical keyboard commands', () => {
    givenTheKeypad();
    givenKeyboardFocus();

    whenPressing('0');
    whenPressing('4');
    whenPressing('8');
    whenPressing(Cypress.Keyboard.Keys.BACKSPACE);
    thenCodeIs('04');
    whenPressing('9');
    whenPressing(Cypress.Keyboard.Keys.ENTER);

    thenJeanIsDesignated();
  });

  it('should ignore native keyboard repetition without prolonging the designation deadline', () => {
    givenTheKeypad();
    givenKeyboardFocus();
    givenAControlledClock();

    whenHoldingFour(false);
    whenTimePasses(0);
    thenCodeIs('4');
    whenTimePasses(29_000);
    whenHoldingFour(true);
    whenTimePasses(0);
    thenCodeIs('4');
    whenTimePasses(1_000);
    thenCodeIs('');
    whenReleasingFour();
    thenCodeIs('');
  });

  const whenHoldingFour = (autoRepeat: boolean): void => {
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Input.dispatchKeyEvent',
        params: { type: 'keyDown', key: '4', code: 'Digit4', windowsVirtualKeyCode: 52, text: '4', autoRepeat },
      }),
    );
  };
  const whenReleasingFour = (): void => {
    cy.then(() =>
      Cypress.automation('remote:debugger:protocol', {
        command: 'Input.dispatchKeyEvent',
        params: { type: 'keyUp', key: '4', code: 'Digit4', windowsVirtualKeyCode: 52 },
      }),
    );
  };

  const givenKeyboardFocus = (): void => {
    cy.get(dataSelector('code')).focus();
  };
  const whenPressing = (key: string): void => {
    cy.press(key);
  };

  const givenAControlledClock = (): void => {
    cy.clock(Date.now(), ['Date', 'setTimeout', 'clearTimeout']);
  };
  const whenTimePasses = (duration: number): void => {
    cy.tick(duration);
    cy.tick(1);
  };

  const whenTyping = (code: string): void => {
    cy.get(dataSelector('code')).focus();
    cy.get(dataSelector('code')).type(code, { delay: 0 });
  };
  const whenScrollingToTheBeginning = (): void => {
    cy.get(dataSelector('code')).scrollTo('left');
  };
  const thenLastDigitsAreVisibleOnOneLine = (): void => {
    cy.get(dataSelector('code')).should(display => {
      const element = requiredFixture(display[0], 'code display');
      expect(element.scrollWidth).to.be.greaterThan(element.clientWidth);
      expect(element.scrollLeft + element.clientWidth).to.be.closeTo(element.scrollWidth, 1);
      expect(element.scrollHeight).to.equal(element.clientHeight);
    });
  };
  const thenFirstDigitsAreVisible = (): void => {
    cy.get(dataSelector('code')).should(display => {
      expect(requiredFixture(display[0], 'code display').scrollLeft).to.equal(0);
    });
  };

  const givenTheKeypad = (): void => {
    cy.visit('/');
    cy.get(dataSelector('designation'));
  };
  const whenHolding = (selector: string): void => {
    cy.get(dataSelector(selector)).then(element => {
      const rect = requiredFixture(element[0], 'pressed element').getBoundingClientRect();
      const topWindow = requiredFixture(window.top, 'Cypress top window');
      const frame = requiredFixture(topWindow.document.querySelector<HTMLIFrameElement>('iframe.aut-iframe'), 'Cypress application frame');
      const viewport = frame.getBoundingClientRect();
      const scale = viewport.width / frame.clientWidth;
      return dispatchTouchFixture('touchStart', [
        { x: viewport.x + (rect.x + rect.width / 2) * scale, y: viewport.y + (rect.y + rect.height / 2) * scale },
      ]);
    });
  };
  const whenReleasing = (): void => {
    cy.then(() => dispatchTouchFixture('touchEnd', []));
  };
  const whenTouching = (selector: string): void => {
    whenHolding(selector);
    whenReleasing();
  };
  const thenCodeIs = (code: string): void => {
    cy.get(dataSelector('code')).should(display => {
      expect(display.text().trim()).to.equal(code);
    });
  };
  const thenJeanIsDesignated = (): void => {
    cy.get(dataSelector('designated-identity')).should('have.text', 'Jean Dupont');
  };
});
