import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActiviteDeSupervision } from '../../../domain/activite/ActiviteDeSupervision';
import { CategorieActivite } from '../../../domain/activite/CategorieActivite';
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

describe.each([
  {
    name: 'InMemory',
    create: (): DonneesDeSupervisionPort => new InMemoryDonneesDeSupervision(),
  },
])('$name supervision data read contract', ({ create }) => {
  afterEach(() => vi.useRealTimers());

  it('should retain the evaluation of each complete acquisition', async () => {
    givenEvaluationAt('2026-09-13T10:00:00Z');
    const port = create();

    const premiere = await port.read();
    const suivante = await whenReadAt(port, '2026-09-13T10:00:30Z');

    expect(premiere.evaluation.value).toBe('2026-09-13T10:00:00.000Z');
    expect(suivante.evaluation.value).toBe('2026-09-13T10:00:30.000Z');
  });

  it('should read conflicting sequences separately from interpretable activities', async () => {
    const port = create();

    const donnees = await port.read();

    expect(donnees.sequencesEnConflit.length).toBeGreaterThan(0);
    expect(donnees.sequencesEnConflit.every(sequence => sequence.hasOperateurIdentifiable(donnees.operateurs))).toBe(true);
  });

  it('should represent personal work by its fabrication order in the demonstration', async () => {
    const port = create();

    const donnees = await port.read();

    expect(donnees.activites.find(activite => activite.operateurId?.value === 'op-chevalier')?.objet).toMatchObject({
      type: 'ORDRE_DE_FABRICATION',
      nom: 'OF Perso',
    });
    expect(
      donnees.sequencesEnConflit.flatMap(sequence => sequence.activites).find(activite => activite.id.value === 'act-morel-a-resoudre')
        ?.objet,
    ).toMatchObject({
      type: 'ORDRE_DE_FABRICATION',
      nom: 'OF Perso',
    });
  });

  it('should read supervision data in which every activity belongs to a declared operator', async () => {
    const port = create();

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
  objet: new ElementTravaille({ type: 'ORDRE_DE_FABRICATION', nom: 'OF-2026-000042', reference: new ReferenceDElement('3004') }),
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
        element: { id: 'of-42', type: 'ORDRE_DE_FABRICATION', nom: 'OF-2026-000042', reference: '3004' },
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
  objet: new ElementTravaille({ type: 'PRODUIT', nom: 'Moule personnel' }),
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
        element: { id: 'moule-personnel', type: 'PRODUIT', nom: 'Moule personnel' },
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
        objet: new ElementTravaille({ type: 'ORDRE_DE_FABRICATION', nom: 'OF Perso' }),
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
        element: { id: 'of-perso', type: 'ORDRE_DE_FABRICATION', nom: 'OF Perso' },
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
            objet: new ElementTravaille({ type: 'ORDRE_DE_FABRICATION', nom: 'OF Perso' }),
            categorie: new CategorieActivite('NON_CONFORMITE'),
            debut: new Instant('2026-09-12T08:00:00Z'),
            echeance: new Instant('2026-09-12T21:00:00Z'),
            etat: 'A_RESOUDRE',
          }),
          new ActiviteDeSupervision({
            id: new IdentifiantActivite('opening-conflict-mould'),
            operateurId: operateurFixture.id,
            objet: new ElementTravaille({ type: 'PRODUIT', nom: 'PRD-2026-000015', reference: new ReferenceDElement('1015') }),
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
            element: { id: 'of-perso', type: 'ORDRE_DE_FABRICATION', nom: 'OF Perso' },
            categorie: 'NON_CONFORMITE',
            debut: '2026-09-12T08:00:00Z',
            echeance: '2026-09-12T21:00:00Z',
          },
          {
            id: 'opening-conflict-mould',
            operateurId: 'op-serin',
            element: { id: 'moule-1015', type: 'PRODUIT', nom: 'PRD-2026-000015', reference: '1015' },
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
const unresolvedSequenceFixture: SceneFixture = {
  donnees: { ...emptyConflictFixture.donnees, operateurs: [], activites: [] },
  response: { ...emptyConflictFixture.response, operateurs: [], activites: [] },
};

const givenInMemory = (scene: SceneFixture): ReadHarness => ({
  port: new InMemoryDonneesDeSupervision(scene.donnees),
  answer: () => undefined,
});

const givenHttp = (scene: SceneFixture): ReadHarness => {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      ApiClient,
      HttpDonneesDeSupervision,
      { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
    ],
  });
  const http = TestBed.inject(HttpTestingController);
  return {
    port: TestBed.inject(HttpDonneesDeSupervision),
    answer: () => {
      http.expectOne({ method: 'GET', url: '/api/atelier/supervision' }).flush(scene.response);
    },
  };
};

const whenRead = async (harness: ReadHarness): Promise<DonneesDeSupervision> => {
  const reading = harness.port.read();
  harness.answer();
  return reading;
};

describe.each([
  { name: 'InMemory', given: givenInMemory },
  { name: 'HTTP', given: givenHttp },
])('$name complete supervision acquisition', ({ given }) => {
  afterEach(() => vi.useRealTimers());

  it('should read a complete empty workshop without fabricating operators or activities', async () => {
    givenEvaluationAt(EVALUATION.value);
    const harness = given(emptyFixture);

    const donnees = await whenRead(harness);

    expect(donnees).toEqual(emptyFixture.donnees);
  });

  it('should retain a declared operator and trades even without any activity', async () => {
    givenEvaluationAt(EVALUATION.value);
    const harness = given(oneOperatorFixture);

    const donnees = await whenRead(harness);

    expect(donnees).toEqual(oneOperatorFixture.donnees);
  });

  it('should retain a fabrication-order activity, its opening identity and deadline without fabricating a workstation', async () => {
    givenEvaluationAt(EVALUATION.value);
    const harness = given(fabricationOrderFixture);

    const donnees = await whenRead(harness);

    expect(donnees).toEqual(fabricationOrderFixture.donnees);
  });

  it('should retain a nonconforming mould activity and workstation trade without inventing an element reference', async () => {
    givenEvaluationAt(EVALUATION.value);
    const harness = given(mouldFixture);

    const donnees = await whenRead(harness);

    expect(donnees).toEqual(mouldFixture.donnees);
  });

  it('should retain a personal-order automatic end and its retained finish on a workstation without a trade', async () => {
    givenEvaluationAt(EVALUATION.value);
    const harness = given(automaticEndFixture);

    const donnees = await whenRead(harness);

    expect(donnees).toEqual(automaticEndFixture.donnees);
  });

  it('should retain an empty conflicting sequence independently of current interpretable work', async () => {
    givenEvaluationAt(EVALUATION.value);
    const harness = given(emptyConflictFixture);

    const donnees = await whenRead(harness);

    expect(donnees).toEqual(emptyConflictFixture.donnees);
  });

  it('should retain every conflicting activity and its own element separately from interpretable work after expiration', async () => {
    givenEvaluationAt(EVALUATION.value);
    const harness = given(conflictFixture);

    const donnees = await whenRead(harness);

    expect(donnees).toEqual(conflictFixture.donnees);
  });

  it.each([
    { name: 'activity', scene: unresolvedActivityFixture },
    { name: 'conflicting sequence', scene: unresolvedSequenceFixture },
  ])('should acquire a complete $name without a declared operator for the domain to decide exploitability', async ({ scene }) => {
    givenEvaluationAt(EVALUATION.value);
    const harness = given(scene);

    const donnees = await whenRead(harness);

    expect(donnees).toEqual(scene.donnees);
  });
});
