import { dataSelector } from '../../../utils/DataSelector';

describe('Pupitre common page in a browser', () => {
  let controlledClock: { setSystemTime: (now: number) => void } | undefined;

  beforeEach(() => {
    controlledClock = undefined;
    cy.viewport(1280, 800);
  });

  it('should render only the permanent header before the first reference, then reveal the keypad', () => {
    givenThePageWithoutAReference();
    thenOnlyTheHeaderIsVisible();

    whenTheReferenceBecomesReady();

    thenTheKeypadIsVisible();
  });

  it('should move from designation to identity and pointage, then finish on an empty keypad', () => {
    givenThePage();

    whenDesignatingJean();
    thenJeanAndPointageAreVisible();

    whenFinishing();

    thenAnEmptyKeypadIsVisible();
  });

  it('should expire the pointage and its open workstation choice', () => {
    givenTheControlledPage();
    whenDesignatingJeanWithControlledTime();
    whenOpeningAWorkstationChoice();
    thenTheWorkstationChoiceIsVisible();

    whenTimePasses(30_001);

    thenPointageAndWorkstationChoiceAreClosed();
  });

  it('should renew the operator window on a press outside the keypad', () => {
    givenTheControlledPage();
    whenDesignatingJeanWithControlledTime();
    whenTimePasses(29_000);

    whenPressingTheHeader();
    whenTimePasses(29_000);
    thenThePointageIsVisible();

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

  it('should accept the first digit after the expiry timer already reset the keypad', () => {
    givenTheControlledPage();
    whenEnteringDigit('0');
    whenTimePasses(30_000);
    thenTheCodeIs('');

    whenEnteringDigit('9');

    thenTheCodeIs('9');
  });

  it('should disable every tile and global command during global acceptance while keeping finish available', () => {
    givenThePageWithDelayedAcceptance();
    whenDesignatingJean();

    whenPressingPause();

    thenWorkshopGesturesAreUnavailable();
    thenFinishIsAvailable();

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
    cy.get(dataSelector(selector)).then(pressed => dispatchPress(pressed));
  };

  const dispatchPress = (pressed: JQuery<HTMLElement>): void => {
    const target = pressed[0];
    if (target === undefined) throw new Error('Missing pressed element.');
    target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  };

  const thenOnlyTheHeaderIsVisible = (): void => {
    cy.get(dataSelector('pupitre-header')).should('be.visible');
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
