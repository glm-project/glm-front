import { components } from '@/app/generated/schema';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { PreparationActe } from '@/gestion/contexts/resolution-conflits/application/PreparationActe';
import { ActeResolution } from '@/gestion/contexts/resolution-conflits/domain/acte/ActeResolution';
import { ApplicationActePort, PrevisualisationConflitPort } from '@/gestion/contexts/resolution-conflits/domain/acte/ConflitsActesPorts';
import { PropositionResolution } from '@/gestion/contexts/resolution-conflits/domain/acte/ResolutionDuConflit';
import { SaisieActe } from '@/gestion/contexts/resolution-conflits/domain/acte/SaisieActe';
import { ConflitsReadPort } from '@/gestion/contexts/resolution-conflits/domain/dossier/ConflitsReadPort';
import { ConflitsRightsPort } from '@/gestion/contexts/resolution-conflits/domain/dossier/ConflitsRightsPort';
import { AdresseDossier } from '@/gestion/contexts/resolution-conflits/domain/dossier/DossierConflit';
import { PointageConflitId } from '@/gestion/contexts/resolution-conflits/domain/dossier/PointageConflitId';
import { SuiviConflitId } from '@/gestion/contexts/resolution-conflits/domain/dossier/SuiviConflitId';
import { resolutionConflitsProvider } from '@/gestion/resolution-conflits.provider';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { resolutionConflitsProvider as cypressResolutionConflitsFixture } from '@test/utils/gestion/resolution-conflits/resolution-conflits.provider';

const adresseFixture: AdresseDossier = { suivi: new SuiviConflitId('suivi-camille'), pointage: new PointageConflitId('fin-17') };
const acteFixture: ActeResolution = { kind: 'ANNULATION', pointage: 'fin-17', motif: 'Double appui confirmé' };
const propositionFixture: PropositionResolution = {
  adresse: adresseFixture,
  commande: '80000000-0000-0000-0000-000000000001',
  acte: acteFixture,
  empreinteConsequences: 'empreinte-1',
  version: 7,
};

const perimetreFixture: components['schemas']['RestSequenceDuDossier'] = {
  operateurId: 'op-camille',
  activites: ['travail-8'],
  pointages: ['debut-8', 'fin-17'],
  datePremierPointage: '2026-09-14T08:00:00.123456789+02:00',
  nombrePointages: 2,
};
const dossierFixture = (kind: 'EN_CONFLIT' | 'ANCRE_ANNULEE', revision: number): components['schemas']['RestDossierConflit'] => ({
  kind,
  enConflit: kind === 'EN_CONFLIT',
  adresse: { suivi: 'suivi-camille', pointage: 'fin-17' },
  revision,
  evaluation: '2026-10-04T10:00:00Z',
  ...(kind === 'EN_CONFLIT' ? { sequence: perimetreFixture } : {}),
  perimetre: perimetreFixture,
  activites: [],
  diagnostics: [],
  choix: [],
  continuations: [],
  suivi: {
    id: 'suivi-camille',
    element: 'moule-42',
    nom: 'M-042',
    type: 'PRODUIT',
    engageLe: '2026-09-14T06:00:00Z',
    engagePar: 'gestionnaire',
    etat: 'EN_ATTENTE',
    activitesEnCours: [],
    conflits: [],
    journal: [],
  },
});

