import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { HttpBackend, HttpErrorResponse, HttpEvent, HttpRequest, HttpResponse, provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import {
  ligneFixture,
  PointagesDeLOperateurFixture,
  semaineFixture,
} from '@test/unit/fixtures/pupitre/pointages-de-l-operateur/PointagesDeLOperateurFixture';
import { defer, Observable, of, switchMap, throwError } from 'rxjs';
import { DemandeDePointages } from '../../domain/DemandeDePointages';
import { OperateurId } from '../../domain/OperateurId';
import { PointagesDeLaSemaine } from '../../domain/PointagesDeLaSemaine';
import { PointagesDeLOperateurPort } from '../../domain/PointagesDeLOperateurPort';
import { SemaineISO } from '../../domain/semaine/SemaineISO';
import { HttpPointagesDeLOperateur } from './http/HttpPointagesDeLOperateur';

type RestSynthese = components['schemas']['RestSyntheseDesHeures'];
type RestFeuille = components['schemas']['RestFeuilleDeTemps'];
type RestActivite = components['schemas']['RestActiviteDeLaFeuilleDeTemps'];

const OPERATEUR = 'jean';
const SEMAINE = new SemaineISO(2026, 41);
const DEMANDE = new DemandeDePointages(new OperateurId(OPERATEUR), SEMAINE);

const syntheseFixture = (): RestSynthese => ({
  annee: 2026,
  semaine: 41,
  operateur: { id: OPERATEUR, nom: 'Dupont', prenom: 'Jean' },
  evaluation: '2026-10-08T12:00:00Z',
  dureeOperationnelleTotale: { complete: true, valeur: 'PT15H25M' },
  conflits: [],
  elements: [
    {
      id: 'of-1',
      categorie: 'OF',
      type: 'ORDRE_DE_FABRICATION',
      nom: 'OF-2026-000204',
      reference: '204',
      duree: { complete: true, valeur: 'PT15H25M' },
      dureeNonConformite: { complete: true, valeur: 'PT35M' },
      postes: [{ poste: { id: 'tour', libelle: 'Tour' }, nature: 'Tournage' }],
    },
    {
      id: 'of-2',
      categorie: 'OF',
      type: 'ORDRE_DE_FABRICATION',
      nom: 'OF-2026-000205',
      duree: { complete: true, valeur: 'PT0S' },
      dureeNonConformite: { complete: true, valeur: 'PT0S' },
      postes: [],
    },
  ],
  jours: SEMAINE.jours().map((jour, rang) => ({
    jour: jour.value,
    dureeOperationnelle: { complete: true, valeur: ['PT7H45M', 'PT7H40M'][rang] ?? 'PT0S' },
    ...(rang < 2
      ? {
          pointages: [
            {
              id: `debut-${String(rang)}`,
              type: 'DEBUT',
              intention: 'OUVERTURE',
              dateDeSurvenue: `${jour.value}T05:00:00Z`,
              element: 'of-1',
            },
          ],
        }
      : {}),
  })),
});

const activiteFixture = (debut: string, fin: string | undefined, element = 'of-1'): RestActivite => ({
  element,
  ...(element === 'of-1' ? { poste: 'tour', nature: 'Tournage' } : {}),
  categorie: 'TRAVAIL',
  debut,
  ...(fin === undefined ? {} : { fin }),
  activite: { id: `activite-${debut}`, debut, ...(fin === undefined ? { etat: 'EN_COURS' } : { fin, etat: 'TERMINEE' }) },
});

const feuilleFixture = (): RestFeuille => ({
  annee: 2026,
  semaine: 41,
  operateur: { id: OPERATEUR, nom: 'Dupont', prenom: 'Jean' },
  evaluation: '2026-10-08T12:00:00Z',
  jours: SEMAINE.jours()
    .map((jour, rang) => ({
      jour: jour.value,
      activites:
        [
          [activiteFixture('2026-10-05T05:00:00Z', '2026-10-05T12:45:00Z')],
          [activiteFixture('2026-10-06T05:00:00Z', '2026-10-06T12:40:00Z'), activiteFixture('2026-10-06T13:00:00Z', undefined, 'of-2')],
        ][rang] ?? [],
    }))
    .reverse(),
});

const domaineFixture = (): PointagesDeLaSemaine =>
  semaineFixture(
    SEMAINE,
    {
      0: {
        total: 'PT7H45M',
        lignes: [
          ligneFixture({ element: '204', poste: 'Tour', debut: new Date('2026-10-05T05:00:00Z'), fin: new Date('2026-10-05T12:45:00Z') }),
        ],
      },
      1: {
        total: 'PT7H40M',
        lignes: [
          ligneFixture({ element: '204', poste: 'Tour', debut: new Date('2026-10-06T05:00:00Z'), fin: new Date('2026-10-06T12:40:00Z') }),
          ligneFixture({ element: 'OF-2026-000205', debut: new Date('2026-10-06T13:00:00Z') }),
        ],
      },
    },
    'PT15H25M',
  );

class PointagesHttpBackendFixture implements HttpBackend {
  synthese = syntheseFixture();
  feuille = feuilleFixture();
  echo: (evaluation: string) => string = evaluation => evaluation;
  failure = false;
  readonly requests: HttpRequest<unknown>[] = [];

  handle(request: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    return defer(() => this.answer(request)).pipe(
      switchMap(answer => (answer instanceof HttpErrorResponse ? throwError(() => answer) : of(answer))),
    );
  }

  private async answer(request: HttpRequest<unknown>): Promise<HttpResponse<unknown> | HttpErrorResponse> {
    this.requests.push(request);
    await new Promise(resolve => setTimeout(resolve));
    if (this.failure) return new HttpErrorResponse({ status: 500 });
    const lecture = request.url.startsWith('/api/feuilles-de-temps') ? this.feuille : this.synthese;
    return new HttpResponse({ status: 200, body: { ...lecture, evaluation: this.echo(request.params.get('evaluation') ?? '') } });
  }
}

interface PointagesHarness {
  readonly port: PointagesDeLOperateurPort;
  seed(pointages: PointagesDeLaSemaine, synthese: RestSynthese, feuille?: RestFeuille): void;
  seedFailure(): void;
}

const createHttpHarness = (): PointagesHarness => {
  const backend = new PointagesHttpBackendFixture();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      { provide: HttpBackend, useValue: backend },
      ApiClient,
      { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
      HttpPointagesDeLOperateur,
    ],
  });
  return {
    port: TestBed.inject(HttpPointagesDeLOperateur),
    seed: (_pointages, synthese, feuille = feuilleFixture()) => {
      backend.synthese = synthese;
      backend.feuille = feuille;
    },
    seedFailure: () => {
      backend.failure = true;
    },
  };
};

