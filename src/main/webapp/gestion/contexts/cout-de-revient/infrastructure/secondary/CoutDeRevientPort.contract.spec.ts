import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { HttpBackend, HttpErrorResponse, HttpEvent, HttpResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { CoutDeRevientFixture } from '@test/unit/fixtures/gestion/cout-de-revient/CoutDeRevientFixture';
import { defer, Observable, of, switchMap, throwError } from 'rxjs';
import { ElementChiffre } from '../../domain/element/ElementChiffre';
import { ElementChiffreId } from '../../domain/element/ElementChiffreId';
import { Cout } from '../../domain/montant/Cout';
import { Montant } from '../../domain/montant/Montant';
import { CoutDeRevient } from '../../domain/rapport/CoutDeRevient';
import { CoutDeRevientPort } from '../../domain/rapport/CoutDeRevientPort';
import { LigneDeCout } from '../../domain/rapport/LigneDeCout';
import { NatureDOperation } from '../../domain/rapport/NatureDOperation';
import { DureePassee } from '../../domain/temps/DureePassee';
import { InstantDeTravail } from '../../domain/temps/InstantDeTravail';
import { PeriodeDeTravail } from '../../domain/temps/PeriodeDeTravail';
import { TempsPasse } from '../../domain/temps/TempsPasse';
import { HttpCoutDeRevient } from './HttpCoutDeRevient';

type RestRapport = components['schemas']['RestCoutDeRevient'];
type RestLigne = components['schemas']['RestLigneDeCout'];

const ROUTE = '/api/couts-de-revient';
const ELEMENT = '4f8d1e0a-1111-2222-3333-444455556666';
const DEMANDE = new ElementChiffreId(ELEMENT);

interface LigneFixture {
  readonly nature: string | undefined;
  readonly travail: string;
  readonly nonConformite: string;
  readonly machine: number;
  readonly mainDOeuvre: number;
  readonly reprises: readonly [string, string][];
}

const fraisageFixture: LigneFixture = {
  nature: 'Fraisage',
  travail: 'PT2H',
  nonConformite: 'PT0S',
  machine: 90,
  mainDOeuvre: 40,
  reprises: [],
};

const tournageFixture: LigneFixture = {
  nature: 'Tournage',
  travail: 'PT1H',
  nonConformite: 'PT0S',
  machine: 60,
  mainDOeuvre: 10,
  reprises: [],
};

const sansPosteFixture: LigneFixture = {
  nature: undefined,
  travail: 'PT1H',
  nonConformite: 'PT0S',
  machine: 0,
  mainDOeuvre: 20,
  reprises: [],
};

const repriseFixture: LigneFixture = {
  nature: 'Fraisage',
  travail: 'PT1H',
  nonConformite: 'PT1H',
  machine: 90,
  mainDOeuvre: 40,
  reprises: [['2026-05-11T10:00:00Z', '2026-05-11T11:00:00Z']],
};

const PERIODE = { debut: '2026-05-11T09:00:00Z', fin: '2026-05-11T11:00:00Z' };
const TOTAL = { travail: 'PT2H', nonConformite: 'PT30M', total: 'PT2H30M' };
const COUT_TOTAL = { machine: 90, mainDOeuvre: 40, total: 130 };

const toRestLigne = (ligne: LigneFixture): RestLigne => ({
  ...(ligne.nature === undefined ? {} : { nature: ligne.nature }),
  periode: PERIODE,
  temps: { travail: ligne.travail, nonConformite: ligne.nonConformite, total: ligne.travail },
  nonConformites: ligne.reprises.map(([debut, fin]) => ({ debut, fin })),
  cout: { machine: ligne.machine, mainDOeuvre: ligne.mainDOeuvre, total: ligne.machine + ligne.mainDOeuvre },
});

const toRest = (lignes: readonly LigneFixture[]): RestRapport => ({
  element: { id: ELEMENT, nom: 'OF-2026-000001', type: 'ORDRE_DE_FABRICATION' },
  lignes: lignes.map(toRestLigne),
  temps: TOTAL,
  cout: COUT_TOTAL,
});

const toDomainLigne = (ligne: LigneFixture): LigneDeCout =>
  new LigneDeCout({
    nature: ligne.nature === undefined ? undefined : new NatureDOperation(ligne.nature),
    periode: new PeriodeDeTravail(new InstantDeTravail(PERIODE.debut), new InstantDeTravail(PERIODE.fin)),
    temps: new TempsPasse(new DureePassee(ligne.travail), new DureePassee(ligne.nonConformite), new DureePassee(ligne.travail)),
    cout: new Cout(new Montant(ligne.machine), new Montant(ligne.mainDOeuvre), new Montant(ligne.machine + ligne.mainDOeuvre)),
    nonConformites: ligne.reprises.map(([debut, fin]) => new PeriodeDeTravail(new InstantDeTravail(debut), new InstantDeTravail(fin))),
  });

const toDomain = (lignes: readonly LigneFixture[]): CoutDeRevient =>
  new CoutDeRevient(new ElementChiffre('OF-2026-000001', 'ORDRE_DE_FABRICATION'), {
    lignes: lignes.map(toDomainLigne),
    temps: new TempsPasse(new DureePassee(TOTAL.travail), new DureePassee(TOTAL.nonConformite), new DureePassee(TOTAL.total)),
    cout: new Cout(new Montant(COUT_TOTAL.machine), new Montant(COUT_TOTAL.mainDOeuvre), new Montant(COUT_TOTAL.total)),
  });

/** `exactOptionalPropertyTypes` interdit d'écraser un champ optionnel par `undefined` : on retire la clé. */
const sansChampDuRapport = (rapport: RestRapport, champ: keyof RestRapport): RestRapport =>
  Object.fromEntries(Object.entries(rapport).filter(([cle]) => cle !== champ)) as RestRapport;

const sansChampDeLigne = (ligne: RestLigne, champ: keyof RestLigne): RestLigne =>
  Object.fromEntries(Object.entries(ligne).filter(([cle]) => cle !== champ)) as RestLigne;

const premiereLigneDe = (rapport: RestRapport): RestLigne => {
  const ligne = rapport.lignes?.[0];
  if (ligne === undefined) {
    throw new Error('Le rapport de scénario ne porte aucune ligne');
  }
  return ligne;
};

const projeterLigne = (ligne: LigneDeCout): Record<string, unknown> => ({
  nature: ligne.nature?.value,
  travail: ligne.temps.travail.minutes,
  nonConformite: ligne.temps.nonConformite.minutes,
  machine: ligne.cout.machine.euros,
  mainDOeuvre: ligne.cout.mainDOeuvre.euros,
});

class CoutDeRevientHttpBackendFixture implements HttpBackend {
  lignes: readonly LigneFixture[] = [];
  elementInconnu = false;

  /** La route ne porte aucun filtre qui changerait la réponse : ce double n'a pas besoin de la requête. */
  handle(): Observable<HttpEvent<unknown>> {
    return defer(() => this.answer()).pipe(
      switchMap(answer => (answer instanceof HttpErrorResponse ? throwError(() => answer) : of(answer))),
    );
  }

  private async answer(): Promise<HttpResponse<unknown> | HttpErrorResponse> {
    await new Promise(resolve => setTimeout(resolve));
    if (this.elementInconnu) {
      return new HttpErrorResponse({
        status: 404,
        statusText: 'Not Found',
        error: { title: 'element de fabrication introuvable' },
      });
    }
    return new HttpResponse({ status: 200, body: toRest(this.lignes) });
  }
}

interface CoutDeRevientHarness {
  readonly port: CoutDeRevientPort;
  seed(lignes: readonly LigneFixture[]): void;
  seedElementInconnu(): void;
}

const createHttpHarness = (): CoutDeRevientHarness => {
  const backend = new CoutDeRevientHttpBackendFixture();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      { provide: HttpBackend, useValue: backend },
      ApiClient,
      { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
      HttpCoutDeRevient,
    ],
  });
  return {
    port: TestBed.inject(HttpCoutDeRevient),
    seed: (lignes: readonly LigneFixture[]) => {
      backend.lignes = [...lignes];
    },
    seedElementInconnu: () => {
      backend.elementInconnu = true;
    },
  };
};