describe('Real conflict resolution composition', () => {
  let server: HttpTestingController;
  let errors: ErrorHandlerFixture;

  beforeEach(() => {
    errors = new ErrorHandlerFixture();
    TestBed.configureTestingModule({
      providers: [
        ...resolutionConflitsProvider,
        PreparationActe,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ConflitsRightsPort, useValue: { canApply: () => true } },
        { provide: ErrorHandlerPort, useValue: errors },
      ],
    });
    server = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    server.verify();
    vi.useRealTimers();
  });

  it('should use the same-origin API for reading, previewing and confirming through the public ports', async () => {
    const resultat = await whenUsingThePublicResolutionPorts();

    expect(resultat.lecture).toEqual({ lignes: [], total: 0, complete: true });
    expect(resultat.apercu).toEqual({ kind: 'REFUS', raison: 'Proposition invalide' });
    expect(resultat.confirmation).toEqual({ kind: 'ISSUE_INCONNUE' });
  });

  it('should keep a thirty-second confirmation timeout unknown and retry only its original public command', async () => {
    const { preparation, commande } = await givenAPreparedCancellation();

    const premiereDemande = await whenTheConfirmationTimesOut(preparation);
    const inconnue = preparation.operation();
    const verification = preparation.verify();
    whenReceiptAnswers({ kind: 'NON_ATTESTEE' }, commande);
    await verification;
    const nonAttestee = preparation.operation();
    const reprise = preparation.retryConfirmation();
    const confirmation = confirmationFixture();
    confirmation.recu.commande = commande;
    const deuxiemeDemande = whenTheRetriedConfirmationAnswers(confirmation);
    await reprise;

    expect(inconnue).toEqual({ kind: 'ISSUE_INCONNUE' });
    expect(nonAttestee).toEqual({ kind: 'ISSUE_INCONNUE' });
    expect(premiereDemande).toEqual({
      commande,
      adresse: { suivi: 'suivi-camille', pointage: 'fin-17' },
      revision: 7,
      acte: acteFixture,
      empreinteConsequences: 'empreinte-1',
    });
    expect(deuxiemeDemande).toEqual(premiereDemande);
    expect(errors.errors).toMatchObject([{ name: 'TimeoutError' }]);
    expect(preparation.operation()).toMatchObject({ kind: 'APPLIQUE', dossier: { version: 9, enConflit: false } });
  });

  const givenAPreparedCancellation = async () => {
    const lecture = TestBed.inject(ConflitsReadPort).read(adresseFixture);
    server.expectOne('/api/atelier/suivis/suivi-camille/conflits/fin-17').flush(dossierFixture('EN_CONFLIT', 7));
    const dossier = await lecture;
    if (dossier.kind !== 'DOSSIER') throw new Error('Dossier de préparation fixture absent');
    const preparation = TestBed.inject(PreparationActe);
    preparation.choose(SaisieActe.cancel('fin-17').afterChange({ motif: acteFixture.motif }));
    const demande = preparation.preview(dossier.dossier);
    const commande = whenPreviewAnswers();
    await demande;
    return { preparation, commande };
  };

  const whenTheConfirmationTimesOut = async (preparation: PreparationActe): Promise<unknown> => {
    vi.useFakeTimers();
    const confirmation = preparation.confirm();
    const request = server.expectOne('/api/atelier/suivis/suivi-camille/confirmations-de-resolution');
    await vi.advanceTimersByTimeAsync(30_000);
    await confirmation;
    vi.useRealTimers();
    return request.request.body;
  };

  const whenTheRetriedConfirmationAnswers = (confirmation: components['schemas']['RestConfirmationEnregistree']): unknown => {
    const request = server.expectOne('/api/atelier/suivis/suivi-camille/confirmations-de-resolution');
    request.flush(confirmation);
    return request.request.body;
  };

  const whenReceiptAnswers = (resultat: components['schemas']['RestConfirmationDeResolution'], commande: string): void => {
    const request = server.expectOne(`/api/atelier/suivis/suivi-camille/confirmations-de-resolution/${commande}`);
    expect(request.request.method).toBe('GET');
    request.flush(resultat);
  };

  const confirmationFixture = (): components['schemas']['RestConfirmationEnregistree'] => ({
    kind: 'ENREGISTREE',
    recu: {
      commande: propositionFixture.commande,
      adresse: { suivi: 'suivi-camille', pointage: 'fin-17' },
      acte: acteFixture,
      revisionDeDepart: 7,
      revisionEnregistree: 8,
      enregistreLe: '2026-10-04T10:00:00Z',
      evenementsTouches: ['fin-17'],
    },
    dossier: dossierFixture('ANCRE_ANNULEE', 9),
  });

  const whenPreviewAnswers = (): string => {
    const request = server.expectOne('/api/atelier/suivis/suivi-camille/conflits/fin-17/apercus');
    const body = request.request.body as components['schemas']['RestDemandeDApercu'];
    expect(request.request.method).toBe('POST');
    expect(body).toEqual({ revision: 7, acte: acteFixture, commande: body.commande });
    expect(body.commande).toMatch(/^[0-9a-f-]{36}$/);
    request.flush({
      commande: body.commande,
      adresse: { suivi: 'suivi-camille', pointage: 'fin-17' },
      revision: 7,
      evaluation: '2026-10-04T10:00:00Z',
      empreinteConsequences: 'empreinte-1',
      acte: acteFixture,
      avant: dossierFixture('EN_CONFLIT', 7),
      apres: dossierFixture('ANCRE_ANNULEE', 8),
    } satisfies components['schemas']['RestApercuDeResolution']);
    return body.commande;
  };

  const whenUsingThePublicResolutionPorts = async () => {
    const adresse = { suivi: new SuiviConflitId('suivi-camille'), pointage: new PointageConflitId('fin-17') };
    const lecture = TestBed.inject(ConflitsReadPort).list({ operateur: '', element: '', page: 1 });
    server
      .expectOne('/api/atelier/conflits?operateur=&element=&page=0&size=5')
      .flush({ lignes: [], total: 0, complete: true, page: 0, size: 5 });
    const resultatLecture = await lecture;
    const apercu = TestBed.inject(PrevisualisationConflitPort).preview(adresse, 1, {
      kind: 'ANNULATION',
      pointage: 'fin-17',
      motif: 'Double appui',
    });
    server
      .expectOne('/api/atelier/suivis/suivi-camille/conflits/fin-17/apercus')
      .flush(
        { type: 'urn:glm:erreur:atelier:proposition-invalide', message: 'Proposition invalide' },
        { status: 400, statusText: 'Invalid' },
      );
    const resultatApercu = await apercu;
    const confirmation = TestBed.inject(ApplicationActePort).apply({
      adresse,
      version: 1,
      commande: 'commande-1',
      acte: acteFixture,
      empreinteConsequences: 'empreinte-1',
    });
    server.expectOne('/api/atelier/suivis/suivi-camille/confirmations-de-resolution').flush({ kind: 'NON_ATTESTEE' });
    return { lecture: resultatLecture, apercu: resultatApercu, confirmation: await confirmation };
  };
});

describe('Conflict resolution source selected before the route runtime starts', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ...cypressResolutionConflitsFixture,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ErrorHandlerPort, useClass: ErrorHandlerFixture },
      ],
    });
  });

  afterEach(() => {
    delete window.gestionConflitsSource;
    TestBed.inject(HttpTestingController).verify();
  });

  it('should read through HTTP when the browser selects that source after the route providers were declared', async () => {
    givenTheBrowserSelectsHttp();

    const lecture = whenReadingTheConflictList();
    whenTheHttpConflictListAnswers();
    const resultat = await lecture;

    expect(resultat).toEqual({ lignes: [], total: 0, complete: true });
  });

  const givenTheBrowserSelectsHttp = (): void => {
    window.gestionConflitsSource = 'HTTP';
  };

  const whenReadingTheConflictList = () => TestBed.inject(ConflitsReadPort).list({ operateur: '', element: '', page: 1 });

  const whenTheHttpConflictListAnswers = (): void => {
    TestBed.inject(HttpTestingController)
      .expectOne('/api/atelier/conflits?operateur=&element=&page=0&size=5')
      .flush({ lignes: [], total: 0, complete: true, page: 0, size: 5 });
  };
});
