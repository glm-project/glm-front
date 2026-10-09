import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { HttpErrorResponse, HttpRequest, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { ActiviteAnomalieId } from '../../domain/dossier/ActiviteAnomalieId';
import { AnomaliesReadPort } from '../../domain/dossier/AnomaliesReadPort';
import { DossierAnomalie, LectureDossier } from '../../domain/dossier/DossierAnomalie';
import { ElementAnomalieId } from '../../domain/dossier/ElementAnomalieId';
import { OperateurAnomalie } from '../../domain/dossier/OperateurAnomalie';
import { OperateurAnomalieId } from '../../domain/dossier/OperateurAnomalieId';
import { PointageAnomalieId } from '../../domain/dossier/PointageAnomalieId';
import { SuiviAnomalieId } from '../../domain/dossier/SuiviAnomalieId';
import { HttpAnomalies } from './HttpAnomalies';

const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('debut-8') };

const restOperateurFixture = (
  id: string,
  extra: Partial<components['schemas']['RestOperateur']> = {},
): components['schemas']['RestOperateur'] => ({
  id,
  prenom: 'Camille',
  nom: 'Martin',
  natures: [],
  postes: [],
  ...extra,
});

const restElementFixture = (
  id: string,
  extra: Partial<components['schemas']['RestElementDeFabrication']> = {},
): components['schemas']['RestElementDeFabrication'] => ({ id, nom: 'Bielle', categorie: 'MOULE', ...extra });

const ouvertureFixture: components['schemas']['RestEvenementDAtelier'] = {
  id: 'debut-8',
  type: 'DEBUT',
  activite: 'travail-8',
  operateurId: 'op-camille',
  operateur: { id: 'op-camille', nom: 'Martin', prenom: 'Camille' },
  posteId: 'poste-dmu',
  poste: { id: 'poste-dmu', libelle: 'DMU 50' },
  auteur: 'camille',
  dateDeSurvenue: '2026-09-14T08:00:00.123456789+02:00',
  dateDEnregistrement: '2026-09-14T08:00:01Z',
  estUneRegularisation: false,
};

const dossierFixture = (): components['schemas']['RestDossierAnomalie'] => ({
  adresse: { suivi: 'suivi-camille', pointage: 'debut-8' },
  revision: 8,
  evaluation: '2026-09-14T22:00:00Z',
  borneDeFin: '2026-09-14T23:00:00Z',
  activite: {
    evenement: 'debut-8',
    activite: 'travail-8',
    operateurId: 'op-camille',
    operateur: { id: 'op-camille', nom: 'Martin', prenom: 'Camille' },
    posteId: 'poste-dmu',
    poste: { id: 'poste-dmu', libelle: 'DMU 50' },
    categorie: 'TRAVAIL',
    debut: '2026-09-14T08:00:00.123456789+02:00',
    fin: '2026-09-14T21:00:00.123456789+02:00',
    duree: 'PT13H',
  },
  pointages: [ouvertureFixture],
});