const createFixtureHarness = (): CoutDeRevientHarness => {
  const fixture = new CoutDeRevientFixture();
  return {
    port: fixture,
    seed: (lignes: readonly LigneFixture[]) => {
      fixture.rapports.set(ELEMENT, toDomain(lignes));
    },
    seedElementInconnu: () => {
      fixture.elementsInconnus.add(ELEMENT);
    },
  };
};

const adapters: [string, () => CoutDeRevientHarness][] = [
  ['HttpCoutDeRevient', createHttpHarness],
  ['CoutDeRevientFixture', createFixtureHarness],
];

describe.each(adapters)('CoutDeRevientPort contract, honoured by %s', (_adapter, createHarness) => {
  let harness: CoutDeRevientHarness;
  let port: CoutDeRevientPort;

  beforeEach(() => {
    harness = createHarness();
    port = harness.port;
  });

  it('should return the element the report resolved', async () => {
    givenRapport([fraisageFixture]);

    const rapport = await port.rapport(DEMANDE);

    expect(rapport?.element).toMatchObject({ nom: 'OF-2026-000001', type: 'ORDRE_DE_FABRICATION' });
  });

  it('should return one line per operation nature, valued in machine and labour', async () => {
    givenRapport([fraisageFixture]);

    const rapport = await port.rapport(DEMANDE);

    expect(rapport?.lignes.map(projeterLigne)).toEqual([
      { nature: 'Fraisage', travail: 120, nonConformite: 0, machine: 90, mainDOeuvre: 40 },
    ]);
  });

  it('should return the lines in the order the server sent them', async () => {
    givenRapport([fraisageFixture, tournageFixture]);

    const rapport = await port.rapport(DEMANDE);

    expect(rapport?.lignes.map(ligne => ligne.nature?.value)).toEqual(['Fraisage', 'Tournage']);
  });

  it('should return a line clocked without a work station as carrying no trade', async () => {
    givenRapport([sansPosteFixture]);

    const rapport = await port.rapport(DEMANDE);

    expect(rapport?.lignes[0]?.estSansPoste()).toBe(true);
  });

  it('should return the dated rework periods of a line', async () => {
    givenRapport([repriseFixture]);

    const rapport = await port.rapport(DEMANDE);

    expect(rapport?.lignes[0]?.nonConformites.map(periode => periode.debut.value.toISOString())).toEqual(['2026-05-11T10:00:00.000Z']);
  });

  it('should return the totals the server computed', async () => {
    givenRapport([fraisageFixture, tournageFixture]);

    const rapport = await port.rapport(DEMANDE);

    expect([rapport?.temps.total.minutes, rapport?.cout.total.euros]).toEqual([150, 130]);
  });

  it('should return an element nobody has clocked on yet as carrying no work', async () => {
    givenRapport([]);

    const rapport = await port.rapport(DEMANDE);

    expect(rapport?.estSansTravail()).toBe(true);
  });

  it('should answer nothing for an element the referential does not know', async () => {
    givenElementInconnu();

    const rapport = await port.rapport(DEMANDE);

    expect(rapport).toBeUndefined();
  });

  const givenRapport = (lignes: readonly LigneFixture[]): void => {
    harness.seed(lignes);
  };

  const givenElementInconnu = (): void => {
    harness.seedElementInconnu();
  };
});

