import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { HttpBackend, HttpErrorResponse, HttpEvent, HttpHeaders, HttpRequest, HttpResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { RapportDActiviteFixture } from '@test/unit/fixtures/gestion/releve-des-heures/RapportDActiviteFixture';
import { defer, Observable, of, switchMap, throwError } from 'rxjs';
import { DureeTravaillee } from '../../domain/duree/DureeTravaillee';
import { PeriodeDuRapport } from '../../domain/rapport/PeriodeDuRapport';
import { RapportDActivitePort } from '../../domain/rapport/RapportDActivitePort';
import { ResumeDuRapport } from '../../domain/rapport/ResumeDuRapport';
import { OperateurReleveId } from '../../domain/releve/OperateurReleveId';
import { JourCalendaire } from '../../domain/semaine/JourCalendaire';
import { HttpRapportDActivite } from './HttpRapportDActivite';

type RestResume = components['schemas']['RestResumeDuRapportDActivite'];

const OPERATEUR = 'op-1';
const ROUTE = `/api/syntheses-des-heures/${OPERATEUR}/rapport`;
const SEMAINE_38 = PeriodeDuRapport.semaineContenant(new JourCalendaire('2026-09-16'));
const SEPTEMBRE = PeriodeDuRapport.moisContenant(new JourCalendaire('2026-09-16'));

const restFixture = (periode: PeriodeDuRapport, tempsPointe = 'PT47H45M'): RestResume => ({
  operateur: { id: OPERATEUR, nom: 'Lefèvre', prenom: 'Martin' },
  premierJour: periode.premierJour().value,
  dernierJour: periode.dernierJour().value,
  evaluation: '2026-10-12T07:42:00Z',
  tempsPointe: { valeur: tempsPointe },
  dureeNonConformite: { valeur: 'PT2H40M' },
  joursAvecPointage: 6,
  pointages: 23,
  finsAutomatiques: 1,
});

const resumeFixture = (tempsPointe = 'PT47H45M'): ResumeDuRapport =>
  new ResumeDuRapport({ tempsPointe: new DureeTravaillee(tempsPointe), joursAvecPointage: 6, pointages: 23, finsAutomatiques: 1 });

class RapportHttpBackendFixture implements HttpBackend {
  readonly resumes = new Map<string, RestResume>();

  handle(request: HttpRequest<unknown>): Observable<HttpEvent<unknown>> {
    return defer(() => this.answer(request)).pipe(
      switchMap(answer => (answer instanceof HttpErrorResponse ? throwError(() => answer) : of(answer))),
    );
  }

  private async answer(request: HttpRequest<unknown>): Promise<HttpResponse<unknown> | HttpErrorResponse> {
    await new Promise(resolve => setTimeout(resolve));
    if (request.url.endsWith('/export.pdf')) {
      return new HttpResponse({
        status: 200,
        body: new Blob(['document']),
        headers: new HttpHeaders({
          'Content-Disposition': `attachment; filename="activite-lefevre-martin-S38-2026-${request.params.get('version') ?? ''}.pdf"`,
        }),
      });
    }
    if (request.url.endsWith('/export.xlsx')) {
      return new HttpResponse({
        status: 200,
        body: new Blob(['classeur']),
        headers: new HttpHeaders({ 'Content-Disposition': 'attachment; filename="activite-lefevre-martin-S38-2026.xlsx"' }),
      });
    }
    const resume = this.resumes.get(`${request.params.get('semaine') ?? ''}|${request.params.get('mois') ?? ''}`);
    return resume === undefined ? new HttpErrorResponse({ status: 500 }) : new HttpResponse({ status: 200, body: resume });
  }
}

interface RapportHarness {
  readonly port: RapportDActivitePort;
  seed(periode: PeriodeDuRapport, tempsPointe: string): void;
}

const createHttpHarness = (): RapportHarness => {
  const backend = new RapportHttpBackendFixture();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      { provide: HttpBackend, useValue: backend },
      ApiClient,
      { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
      HttpRapportDActivite,
    ],
  });
  return {
    port: TestBed.inject(HttpRapportDActivite),
    seed: (periode, tempsPointe) => {
      const cle = periode.borne.genre === 'SEMAINE' ? `${String(periode.borne.semaine.numero)}|` : `|${String(periode.borne.mois.mois)}`;
      backend.resumes.set(cle, restFixture(periode, tempsPointe));
    },
  };
};

