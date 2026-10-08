import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActiviteDeSupervision } from '../../../domain/activite/ActiviteDeSupervision';
import { CategorieActivite } from '../../../domain/activite/CategorieActivite';
import { CategorieDElement } from '../../../domain/activite/CategorieDElement';
import { ElementTravaille } from '../../../domain/activite/ElementTravaille';
import { IdentifiantActivite } from '../../../domain/activite/IdentifiantActivite';
import { IdentifiantSequence } from '../../../domain/activite/IdentifiantSequence';
import { ReferenceDElement } from '../../../domain/activite/ReferenceDElement';
import { SequenceEnConflit } from '../../../domain/activite/SequenceEnConflit';
import { Instant } from '../../../domain/instant/Instant';
import { IdentifiantOperateur } from '../../../domain/operateur/IdentifiantOperateur';
import { OperateurDeclare } from '../../../domain/operateur/OperateurDeclare';
import { IdentifiantPoste } from '../../../domain/poste/IdentifiantPoste';
import { NatureDeTravail } from '../../../domain/poste/NatureDeTravail';
import { PosteDeSupervision } from '../../../domain/poste/PosteDeSupervision';
import { DonneesDeSupervision, DonneesDeSupervisionPort } from '../../../domain/supervision/DonneesDeSupervisionPort';
import { HttpDonneesDeSupervision } from './HttpDonneesDeSupervision';
import { InMemoryDonneesDeSupervision } from './InMemoryDonneesDeSupervision';

describe('InMemory demonstration beyond the shared contract', () => {
  afterEach(() => vi.useRealTimers());

  it('should retain the evaluation of each complete acquisition', async () => {
    givenEvaluationAt('2026-09-13T10:00:00Z');
    const port = new InMemoryDonneesDeSupervision();

    const premiere = await port.read();
    const suivante = await whenReadAt(port, '2026-09-13T10:00:30Z');

    expect(premiere.evaluation.value).toBe('2026-09-13T10:00:00.000Z');
    expect(suivante.evaluation.value).toBe('2026-09-13T10:00:30.000Z');
  });

  it('should read conflicting sequences separately from interpretable activities', async () => {
    const port = new InMemoryDonneesDeSupervision();

    const donnees = await port.read();

    expect(donnees.sequencesEnConflit.length).toBeGreaterThan(0);
    expect(donnees.sequencesEnConflit.every(sequence => sequence.hasOperateurIdentifiable(donnees.operateurs))).toBe(true);
  });

  it('should represent personal work by its fabrication order in the demonstration', async () => {
    const port = new InMemoryDonneesDeSupervision();

    const donnees = await port.read();

    expect(designationOf(donnees.activites.find(activite => activite.operateurId?.value === 'op-chevalier')?.objet)).toEqual([
      'OF',
      'OF Perso',
    ]);
    expect(
      designationOf(
        donnees.sequencesEnConflit.flatMap(sequence => sequence.activites).find(activite => activite.id.value === 'act-morel-a-resoudre')
          ?.objet,
      ),
    ).toEqual(['OF', 'OF Perso']);
  });

  it('should read supervision data in which every activity belongs to a declared operator', async () => {
    const port = new InMemoryDonneesDeSupervision();

    const donnees = await port.read();

    expect(donnees.activites.filter(activite => !activite.hasOperateurIdentifiable(donnees.operateurs))).toEqual([]);
  });
});

const givenEvaluationAt = (instant: string): void => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(instant));
};

const whenReadAt = (port: DonneesDeSupervisionPort, instant: string) => {
  vi.setSystemTime(new Date(instant));
  return port.read();
};

const EVALUATION = new Instant('2026-09-13T10:00:00Z');
type RestSupervision = components['schemas']['RestSupervisionDAtelier'];

interface SceneFixture {
  readonly donnees: DonneesDeSupervision;
  readonly response: RestSupervision;
}

interface ReadHarness {
  readonly port: DonneesDeSupervisionPort;
  answer(): void;
}

interface HttpReadHarness extends ReadHarness {
  readonly http: HttpTestingController;
  readonly errors: ErrorHandlerFixture;
}

const emptyFixture: SceneFixture = {
  donnees: { evaluation: EVALUATION, operateurs: [], activites: [], sequencesEnConflit: [] },
  response: { evaluation: EVALUATION.value, operateurs: [], activites: [], sequencesEnConflit: [] },
};