describe('Beyond the contract: HttpCoutDeRevient', () => {
  let port: CoutDeRevientPort;
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
        HttpCoutDeRevient,
      ],
    });
    port = TestBed.inject(HttpCoutDeRevient);
    server = TestBed.inject(HttpTestingController);
    errorHandler = TestBed.inject(ErrorHandlerPort) as ErrorHandlerFixture;
  });

  afterEach(() => {
    server.verify();
  });

  it('should ask the server for the element, never for its workshop follow-up', async () => {
    const result = port.rapport(DEMANDE);
    const request = await whenServerAnswers(toRest([fraisageFixture]));

    await result;
    expect(request.request.url).toBe(`${ROUTE}/${ELEMENT}`);
  });

  it.each<keyof RestRapport>(['element', 'lignes', 'temps', 'cout'])('should reject a server answer missing rapport.%s', async champ => {
    const result = port.rapport(DEMANDE).catch((failure: unknown) => failure);
    await whenServerAnswers(sansChampDuRapport(toRest([fraisageFixture]), champ));

    expect(await result).toEqual(new Error(`rapport.${champ} manque dans la réponse du serveur`));
  });

  it.each<keyof RestLigne>(['periode', 'temps', 'cout', 'nonConformites'])(
    'should reject a server answer missing ligne.%s',
    async champ => {
      const rapport = toRest([fraisageFixture]);
      const result = port.rapport(DEMANDE).catch((failure: unknown) => failure);
      await whenServerAnswers({ ...rapport, lignes: [sansChampDeLigne(premiereLigneDe(rapport), champ)] });

      expect(await result).toEqual(new Error(`ligne.${champ} manque dans la réponse du serveur`));
    },
  );

  it('should reject a server answer missing the element name', async () => {
    const result = port.rapport(DEMANDE).catch((failure: unknown) => failure);
    await whenServerAnswers({ ...toRest([fraisageFixture]), element: { id: ELEMENT, type: 'ORDRE_DE_FABRICATION' } });

    expect(await result).toEqual(new Error('rapport.element.nom manque dans la réponse du serveur'));
  });

  it('should reject a server answer missing the element type', async () => {
    const result = port.rapport(DEMANDE).catch((failure: unknown) => failure);
    await whenServerAnswers({ ...toRest([fraisageFixture]), element: { id: ELEMENT, nom: 'OF-2026-000001' } });

    expect(await result).toEqual(new Error('rapport.element.type manque dans la réponse du serveur'));
  });

  it('should reject a duration the report cannot read', async () => {
    const result = port.rapport(DEMANDE).catch((failure: unknown) => failure);
    await whenServerAnswers({ ...toRest([fraisageFixture]), temps: { ...TOTAL, total: 'P1D' } });

    expect(await result).toEqual(new Error('La durée « P1D » reçue du serveur n’est pas un temps passé.'));
  });

  it('should reject an amount the report cannot read', async () => {
    const result = port.rapport(DEMANDE).catch((failure: unknown) => failure);
    await whenServerAnswers({ ...toRest([fraisageFixture]), cout: { ...COUT_TOTAL, total: -1 } });

    expect(await result).toEqual(new Error('Le montant « -1 » reçu du serveur n’est pas un montant en euros.'));
  });

  it('should report a technical failure once through the error handler and reject', async () => {
    const result = port.rapport(DEMANDE).catch((failure: unknown) => failure);
    await whenServerFails(500, {});

    expect(await result).toBeInstanceOf(HttpErrorResponse);
    expect(errorHandler.errors).toHaveLength(1);
  });

  /**
   * Le back ne pose aucune URN sur ce 404 : le statut nu est le seul signal, contrairement à tous les
   * autres adaptateurs du dépôt.
   */
  it('should not report an element the referential does not know', async () => {
    const result = port.rapport(DEMANDE);
    await whenServerFails(404, { title: 'element de fabrication introuvable' });

    expect(await result).toBeUndefined();
    expect(errorHandler.errors).toEqual([]);
  });

  it('should keep a refused read a technical failure', async () => {
    const result = port.rapport(DEMANDE).catch((failure: unknown) => failure);
    await whenServerFails(403, {});

    expect(await result).toBeInstanceOf(HttpErrorResponse);
    expect(errorHandler.errors).toHaveLength(1);
  });

  const whenServerAnswers = async (body: RestRapport): Promise<TestRequest> => {
    await new Promise(resolve => setTimeout(resolve));
    const request = server.expectOne(candidate => candidate.method === 'GET' && candidate.url === `${ROUTE}/${ELEMENT}`);
    request.flush(body);
    return request;
  };

  const whenServerFails = async (status: number, error: object): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
    server
      .expectOne(candidate => candidate.method === 'GET' && candidate.url === `${ROUTE}/${ELEMENT}`)
      .flush(error, { status, statusText: 'Failure' });
  };
});
