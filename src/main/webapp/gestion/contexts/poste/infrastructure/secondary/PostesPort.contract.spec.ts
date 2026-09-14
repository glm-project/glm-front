import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CoutHoraire } from '../../domain/CoutHoraire';
import { LibellePoste } from '../../domain/LibellePoste';
import { LibellePosteDejaUtilise } from '../../domain/LibellePosteDejaUtilise';
import { NatureDeTravail } from '../../domain/NatureDeTravail';
import { PosteDeTravailId } from '../../domain/PosteDeTravailId';
import { PosteIntrouvable } from '../../domain/PosteIntrouvable';
import { PosteNonSupprimable } from '../../domain/PosteNonSupprimable';
import { PostesPort } from '../../domain/PostesPort';
import { HttpPostes } from './HttpPostes';

type RestPoste = components['schemas']['RestPosteDeTravail'];
const tourFixture: RestPoste = { id: 'tour-1', libelle: 'Tour 1', nature: 'tournage', coutHoraire: 45.5 };

describe.each([['HTTP', () => TestBed.inject(HttpPostes)] as const])('PostesPort contract, honoured by %s', (_name, buildPort) => {
  let port: PostesPort;
  let server: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), ApiClient, HttpPostes] });
    port = buildPort();
    server = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    server.verify();
  });

  it('should return the requested page with domain values and the server total', async () => {
    const result = port.postes(2, 20);
    await whenPageAnswers([tourFixture], 61, 2, 20);
    const page = await result;

    expect(page.totalCount).toBe(61);
    expect(page.elements).toEqual([
      { id: { value: 'tour-1' }, libelle: { value: 'Tour 1' }, nature: { value: 'tournage' }, coutHoraire: { value: 45.5 } },
    ]);
    expect(page.isComplete()).toBe(false);
  });

  it('should retain an omitted hourly cost as optional', async () => {
    const result = port.postes(0, 20);
    await whenPageAnswers([{ id: 'scie-1', libelle: 'Scie 1', nature: 'sciage' }], 1);
    const page = await result;

    expect(page.elements).toEqual([
      { id: { value: 'scie-1' }, libelle: { value: 'Scie 1' }, nature: { value: 'sciage' }, coutHoraire: undefined },
    ]);
  });

  it('should reject a technical read failure', async () => {
    const result = port.postes(0, 20).catch((failure: unknown) => failure);
    await whenServerFails('/api/postes-de-travail?page=0&size=20', 500);
    expect(await result).toBeInstanceOf(HttpErrorResponse);
  });

  it('should collect sorted distinct natures from every page of the workshop', async () => {
    const result = port.natures();
    await whenPageAnswers([tourFixture, { ...tourFixture, id: 'tour-2' }], 3, 0, 100);
    await whenPageAnswers([{ id: 'scie-1', libelle: 'Scie 1', nature: 'sciage' }], 3, 1, 100);

    expect(await result).toEqual([{ value: 'sciage' }, { value: 'tournage' }]);
  });

  it('should return no suggested natures for an empty workshop', async () => {
    const result = port.natures();
    await whenPageAnswers([], 0, 0, 100);

    expect(await result).toEqual([]);
  });

  it('should reject incomplete nature acquisition when the server stops providing entries', async () => {
    const result = port.natures().catch((failure: unknown) => failure);
    await whenPageAnswers([], 1, 0, 100);

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

  const whenSaving = (action: 'creer' | 'modifier', coutHoraire?: CoutHoraire) => {
    const commande = { libelle: new LibellePoste('Tour 1'), nature: new NatureDeTravail('tournage'), coutHoraire };
    return action === 'creer' ? port.creer(commande) : port.modifier(new PosteDeTravailId('tour-1'), commande);
  };

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
