import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { Page } from '@/app/shared/pagination/domain/Page';
import { Result } from '@/app/shared/result/domain/Result';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PostesFixture } from '@test/unit/fixtures/gestion/poste/PostesFixture';
import { CoutHoraire } from '../../domain/CoutHoraire';
import { LibellePoste } from '../../domain/LibellePoste';
import { LibellePosteDejaUtilise } from '../../domain/LibellePosteDejaUtilise';
import { NatureDeTravail } from '../../domain/NatureDeTravail';
import { PosteDeTravail } from '../../domain/PosteDeTravail';
import { PosteDeTravailId } from '../../domain/PosteDeTravailId';
import { PosteIntrouvable } from '../../domain/PosteIntrouvable';
import { PosteNonSupprimable } from '../../domain/PosteNonSupprimable';
import { PostesPort } from '../../domain/PostesPort';
import { RefusModificationPoste } from '../../domain/RefusModificationPoste';
import { RefusSuppressionPoste } from '../../domain/RefusSuppressionPoste';
import { RequetePostes } from '../../domain/RequetePostes';
import { HttpPostes } from './HttpPostes';

type RestPoste = components['schemas']['RestPosteDeTravail'];
const tourFixture: RestPoste = { id: 'tour-1', libelle: 'Tour 1', nature: 'tournage', coutHoraire: 45.5 };