const operateurFixture = new OperateurDeclare({
  id: new IdentifiantOperateur('op-serin'),
  nom: 'Sérin',
  prenom: 'Maya',
  metiers: [new NatureDeTravail('Rectification')],
});
const oneOperatorFixture: SceneFixture = {
  donnees: { ...emptyFixture.donnees, operateurs: [operateurFixture] },
  response: { ...emptyFixture.response, operateurs: [{ id: 'op-serin', nom: 'Sérin', prenom: 'Maya', metiers: ['Rectification'] }] },
};

const activityFixture = new ActiviteDeSupervision({
  id: new IdentifiantActivite('opening-of'),
  operateurId: operateurFixture.id,
  objet: new ElementTravaille({ categorie: new CategorieDElement('OF'), nom: 'OF-2026-000042', reference: new ReferenceDElement('3004') }),
  categorie: new CategorieActivite('TRAVAIL'),
  debut: new Instant('2026-09-13T08:30:00Z'),
  echeance: new Instant('2026-09-13T21:30:00Z'),
});
const fabricationOrderFixture: SceneFixture = {
  donnees: { ...oneOperatorFixture.donnees, activites: [activityFixture] },
  response: {
    ...oneOperatorFixture.response,
    activites: [
      {
        id: 'opening-of',
        operateurId: 'op-serin',
        element: { id: 'of-42', categorie: 'OF', type: 'ORDRE_DE_FABRICATION', nom: 'OF-2026-000042', reference: '3004' },
        categorie: 'TRAVAIL',
        debut: '2026-09-13T08:30:00Z',
        echeance: '2026-09-13T21:30:00Z',
        etat: 'EN_COURS',
      },
    ],
  },
};

const otherOperatorFixture = new OperateurDeclare({ id: new IdentifiantOperateur('op-legrand'), nom: 'Legrand', prenom: 'Noé' });
const mouldActivityFixture = new ActiviteDeSupervision({
  id: new IdentifiantActivite('opening-mould'),
  operateurId: otherOperatorFixture.id,
  objet: new ElementTravaille({ categorie: new CategorieDElement('MOULE'), nom: 'Moule personnel' }),
  categorie: new CategorieActivite('NON_CONFORMITE'),
  debut: new Instant('2026-09-13T09:15:00Z'),
  echeance: new Instant('2026-09-13T22:15:00Z'),
  poste: new PosteDeSupervision({
    id: new IdentifiantPoste('poste-fraiseuse'),
    libelle: 'Fraiseuse 2',
    nature: new NatureDeTravail('Fraisage'),
  }),
});
const mouldFixture: SceneFixture = {
  donnees: {
    ...fabricationOrderFixture.donnees,
    operateurs: [operateurFixture, otherOperatorFixture],
    activites: [activityFixture, mouldActivityFixture],
  },
  response: {
    ...fabricationOrderFixture.response,
    operateurs: [...fabricationOrderFixture.response.operateurs, { id: 'op-legrand', nom: 'Legrand', prenom: 'Noé', metiers: [] }],
    activites: [
      ...fabricationOrderFixture.response.activites,
      {
        id: 'opening-mould',
        operateurId: 'op-legrand',
        element: { id: 'moule-personnel', categorie: 'MOULE', type: 'PRODUIT', nom: 'Moule personnel' },
        categorie: 'NON_CONFORMITE',
        debut: '2026-09-13T09:15:00Z',
        echeance: '2026-09-13T22:15:00Z',
        etat: 'EN_COURS',
        poste: { id: 'poste-fraiseuse', libelle: 'Fraiseuse 2', nature: 'Fraisage' },
      },
    ],
  },
};

const automaticEndFixture: SceneFixture = {
  donnees: {
    ...oneOperatorFixture.donnees,
    activites: [
      new ActiviteDeSupervision({
        id: new IdentifiantActivite('automatic-end'),
        operateurId: operateurFixture.id,
        objet: new ElementTravaille({ categorie: new CategorieDElement('OF'), nom: 'OF Perso' }),
        categorie: new CategorieActivite('TRAVAIL'),
        debut: new Instant('2026-09-12T08:00:00Z'),
        echeance: new Instant('2026-09-12T21:00:00Z'),
        etat: 'TERMINEE_AUTOMATIQUEMENT',
        finRetenue: new Instant('2026-09-12T20:45:00Z'),
        poste: new PosteDeSupervision({ id: new IdentifiantPoste('poste-tour'), libelle: 'Tour 3' }),
      }),
    ],
  },
  response: {
    ...oneOperatorFixture.response,
    activites: [
      {
        id: 'automatic-end',
        operateurId: 'op-serin',
        element: { id: 'of-perso', categorie: 'OF', type: 'ORDRE_DE_FABRICATION', nom: 'OF Perso' },
        categorie: 'TRAVAIL',
        debut: '2026-09-12T08:00:00Z',
        echeance: '2026-09-12T21:00:00Z',
        etat: 'TERMINEE_AUTOMATIQUEMENT',
        finRetenue: '2026-09-12T20:45:00Z',
        poste: { id: 'poste-tour', libelle: 'Tour 3' },
      },
    ],
  },
};

