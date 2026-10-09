import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { ParametrageFixture } from '@test/unit/fixtures/gestion/parametrage/ParametrageFixture';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { DureeMaxDActivite } from '../../domain/DureeMaxDActivite';
import { ImageDuLogo } from '../../domain/ImageDuLogo';
import { Parametrage } from '../../domain/Parametrage';
import { ParametragePort } from '../../domain/ParametragePort';
import { VersionDuLogo } from '../../domain/VersionDuLogo';
import { HttpParametrage } from './HttpParametrage';

const VERSION = '0123456789abcdef';
const OCTETS_PNG = '\u0089PNG';
const IMAGE_EN_LIGNE = `data:image/png;base64,${btoa(OCTETS_PNG)}`;

interface ParametrageHarness {
  readonly port: ParametragePort;
  readonly settle: () => Promise<void>;
  readonly donnerLeLogo: () => void;
}

const bytesOf = (texte: string): Uint8Array<ArrayBuffer> => Uint8Array.from(texte, caractere => caractere.codePointAt(0) ?? 0);

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
  let logo = false;
  const answer = (request: TestRequest): void => {
    if (request.request.method === 'PUT') {
      duree = (request.request.body as { dureeMaxDActivite: string }).dureeMaxDActivite;
    }
    if (request.request.url.startsWith('/api/parametrage/logo/')) {
      const courant = logo && request.request.url.endsWith(VERSION);
      if (courant) {
        request.flush(new Blob([bytesOf(OCTETS_PNG)], { type: 'image/png' }));
      } else {
        request.flush(new Blob(), { status: 404, statusText: 'Not Found' });
      }
      return;
    }
    request.flush(logo ? { dureeMaxDActivite: duree, logo: { version: VERSION } } : { dureeMaxDActivite: duree });
  };
  const settle = async (): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
    server.match(() => true).forEach(answer);
    await new Promise(resolve => setTimeout(resolve));
  };
  return {
    port: TestBed.inject(HttpParametrage),
    settle,
    donnerLeLogo: () => {
      logo = true;
    },
  };
};

const createFixtureHarness = (): ParametrageHarness => {
  const fixture = new ParametrageFixture();
  return {
    port: fixture,
    settle: () => Promise.resolve(),
    donnerLeLogo: () => {
      fixture.logo = { version: new VersionDuLogo(VERSION), image: new ImageDuLogo(IMAGE_EN_LIGNE) };
    },
  };
};

const adapters: [string, () => ParametrageHarness][] = [
  ['HttpParametrage', createHttpHarness],
  ['ParametrageFixture', createFixtureHarness],
];

describe.each(adapters)('ParametragePort contract, honoured by %s', (_adapter, createHarness) => {
  let harness: ParametrageHarness;

  beforeEach(() => {
    harness = createHarness();
  });

  it('should read thirteen hours and no logo for a company that set nothing', async () => {
    const lecture = harness.port.parametrage();
    await harness.settle();

    expect(await lecture).toEqual(new Parametrage(new DureeMaxDActivite(13), undefined));
  });

  it('should read back the duration the manager set', async () => {
    const ecriture = harness.port.fixerDureeMaxDActivite(new DureeMaxDActivite(10));
    await harness.settle();
    await ecriture;

    const lecture = harness.port.parametrage();
    await harness.settle();

    expect((await lecture).dureeMaxDActivite).toEqual(new DureeMaxDActivite(10));
  });

  it('should read the version of the logo, then its image inline', async () => {
    harness.donnerLeLogo();
    const lecture = harness.port.parametrage();
    await harness.settle();
    const version = requiredFixture((await lecture).logo, 'version du logo');

    const image = harness.port.imageDuLogo(version);
    await harness.settle();

    expect(version).toEqual(new VersionDuLogo(VERSION));
    expect(await image).toEqual(new ImageDuLogo(IMAGE_EN_LIGNE));
  });

  it('should not read the image of a version that is no longer the current one', async () => {
    harness.donnerLeLogo();

    const image = harness.port.imageDuLogo(new VersionDuLogo('fedcba9876543210')).then(
      () => 'lue',
      () => 'refusee',
    );
    await harness.settle();

    expect(await image).toBe('refusee');
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

  it('should report a failed image read once and reject', async () => {
    const image = port.imageDuLogo(new VersionDuLogo(VERSION)).catch((failure: unknown) => failure);
    await whenServerAnswers(`/api/parametrage/logo/${VERSION}`, 500, new Blob());

    expect(await image).toBeInstanceOf(HttpErrorResponse);
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
