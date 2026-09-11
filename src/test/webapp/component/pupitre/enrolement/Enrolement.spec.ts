import { dataSelector } from '../../../utils/DataSelector';
import { requiredFixture } from '../../../utils/RequiredFixture';

const TOUCH_TARGET_HEIGHT = 48;
const RECOVERIES: readonly [string, string, string][] = [
  ['expired', "Le code d'autorisation a expiré", 'Demander un nouveau code'],
  ['denied', "Autorisation refusée par l'administrateur", 'Recommencer'],
  ['unreachable', "Connexion Internet requise pour enrôler l'appareil", 'Réessayer'],
];

describe('Pupitre enrolment screen in a browser', () => {
  beforeEach(() => {
    cy.viewport(1280, 800);
  });

  it('should show the scannable code, the address to type it on and a countdown while approval is awaited', () => {
    givenAPupitreAwaitingApproval();

    thenTheCodeToTypeIs('WDJB-MJHT');
    thenTheAddressToTypeItOnIsVisible();
    thenTheQrCodeIsDrawn();
    thenTheCountdownRunsDown();
  });

  for (const [scenario, message, action] of RECOVERIES) {
    it(`should explain an ${scenario} enrolment and offer a touch target to recover`, () => {
      givenAnEnrolmentThat(scenario);

      thenTheStatusReads(message);
      thenTheRecoveryTargetReads(action);
      thenTheRecoveryTargetIsTouchable();
    });
  }

  it('should keep the keypad hidden until the workshop reference makes the pupitre ready', () => {
    givenAPupitreAwaitingItsWorkshop();

    thenTheStatusReads("Appareil validé — En attente de connexion pour charger l'atelier");
    thenTheKeypadIsHidden();

    whenTheReferenceBecomesReady();

    thenTheKeypadIsVisible();
    thenTheEnrolmentScreenIsGone();
  });
});

const givenAPupitreAwaitingApproval = (): void => {
  cy.visit('/?enrolment=awaiting');
  cy.get(dataSelector('enrolement-awaiting')).should('be.visible');
};

const givenAnEnrolmentThat = (scenario: string): void => {
  cy.visit(`/?enrolment=${scenario}`);
  cy.get(dataSelector('enrolement-panel')).should('be.visible');
};

const givenAPupitreAwaitingItsWorkshop = (): void => {
  cy.visit('/?reference-delay');
  cy.get(dataSelector('enrolement-panel')).should('be.visible');
};

const whenTheReferenceBecomesReady = (): void => {
  cy.window().then(browser => {
    browser.dispatchEvent(new Event('pupitre-fixture-reference-ready'));
  });
};

const thenTheCodeToTypeIs = (userCode: string): void => {
  cy.get(dataSelector('user-code')).should('have.text', userCode);
};

const thenTheAddressToTypeItOnIsVisible = (): void => {
  cy.get(dataSelector('verification-uri')).should('contain.text', 'http://localhost:9080/realms/glmproject/device');
};

const thenTheQrCodeIsDrawn = (): void => {
  cy.get(dataSelector('qr-code')).find('svg').should('have.attr', 'role', 'img');
  cy.get(dataSelector('qr-modules'))
    .invoke('attr', 'd')
    .should(drawing => {
      expect(requiredFixture(drawing, 'qr drawing').length).to.be.greaterThan(0);
    });
};

const thenTheCountdownRunsDown = (): void => {
  cy.get(dataSelector('countdown'))
    .invoke('text')
    .should('match', /^Expire dans 0\d:\d{2}$/);
  cy.get(dataSelector('countdown'))
    .invoke('text')
    .then(first => {
      cy.get(dataSelector('countdown')).should(elements => {
        expect(elements.text()).not.to.equal(first);
      });
    });
};

const thenTheStatusReads = (message: string): void => {
  cy.get(dataSelector('enrolement-status')).should('have.text', message);
};

const thenTheRecoveryTargetReads = (action: string): void => {
  cy.get(dataSelector('enrolement-action')).should('contain.text', action);
};

const thenTheRecoveryTargetIsTouchable = (): void => {
  cy.get(dataSelector('enrolement-action')).should(targets => {
    expect(requiredFixture(targets[0], 'recovery target').getBoundingClientRect().height).to.be.at.least(TOUCH_TARGET_HEIGHT);
  });
};

const thenTheKeypadIsHidden = (): void => {
  cy.get(dataSelector('designation')).should('not.exist');
};

const thenTheKeypadIsVisible = (): void => {
  cy.get(dataSelector('designation')).should('be.visible');
};

const thenTheEnrolmentScreenIsGone = (): void => {
  cy.get(dataSelector('enrolement')).should('not.exist');
};