const emptyConflictFixture: SceneFixture = {
  donnees: {
    ...fabricationOrderFixture.donnees,
    sequencesEnConflit: [
      new SequenceEnConflit({
        id: new IdentifiantSequence('sequence-empty'),
        operateurId: operateurFixture.id,
        activites: [],
      }),
    ],
  },
  response: { ...fabricationOrderFixture.response, sequencesEnConflit: [{ id: 'sequence-empty', operateurId: 'op-serin', activites: [] }] },
};

const conflictFixture: SceneFixture = {
  donnees: {
    ...fabricationOrderFixture.donnees,
    sequencesEnConflit: [
      new SequenceEnConflit({
        id: new IdentifiantSequence('sequence-described'),
        operateurId: operateurFixture.id,
        poste: new PosteDeSupervision({
          id: new IdentifiantPoste('poste-erodeuse'),
          libelle: 'Érodeuse 2',
          nature: new NatureDeTravail('Érosion'),
        }),
        activites: [
          new ActiviteDeSupervision({
            id: new IdentifiantActivite('opening-conflict-perso'),
            operateurId: operateurFixture.id,
            objet: new ElementTravaille({ categorie: new CategorieDElement('OF'), nom: 'OF Perso' }),
            categorie: new CategorieActivite('NON_CONFORMITE'),
            debut: new Instant('2026-09-12T08:00:00Z'),
            echeance: new Instant('2026-09-12T21:00:00Z'),
            etat: 'A_RESOUDRE',
          }),
          new ActiviteDeSupervision({
            id: new IdentifiantActivite('opening-conflict-mould'),
            operateurId: operateurFixture.id,
            objet: new ElementTravaille({
              categorie: new CategorieDElement('MOULE'),
              nom: 'PRD-2026-000015',
              reference: new ReferenceDElement('1015'),
            }),
            categorie: new CategorieActivite('TRAVAIL'),
            debut: new Instant('2026-09-12T09:00:00Z'),
            echeance: new Instant('2026-09-12T22:00:00Z'),
            etat: 'A_RESOUDRE',
            poste: new PosteDeSupervision({
              id: new IdentifiantPoste('poste-erodeuse'),
              libelle: 'Érodeuse 2',
              nature: new NatureDeTravail('Érosion'),
            }),
          }),
        ],
      }),
    ],
  },
  response: {
    ...fabricationOrderFixture.response,
    sequencesEnConflit: [
      {
        id: 'sequence-described',
        operateurId: 'op-serin',
        poste: { id: 'poste-erodeuse', libelle: 'Érodeuse 2', nature: 'Érosion' },
        activites: [
          {
            id: 'opening-conflict-perso',
            operateurId: 'op-serin',
            element: { id: 'of-perso', categorie: 'OF', type: 'ORDRE_DE_FABRICATION', nom: 'OF Perso' },
            categorie: 'NON_CONFORMITE',
            debut: '2026-09-12T08:00:00Z',
            echeance: '2026-09-12T21:00:00Z',
          },
          {
            id: 'opening-conflict-mould',
            operateurId: 'op-serin',
            element: { id: 'moule-1015', categorie: 'MOULE', type: 'PRODUIT', nom: 'PRD-2026-000015', reference: '1015' },
            categorie: 'TRAVAIL',
            debut: '2026-09-12T09:00:00Z',
            echeance: '2026-09-12T22:00:00Z',
            poste: { id: 'poste-erodeuse', libelle: 'Érodeuse 2', nature: 'Érosion' },
          },
        ],
      },
    ],
  },
};

const unresolvedActivityFixture: SceneFixture = {
  donnees: { ...fabricationOrderFixture.donnees, operateurs: [] },
  response: { ...fabricationOrderFixture.response, operateurs: [] },
};