const createFixtureHarness = (): PointagesHarness => {
  const fixture = new PointagesDeLOperateurFixture();
  fixture.seed(DEMANDE, domaineFixture());
  return {
    port: fixture,
    seed: pointages => {
      fixture.seed(DEMANDE, pointages);
    },
    seedFailure: () => {
      fixture.lectureFailure = new Error('Indisponible');
    },
  };
};

const adapters: readonly (readonly [string, () => PointagesHarness])[] = [
  ['HttpPointagesDeLOperateur', createHttpHarness],
  ['PointagesDeLOperateurFixture', createFixtureHarness],
];

describe.each(adapters)('PointagesDeLOperateurPort contract, honoured by %s', (_adapter, createHarness) => {
  let harness: PointagesHarness;

  beforeEach(() => {
    harness = createHarness();
  });

  it('should return the requested week with the week total read from the server', async () => {
    const pointages = await harness.port.semaine(DEMANDE);

    expect(pointages.semaine).toEqual(SEMAINE);
    expect(pointages.total.snapshot()).toMatchObject({ complete: true, valeur: { heures: 15, minutesRestantes: 25 } });
  });

  it('should offer only the clocked days, in calendar order, with their own totals', async () => {
    const pointages = await harness.port.semaine(DEMANDE);

    expect(pointages.joursPointes().map(jour => [jour.jour.value, jour.total.snapshot()])).toEqual([
      ['2026-10-05', { complete: true, valeur: { heures: 7, minutesRestantes: 45 } }],
      ['2026-10-06', { complete: true, valeur: { heures: 7, minutesRestantes: 40 } }],
    ]);
  });

  it('should detail each clocked portion with its element reference, workstation and bounds', async () => {
    const pointages = await harness.port.semaine(DEMANDE);

    expect(pointages.joursPointes()[1]?.lignes).toEqual([
      ligneFixture({ element: '204', poste: 'Tour', debut: new Date('2026-10-06T05:00:00Z'), fin: new Date('2026-10-06T12:40:00Z') }),
      ligneFixture({ element: 'OF-2026-000205', debut: new Date('2026-10-06T13:00:00Z') }),
    ]);
  });

  it('should transport an automatic end and a clocking to check as such', async () => {
    harness.seed(
      semaineFixture(SEMAINE, {
        2: {
          total: false,
          lignes: [
            ligneFixture({
              element: '204',
              poste: 'Tour',
              debut: new Date('2026-10-07T04:00:00Z'),
              fin: new Date('2026-10-07T17:00:00Z'),
              automatique: true,
            }),
            ligneFixture({ element: '204', poste: 'Tour', debut: new Date('2026-10-07T18:00:00Z'), aVerifier: true }),
          ],
        },
      }),
      syntheseFixture(),
      {
        ...feuilleFixture(),
        jours: SEMAINE.jours().map(jour => ({
          jour: jour.value,
          activites:
            jour.value === '2026-10-07'
              ? [
                  {
                    ...activiteFixture('2026-10-07T04:00:00Z', '2026-10-07T17:00:00Z'),
                    activite: { id: 'auto', debut: '2026-10-07T04:00:00Z', fin: '2026-10-07T17:00:00Z', etat: 'TERMINEE_AUTOMATIQUEMENT' },
                  },
                  {
                    ...activiteFixture('2026-10-07T18:00:00Z', undefined),
                    activite: { id: 'conflit', debut: '2026-10-07T18:00:00Z', finAuPlusTard: '2026-10-08T07:00:00Z', etat: 'A_RESOUDRE' },
                  },
                ]
              : [],
        })),
      },
    );

    const pointages = await harness.port.semaine(DEMANDE);

    expect(pointages.joursPointes()[0]?.lignes.map(ligne => ligne.etat)).toEqual([
      { etat: 'TERMINEE_AUTOMATIQUEMENT', fin: new Date('2026-10-07T17:00:00Z') },
      { etat: 'A_RESOUDRE' },
    ]);
  });

  it('should keep an incomplete total without any value', async () => {
    const synthese = { ...syntheseFixture(), dureeOperationnelleTotale: { complete: false, valeur: 'PT99H' } };
    harness.seed(semaineFixture(SEMAINE, {}, false), synthese);

    const pointages = await harness.port.semaine(DEMANDE);

    expect(pointages.total.snapshot()).toEqual({ complete: false });
  });

  it('should reject an unavailable week instead of showing partial figures', async () => {
    harness.seedFailure();

    const lecture = harness.port.semaine(DEMANDE);

    await expect(lecture).rejects.toHaveProperty('message');
  });
});