describe('Beyond the contract: HTTP anomaly dossier reading', () => {
  let port: AnomaliesReadPort;
  let server: HttpTestingController;
  let errors: ErrorHandlerFixture;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ApiClient,
        { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
        { provide: AnomaliesReadPort, useClass: HttpAnomalies },
      ],
    });
    port = TestBed.inject(AnomaliesReadPort);
    server = TestBed.inject(HttpTestingController);
    errors = TestBed.inject(ErrorHandlerPort) as ErrorHandlerFixture;
  });

  afterEach(() => {
    server.verify();
  });

  it('should read the expired activity and the pointages of its key, with the exact received instants', async () => {
    const lecture = port.read(adresse);
    whenDossierAnswers();
    const resultat = await lecture;

    expect(resultat).toMatchObject({
      kind: 'DOSSIER',
      dossier: {
        operateur: new OperateurAnomalieId('op-camille'),
        operateurNom: 'Camille Martin',
        posteLibelle: 'DMU 50',
        posteId: 'poste-dmu',
        echue: new ActiviteAnomalieId('travail-8'),
        debut: '2026-09-14T08:00:00.123456789+02:00',
        journal: [
          {
            id: new PointageAnomalieId('debut-8'),
            fait: { type: 'DEBUT', operateur: 'op-camille', instant: '2026-09-14T08:00:00.123456789+02:00' },
            operateurNom: 'Camille Martin',
            regularisation: false,
          },
        ],
        activites: [
          {
            id: new ActiviteAnomalieId('travail-8'),
            ouvrant: new PointageAnomalieId('debut-8'),
            etat: 'ECHUE',
            periode: {
              categorie: 'TRAVAIL',
              debut: '2026-09-14T08:00:00.123456789+02:00',
              fin: '2026-09-14T21:00:00.123456789+02:00',
            },
          },
        ],
      },
    });
  });

  it('should present neither name nor workstation identity when the references cannot be resolved', async () => {
    const lecture = port.read(adresse);
    whenDossierAnswers(dossierWithoutReferences());
    const resultat = await lecture;

    expect(resultat).toMatchObject({
      kind: 'DOSSIER',
      dossier: { operateurNom: '', posteLibelle: '', journal: [{ operateurNom: '' }] },
    });
  });

  it('should keep no workstation reference when the received one is absent', async () => {
    const lecture = port.read(adresse);
    whenDossierAnswers(dossierWithoutReferences());
    const dossier = dossierFromReading(await lecture);

    expect(dossier).not.toHaveProperty('posteId');
  });

  it.each(['suivi-d-atelier-introuvable', 'fin-automatique-introuvable'])(
    'should return a dossier that does not exist (%s) explicitly instead of failing the read',
    async urn => {
      const lecture = port.read(adresse).catch((failure: unknown) => failure);
      whenDossierIsMissing(urn);
      const resultat = await lecture;

      expect(resultat).toEqual({ kind: 'INTROUVABLE' });
      expect(errors.errors).toEqual([]);
    },
  );

  it('should read the operators across server pages', async () => {
    const operateurs = Array.from({ length: 125 }, (_, index) => restOperateurFixture(`op-${index}`, { nom: `Nom ${index}` }));
    operateurs[1] = restOperateurFixture('op-camille', {
      identifiant: '007',
      postes: [{ id: 'poste-tour', libelle: 'Tour 1', nature: 'tournage' }],
    });

    const lus = await whenReadingTheOperatorsAnsweredWith(operateurs);

    expect(lus).toHaveLength(125);
    expect(lus[1]).toEqual({
      id: new OperateurAnomalieId('op-camille'),
      nom: 'Camille Martin',
      code: '007',
    });
    expect(errors.errors).toEqual([]);
  });

  it.each<{ incoherence: string; attendu: string; pages: { taille: number; total: number; page?: number }[] }>([
    {
      incoherence: 'a changing total',
      attendu: 'Le nombre des entrées est incohérent pendant la lecture.',
      pages: [
        { taille: 100, total: 101 },
        { taille: 1, total: 102 },
      ],
    },
    { incoherence: 'a truncated page', attendu: 'Le référentiel reçu est tronqué.', pages: [{ taille: 99, total: 100 }] },
    {
      incoherence: 'a page other than the requested one',
      attendu: 'La page reçue ne correspond pas à la page demandée.',
      pages: [{ taille: 1, total: 1, page: 3 }],
    },
  ])('should refuse and report an operator list with $incoherence', async ({ attendu, pages }) => {
    const failure = await whenReadingTheOperatorsWhilePagesAnswer(pages);

    expect(failure).toEqual(new Error(attendu));
    expect(errors.errors).toEqual([failure]);
  });

  it('should refuse and report an operator list that repeats an identity', async () => {
    const failure = await whenReadingTheOperatorsAnsweredWith([restOperateurFixture('doublon'), restOperateurFixture('doublon')]).catch(
      (failure: unknown) => failure,
    );

    expect(failure).toEqual(new Error('Le référentiel contient une identité dupliquée.'));
    expect(errors.errors).toEqual([failure]);
  });

  it('should report a failed operator read once and reject', async () => {
    const lecture = port.operateurs().catch((failure: unknown) => failure);
    await whenReferentialFails('/api/operateurs?page=0&size=100');
    const failure = await lecture;

    expect(failure).toBeInstanceOf(HttpErrorResponse);
    expect(errors.errors).toEqual([failure]);
  });

  const whenReadingTheOperatorsAnsweredWith = async (operateurs: readonly unknown[]): Promise<readonly OperateurAnomalie[]> => {
    const lecture = port.operateurs();
    lecture.catch(() => undefined);
    await answerPages('/api/operateurs', operateurs);
    return lecture;
  };

  const whenReadingTheOperatorsWhilePagesAnswer = async (pages: { taille: number; total: number; page?: number }[]): Promise<unknown> => {
    const lecture = port.operateurs().catch((failure: unknown) => failure);
    for (const [index, page] of pages.entries()) {
      await flushPage(
        '/api/operateurs',
        index,
        Array.from({ length: page.taille }, (_, operateur) => restOperateurFixture(`id-${index}-${operateur}`)),
        page.total,
        page.page,
      );
    }
    return lecture;
  };

  it('should read the whole element referential across server pages, over the whole period, into the anomaly vocabulary', async () => {
    const elements = Array.from({ length: 125 }, (_, index) => restElementFixture(`element-${index}`, { nom: `Pièce ${index}` }));
    elements[1] = restElementFixture('element-of', { nom: 'Bielle', reference: 'OF M24-0655' });

    const lecture = port.elements();
    await answerElementPages(elements);
    const lus = await lecture;

    expect(lus).toHaveLength(125);
    expect(lus[1]).toEqual({ id: new ElementAnomalieId('element-of'), nom: 'Bielle', reference: 'OF M24-0655' });
    expect(lus[2]).toEqual({ id: new ElementAnomalieId('element-2'), nom: 'Pièce 2' });
    expect(lus[2]).not.toHaveProperty('reference');
    expect(errors.errors).toEqual([]);
  });

  it('should ask the elements of every period, since the filter looks for an element whatever its dates', async () => {
    const demande = await whenReadingTheElementsOfAnEmptyServer();

    expect(demande.params.get('debut')).toBe('1970-01-01T00:00:00Z');
    expect(demande.params.get('fin')).toBe('2999-12-31T23:59:59Z');
  });

  it.each<{ incoherence: string; attendu: string; pages: { taille: number; total: number; page?: number }[] }>([
    {
      incoherence: 'a changing total',
      attendu: 'Le nombre des entrées est incohérent pendant la lecture.',
      pages: [
        { taille: 100, total: 101 },
        { taille: 1, total: 102 },
      ],
    },
    { incoherence: 'a truncated page', attendu: 'Le référentiel reçu est tronqué.', pages: [{ taille: 99, total: 100 }] },
    {
      incoherence: 'a page other than the requested one',
      attendu: 'La page reçue ne correspond pas à la page demandée.',
      pages: [{ taille: 1, total: 1, page: 3 }],
    },
  ])('should refuse and report an element referential with $incoherence', async ({ attendu, pages }) => {
    const failure = await whenReadingTheElementsWhilePagesAnswer(pages);

    expect(failure).toEqual(new Error(attendu));
    expect(errors.errors).toEqual([failure]);
  });

  it('should refuse and report an element referential that repeats an identity', async () => {
    const failure = await whenReadingTheElementsAnsweredWith([restElementFixture('doublon'), restElementFixture('doublon')]);

    expect(failure).toEqual(new Error('Le référentiel contient une identité dupliquée.'));
    expect(errors.errors).toEqual([failure]);
  });

  it.each<{ champ: string; element: components['schemas']['RestElementDeFabrication'] }>([
    { champ: 'element.id', element: { nom: 'Bielle' } },
    { champ: 'element.nom', element: { id: 'element-sans-nom' } },
  ])('should refuse and report an element received without its $champ', async ({ champ, element }) => {
    const failure = await whenReadingTheElementsAnsweredWith([element]);

    expect(failure).toEqual(new Error(`${champ} manque dans la réponse du serveur`));
    expect(errors.errors).toEqual([failure]);
  });

  it('should report a failed element read once and reject instead of offering a partial list', async () => {
    const failure = await whenTheElementReadFails();

    expect(failure).toBeInstanceOf(HttpErrorResponse);
    expect(errors.errors).toEqual([failure]);
  });

  const whenReadingTheElementsOfAnEmptyServer = async (): Promise<HttpRequest<unknown>> => {
    const lecture = port.elements();
    await new Promise(resolve => setTimeout(resolve));
    const demande = server.expectOne(request => request.url === '/api/elements-de-fabrication');
    demande.flush({ content: [], currentPage: 0, pageSize: 100, totalElementsCount: 0 });
    await lecture;
    return demande.request;
  };

  const whenReadingTheElementsWhilePagesAnswer = async (pages: { taille: number; total: number; page?: number }[]): Promise<unknown> => {
    const lecture = port.elements().catch((failure: unknown) => failure);
    for (const [index, page] of pages.entries()) {
      await flushElementsPage(
        index,
        Array.from({ length: page.taille }, (_, element) => restElementFixture(`id-${index}-${element}`)),
        page.total,
        page.page,
      );
    }
    return lecture;
  };

  const whenReadingTheElementsAnsweredWith = async (elements: readonly unknown[]): Promise<unknown> => {
    const lecture = port.elements().catch((failure: unknown) => failure);
    await answerElementPages(elements);
    return lecture;
  };

  const whenTheElementReadFails = async (): Promise<unknown> => {
    const lecture = port.elements().catch((failure: unknown) => failure);
    await new Promise(resolve => setTimeout(resolve));
    server.expectOne(request => request.url === '/api/elements-de-fabrication').flush({}, { status: 500, statusText: 'Failure' });
    return lecture;
  };

  const flushElementsPage = async (page: number, content: unknown[], total: number, answeredPage = page): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
    server
      .expectOne(request => request.url === '/api/elements-de-fabrication' && request.params.get('page') === String(page))
      .flush({ content, currentPage: answeredPage, pageSize: 100, totalElementsCount: total });
  };

  const answerElementPages = async (elements: readonly unknown[]): Promise<void> => {
    let page = 0;
    do {
      await flushElementsPage(page, elements.slice(page * 100, (page + 1) * 100), elements.length);
      page += 1;
    } while (page * 100 < elements.length);
  };

  const flushPage = async (url: string, page: number, content: unknown[], total: number, answeredPage = page): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
    server
      .expectOne(`${url}?page=${page}&size=100`)
      .flush({ content, currentPage: answeredPage, pageSize: 100, totalElementsCount: total });
  };

  const answerPages = async (url: string, elements: readonly unknown[]): Promise<void> => {
    let page = 0;
    do {
      await flushPage(url, page, elements.slice(page * 100, (page + 1) * 100), elements.length);
      page += 1;
    } while (page * 100 < elements.length);
  };

  const whenReferentialFails = async (url: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve));
    server.expectOne(url).flush({}, { status: 500, statusText: 'Failure' });
  };

  it.each([
    { status: 500, urn: undefined },
    { status: 404, urn: 'urn:glm:erreur:atelier:code-inconnu' },
    { status: 403, urn: undefined },
  ])(
    'should reject a failed read with status $status and report it once instead of claiming the dossier is missing',
    async ({ status, urn }) => {
      const lecture = port.read(adresse).catch((failure: unknown) => failure);
      whenDossierFails(status, urn);
      const failure = await lecture;

      expect(failure).toBeInstanceOf(HttpErrorResponse);
      expect(errors.errors).toEqual([failure]);
    },
  );

  const whenDossierFails = (status: number, urn: string | undefined): void => {
    server.expectOne('/api/atelier/suivis/suivi-camille/anomalies/debut-8').flush({ type: urn }, { status, statusText: 'Read failed' });
  };

  const dossierWithoutReferences = (): components['schemas']['RestDossierAnomalie'] => {
    const dossier = dossierFixture();
    delete dossier.activite.operateur;
    delete dossier.activite.poste;
    delete dossier.activite.posteId;
    const pointage: components['schemas']['RestEvenementDAtelier'] = { ...ouvertureFixture };
    delete pointage.operateur;
    delete pointage.poste;
    delete pointage.posteId;
    dossier.pointages = [pointage];
    return dossier;
  };

  const whenDossierIsMissing = (urn: string): void => {
    server
      .expectOne('/api/atelier/suivis/suivi-camille/anomalies/debut-8')
      .flush({ type: `urn:glm:erreur:atelier:${urn}`, detail: 'Introuvable.' }, { status: 404, statusText: 'Not found' });
  };

  const dossierFromReading = (lecture: LectureDossier): DossierAnomalie => {
    if (lecture.kind !== 'DOSSIER') throw new Error('Missing dossier fixture');
    return lecture.dossier;
  };

  const whenDossierAnswers = (dossier = dossierFixture()): void => {
    server.expectOne('/api/atelier/suivis/suivi-camille/anomalies/debut-8').flush(dossier);
  };
});