const preciseEndFixture: SceneFixture = {
  donnees: {
    ...oneOperatorFixture.donnees,
    activites: [
      new ActiviteDeSupervision({
        id: new IdentifiantActivite('automatic-end'),
        operateurId: operateurFixture.id,
        objet: new ElementTravaille({ categorie: new CategorieDElement('OF'), nom: 'OF Perso' }),
        categorie: new CategorieActivite('TRAVAIL'),
        debut: new Instant('2026-09-12T06:00:00.123456789Z'),
        echeance: new Instant('2026-09-12T19:00:00.987654321Z'),
        finRetenue: new Instant('2026-09-12T18:45:00.111222333Z'),
        etat: 'TERMINEE_AUTOMATIQUEMENT',
        poste: new PosteDeSupervision({ id: new IdentifiantPoste('poste-tour'), libelle: 'Tour 3' }),
      }),
    ],
  },
  response: {
    ...automaticEndFixture.response,
    activites: automaticEndFixture.response.activites.map(activite => ({
      ...activite,
      debut: '2026-09-12T08:00:00.123456789+02:00',
      echeance: '2026-09-12T21:00:00.987654321+02:00',
      finRetenue: '2026-09-12T20:45:00.111222333+02:00',
    })),
  },
};
const unresolvedSequenceFixture: SceneFixture = {
  donnees: { ...emptyConflictFixture.donnees, operateurs: [], activites: [] },
  response: { ...emptyConflictFixture.response, operateurs: [], activites: [] },
};

const givenInMemory = (scene: SceneFixture): ReadHarness => ({
  port: new InMemoryDonneesDeSupervision(scene.donnees),
  answer: () => undefined,
});

const givenHttp = (scene: SceneFixture): HttpReadHarness => {
  const errors = new ErrorHandlerFixture();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      ApiClient,
      HttpDonneesDeSupervision,
      { provide: ErrorHandlerPort, useValue: errors },
    ],
  });
  const http = TestBed.inject(HttpTestingController);
  return {
    port: TestBed.inject(HttpDonneesDeSupervision),
    http,
    errors,
    answer: () => {
      http.expectOne({ method: 'GET', url: '/api/atelier/supervision' }).flush(scene.response);
    },
  };
};

const designationOf = (objet: ElementTravaille | undefined): readonly (string | undefined)[] => [objet?.categorie.value, objet?.nom];

const whenRead = async (harness: ReadHarness): Promise<DonneesDeSupervision> => {
  const reading = harness.port.read();
  harness.answer();
  return reading;
};

const posteObservationFixture = (poste: PosteDeSupervision | undefined) =>
  poste === undefined ? undefined : { id: poste.id.value, libelle: poste.libelle, nature: poste.nature?.value };

const activityObservationFixture = (activite: ActiviteDeSupervision, evaluation: Instant) => ({
  id: activite.id.value,
  operateurId: activite.operateurId?.value,
  objet: { categorie: activite.objet.categorie.value, nom: activite.objet.nom, reference: activite.objet.reference?.value },
  categorie: activite.categorie.value,
  debut: activite.debut.value,
  echeance: activite.echeance.value,
  finRetenue: activite.finRetenue.value,
  poste: posteObservationFixture(activite.poste),
  enCours: activite.isEnCours(evaluation),
  termineeAutomatiquement: activite.isTermineeAutomatiquement(evaluation),
});

const supervisionObservationFixture = (donnees: DonneesDeSupervision) => ({
  evaluation: donnees.evaluation.value,
  operateurs: donnees.operateurs.map(operateur => ({
    id: operateur.id.value,
    nom: operateur.nom,
    prenom: operateur.prenom,
    metiers: operateur.metiers.map(metier => metier.value),
  })),
  activites: donnees.activites.map(activite => activityObservationFixture(activite, donnees.evaluation)),
  sequencesEnConflit: donnees.sequencesEnConflit.map(sequence => ({
    id: sequence.id.value,
    operateurId: sequence.operateurId?.value,
    poste: posteObservationFixture(sequence.poste),
    activites: sequence.activites.map(activite => activityObservationFixture(activite, donnees.evaluation)),
  })),
});

