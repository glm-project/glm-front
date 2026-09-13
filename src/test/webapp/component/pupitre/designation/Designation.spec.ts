import { dataSelector } from '../../../utils/DataSelector';
import { requiredFixture } from '../../../utils/RequiredFixture';
import { holdTouchFixture, releaseTouchFixture, touchFixture } from '../../../utils/TouchscreenFixture';

const longCodeFixture = '0123456789'.repeat(5);

describe('Designation keypad in a browser', () => {
  let heldTouchFixture = false;
  beforeEach(() => {
    cy.viewport(1024, 768);
  });

  afterEach(() => {
    cy.then(() => {
      if (heldTouchFixture) whenReleasing();
    });
    whenReleasingFour();
  });

  it('should enter the first digit once using a real touchscreen press', () => {
    givenTheKeypad();
    whenTouching('digit-0');

    thenCodeIs('0');
  });

  it('should append a second digit once using a real touchscreen press', () => {
    givenTheKeypad();
    whenTouching('digit-0');
    whenTouching('digit-4');

    thenCodeIs('04');
  });

  it('should append a third digit once using a real touchscreen press', () => {
    givenTheKeypad();
    whenTouching('digit-0');
    whenTouching('digit-4');
    whenTouching('digit-9');

    thenCodeIs('049');
  });

  it('should resolve the operator locally after touchscreen entry', () => {
    givenTheKeypad();
    whenTouching('digit-0');
    whenTouching('digit-4');
    whenTouching('digit-9');
    whenTouching('validate');

    thenJeanIsDesignated();
  });

  it('should follow the last digits of a long code on one line', () => {
    givenTheKeypad();
    whenTyping(longCodeFixture);

    thenCodeIs(longCodeFixture);
    thenLastDigitsAreVisibleOnOneLine();
  });

  it('should let the operator scroll back to the beginning of a long code', () => {
    givenTheKeypad();
    whenTyping(longCodeFixture);
    whenScrollingToTheBeginning();

    thenFirstDigitsAreVisible();
  });

  it('should enter one digit when a touchscreen press is held', () => {
    givenTheKeypad();
    givenAControlledClock();
    whenHolding('digit-0');
    whenTimePasses(0);

    thenCodeIs('0');
  });

  it('should expire the code while a touchscreen press remains held', () => {
    givenTheKeypad();
    givenAControlledClock();
    whenHolding('digit-0');
    whenTimePasses(0);
    whenTimePasses(30_000);

    thenCodeIs('');
  });

  it('should ignore a held touchscreen release after expiration', () => {
    givenTheKeypad();
    givenAControlledClock();
    whenHolding('digit-0');
    whenTimePasses(0);
    whenTimePasses(30_000);
    whenReleasing();

    thenCodeIs('');
  });

  it('should accept the next touchscreen press after an expired hold', () => {
    givenTheKeypad();
    givenAControlledClock();
    whenHolding('digit-0');
    whenTimePasses(0);
    whenTimePasses(30_000);
    whenReleasing();
    whenTouching('digit-9');
    whenTimePasses(0);

    thenCodeIs('9');
  });

  it('should erase the last digit with native Backspace', () => {
    givenTheKeypad();
    givenKeyboardFocus();
    whenPressing('0');
    whenPressing('4');
    whenPressing('8');
    whenPressing(Cypress.Keyboard.Keys.BACKSPACE);

    thenCodeIs('04');
  });

  it('should validate the corrected code with native Enter', () => {
    givenTheKeypad();
    givenKeyboardFocus();
    whenPressing('0');
    whenPressing('4');
    whenPressing('8');
    whenPressing(Cypress.Keyboard.Keys.BACKSPACE);
    whenPressing('9');
    whenPressing(Cypress.Keyboard.Keys.ENTER);

    thenJeanIsDesignated();
  });

  it('should enter a digit on native keydown', () => {
    givenTheKeypad();
    givenKeyboardFocus();
    givenAControlledClock();
    whenHoldingFour(false);
    whenTimePasses(0);

    thenCodeIs('4');
  });

  it('should ignore native keyboard repetition', () => {
    givenTheKeypad();
    givenKeyboardFocus();
    givenAControlledClock();
    whenHoldingFour(false);
    whenTimePasses(0);
    whenTimePasses(29_000);
    whenHoldingFour(true);
    whenTimePasses(0);

    thenCodeIs('4');
  });

  it('should expire designation despite native keyboard repetition', () => {
    givenTheKeypad();
    givenKeyboardFocus();
    givenAControlledClock();
    whenHoldingFour(false);
    whenTimePasses(0);
    whenTimePasses(29_000);
    whenHoldingFour(true);
    whenTimePasses(0);
    whenTimePasses(1_000);

    thenCodeIs('');
  });

  it('should ignore native keyup after designation expired', () => {
    givenTheKeypad();
    givenKeyboardFocus();
    givenAControlledClock();
    whenHoldingFour(false);
    whenTimePasses(0);
    whenTimePasses(29_000);
    whenHoldingFour(true);
    whenTimePasses(0);
    whenTimePasses(1_000);
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
    holdTouchFixture(dataSelector(selector));
    cy.then(() => {
      heldTouchFixture = true;
    });
  };
  const whenReleasing = (): void => {
    releaseTouchFixture();
    cy.then(() => {
      heldTouchFixture = false;
    });
  };
  const whenTouching = (selector: string): void => {
    touchFixture(dataSelector(selector));
  };
  const thenCodeIs = (code: string): void => {
    cy.get(dataSelector('code')).should(display => {
      expect(display.text().trim()).to.equal(code);
    });
  };
  const thenJeanIsDesignated = (): void => {
    cy.get(dataSelector('header-operator')).should('contain.text', 'Dupont Jean');
  };
});