describe('PostesPort contract honoured by HttpPostes', () => {
  let port: PostesPort;
  let server: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), ApiClient, HttpPostes] });
    port = TestBed.inject(HttpPostes);
    server = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    server.verify();
  });

  it('should return the requested page with domain values and the server total', async () => {
    const result = port.postes(new RequetePostes(2, 20));
    await whenPageAnswers([tourFixture], 61, 2, 20);
    const page = await result;

    expect(page.totalCount).toBe(61);
    expect(page.elements).toEqual([
      { id: { value: 'tour-1' }, libelle: { value: 'Tour 1' }, nature: { value: 'tournage' }, coutHoraire: { value: 45.5 } },
    ]);
    expect(page.isComplete()).toBe(false);
  });

  it('should retain an omitted hourly cost as optional', async () => {
    const result = port.postes(new RequetePostes(0, 20));
    await whenPageAnswers([{ id: 'scie-1', libelle: 'Scie 1', nature: 'sciage' }], 1);
    const page = await result;

    expect(page.elements).toEqual([
      { id: { value: 'scie-1' }, libelle: { value: 'Scie 1' }, nature: { value: 'sciage' }, coutHoraire: undefined },
    ]);
  });

  it('should reject a technical read failure', async () => {
    const result = port.postes(new RequetePostes(0, 20)).catch((failure: unknown) => failure);
    await whenServerFails('/api/postes-de-travail?page=0&size=20', 500);
    expect(await result).toBeInstanceOf(HttpErrorResponse);
  });

  it('should collect sorted distinct natures from every page of the workshop', async () => {
    const postes = [
      ...Array.from({ length: 200 }, (_, index) => ({ ...tourFixture, id: 'tour-' + String(index) })),
      { id: 'scie-1', libelle: 'Scie 1', nature: 'sciage' },
    ];
    const result = port.natures();
    await whenReferentialAnswers(postes);

    expect(await result).toEqual([{ value: 'sciage' }, { value: 'tournage' }]);
  });

  it('should reuse cached natures on subsequent calls without querying the server again', async () => {
    const initial = port.natures();
    await whenReferentialAnswers([{ id: 'scie-1', libelle: 'Scie 1', nature: 'sciage' }]);
    const premier = await initial;
    const second = await port.natures();

    expect([premier, second]).toEqual([[{ value: 'sciage' }], [{ value: 'sciage' }]]);
  });

  it('should query the referential again after a write invalidates the cache', async () => {
    const initial = port.natures();
    await whenReferentialAnswers([{ id: 'scie-1', libelle: 'Scie 1', nature: 'sciage' }]);
    await initial;
    const save = whenSaving('creer');
    await whenWriteAnswers('creer');
    await save;
    const refreshed = port.natures();
    await whenReferentialAnswers([{ id: 'tour-1', libelle: 'Tour 1', nature: 'tournage' }]);

    expect(await refreshed).toEqual([{ value: 'tournage' }]);
  });

  it('should return no suggested natures for an empty workshop', async () => {
    const result = port.natures();
    await whenReferentialAnswers([]);

    expect(await result).toEqual([]);
  });

  it('should reject incomplete nature acquisition when the server stops providing entries', async () => {
    const result = port.natures().catch((failure: unknown) => failure);
    await whenReferentialAnswers([], 1);

    expect(await result).toEqual(new Error('Le référentiel des natures est incomplet.'));
  });

  it.each(['creer', 'modifier'] as const)('should acknowledge %s only after the server accepts the validated command', async action => {
    const result = whenSaving(action, new CoutHoraire(45.5));
    const request = await whenWriteAnswers(action);

    expect(await result).toEqual({ ok: true, value: undefined });
    expect(request.request.body).toEqual({ libelle: 'Tour 1', nature: 'tournage', coutHoraire: 45.5 });
  });

  it.each(['creer', 'modifier'] as const)('should omit the optional hourly cost in %s', async action => {
    const result = whenSaving(action);
    const request = await whenWriteAnswers(action);

    expect(await result).toEqual({ ok: true, value: undefined });
    expect(request.request.body).toEqual({ libelle: 'Tour 1', nature: 'tournage' });
  });

  it('should acknowledge deletion after the server removes the workstation', async () => {
    const result = port.supprimer(new PosteDeTravailId('tour-1'));
    await whenWriteAnswers('supprimer');

    expect(await result).toEqual({ ok: true, value: undefined });
  });

  it.each([
    ['creer', 'libelle-deja-utilise', 409, new LibellePosteDejaUtilise()],
    ['modifier', 'libelle-deja-utilise', 409, new LibellePosteDejaUtilise()],
    ['modifier', 'poste-de-travail-introuvable', 404, new PosteIntrouvable()],
    ['supprimer', 'poste-de-travail-introuvable', 404, new PosteIntrouvable()],
    ['supprimer', 'poste-de-travail-pointe', 409, new PosteNonSupprimable()],
    ['supprimer', 'poste-de-travail-utilise', 409, new PosteNonSupprimable()],
  ] as const)('should translate the %s refusal %s into the domain', async (action, code, status, refus) => {
    const result = whenCommandStarts(action);
    await whenWriteAnswers(action, status, { type: 'urn:glm:erreur:poste-de-travail:' + code });

    expect(await result).toEqual({ ok: false, error: refus });
  });

  it.each(['creer', 'modifier', 'supprimer'] as const)('should reject an unknown business code during %s', async action => {
    const result = whenCommandStarts(action).catch((failure: unknown) => failure);
    await whenWriteAnswers(action, 409, { type: 'urn:glm:erreur:poste-de-travail:inconnu' });

    expect(await result).toBeInstanceOf(HttpErrorResponse);
  });

  it.each(['creer', 'modifier', 'supprimer'] as const)('should reject a technical failure during %s', async action => {
    const result = whenCommandStarts(action).catch((failure: unknown) => failure);
    await whenWriteAnswers(action, 500, {});

    expect(await result).toBeInstanceOf(HttpErrorResponse);
  });

  const whenSaving = (action: 'creer' | 'modifier', coutHoraire?: CoutHoraire) =>
    action === 'creer'
      ? port.creer({ libelle: new LibellePoste('Tour 1'), nature: new NatureDeTravail('tournage'), coutHoraire })
      : port.modifier({
          id: new PosteDeTravailId('tour-1'),
          libelle: new LibellePoste('Tour 1'),
          nature: new NatureDeTravail('tournage'),
          coutHoraire,
        });

  const whenCommandStarts = (action: 'creer' | 'modifier' | 'supprimer') =>
    action === 'supprimer' ? port.supprimer(new PosteDeTravailId('tour-1')) : whenSaving(action);

  const whenWriteAnswers = async (action: 'creer' | 'modifier' | 'supprimer', status?: number, body?: object) => {
    await new Promise(resolve => setTimeout(resolve));
    const request = server.expectOne(action === 'creer' ? '/api/postes-de-travail' : '/api/postes-de-travail/tour-1');
    const methods = { creer: 'POST', modifier: 'PUT', supprimer: 'DELETE' };
    expect(request.request.method).toBe(methods[action]);
    const successStatus = { creer: 201, modifier: 200, supprimer: 204 };
    request.flush(body ?? null, { status: status ?? successStatus[action], statusText: 'Response' });
    return request;
  };

  const whenReferentialAnswers = async (postes: RestPoste[], totalElementsCount = postes.length): Promise<void> => {
    let end: number;
    do {
      await new Promise(resolve => setTimeout(resolve));
      const request = server.expectOne(request => request.method === 'GET' && request.url === '/api/postes-de-travail');
      const page = Number(request.request.params.get('page'));
      const size = Number(request.request.params.get('size'));
      end = (page + 1) * size;
      request.flush({ content: postes.slice(page * size, end), currentPage: page, pageSize: size, totalElementsCount });
    } while (end < totalElementsCount);
  };

  const whenPageAnswers = async (content: RestPoste[], totalElementsCount: number, page = 0, size = 20): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
    server
      .expectOne(`/api/postes-de-travail?page=${page}&size=${size}`)
      .flush({ content, currentPage: page, pageSize: size, totalElementsCount });
  };
  const whenServerFails = async (url: string, status: number, body: object = {}): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
    server.expectOne(url).flush(body, { status, statusText: 'Failure' });
  };
});