describe.each([
  { name: 'InMemory', given: givenInMemory },
  { name: 'HTTP', given: givenHttp },
])('$name complete supervision acquisition', ({ given }) => {
  afterEach(() => vi.useRealTimers());

  it('should read a complete empty workshop without fabricating operators or activities', async () => {
    givenEvaluationAt(EVALUATION.value);
    const harness = given(emptyFixture);

    const donnees = await whenRead(harness);

    expect(supervisionObservationFixture(donnees)).toEqual(supervisionObservationFixture(emptyFixture.donnees));
  });

  it('should retain a declared operator and trades even without any activity', async () => {
    givenEvaluationAt(EVALUATION.value);
    const harness = given(oneOperatorFixture);

    const donnees = await whenRead(harness);

    expect(supervisionObservationFixture(donnees)).toEqual(supervisionObservationFixture(oneOperatorFixture.donnees));
  });

  it('should retain a fabrication-order activity, its opening identity and deadline without fabricating a workstation', async () => {
    givenEvaluationAt(EVALUATION.value);
    const harness = given(fabricationOrderFixture);

    const donnees = await whenRead(harness);

    expect(supervisionObservationFixture(donnees)).toEqual(supervisionObservationFixture(fabricationOrderFixture.donnees));
  });

  it('should retain a nonconforming mould activity and workstation trade without inventing an element reference', async () => {
    givenEvaluationAt(EVALUATION.value);
    const harness = given(mouldFixture);

    const donnees = await whenRead(harness);

    expect(supervisionObservationFixture(donnees)).toEqual(supervisionObservationFixture(mouldFixture.donnees));
  });

  it('should retain a personal-order automatic end and its retained finish on a workstation without a trade', async () => {
    givenEvaluationAt(EVALUATION.value);
    const harness = given(automaticEndFixture);

    const donnees = await whenRead(harness);

    expect(supervisionObservationFixture(donnees)).toEqual(supervisionObservationFixture(automaticEndFixture.donnees));
  });

  it('should retain opening, deadline and automatic finish nanoseconds in UTC', async () => {
    givenEvaluationAt(EVALUATION.value);
    const harness = given(preciseEndFixture);

    const donnees = await whenRead(harness);

    expect(donnees.activites.map(activite => [activite.debut.value, activite.echeance.value, activite.finRetenue.value])).toEqual([
      ['2026-09-12T06:00:00.123456789Z', '2026-09-12T19:00:00.987654321Z', '2026-09-12T18:45:00.111222333Z'],
    ]);
    expect(donnees.activites.map(activite => activite.isTermineeAutomatiquement(donnees.evaluation))).toEqual([true]);
  });

  it('should retain an empty conflicting sequence independently of current interpretable work', async () => {
    givenEvaluationAt(EVALUATION.value);
    const harness = given(emptyConflictFixture);

    const donnees = await whenRead(harness);

    expect(supervisionObservationFixture(donnees)).toEqual(supervisionObservationFixture(emptyConflictFixture.donnees));
  });

  it('should retain every conflicting activity and its own element separately from interpretable work after expiration', async () => {
    givenEvaluationAt(EVALUATION.value);
    const harness = given(conflictFixture);

    const donnees = await whenRead(harness);

    expect(supervisionObservationFixture(donnees)).toEqual(supervisionObservationFixture(conflictFixture.donnees));
  });

  it.each([
    { name: 'activity', scene: unresolvedActivityFixture },
    { name: 'conflicting sequence', scene: unresolvedSequenceFixture },
  ])('should acquire a complete $name without a declared operator for the domain to decide exploitability', async ({ scene }) => {
    givenEvaluationAt(EVALUATION.value);
    const harness = given(scene);

    const donnees = await whenRead(harness);

    expect(supervisionObservationFixture(donnees)).toEqual(supervisionObservationFixture(scene.donnees));
  });
});

