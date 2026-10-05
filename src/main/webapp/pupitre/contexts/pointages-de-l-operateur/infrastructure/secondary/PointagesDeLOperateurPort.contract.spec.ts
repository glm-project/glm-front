import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { HttpBackend, HttpErrorResponse, HttpEvent, HttpRequest, HttpResponse, provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import {
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
  elements: [],
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

const domaineFixture = (): PointagesDeLaSemaine =>
  semaineFixture(
    SEMAINE,
    {
      0: { total: 'PT7H45M', pointages: 1 },
      1: { total: 'PT7H40M', pointages: 1 },
    },
    'PT15H25M',
  );

class PointagesHttpBackendFixture implements HttpBackend {
  synthese = syntheseFixture();
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
    return new HttpResponse({ status: 200, body: { ...this.synthese, evaluation: this.echo(request.params.get('evaluation') ?? '') } });
  }
}

interface PointagesHarness {
  readonly port: PointagesDeLOperateurPort;
  seed(pointages: PointagesDeLaSemaine, synthese: RestSynthese): void;
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
    seed: (_pointages, synthese) => {
      backend.synthese = synthese;
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

  it('should keep an incomplete total without any value', async () => {
    const synthese = { ...syntheseFixture(), dureeOperationnelleTotale: { complete: false, valeur: 'PT99H' } };
    harness.seed(
      semaineFixture(SEMAINE, { 0: { total: 'PT7H45M', pointages: 1 }, 1: { total: 'PT7H40M', pointages: 1 } }, false),
      synthese,
    );

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

  it('should ask the operator week for one evaluation instant', async () => {
    await port.semaine(DEMANDE);

    expect(backend.requests.map(request => [request.url, request.params.get('annee'), request.params.get('semaine')])).toEqual([
      ['/api/syntheses-des-heures/jean', '2026', '41'],
    ]);
    expect(backend.requests[0]?.params.get('evaluation')).toMatch(/^\d{4}-\d{2}-\d{2}T/);
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
