import { components } from '@/app/generated/schema';
import { ApiClient } from '@/app/shared/api-client/infrastructure/secondary/ApiClient';
import { ErrorHandlerPort } from '@/app/shared/error-handler/domain/ErrorHandlerPort';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ErrorHandlerFixture } from '@test/unit/fixtures/ErrorHandlerFixture';
import { requiredFixture } from '@test/utils/RequiredFixture';
import { ActiviteAnomalieId } from '../../domain/dossier/ActiviteAnomalieId';
import { AnomaliesReadPort } from '../../domain/dossier/AnomaliesReadPort';
import { DossierAnomalie, LectureDossier } from '../../domain/dossier/DossierAnomalie';
import { ElementAnomalieId } from '../../domain/dossier/ElementAnomalieId';
import { PointageAnomalieId } from '../../domain/dossier/PointageAnomalieId';
import { SuiviAnomalieId } from '../../domain/dossier/SuiviAnomalieId';
import { HttpAnomalies } from './HttpAnomalies';

const ligneFixture: components['schemas']['RestConflitEnListe'] = {
  adresse: { suivi: 'suivi-camille', pointage: 'fin-17' },
  revision: 7,
  elementId: 'moule-42',
  designation: 'M-042',
  operateurId: 'op-camille',
  operateur: { id: 'op-camille', nom: 'Martin', prenom: 'Camille' },
  posteId: 'poste-dmu',
  poste: { id: 'poste-dmu', libelle: 'DMU 50' },
  datePremierPointage: '2026-09-14T08:00:00.123456789+02:00',
  nombrePointages: 3,
};