describe('HTTP supervision beyond the shared contract', () => {
  let harnessFixture: HttpReadHarness;

  beforeEach(() => {
    harnessFixture = givenHttp(emptyFixture);
  });
  afterEach(() => {
    harnessFixture.http.verify();
    vi.useRealTimers();
  });

  it('should retain the microsecond server evaluation returned by the real workshop projection', async () => {
    const reading = harnessFixture.port.read();

    whenEvaluationArrives('2026-10-01T22:59:48.907555Z');
    const donnees = await reading;

    expect(donnees.evaluation.value).toBe('2026-10-01T22:59:48.907555Z');
    expect(harnessFixture.errors.errors).toEqual([]);
  });

  it.each([
    { evaluation: '2026-09-13T08:00:00.1Z', utc: '2026-09-13T08:00:00.100Z' },
    { evaluation: '2026-09-13T08:00:00.12Z', utc: '2026-09-13T08:00:00.120Z' },
    { evaluation: '2026-09-13T08:00:00.123Z', utc: '2026-09-13T08:00:00.123Z' },
    { evaluation: '2026-09-13T08:00:00.1234Z', utc: '2026-09-13T08:00:00.1234Z' },
    { evaluation: '2026-09-13T08:00:00.12345Z', utc: '2026-09-13T08:00:00.12345Z' },
    { evaluation: '2026-09-13T08:00:00.1234567Z', utc: '2026-09-13T08:00:00.1234567Z' },
    { evaluation: '2026-09-13T08:00:00.12345678Z', utc: '2026-09-13T08:00:00.12345678Z' },
    { evaluation: '2026-09-13T08:00:00.123456789-03:30', utc: '2026-09-13T11:30:00.123456789Z' },
  ])('should retain ISO fractional server evaluations in UTC for $evaluation', async ({ evaluation, utc }) => {
    const reading = harnessFixture.port.read();

    whenEvaluationArrives(evaluation);
    const donnees = await reading;

    expect(donnees.evaluation.value).toBe(utc);
    expect(harnessFixture.errors.errors).toEqual([]);
  });

  it('should reject an unavailable acquisition and report the technical failure once', async () => {
    const reading = harnessFixture.port.read();

    whenBackendUnavailable();
    const failure = await reading.catch((error: unknown) => error);

    expect(failure).toMatchObject({ status: 503 });
    expect(harnessFixture.errors.errors).toEqual([failure]);
  });

  it('should reject an automatic end without its retained finish instead of fabricating the deadline as the finish', async () => {
    const reading = harnessFixture.port.read();

    whenAutomaticEndWithoutFinishArrives();
    const failure = await reading.catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(Error);
    expect(harnessFixture.errors.errors).toEqual([failure]);
  });

  it.each([
    '2026-09-13T10:00:00',
    '2026-09-13T08:00:00.Z',
    '2026-09-13T08:00:00.1234567890Z',
    '2026-09-13T08:00:00.123456789',
    '2026-09-13T08:00:00.123456789Zgarbage',
    '2026-13-13T08:00:00.123456789Z',
    '2026-09-13T08:00:60.123456789Z',
    '2026-02-30T08:00:00.123456789Z',
    '2026-09-13T24:00:00.123456789Z',
  ])('should reject and report an invalid server evaluation without using the browser clock for %s', async evaluation => {
    const reading = harnessFixture.port.read();

    whenEvaluationArrives(evaluation);
    const failure = await reading.catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(Error);
    expect(failure).toMatchObject({ valeurRejetee: evaluation });
    expect(harnessFixture.errors.errors).toEqual([failure]);
  });

  it('should reject an acquisition still pending at the thirty-second network deadline and report it once', async () => {
    givenNetworkClock();
    const reading = harnessFixture.port.read();

    const failure = await whenNetworkDeadlineIsReached(reading);

    expect(failure).toMatchObject({ name: 'TimeoutError' });
    expect(harnessFixture.errors.errors).toEqual([failure]);
  });

  const givenNetworkClock = (): void => {
    vi.useFakeTimers();
  };

  const whenNetworkDeadlineIsReached = async (reading: Promise<DonneesDeSupervision>): Promise<unknown> => {
    const failure = reading.catch((error: unknown) => error);
    harnessFixture.http.expectOne('/api/atelier/supervision');
    await vi.advanceTimersByTimeAsync(30_000);
    return failure;
  };

  const whenEvaluationArrives = (evaluation: string): void => {
    harnessFixture.http.expectOne('/api/atelier/supervision').flush({ ...emptyFixture.response, evaluation });
  };

  const whenAutomaticEndWithoutFinishArrives = (): void => {
    const activites = automaticEndFixture.response.activites.map(activite => {
      const incomplete = { ...activite };
      delete incomplete.finRetenue;
      return incomplete;
    });
    harnessFixture.http.expectOne('/api/atelier/supervision').flush({ ...automaticEndFixture.response, activites });
  };

  const whenBackendUnavailable = (): void => {
    harnessFixture.http.expectOne('/api/atelier/supervision').flush(null, { status: 503, statusText: 'Service Unavailable' });
  };
});
