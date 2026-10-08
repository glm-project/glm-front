import { components } from '@/app/generated/schema';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { anomaliesDePointageProvider } from '@/gestion/anomalies-de-pointage.provider';
import { PreparationActe } from '@/gestion/contexts/anomalies-de-pointage/application/PreparationActe';
import { ActeResolution } from '@/gestion/contexts/anomalies-de-pointage/domain/acte/ActeResolution';
import {
  ApplicationActePort,
  PrevisualisationAnomaliePort,
} from '@/gestion/contexts/anomalies-de-pointage/domain/acte/AnomaliesActesPorts';
import { PropositionResolution } from '@/gestion/contexts/anomalies-de-pointage/domain/acte/ResolutionDeLAnomalie';
import { SaisieActe } from '@/gestion/contexts/anomalies-de-pointage/domain/acte/SaisieActe';
import { AnomaliesReadPort } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/AnomaliesReadPort';
import { AdresseDossier } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/DossierAnomalie';
import { ElementAnomalie } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/ElementAnomalie';
import { ElementAnomalieId } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/ElementAnomalieId';
import { OperateurAnomalieId } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/OperateurAnomalieId';
import { PointageAnomalieId } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/PointageAnomalieId';
import { PosteAnomalieId } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/PosteAnomalieId';
import { OperateurAnomalie, ReferentielAnomalies } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/ReferentielAnomalies';
import { SuiviAnomalieId } from '@/gestion/contexts/anomalies-de-pointage/domain/dossier/SuiviAnomalieId';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';

const adresseFixture: AdresseDossier = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-17') };
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
const dossierFixture = (kind: 'EN_CONFLIT' | 'ANCRE_ANNULEE', revision: number): components['schemas']['RestDossierAnomalie'] => ({
  kind,
  enConflit: kind === 'EN_CONFLIT',
  finAutomatique: false,
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
    categorie: 'MOULE',
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
        ...anomaliesDePointageProvider,
        PreparationActe,
        provideHttpClient(),
        provideHttpClientTesting(),
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

    expect(resultat.lecture).toEqual({ nature: 'CONFLIT', lignes: [], total: 0, complete: true });
    expect(resultat.apercu).toEqual({ kind: 'REFUS', code: 'proposition-invalide' });
    expect(resultat.confirmation).toEqual({ kind: 'ISSUE_INCONNUE' });
  });

  it('should read the operator and workstation referential through the public read port on the same-origin API', async () => {
    const lecture = whenReadingTheReferential();
    whenTheReferentielAnswers();

    const referentiel = await lecture;

    expect(referentiel.operateurs).toEqual([
      {
        id: new OperateurAnomalieId('op-camille'),
        nom: 'Camille Martin',
        code: '007',
        postesHabilites: [new PosteAnomalieId('poste-tour')],
      },
    ]);
    expect(referentiel.postes).toEqual([{ id: new PosteAnomalieId('poste-tour'), libelle: 'Tour 1' }]);
  });

  it('should read the operators alone through the public read port on the same-origin API, without asking for the workstations', async () => {
    const lecture = whenReadingTheOperators();
    whenTheOperatorsAnswer();

    const operateurs = await lecture;

    expect(operateurs).toEqual([
      {
        id: new OperateurAnomalieId('op-camille'),
        nom: 'Camille Martin',
        code: '007',
        postesHabilites: [new PosteAnomalieId('poste-tour')],
      },
    ]);
  });

  const whenReadingTheOperators = (): Promise<readonly OperateurAnomalie[]> => TestBed.inject(AnomaliesReadPort).operateurs();

  const whenReadingTheReferential = (): Promise<ReferentielAnomalies> => TestBed.inject(AnomaliesReadPort).referentiel();

  const whenTheOperatorsAnswer = (): void => {
    server.expectOne('/api/operateurs?page=0&size=100').flush({
      content: [
        {
          id: 'op-camille',
          identifiant: '007',
          prenom: 'Camille',
          nom: 'Martin',
          natures: ['tournage'],
          postes: [{ id: 'poste-tour', libelle: 'Tour 1', nature: 'tournage' }],
        },
      ],
      currentPage: 0,
      pageSize: 100,
      totalElementsCount: 1,
    } satisfies components['schemas']['PageRestOperateur']);
  };

  const whenTheReferentielAnswers = (): void => {
    whenTheOperatorsAnswer();
    server.expectOne('/api/postes-de-travail?page=0&size=100').flush({
      content: [{ id: 'poste-tour', libelle: 'Tour 1', nature: 'tournage' }],
      currentPage: 0,
      pageSize: 100,
      totalElementsCount: 1,
    } satisfies components['schemas']['PageRestPosteDeTravail']);
  };

  it('should read the element referential through the public read port on the same-origin API', async () => {
    const lecture = whenReadingTheElements();
    whenTheElementsAnswer();

    const elements = await lecture;

    expect(elements).toEqual([{ id: new ElementAnomalieId('element-bielle'), nom: 'Bielle', reference: 'OF M24-0655' }]);
  });

  const whenReadingTheElements = (): Promise<readonly ElementAnomalie[]> => TestBed.inject(AnomaliesReadPort).elements();

  const whenTheElementsAnswer = (): void => {
    server
      .expectOne(request => request.url === '/api/elements-de-fabrication' && request.params.get('page') === '0')
      .flush({
        content: [{ id: 'element-bielle', nom: 'Bielle', reference: 'OF M24-0655', categorie: 'MOULE', type: 'PRODUIT' }],
        currentPage: 0,
        pageSize: 100,
        totalElementsCount: 1,
      } satisfies components['schemas']['PageRestElementDeFabrication']);
  };

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
    const lecture = TestBed.inject(AnomaliesReadPort).read(adresseFixture);
    server.expectOne('/api/atelier/suivis/suivi-camille/anomalies/fin-17').flush(dossierFixture('EN_CONFLIT', 7));
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
    const request = server.expectOne('/api/atelier/suivis/suivi-camille/anomalies/fin-17/apercus');
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
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-17') };
    const lecture = TestBed.inject(AnomaliesReadPort).list({ nature: 'CONFLIT', operateur: '', element: '', page: 1 });
    server
      .expectOne('/api/atelier/anomalies?nature=CONFLIT&operateur=&element=&page=0&size=5')
      .flush({ lignes: [], total: 0, complete: true, page: 0, size: 5 });
    const resultatLecture = await lecture;
    const apercu = TestBed.inject(PrevisualisationAnomaliePort).preview(adresse, 1, {
      kind: 'ANNULATION',
      pointage: 'fin-17',
      motif: 'Double appui',
    });
    server
      .expectOne('/api/atelier/suivis/suivi-camille/anomalies/fin-17/apercus')
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
