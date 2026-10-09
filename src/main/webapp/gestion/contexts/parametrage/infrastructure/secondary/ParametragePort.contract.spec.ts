import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { ParametrageFixture } from '@test/unit/fixtures/gestion/parametrage/ParametrageFixture';
import { DureeMaxDActivite } from '../../domain/DureeMaxDActivite';
import { Parametrage } from '../../domain/Parametrage';
import { ParametragePort } from '../../domain/ParametragePort';
import { HttpParametrage } from './HttpParametrage';

interface ParametrageHarness {
  readonly port: ParametragePort;
  readonly settle: () => Promise<void>;
}

const createHttpHarness = (): ParametrageHarness => {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      ApiClient,
      { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
      HttpParametrage,
    ],
  });
  const server = TestBed.inject(HttpTestingController);
  let duree = 'PT13H';
  const settle = async (): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
    for (const request of server.match(() => true)) {
      if (request.request.method === 'PUT') {
        duree = (request.request.body as { dureeMaxDActivite: string }).dureeMaxDActivite;
      }
      request.flush({ dureeMaxDActivite: duree });
    }
  };
  return { port: TestBed.inject(HttpParametrage), settle };
};

const createFixtureHarness = (): ParametrageHarness => ({ port: new ParametrageFixture(), settle: () => Promise.resolve() });

const adapters: [string, () => ParametrageHarness][] = [
  ['HttpParametrage', createHttpHarness],
  ['ParametrageFixture', createFixtureHarness],
];

describe.each(adapters)('ParametragePort contract, honoured by %s', (_adapter, createHarness) => {
  let harness: ParametrageHarness;

  beforeEach(() => {
    harness = createHarness();
  });

  it('should read thirteen hours for a company that never set the duration', async () => {
    const lecture = harness.port.parametrage();
    await harness.settle();

    expect(await lecture).toEqual(new Parametrage(new DureeMaxDActivite(13)));
  });

  it('should read back the duration the manager set', async () => {
    const ecriture = harness.port.fixerDureeMaxDActivite(new DureeMaxDActivite(10));
    await harness.settle();
    await ecriture;

    const lecture = harness.port.parametrage();
    await harness.settle();

    expect(await lecture).toEqual(new Parametrage(new DureeMaxDActivite(10)));
  });
});

describe('Beyond the contract: HttpParametrage', () => {
  let port: HttpParametrage;
  let server: HttpTestingController;
  let errorHandler: ErrorHandlerFixture;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ApiClient,
        { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
        HttpParametrage,
      ],
    });
    port = TestBed.inject(HttpParametrage);
    server = TestBed.inject(HttpTestingController);
    errorHandler = TestBed.inject(ErrorHandlerPort) as ErrorHandlerFixture;
  });

  afterEach(() => {
    server.verify();
  });

  it('should send the duration in ISO-8601 hours', async () => {
    const ecriture = port.fixerDureeMaxDActivite(new DureeMaxDActivite(10));
    const request = await whenServerAnswers('/api/parametrage/duree-max-d-activite', 200, { dureeMaxDActivite: 'PT10H' });

    await ecriture;
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ dureeMaxDActivite: 'PT10H' });
  });

  it('should report a technical read failure once and reject', async () => {
    const lecture = port.parametrage().catch((failure: unknown) => failure);
    await whenServerAnswers('/api/parametrage', 500, {});

    expect(await lecture).toBeInstanceOf(HttpErrorResponse);
    expect(errorHandler.errors).toHaveLength(1);
  });

  it('should treat a duration that is not a whole number of hours as a read failure, never rounding it', async () => {
    const lecture = port.parametrage().catch((failure: unknown) => failure);
    await whenServerAnswers('/api/parametrage', 200, { dureeMaxDActivite: 'PT8H30M' });

    expect(await lecture).toEqual(new Error('Durée max d’activité illisible en heures entières : PT8H30M'));
    expect(errorHandler.errors).toHaveLength(1);
  });

  it('should let a refused write reject as a technical failure', async () => {
    const ecriture = port.fixerDureeMaxDActivite(new DureeMaxDActivite(10)).catch((failure: unknown) => failure);
    await whenServerAnswers('/api/parametrage/duree-max-d-activite', 400, {});

    expect(await ecriture).toBeInstanceOf(HttpErrorResponse);
  });

  const whenServerAnswers = async (url: string, status: number, body: object): Promise<TestRequest> => {
    await new Promise(resolve => setTimeout(resolve));
    const request = server.expectOne(candidate => candidate.url === url);
    request.flush(body, { status, statusText: 'Response' });
    return request;
  };
});
