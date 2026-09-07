import { ChargementDeLAtelier } from './ChargementDeLAtelierPort';
import { CodeDEnrolement } from './CodeDEnrolement';
import { Enrolement, IssueDEnrolement, VueDEnrolement } from './Enrolement';

const MAINTENANT = 1_700_000_000_000;
const UNE_MINUTE = 60_000;
const ATELIER_CHARGE: ChargementDeLAtelier = { referentielDisponible: true, connecte: true };
const ATELIER_EN_CHARGEMENT: ChargementDeLAtelier = { referentielDisponible: false, connecte: true };
const ATELIER_SANS_RESEAU: ChargementDeLAtelier = { referentielDisponible: false, connecte: false };

describe('Enrolement', () => {
  it('should ask for its authorization before any code is issued', () => {
    const enrolement = givenAnEnrolementBeingRequested();

    const vue = whenProjectingAt(enrolement, MAINTENANT, ATELIER_EN_CHARGEMENT);

    thenTheScreenShows(vue, 'DEMANDE_EN_COURS');
  });

  it('should show the issued code while approval is still awaited', () => {
    const enrolement = givenACodeAwaitingApproval();

    const vue = whenProjectingAt(enrolement, MAINTENANT, ATELIER_EN_CHARGEMENT);

    thenTheScreenShows(vue, 'EN_ATTENTE_D_APPROBATION');
    thenTheCodeShownExpiresIn(vue, 60);
  });

  it('should declare the awaited code expired once its own deadline has passed', () => {
    const enrolement = givenACodeAwaitingApproval();

    const vue = whenProjectingAt(enrolement, MAINTENANT + UNE_MINUTE, ATELIER_EN_CHARGEMENT);

    thenTheScreenShows(vue, 'EXPIRE');
  });

  it.each([
    ['REFUSE', 'REFUSE'],
    ['EXPIRE', 'EXPIRE'],
    ['INJOIGNABLE', 'ERREUR_RESEAU_INITIALE'],
  ] satisfies readonly [IssueDEnrolement, VueDEnrolement['kind']][])('should report the %s attempt as %s', (issue, expected) => {
    const enrolement = givenAnAttemptAnsweredWith(issue);

    const vue = whenProjectingAt(enrolement, MAINTENANT, ATELIER_EN_CHARGEMENT);

    thenTheScreenShows(vue, expected);
  });

  it.each([
    ['ENROLE_ET_PRET', 'the workshop is loaded', ATELIER_CHARGE],
    ['VALIDE_CHARGEMENT_ATELIER', 'its first reference is still downloading', ATELIER_EN_CHARGEMENT],
    ['ATTENTE_RESEAU_ATELIER', 'the network dropped before that reference arrived', ATELIER_SANS_RESEAU],
  ] satisfies readonly [VueDEnrolement['kind'], string, ChargementDeLAtelier][])(
    'should report an approved device as %s when %s',
    (expected, _situation, chargement) => {
      const enrolement = givenAnAttemptAnsweredWith('ENROLE');

      const vue = whenProjectingAt(enrolement, MAINTENANT, chargement);

      thenTheScreenShows(vue, expected);
    },
  );

  it('should leave the previous version untouched when a code is issued', () => {
    const demande = givenAnEnrolementBeingRequested();

    const attente = whenTheCodeIsIssued(demande);

    thenTheScreenShows(whenProjectingAt(demande, MAINTENANT, ATELIER_EN_CHARGEMENT), 'DEMANDE_EN_COURS');
    thenTheScreenShows(whenProjectingAt(attente, MAINTENANT, ATELIER_EN_CHARGEMENT), 'EN_ATTENTE_D_APPROBATION');
  });
});

const givenAnEnrolementBeingRequested = (): Enrolement => Enrolement.demande();

const givenACodeAwaitingApproval = (): Enrolement => whenTheCodeIsIssued(Enrolement.demande());

const givenAnAttemptAnsweredWith = (issue: IssueDEnrolement): Enrolement => Enrolement.demande().afterAttempting(issue);

const whenTheCodeIsIssued = (enrolement: Enrolement): Enrolement =>
  enrolement.afterShowingCode(
    new CodeDEnrolement('WDJB-MJHT', 'http://keycloak.test/realms/glm/device', undefined, MAINTENANT + UNE_MINUTE),
  );

const whenProjectingAt = (enrolement: Enrolement, maintenant: number, chargement: ChargementDeLAtelier): VueDEnrolement =>
  enrolement.vue(maintenant, chargement);

const thenTheScreenShows = (vue: VueDEnrolement, expected: VueDEnrolement['kind']): void => {
  expect(vue.kind).toBe(expected);
};

const thenTheCodeShownExpiresIn = (vue: VueDEnrolement, secondes: number): void => {
  expect(vue.kind === 'EN_ATTENTE_D_APPROBATION' ? vue.code.secondesRestantes : undefined).toBe(secondes);
};