describe('Beyond the contract: HTTP conflict reading', () => {
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

  it('should reject and report an incomplete required page instead of displaying partial conflict data', async () => {
    const lecture = port.list({ operateur: 'Camille', element: 'M-042', page: 2 }).catch((failure: unknown) => failure);

    whenPageAnswers([ligneFixture], false);
    const failure = await lecture;

    expect(failure).toEqual(new Error('Lecture des conflits incomplète.'));
    expect(errors.errors).toEqual([failure]);
  });

  it('should acquire one filtered page while preserving the server total and exact first timestamp', async () => {
    const filtre = { operateur: 'Camille', element: 'M-042', page: 2 };

    const lecture = port.list(filtre);
    whenPageAnswers();
    const page = await lecture;

    expect(page).toMatchObject({
      lignes: [
        {
          adresse: { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-17') },
          element: new ElementAnomalieId('moule-42'),
          designation: 'M-042',
          operateur: 'Camille Martin',
          poste: 'DMU 50',
          date: '2026-09-14T08:00:00.123456789+02:00',
          explication: '',
          nombrePointages: 3,
        },
      ],
      total: 12,
      complete: true,
    });
  });

  it('should preserve raw operator and workstation identities when their references cannot be resolved', async () => {
    const ligne = givenUnresolvedReferences();

    const lecture = port.list({ operateur: 'Camille', element: 'M-042', page: 2 });
    whenPageAnswers([ligne]);
    const page = await lecture;

    expect(page.lignes[0]).toMatchObject({ operateur: '', operateurId: 'op-camille', poste: '', posteId: 'poste-dmu' });
  });

  it('should retain the journal of a cancelled anchor instead of opening another sequence', async () => {
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-17') };

    const lecture = port.read(adresse);
    whenCancelledDossierAnswers();
    const resultat = await lecture;

    expect(resultat).toMatchObject({
      kind: 'ANCRE_ANNULEE',
      journal: [
        {
          id: new PointageAnomalieId('fin-17'),
          fait: {
            type: 'FIN',
            intention: 'FIN',
            activiteVisee: 'travail-8',
            operateur: 'op-camille',
            poste: '',
            instant: '2026-09-14T17:00:00.123456789+02:00',
          },
          annulation: { motif: 'Double pression confirmée', auteur: 'gestionnaire', instant: '2026-09-15T08:00:00Z' },
          auteur: 'camille',
          enregistre: '2026-09-15T07:00:00Z',
          regularisation: false,
        },
      ],
    });
  });

  it('should return an inaccessible follow-up explicitly without revealing a journal', async () => {
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-17') };

    const lecture = port.read(adresse).catch((failure: unknown) => failure);
    whenFollowUpIsMissing();
    const resultat = await lecture;

    expect(resultat).toEqual({ kind: 'INTROUVABLE', journal: [] });
    expect(errors.errors).toEqual([]);
  });

  it('should retain the replacement link and manager regularisation in the original journal', async () => {
    const dossier = givenAReplacementInTheJournal();
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-17') };

    const lecture = port.read(adresse);
    whenCancelledDossierAnswers(dossier);
    const resultat = await lecture;

    expect(resultat).toMatchObject({
      kind: 'ANCRE_ANNULEE',
      journal: [
        { id: new PointageAnomalieId('fin-17'), annulation: { motif: 'Double pression confirmée' } },
        { id: new PointageAnomalieId('fin-corrigee'), remplace: new PointageAnomalieId('fin-17'), regularisation: true },
      ],
    });
  });

  it('should preserve the stable activity opened by a corrected opening and its absent target', async () => {
    const dossier = givenACorrectedOpening();
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-17') };

    const lecture = port.read(adresse);
    whenCancelledDossierAnswers(dossier);
    const resultat = await lecture;

    expect(resultat).toMatchObject({
      journal: [
        { id: new PointageAnomalieId('fin-17') },
        {
          id: new PointageAnomalieId('ouverture-corrigee'),
          activiteCreee: new ActiviteAnomalieId('travail-8'),
          fait: { intention: 'OUVERTURE', activiteVisee: '' },
        },
      ],
    });
  });

  const givenACorrectedOpening = (): components['schemas']['RestDossierConflit'] => {
    const dossier = dossierAnnuleFixture();
    const original = requiredFixture(dossier.suivi.journal[0], 'original finish');
    const ouverture: components['schemas']['RestEvenementDAtelier'] = {
      ...original,
      id: 'ouverture-corrigee',
      type: 'DEBUT',
      intention: 'OUVERTURE',
      activite: 'travail-8',
      estUneRegularisation: true,
    };
    delete ouverture.cible;
    delete ouverture.annulation;
    return { ...dossier, suivi: { ...dossier.suivi, journal: [original, ouverture] } };
  };

  const givenAReplacementInTheJournal = (): components['schemas']['RestDossierConflit'] => {
    const dossier = dossierAnnuleFixture();
    const original = requiredFixture(dossier.suivi.journal[0], 'original finish');
    const remplacement = { ...original, id: 'fin-corrigee', estUneRegularisation: true, remplace: 'fin-17' };
    delete remplacement.annulation;
    return { ...dossier, suivi: { ...dossier.suivi, journal: [original, remplacement] } };
  };

  it('should retain the authoritative sequence scope and unresolved activity without inventing a duration', async () => {
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-17') };

    const lecture = port.read(adresse).catch((failure: unknown) => failure);
    whenConflictDossierAnswers();
    const resultat = await lecture;

    expect(resultat).toMatchObject({
      kind: 'DOSSIER',
      dossier: {
        version: 8,
        enConflit: true,
        cloture: false,
        ligne: {
          adresse,
          nombrePointages: 3,
          date: '2026-09-14T08:00:00.123456789+02:00',
          operateurId: 'op-camille',
          posteId: 'poste-dmu',
        },
        activites: [
          {
            id: new ActiviteAnomalieId('travail-8'),
            etat: 'A_RESOUDRE',
            periode: { categorie: 'TRAVAIL', debut: '2026-09-14T08:00:00.123456789+02:00' },
          },
        ],
        diagnostics: [
          {
            pointage: new PointageAnomalieId('fin-17'),
            raison: 'CIBLE_REMPLACEE',
            cible: {
              activite: new ActiviteAnomalieId('travail-8'),
              ouvrant: new PointageAnomalieId('debut-8'),
              termineePar: new PointageAnomalieId('nc-12'),
            },
          },
        ],
      },
    });
  });

  it('should preserve an exact received duration and workshop closure while another sequence remains unresolved', async () => {
    const dossier = givenAClosedDossierWithExactDuration();
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-17') };

    const lecture = port.read(adresse);
    whenConflictDossierAnswers(dossier);
    const resultat = await lecture;

    expect(resultat).toMatchObject({
      kind: 'DOSSIER',
      dossier: {
        cloture: true,
        finCloture: '2026-09-14T18:00:00Z',
        ligne: { poste: '' },
        activites: [{ etat: 'TERMINEE', periode: { fin: '2026-09-14T17:00:00+02:00', duree: 'PT8H59M59.876543211S' } }],
        diagnostics: [{ raison: 'CIBLE_DEJA_TERMINEE', cible: { activite: new ActiviteAnomalieId('travail-8') } }],
      },
    });
  });

  it('should expose the authoritative guided cancellation while leaving its motive for the manager', async () => {
    const dossier = dossierAnomalieFixture();
    dossier.choix = [{ code: 'ANNULER_TRANSITION', kind: 'ANNULATION', pointage: 'nc-12' }];
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-17') };

    const lecture = port.read(adresse);
    whenConflictDossierAnswers(dossier);
    const resultat = await lecture;

    const choix = requiredFixture(dossierFromReading(resultat).choix[0], 'guided cancellation');
    expect(choix.id).toBe('ANNULER_TRANSITION:nc-12');
    expect(choix.saisie.proposition).toEqual({ kind: 'ANNULATION', pointage: 'nc-12', motif: '' });
    expect(choix.saisie.command()).toBeUndefined();
  });

  it('should acquire the exact guided replacement fact without inventing a motive or workstation', async () => {
    const dossier = dossierAnomalieFixture();
    dossier.choix = [
      {
        code: 'RATTACHER_FIN_A_ACTIVITE_REMPLACANTE',
        kind: 'CORRECTION',
        pointage: 'fin-17',
        fait: {
          type: 'FIN',
          intention: 'FIN',
          activiteVisee: 'nc-12',
          operateur: 'op-camille',
          instant: '2026-09-14T17:00:00.123456789+02:00',
        },
      },
    ];
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-17') };

    const lecture = port.read(adresse);
    whenConflictDossierAnswers(dossier);
    const resultat = await lecture;

    const choix = requiredFixture(dossierFromReading(resultat).choix[0], 'guided correction');
    expect(choix.saisie.proposition).toEqual({
      kind: 'CORRECTION',
      pointage: 'fin-17',
      motif: '',
      fait: {
        type: 'FIN',
        intention: 'FIN',
        activiteVisee: 'nc-12',
        operateur: 'op-camille',
        poste: '',
        instant: '2026-09-14T17:00:00.123456789+02:00',
      },
    });
    expect(choix.saisie.command()).toBeUndefined();
  });

  it('should reject a dossier missing its required sequence instead of reconstructing it from the journal', async () => {
    const dossier = dossierAnomalieFixture();
    delete dossier.sequence;
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-17') };

    const lecture = port.read(adresse).catch((failure: unknown) => failure);
    whenConflictDossierAnswers(dossier);
    const failure = await lecture;

    expect(failure).toEqual(new Error('Séquence du dossier absente.'));
    expect(errors.errors).toEqual([failure]);
  });

  it('should expose only the authoritative continuation address with its own scope and unresolved references', async () => {
    const dossier = dossierAnomalieFixture();
    dossier.continuations = [
      { ...givenUnresolvedReferences(), adresse: { suivi: 'suivi-camille', pointage: 'fin-corrigee' }, nombrePointages: 2 },
    ];
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-17') };

    const lecture = port.read(adresse);
    whenConflictDossierAnswers(dossier);
    const resultat = await lecture;

    expect(dossierFromReading(resultat).continuations).toMatchObject([
      {
        adresse: { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-corrigee') },
        nombrePointages: 2,
        operateur: '',
        operateurId: 'op-camille',
        poste: '',
        posteId: 'poste-dmu',
        date: '2026-09-14T08:00:00.123456789+02:00',
      },
    ]);
  });

  it('should reject a guided correction missing its required fact and report the incomplete acquisition once', async () => {
    const dossier = dossierAnomalieFixture();
    dossier.choix = [{ code: 'RATTACHER_FIN_A_ACTIVITE_REMPLACANTE', kind: 'CORRECTION', pointage: 'fin-17' }];
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-17') };

    const lecture = port.read(adresse).catch((failure: unknown) => failure);
    whenConflictDossierAnswers(dossier);
    const resultat = await lecture;

    expect(resultat).toEqual(new Error('Fait de la proposition guidée absent.'));
    expect(errors.errors).toEqual([resultat]);
  });

  it('should reject a guided finish correction missing its replacement target instead of selecting another activity', async () => {
    const dossier = dossierAnomalieFixture();
    dossier.choix = [
      {
        code: 'RATTACHER_FIN_A_ACTIVITE_REMPLACANTE',
        kind: 'CORRECTION',
        pointage: 'fin-17',
        fait: {
          type: 'FIN',
          intention: 'FIN',
          operateur: 'op-camille',
          instant: '2026-09-14T17:00:00.123456789+02:00',
        },
      },
    ];
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-17') };

    const lecture = port.read(adresse).catch((failure: unknown) => failure);
    whenConflictDossierAnswers(dossier);
    const resultat = await lecture;

    expect(resultat).toEqual(new Error('Cible de la proposition guidée absente.'));
    expect(errors.errors).toEqual([resultat]);
  });

  it.each([
    { code: 'ANNULER_TRANSITION' as const, kind: 'CORRECTION' as const },
    { code: 'RATTACHER_FIN_A_ACTIVITE_REMPLACANTE' as const, kind: 'ANNULATION' as const },
    { code: 'RATTACHER_FIN_A_ACTIVITE_REMPLACANTE' as const, kind: 'REGULARISATION' as const },
  ])('should reject an unsupported $code and $kind combination rather than inventing a guided hypothesis', async ({ code, kind }) => {
    const dossier = dossierAnomalieFixture();
    dossier.choix = [
      {
        code,
        kind,
        pointage: 'fin-17',
        fait: {
          type: 'FIN',
          intention: 'FIN',
          activiteVisee: 'nc-12',
          operateur: 'op-camille',
          instant: '2026-09-14T17:00:00.123456789+02:00',
        },
      },
    ];
    const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-17') };

    const lecture = port.read(adresse).catch((failure: unknown) => failure);
    whenConflictDossierAnswers(dossier);
    const resultat = await lecture;

    expect(resultat).toEqual(new Error('Proposition guidée incohérente.'));
    expect(errors.errors).toEqual([resultat]);
  });

  it.each(['TERMINEE', 'ECHUE'] as const)(
    'should reject $etat work missing its authoritative duration instead of showing a complete dossier',
    async etat => {
      const dossier = givenAClosedDossierWithExactDuration();
      const activite = requiredFixture(dossier.activites[0], 'finished work');
      activite.etat = etat;
      delete activite.duree;
      const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-17') };

      const lecture = port.read(adresse).catch((failure: unknown) => failure);
      whenConflictDossierAnswers(dossier);
      const resultat = await lecture;

      expect(resultat).toEqual(new Error('Durée définitive de l’activité absente.'));
      expect(errors.errors).toEqual([resultat]);
    },
  );

  const givenAClosedDossierWithExactDuration = (): components['schemas']['RestDossierConflit'] => {
    const dossier = dossierAnomalieFixture();
    const sequence = requiredFixture(dossier.sequence, 'addressed sequence');
    delete sequence.posteId;
    return {
      ...dossier,
      suivi: { ...dossier.suivi, etat: 'CLOTURE', clotureLe: '2026-09-14T18:00:00Z', cloturePar: 'gestionnaire' },
      activites: [
        {
          evenement: 'debut-8',
          activite: 'travail-8',
          operateurId: 'op-camille',
          categorie: 'TRAVAIL',
          debut: '2026-09-14T08:00:00.123456789+02:00',
          fin: '2026-09-14T17:00:00+02:00',
          duree: 'PT8H59M59.876543211S',
          etat: 'TERMINEE',
        },
      ],
      diagnostics: [{ pointage: 'fin-17', raison: 'CIBLE_DEJA_TERMINEE', cible: { activite: 'travail-8' } }],
    };
  };

  const dossierAnomalieFixture = (): components['schemas']['RestDossierConflit'] => {
    const dossier = dossierAnnuleFixture();
    return {
      ...dossier,
      kind: 'EN_CONFLIT',
      enConflit: true,
      sequence: {
        operateurId: 'op-camille',
        posteId: 'poste-dmu',
        activites: ['travail-8', 'nc-12'],
        pointages: ['debut-8', 'nc-12', 'fin-17'],
        datePremierPointage: '2026-09-14T08:00:00.123456789+02:00',
        nombrePointages: 3,
      },
      activites: [
        {
          evenement: 'debut-8',
          activite: 'travail-8',
          operateurId: 'op-camille',
          posteId: 'poste-dmu',
          categorie: 'TRAVAIL',
          debut: '2026-09-14T08:00:00.123456789+02:00',
          etat: 'A_RESOUDRE',
        },
      ],
      diagnostics: [
        { pointage: 'fin-17', raison: 'CIBLE_REMPLACEE', cible: { activite: 'travail-8', ouvrant: 'debut-8', termineePar: 'nc-12' } },
      ],
    };
  };

  const whenConflictDossierAnswers = (dossier = dossierAnomalieFixture()): void => {
    server.expectOne('/api/atelier/suivis/suivi-camille/conflits/fin-17').flush(dossier);
  };

  const dossierFromReading = (lecture: LectureDossier): DossierAnomalie => {
    if (lecture.kind !== 'DOSSIER') throw new Error('Missing dossier fixture');
    return lecture.dossier;
  };

  it.each([
    { status: 500, urn: undefined },
    { status: 404, urn: 'urn:glm:erreur:atelier:code-inconnu' },
    { status: 403, urn: undefined },
  ])(
    'should reject a failed read with status $status and report it once instead of claiming the dossier is missing',
    async ({ status, urn }) => {
      const adresse = { suivi: new SuiviAnomalieId('suivi-camille'), pointage: new PointageAnomalieId('fin-17') };

      const lecture = port.read(adresse).catch((failure: unknown) => failure);
      whenDossierFails(status, urn);
      const failure = await lecture;

      expect(failure).toBeInstanceOf(HttpErrorResponse);
      expect(errors.errors).toEqual([failure]);
    },
  );

  const whenDossierFails = (status: number, urn: string | undefined): void => {
    server.expectOne('/api/atelier/suivis/suivi-camille/conflits/fin-17').flush({ type: urn }, { status, statusText: 'Read failed' });
  };

  const whenFollowUpIsMissing = (): void => {
    server
      .expectOne('/api/atelier/suivis/suivi-camille/conflits/fin-17')
      .flush(
        { type: 'urn:glm:erreur:atelier:suivi-d-atelier-introuvable', detail: 'Suivi introuvable.' },
        { status: 404, statusText: 'Not found' },
      );
  };

  const dossierAnnuleFixture = (): components['schemas']['RestDossierConflit'] => ({
    kind: 'ANCRE_ANNULEE',
    enConflit: false,
    adresse: ligneFixture.adresse,
    revision: 8,
    evaluation: '2026-09-15T08:00:00Z',
    choix: [],
    continuations: [],
    diagnostics: [],
    activites: [],
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
      journal: [
        {
          id: 'fin-17',
          type: 'FIN',
          intention: 'FIN',
          cible: 'travail-8',
          operateurId: 'op-camille',
          auteur: 'camille',
          dateDeSurvenue: '2026-09-14T17:00:00.123456789+02:00',
          dateDEnregistrement: '2026-09-15T07:00:00Z',
          estUneRegularisation: false,
          annulation: { motif: 'Double pression confirmée', auteur: 'gestionnaire', date: '2026-09-15T08:00:00Z' },
        },
      ],
    },
  });

  const whenCancelledDossierAnswers = (dossier = dossierAnnuleFixture()): void => {
    server.expectOne('/api/atelier/suivis/suivi-camille/conflits/fin-17').flush(dossier);
  };

  const givenUnresolvedReferences = (): components['schemas']['RestConflitEnListe'] => {
    const ligne = { ...ligneFixture };
    delete ligne.operateur;
    delete ligne.poste;
    return ligne;
  };

  const whenPageAnswers = (lignes: components['schemas']['RestConflitEnListe'][] = [ligneFixture], complete = true): void => {
    server.expectOne('/api/atelier/conflits?operateur=Camille&element=M-042&page=1&size=5').flush({
      lignes,
      total: 12,
      complete,
      page: 1,
      size: 5,
    });
  };
});