const createFixtureHarness = (): RapportHarness => {
  const fixture = new RapportDActiviteFixture();
  return {
    port: fixture,
    seed: (periode, tempsPointe) => {
      fixture.seme(new OperateurReleveId(OPERATEUR), periode, resumeFixture(tempsPointe));
    },
  };
};

const adapters: readonly (readonly [string, () => RapportHarness])[] = [
  ['HttpRapportDActivite', createHttpHarness],
  ['RapportDActiviteFixture', createFixtureHarness],
];

describe.each(adapters)('RapportDActivitePort contract, honoured by %s', (_adapter, createHarness) => {
  let harness: RapportHarness;
  beforeEach(() => {
    harness = createHarness();
  });

  it.each([
    ['week', SEMAINE_38, 'PT47H45M'],
    ['month', SEPTEMBRE, 'PT164H5M'],
  ] as const)('should return the summary of the requested %s', async (_genre, periode, tempsPointe) => {
    harness.seed(periode, tempsPointe);

    const resume = await harness.port.resume(new OperateurReleveId(OPERATEUR), periode);

    expect(resume).toEqual(resumeFixture(tempsPointe));
  });

  it('should hand over the workbook of the requested period under an Excel name', async () => {
    const fichier = await harness.port.exporte(new OperateurReleveId(OPERATEUR), SEMAINE_38, 'EXCEL');

    expect(fichier.nom).toMatch(/\.xlsx$/u);
    expect(await fichier.contenu.text()).toBe('classeur');
  });

  it.each([
    ['PDF_SYNTHESE', /-synthese\.pdf$/u],
    ['PDF_DETAIL', /-detail\.pdf$/u],
  ] as const)('should hand over the %s document of the requested period', async (format, nom) => {
    const fichier = await harness.port.exporte(new OperateurReleveId(OPERATEUR), SEMAINE_38, format);

    expect(fichier.nom).toMatch(nom);
  });

  it('should reject a summary the server cannot give', async () => {
    const lecture = harness.port.resume(new OperateurReleveId(OPERATEUR), SEMAINE_38);

    await expect(lecture).rejects.toBeTruthy();
  });
});