describe('Beyond the contract: HttpPointagesDeLOperateur', () => {
  let backend: PointagesHttpBackendFixture;
  let errors: ErrorHandlerFixture;
  let port: HttpPointagesDeLOperateur;

  beforeEach(() => {
    backend = new PointagesHttpBackendFixture();
    errors = new ErrorHandlerFixture();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        { provide: HttpBackend, useValue: backend },
        ApiClient,
        { provide: ErrorHandlerPort, useValue: errors },
        HttpPointagesDeLOperateur,
      ],
    });
    port = TestBed.inject(HttpPointagesDeLOperateur);
  });

  it('should ask the summary and the time sheet of the operator week for one evaluation instant', async () => {
    await port.semaine(DEMANDE);

    expect(backend.requests.map(request => [request.url, request.params.get('annee'), request.params.get('semaine')])).toEqual([
      ['/api/syntheses-des-heures/jean', '2026', '41'],
      ['/api/feuilles-de-temps/jean', '2026', '41'],
    ]);
    expect(new Set(backend.requests.map(request => request.params.get('evaluation'))).size).toBe(1);
  });

  it.each<[string, (feuille: RestFeuille) => RestFeuille, string]>([
    ['another week', feuille => ({ ...feuille, semaine: 40 }), 'au lieu de celle demandée'],
    [
      'an element missing from the summary',
      feuille => ({ ...feuille, jours: [{ jour: '2026-10-07', activites: [activiteFixture('2026-10-07T05:00:00Z', undefined, 'of-9')] }] }),
      'cite l’élément of-9, absent de la synthèse des heures',
    ],
    [
      'a workstation missing from the summary',
      feuille => ({
        ...feuille,
        jours: [{ jour: '2026-10-07', activites: [{ ...activiteFixture('2026-10-07T05:00:00Z', undefined), poste: 'fraiseuse' }] }],
      }),
      'cite le poste fraiseuse, absent de la synthèse des heures',
    ],
  ])('should reject and report once a time sheet with %s', async (_cas, transforme, message) => {
    backend.feuille = transforme(feuilleFixture());

    const lecture = port.semaine(DEMANDE);

    await expect(lecture).rejects.toThrow(message);
    expect(errors.errors).toHaveLength(1);
  });

  it('should accept another spelling of the same evaluation instant', async () => {
    backend.echo = evaluation => new Date(Date.parse(evaluation)).toISOString().replace('Z', '+00:00');

    const pointages = await port.semaine(DEMANDE);

    expect(pointages.semaine).toEqual(SEMAINE);
  });

  it.each<[string, (evaluation: string) => string, (synthese: RestSynthese) => RestSynthese, string]>([
    ['another evaluation instant', () => '2020-01-01T00:00:00Z', synthese => synthese, 'pas à l’instant demandé'],
    ['another week', evaluation => evaluation, synthese => ({ ...synthese, semaine: 40 }), 'au lieu de celle demandée'],
    ['six days', evaluation => evaluation, synthese => ({ ...synthese, jours: (synthese.jours ?? []).slice(1) }), 'sept jours'],
  ])('should reject and report once a week answered with %s', async (_cas, echo, transforme, message) => {
    backend.echo = echo;
    backend.synthese = transforme(syntheseFixture());

    const lecture = port.semaine(DEMANDE);

    await expect(lecture).rejects.toThrow(message);
    expect(errors.errors).toHaveLength(1);
  });

  it('should report once a failed read', async () => {
    backend.failure = true;

    const lecture = port.semaine(DEMANDE);

    await expect(lecture).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(errors.errors).toHaveLength(1);
  });
});