describe('PostesPort contract honoured by PostesFixture', () => {
  let double: PostesFixture;

  beforeEach(() => {
    double = new PostesFixture();
  });

  it('should slice the paged list and report the total workstation count', async () => {
    givenManyWorkstations(25);

    const page = await whenQueryingPage(1, 10);

    thenPageMatches(page, 25, 10, 'p-10', 'p-19');
  });

  it('should derive distinct sorted natures from the current workstations when suggestions are empty', async () => {
    givenWorkstationsWithDuplicateNatures();

    const natures = await whenQueryingNatures();

    thenNaturesAre(natures, ['sciage', 'tournage']);
  });

  it('should return preset suggestions if specified', async () => {
    givenPresetSuggestions(['special']);

    const natures = await whenQueryingNatures();

    thenNaturesAre(natures, ['special']);
  });

  it('should create and append a workstation when creation succeeds', async () => {
    const resultat = await whenCreatingWorkstation('Tour 1', 'tournage', 35);

    thenCreationSucceeded(resultat, 'Tour 1');
  });

  it('should update an existing workstation when modification succeeds', async () => {
    givenExistingWorkstation('tour-1', 'Tour 1', 'tournage');

    const resultat = await whenModifyingWorkstation('tour-1', 'Tour 1 Modifie', 'tournage-dur', 50);

    thenModificationSucceeded(resultat, 'Tour 1 Modifie', 'tournage-dur', 50);
  });

  it('should remove a workstation when deletion succeeds', async () => {
    givenExistingWorkstation('tour-1', 'Tour 1', 'tournage');

    const resultat = await whenDeletingWorkstation('tour-1');

    thenDeletionSucceeded(resultat, 'tour-1');
  });

  const givenManyWorkstations = (count: number): void => {
    double.liste = Array.from(
      { length: count },
      (_, index) =>
        new PosteDeTravail(new PosteDeTravailId(`p-${index}`), {
          libelle: new LibellePoste(`Poste ${index}`),
          nature: new NatureDeTravail('fraisage'),
          coutHoraire: undefined,
        }),
    );
  };

  const givenWorkstationsWithDuplicateNatures = (): void => {
    double.liste = [
      new PosteDeTravail(new PosteDeTravailId('1'), {
        libelle: new LibellePoste('Poste 1'),
        nature: new NatureDeTravail('tournage'),
        coutHoraire: undefined,
      }),
      new PosteDeTravail(new PosteDeTravailId('2'), {
        libelle: new LibellePoste('Poste 2'),
        nature: new NatureDeTravail('sciage'),
        coutHoraire: undefined,
      }),
      new PosteDeTravail(new PosteDeTravailId('3'), {
        libelle: new LibellePoste('Poste 3'),
        nature: new NatureDeTravail('tournage'),
        coutHoraire: undefined,
      }),
    ];
  };

  const givenPresetSuggestions = (suggestions: string[]): void => {
    double.suggestions = suggestions.map(suggestion => new NatureDeTravail(suggestion));
  };

  const givenExistingWorkstation = (id: string, libelle: string, nature: string): void => {
    double.liste = [
      new PosteDeTravail(new PosteDeTravailId(id), {
        libelle: new LibellePoste(libelle),
        nature: new NatureDeTravail(nature),
        coutHoraire: undefined,
      }),
    ];
  };

  const whenQueryingPage = (page: number, size: number) => double.postes(new RequetePostes(page, size));

  const whenQueryingNatures = () => double.natures();

  const whenCreatingWorkstation = (libelle: string, nature: string, coutHoraire: number) =>
    double.creer({
      libelle: new LibellePoste(libelle),
      nature: new NatureDeTravail(nature),
      coutHoraire: new CoutHoraire(coutHoraire),
    });

  const whenModifyingWorkstation = (id: string, libelle: string, nature: string, coutHoraire: number) =>
    double.modifier({
      id: new PosteDeTravailId(id),
      libelle: new LibellePoste(libelle),
      nature: new NatureDeTravail(nature),
      coutHoraire: new CoutHoraire(coutHoraire),
    });

  const whenDeletingWorkstation = (id: string) => double.supprimer(new PosteDeTravailId(id));

  const thenPageMatches = (page: Page<PosteDeTravail>, total: number, count: number, firstId: string, lastId: string): void => {
    expect(page.totalCount).toBe(total);
    expect(page.elements).toHaveLength(count);
    expect(page.elements[0]?.id.value).toBe(firstId);
    expect(page.elements[count - 1]?.id.value).toBe(lastId);
  };

  const thenNaturesAre = (natures: readonly NatureDeTravail[], expected: string[]): void => {
    expect(natures).toEqual(expected.map(nature => new NatureDeTravail(nature)));
  };

  const thenCreationSucceeded = (resultat: Result<void, LibellePosteDejaUtilise>, libelle: string): void => {
    expect(resultat.ok).toBe(true);
    expect(double.liste).toHaveLength(1);
    expect(double.liste[0]?.libelle.value).toBe(libelle);
  };

  const thenModificationSucceeded = (
    resultat: Result<void, RefusModificationPoste>,
    libelle: string,
    nature: string,
    coutHoraire: number,
  ): void => {
    expect(resultat.ok).toBe(true);
    expect(double.liste[0]?.libelle.value).toBe(libelle);
    expect(double.liste[0]?.nature.value).toBe(nature);
    expect(double.liste[0]?.coutHoraire?.value).toBe(coutHoraire);
  };

  const thenDeletionSucceeded = (resultat: Result<void, RefusSuppressionPoste>, id: string): void => {
    expect(resultat.ok).toBe(true);
    expect(double.suppressions).toEqual([new PosteDeTravailId(id)]);
    expect(double.liste).toHaveLength(0);
  };
});