describe('Beyond the contract: HttpRapportDActivite', () => {
  let port: RapportDActivitePort;
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
        HttpRapportDActivite,
      ],
    });
    port = TestBed.inject(HttpRapportDActivite);
    server = TestBed.inject(HttpTestingController);
    errorHandler = TestBed.inject(ErrorHandlerPort) as ErrorHandlerFixture;
  });
  afterEach(() => {
    server.verify();
  });

  it.each([
    ['an ISO week', SEMAINE_38, { annee: '2026', semaine: '38', mois: null }],
    ['a calendar month', SEPTEMBRE, { annee: '2026', semaine: null, mois: '9' }],
  ] as const)('should ask the summary of %s', async (_genre, periode, parametres) => {
    const result = port.resume(new OperateurReleveId(OPERATEUR), periode);

    const request = await whenServerAnswers(restFixture(periode));
    await result;

    expect({
      annee: request.request.params.get('annee'),
      semaine: request.request.params.get('semaine'),
      mois: request.request.params.get('mois'),
    }).toEqual(parametres);
  });

  it('should reject a summary of another period and report it once', async () => {
    const result = port.resume(new OperateurReleveId(OPERATEUR), SEMAINE_38).catch((failure: unknown) => failure);

    await whenServerAnswers(restFixture(SEPTEMBRE));

    expect(await result).toEqual(new Error('Le résumé reçu du serveur ne porte pas la période demandée.'));
    expect(errorHandler.errors).toHaveLength(1);
  });

  it('should report a failed summary once and reject', async () => {
    const result = port.resume(new OperateurReleveId(OPERATEUR), SEMAINE_38).catch((failure: unknown) => failure);

    await whenServerFails(500);

    expect(await result).toBeInstanceOf(HttpErrorResponse);
    expect(errorHandler.errors).toHaveLength(1);
  });

  it('should download the workbook of the requested week under the name the server gave it', async () => {
    const result = port.exporte(new OperateurReleveId(OPERATEUR), SEMAINE_38, 'EXCEL');

    const request = await whenServerSendsTheWorkbook('attachment; filename="activite-lefevre-martin-S38-2026.xlsx"');
    const fichier = await result;

    expect([request.request.params.get('annee'), request.request.params.get('semaine')]).toEqual(['2026', '38']);
    expect(fichier.nom).toBe('activite-lefevre-martin-S38-2026.xlsx');
  });

  it.each([
    ['PDF_SYNTHESE', 'synthese'],
    ['PDF_DETAIL', 'detail'],
  ] as const)('should download the %s document of the requested month', async (format, version) => {
    const result = port.exporte(new OperateurReleveId(OPERATEUR), SEPTEMBRE, format);

    const request = await whenServerSendsTheDocument(`attachment; filename="activite-${version}.pdf"`);
    const fichier = await result;

    expect([request.request.params.get('mois'), request.request.params.get('version')]).toEqual(['9', version]);
    expect(fichier.nom).toBe(`activite-${version}.pdf`);
  });

  it('should reject a workbook sent without a name and report it once', async () => {
    const result = port.exporte(new OperateurReleveId(OPERATEUR), SEMAINE_38, 'EXCEL').catch((failure: unknown) => failure);

    await whenServerSendsTheWorkbook();

    expect(await result).toEqual(new Error('Content-Disposition.filename manque dans la réponse du serveur'));
    expect(errorHandler.errors).toHaveLength(1);
  });

  it('should report a failed workbook once and reject', async () => {
    const result = port.exporte(new OperateurReleveId(OPERATEUR), SEPTEMBRE, 'EXCEL').catch((failure: unknown) => failure);

    await whenServerFailsAt(`/api/syntheses-des-heures/${OPERATEUR}/export.xlsx`);

    expect(await result).toBeInstanceOf(HttpErrorResponse);
    expect(errorHandler.errors).toHaveLength(1);
  });

  const whenServerSendsTheWorkbook = async (disposition?: string): Promise<TestRequest> => {
    await new Promise(resolve => setTimeout(resolve));
    const request = server.expectOne(candidate => candidate.url === `/api/syntheses-des-heures/${OPERATEUR}/export.xlsx`);
    request.flush(new Blob(['classeur']), { headers: disposition === undefined ? {} : { 'Content-Disposition': disposition } });
    return request;
  };

  const whenServerSendsTheDocument = async (disposition: string): Promise<TestRequest> => {
    await new Promise(resolve => setTimeout(resolve));
    const request = server.expectOne(candidate => candidate.url === `/api/syntheses-des-heures/${OPERATEUR}/export.pdf`);
    request.flush(new Blob(['document']), { headers: { 'Content-Disposition': disposition } });
    return request;
  };

  const whenServerFailsAt = async (route: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
    server.expectOne(candidate => candidate.url === route).flush(new Blob(['{}']), { status: 500, statusText: 'Échec' });
  };

  const whenServerAnswers = async (body: RestResume): Promise<TestRequest> => {
    await new Promise(resolve => setTimeout(resolve));
    const request = server.expectOne(candidate => candidate.method === 'GET' && candidate.url === ROUTE);
    request.flush(body);
    return request;
  };

  const whenServerFails = async (status: number): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
    server.expectOne(candidate => candidate.url === ROUTE).flush({}, { status, statusText: 'Échec' });
  };
});
