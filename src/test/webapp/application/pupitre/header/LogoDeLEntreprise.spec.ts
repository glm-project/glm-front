import { referentielApiFixture } from '@test/utils/pupitre/ReferentielApiFixture';
import { dataSelector } from '../../../utils/DataSelector';
import { givenAPupitreEnrolledThroughItsDeviceFlowFixture } from '../../../utils/pupitre/EnrolementFixture';
import { clearPupitreStorageFixture } from '../../../utils/PupitreStorageFixture';

const entrepriseFixture = 'entreprise-a';
const versionFixture = 'aaaaaaaaaaaaaaaa';

const pngDecodableFixture = (): ArrayBuffer => {
  const toile = document.createElement('canvas');
  toile.width = 256;
  toile.height = 100;
  toile.getContext('2d')?.fillRect(0, 0, 256, 100);
  return Uint8Array.from(atob(toile.toDataURL('image/png').split(',')[1] ?? ''), caractere => caractere.charCodeAt(0)).buffer;
};

describe('Logo of the company in the pupitre header', () => {
  afterEach(() => clearPupitreStorageFixture());

  it('should show the logo of the company and download it once for its version', () => {
    givenAnEnrolledPupitre();
    givenTheServerGivesTheLogo();

    whenRestartingAndReadingTheReference();

    thenTheHeaderShowsADownloadedLogo();
    thenTheLogoWasDownloadedOnce();
  });

  it('should keep showing the stored logo without a network', () => {
    givenAnEnrolledPupitreWithAStoredLogo();
    givenNoNetwork();

    whenRestarting();

    thenTheHeaderShowsTheStoredLogo();
  });
});

const givenEdges = (): void => {
  cy.intercept('POST', '**/protocol/openid-connect/auth/device', { statusCode: 503, body: {} }).as('deviceAuthorization');
  cy.intercept('POST', '**/protocol/openid-connect/token', { statusCode: 503, body: {} });
};

const givenTheServerGivesTheLogo = (): void => {
  givenEdges();
  cy.intercept('GET', '/api/pupitre/referentiel', { body: referentielApiFixture({ logo: { version: versionFixture } }) }).as('reference');
  cy.intercept('GET', `/api/parametrage/logo/${versionFixture}`, {
    statusCode: 200,
    headers: { 'content-type': 'image/png' },
    body: pngDecodableFixture(),
  }).as('logo');
};

const givenNoNetwork = (): void => {
  givenEdges();
  cy.intercept('GET', '/api/pupitre/referentiel', { forceNetworkError: true }).as('reference');
  cy.intercept('GET', '/api/parametrage/logo/*', { forceNetworkError: true }).as('unreachableLogo');
};

const givenAnEnrolledPupitre = (): void => {
  givenAPupitreEnrolledThroughItsDeviceFlowFixture(entrepriseFixture);
};

const givenAnEnrolledPupitreWithAStoredLogo = (): void => {
  givenAnEnrolledPupitre();
  givenTheServerGivesTheLogo();
  cy.reload();
  cy.wait('@logo');
  cy.get(dataSelector('header-logo'))
    .should('have.attr', 'src')
    .and('match', /^data:image\/png;base64,/)
    .as('storedLogo', { type: 'static' });
};

const whenRestartingAndReadingTheReference = (): void => {
  cy.reload();
  cy.wait('@reference');
  cy.get(dataSelector('header-logo'))
    .should('have.attr', 'src')
    .and('match', /^data:image\/png;base64,/);
  cy.reload();
  cy.wait('@reference');
};

const whenRestarting = (): void => {
  cy.reload();
  cy.wait('@reference');
};

const thenTheHeaderShowsADownloadedLogo = (): void => {
  cy.get(dataSelector('header-logo'))
    .should('be.visible')
    .and(image => {
      const cadre = image.get(0).getBoundingClientRect();
      expect(cadre.height).to.be.closeTo(40, 0.5);
      expect(cadre.width).to.be.closeTo(102.4, 0.5);
    });
};

const thenTheLogoWasDownloadedOnce = (): void => {
  cy.get('@logo.all').should('have.length', 1);
};

const thenTheHeaderShowsTheStoredLogo = (): void => {
  cy.get<string>('@storedLogo').then(storedLogo => {
    cy.get(dataSelector('header-logo')).should('have.attr', 'src', storedLogo);
  });
  cy.get('@unreachableLogo.all').should('have.length', 0);
};
