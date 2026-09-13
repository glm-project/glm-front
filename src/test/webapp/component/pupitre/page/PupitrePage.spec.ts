import { dataSelector } from '../../../utils/DataSelector';
import { touchFixture } from '../../../utils/TouchscreenFixture';

describe('Pupitre common page in a browser', () => {
  let controlledClock: { setSystemTime: (now: number) => void } | undefined;

  beforeEach(() => {
    controlledClock = undefined;
    cy.viewport(1280, 800);
  });

  it('should keep enrolment under the header before the first reference', () => {
    givenThePageWithoutAReference();

    thenTheHeaderStandsAboveTheEnrolmentScreen();
  });

  it('should reveal the keypad when the first reference becomes ready', () => {
    givenThePageWithoutAReference();
    whenTheReferenceBecomesReady();

    thenTheKeypadIsVisible();
  });

  it('should show identity and pointage after designation', () => {
    givenThePage();
    whenDesignatingJean();

    thenJeanAndPointageAreVisible();
  });

  it('should return to an empty keypad after finishing', () => {
    givenThePage();
    whenDesignatingJean();
    whenFinishing();

    thenAnEmptyKeypadIsVisible();
  });

  it('should display the workstation choice over pointage', () => {
    givenTheControlledPage();
    whenDesignatingJeanWithControlledTime();
    whenOpeningAWorkstationChoice();

    thenTheWorkstationChoiceIsVisible();
  });

  it('should close pointage and its workstation choice on expiration', () => {
    givenTheControlledPage();
    whenDesignatingJeanWithControlledTime();
    whenOpeningAWorkstationChoice();
    whenTimePasses(30_001);

    thenPointageAndWorkstationChoiceAreClosed();
  });

  it('should keep pointage open after renewing on a header press', () => {
    givenTheControlledPage();
    whenDesignatingJeanWithControlledTime();
    whenTimePasses(29_000);
    whenPressingTheHeader();
    whenTimePasses(29_000);

    thenThePointageIsVisible();
  });

  it('should expire pointage at the renewed deadline', () => {
    givenTheControlledPage();
    whenDesignatingJeanWithControlledTime();
    whenTimePasses(29_000);
    whenPressingTheHeader();
    whenTimePasses(29_000);
    whenTimePasses(1_000);

    thenTheKeypadIsVisible();
  });

  it('should consume the complete press that discovers an overdue operator window after sleep', () => {
    givenTheControlledPage();
    whenDesignatingJeanWithControlledTime();

    whenSleepingPastTheDeadline();
    whenPressingImmediately('pause');

    thenOnlyTheKeypadIsVisible();
  });

  it('should clear the code at the designation deadline', () => {
    givenTheControlledPage();
    whenEnteringDigit('0');
    whenTimePasses(30_000);

    thenTheCodeIs('');
  });

  it('should accept the first digit after the expiry timer reset the keypad', () => {
    givenTheControlledPage();
    whenEnteringDigit('0');
    whenTimePasses(30_000);
    whenEnteringDigit('9');

    thenTheCodeIs('9');
  });

  it('should disable workshop gestures but keep finish available during acceptance', () => {
    givenThePageWithDelayedAcceptance();
    whenDesignatingJean();
    whenPressingPause();

    thenWorkshopGesturesAreUnavailable();
    thenFinishIsAvailable();
  });

  it('should allow finishing while global acceptance is pending', () => {
    givenThePageWithDelayedAcceptance();
    whenDesignatingJean();
    whenPressingPause();
    whenFinishing();

    thenTheKeypadIsVisible();
  });

  const givenThePageWithoutAReference = (): void => {
    cy.visit('/?reference-delay');
  };

  const givenThePage = (): void => {
    cy.visit('/');
    cy.get(dataSelector('designation')).should('be.visible');
  };

  const givenTheControlledPage = (): void => {
    givenThePage();
    cy.clock().then(clock => {
      controlledClock = clock;
    });
  };

  const givenThePageWithDelayedAcceptance = (): void => {
    cy.visit('/?delayed-append');
    cy.get(dataSelector('designation')).should('be.visible');
  };

  const whenDesignatingJean = (): void => {
    cy.get(dataSelector('digit-0')).click();
    cy.get(dataSelector('digit-4')).click();
    cy.get(dataSelector('digit-9')).click();
    cy.get(dataSelector('validate')).click();
    cy.get(dataSelector('pointage')).should('be.visible');
  };

  const whenDesignatingJeanWithControlledTime = (): void => {
    whenEnteringDigit('0');
    whenEnteringDigit('4');
    whenEnteringDigit('9');
    cy.get(dataSelector('validate')).click();
    cy.tick(3);
    cy.get(dataSelector('pointage')).should('be.visible');
  };

  const whenTheReferenceBecomesReady = (): void => {
    cy.window().then(browser => {
      browser.dispatchEvent(new Event('pupitre-fixture-reference-ready'));
    });
  };

  const whenOpeningAWorkstationChoice = (): void => {
    whenPressingTile('of-1', 'primary-target');
    cy.tick(0);
  };

  const whenPressingTheHeader = (): void => {
    cy.get(dataSelector('pupitre-header')).trigger('pointerdown');
  };

  const whenSleepingPastTheDeadline = (): void => {
    cy.then(() => {
      const clock = controlledClock;
      if (clock === undefined) throw new Error('Missing controlled clock.');
      clock.setSystemTime(Date.now() + 31_000);
    });
  };

  const whenEnteringDigit = (digit: string): void => {
    cy.get(dataSelector(`digit-${digit}`)).click();
    cy.tick(0);
  };

  const whenTimePasses = (duration: number): void => {
    cy.tick(duration);
  };

  const whenPressingPause = (): void => {
    cy.get(dataSelector('pause')).click();
  };

  const whenFinishing = (): void => {
    cy.get(dataSelector('finish')).click();
  };

  const whenPressingTile = (tile: string, target: string): void => {
    cy.get(dataSelector(`tile-${tile}`))
      .find(dataSelector(target))
      .then(pressed => dispatchPress(pressed));
  };

  const whenPressingImmediately = (selector: string): void => {
    touchFixture(dataSelector(selector));
  };

  const dispatchPress = (pressed: JQuery<HTMLElement>): void => {
    const target = pressed[0];
    if (target === undefined) throw new Error('Missing pressed element.');
    target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  };

  const thenTheHeaderStandsAboveTheEnrolmentScreen = (): void => {
    cy.get(dataSelector('pupitre-header')).should('be.visible');
    cy.get(dataSelector('enrolement')).should('be.visible');
    cy.get(dataSelector('designation')).should('not.exist');
    cy.get(dataSelector('pointage')).should('not.exist');
  };

  const thenJeanAndPointageAreVisible = (): void => {
    cy.get(dataSelector('header-operator')).should('contain.text', 'Dupont Jean');
    thenThePointageIsVisible();
  };

  const thenAnEmptyKeypadIsVisible = (): void => {
    thenTheKeypadIsVisible();
    thenTheCodeIs('');
    cy.get(dataSelector('pointage')).should('not.exist');
  };

  const thenTheKeypadIsVisible = (): void => {
    cy.get(dataSelector('designation')).should('be.visible');
  };

  const thenOnlyTheKeypadIsVisible = (): void => {
    thenTheKeypadIsVisible();
    cy.get(dataSelector('pointage')).should('not.exist');
  };

  const thenThePointageIsVisible = (): void => {
    cy.get(dataSelector('pointage')).should('be.visible');
  };

  const thenTheWorkstationChoiceIsVisible = (): void => {
    cy.get(dataSelector('workstation-dialog')).should('be.visible');
  };

  const thenPointageAndWorkstationChoiceAreClosed = (): void => {
    thenTheKeypadIsVisible();
    cy.get(dataSelector('workstation-dialog')).should('not.exist');
  };

  const thenWorkshopGesturesAreUnavailable = (): void => {
    cy.get(dataSelector('pause')).should('be.disabled');
    cy.get(dataSelector('resume')).should('be.disabled');
    cy.get(dataSelector('stop-all')).should('be.disabled');
    cy.get(dataSelector('tile-of-1')).find(dataSelector('primary-target')).should('be.disabled');
    cy.get(dataSelector('tile-of-1')).find(dataSelector('secondary-target')).should('be.disabled');
  };

  const thenFinishIsAvailable = (): void => {
    cy.get(dataSelector('finish')).should('not.be.disabled');
  };

  const thenTheCodeIs = (expected: string): void => {
    cy.get(dataSelector('code')).should(display => {
      expect(display.text().trim()).to.equal(expected);
    });
  };
});
